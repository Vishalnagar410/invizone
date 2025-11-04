# backend/app/api/stock.py - ENHANCED VERSION
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

# ✅ Supports both absolute and relative imports
try:
    from ..database import get_db
    from ..models import User, StockAdjustment, AdjustmentReason
    from ..schemas import Stock, StockUpdate, Alert, ChemicalWithStock, UsageHistory, UsageHistoryCreate
    from ..crud import stock_crud
    from ..auth.auth import get_current_user, require_admin
    from ..websocket import broadcast_stock_adjustment  # NEW: WebSocket integration
except ImportError:
    from app.database import get_db
    from app.models import User, StockAdjustment, AdjustmentReason
    from app.schemas import Stock, StockUpdate, Alert, ChemicalWithStock, UsageHistory, UsageHistoryCreate
    from app.crud import stock_crud
    from app.auth.auth import get_current_user, require_admin
    from app.websocket import broadcast_stock_adjustment  # NEW: WebSocket integration

router = APIRouter()

@router.get("/", response_model=List[Stock])
def read_stock(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all stock information.
    Accessible by authenticated users.
    """
    try:
        return stock_crud.get_all_stock(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stock data: {str(e)}")

@router.get("/chemicals-with-stock", response_model=List[ChemicalWithStock])
def read_chemicals_with_stock(
    skip: int = 0,
    limit: int = 100,
    low_stock_only: bool = Query(False),
    location_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all chemicals with their stock information for table display.
    Enhanced with filtering options.
    """
    try:
        chemicals = stock_crud.get_all_chemicals_with_stock(db, skip=skip, limit=limit)
        
        # Apply filters
        if low_stock_only:
            chemicals = [chem for chem in chemicals 
                        if chem.stock and chem.stock.current_quantity <= chem.stock.trigger_level]
        
        if location_id:
            chemicals = [chem for chem in chemicals if chem.location_id == location_id]
            
        return chemicals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chemicals with stock: {str(e)}")

@router.get("/alerts", response_model=List[Alert])
def read_alerts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get active stock alerts.
    Accessible by authenticated users.
    """
    try:
        return stock_crud.get_active_alerts(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving alerts: {str(e)}")

@router.put("/{chemical_id}", response_model=Stock)
def update_stock(
    chemical_id: int,
    stock_update: StockUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update stock information (Admin only) - Enhanced with audit trail and WebSocket
    """
    try:
        # Get current stock for audit
        current_stock = stock_crud.get_stock(db, chemical_id)
        if not current_stock:
            raise HTTPException(status_code=404, detail="Chemical not found")
        
        # Create adjustment record
        change_amount = stock_update.current_quantity - current_stock.current_quantity
        adjustment = StockAdjustment(
            chemical_id=chemical_id,
            admin_id=current_user.id,
            before_quantity=current_stock.current_quantity,
            after_quantity=stock_update.current_quantity,
            change_amount=change_amount,
            reason=AdjustmentReason.CORRECTION,
            note=f"Manual stock adjustment by {current_user.email}"
        )
        db.add(adjustment)
        
        # Update stock
        db_stock = stock_crud.update_stock(db, chemical_id=chemical_id, stock_update=stock_update)
        
        # Broadcast update via WebSocket
        from app.models import Chemical
        chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
        if chemical:
            background_tasks.add_task(
                broadcast_stock_adjustment,
                {
                    "chemical_id": chemical_id,
                    "chemical_name": chemical.name,
                    "before_quantity": current_stock.current_quantity,
                    "after_quantity": stock_update.current_quantity,
                    "change_amount": change_amount,
                    "admin": current_user.email,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        return db_stock
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating stock: {str(e)}")

@router.post("/alerts/{alert_id}/resolve", response_model=Alert)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Resolve a stock alert (Admin only).
    """
    try:
        db_alert = stock_crud.resolve_alert(db, alert_id=alert_id)
        if db_alert is None:
            raise HTTPException(status_code=404, detail="Alert not found")
        return db_alert
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resolving alert: {str(e)}")

# NEW ENDPOINTS FOR COMPREHENSIVE STOCK MANAGEMENT

@router.post("/{chemical_id}/usage", response_model=UsageHistory)
def record_chemical_usage(
    chemical_id: int,
    usage_data: UsageHistoryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record chemical usage and update stock quantity - Enhanced with WebSocket
    """
    try:
        # Ensure the chemical_id in path matches the body
        usage_data.chemical_id = chemical_id
        
        usage_record = stock_crud.record_usage(db, usage_data=usage_data, user_id=current_user.id)
        if usage_record is None:
            raise HTTPException(status_code=404, detail="Chemical not found")
        
        # Broadcast usage via WebSocket
        from app.models import Chemical
        chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
        if chemical:
            background_tasks.add_task(
                broadcast_stock_adjustment,
                {
                    "chemical_id": chemical_id,
                    "chemical_name": chemical.name,
                    "type": "usage",
                    "quantity_used": usage_data.quantity_used,
                    "user": current_user.email,
                    "notes": usage_data.notes,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        return usage_record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recording usage: {str(e)}")

@router.get("/{chemical_id}/usage", response_model=List[UsageHistory])
def get_chemical_usage_history(
    chemical_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get usage history for a specific chemical.
    """
    try:
        usage_history = stock_crud.get_usage_history(db, chemical_id=chemical_id, skip=skip, limit=limit)
        return usage_history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving usage history: {str(e)}")

@router.put("/{chemical_id}/trigger-level", response_model=Stock)
def update_trigger_level(
    chemical_id: int,
    trigger_level: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update low stock trigger level for a chemical (Admin only).
    """
    try:
        db_stock = stock_crud.update_stock_trigger_level(db, chemical_id=chemical_id, trigger_level=trigger_level)
        if db_stock is None:
            raise HTTPException(status_code=404, detail="Chemical not found")
        return db_stock
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating trigger level: {str(e)}")

@router.get("/low-stock", response_model=List[ChemicalWithStock])
def get_low_stock_chemicals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get chemicals with low stock levels.
    """
    try:
        return stock_crud.get_low_stock_chemicals(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving low stock chemicals: {str(e)}")

@router.get("/summary")
def get_stock_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive stock summary statistics.
    """
    try:
        summary = stock_crud.get_stock_summary(db)
        
        # Add low stock count
        low_stock_chemicals = stock_crud.get_low_stock_chemicals(db, limit=1000)
        summary["low_stock_count"] = len(low_stock_chemicals)
        
        # Add total chemicals count
        from app.models import Chemical
        total_chemicals = db.query(Chemical).count()
        summary["total_chemicals"] = total_chemicals
        
        # Calculate percentages
        if total_chemicals > 0:
            summary["low_stock_percentage"] = (summary["low_stock_count"] / total_chemicals) * 100
        else:
            summary["low_stock_percentage"] = 0
            
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stock summary: {str(e)}")