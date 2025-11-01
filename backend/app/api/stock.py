from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

# ✅ Supports both absolute and relative imports
try:
    from ..database import get_db
    from ..models import User
    from ..schemas import Stock, StockUpdate, Alert, ChemicalWithStock, UsageHistory, UsageHistoryCreate
    from ..crud import stock_crud
    from ..auth.auth import get_current_user, require_admin
except ImportError:
    from app.database import get_db
    from app.models import User
    from app.schemas import Stock, StockUpdate, Alert, ChemicalWithStock, UsageHistory, UsageHistoryCreate
    from app.crud import stock_crud
    from auth.auth import get_current_user, require_admin

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all chemicals with their stock information for table display.
    """
    try:
        chemicals = stock_crud.get_all_chemicals_with_stock(db, skip=skip, limit=limit)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update stock information (Admin only).
    """
    try:
        db_stock = stock_crud.update_stock(db, chemical_id=chemical_id, stock_update=stock_update)
        if db_stock is None:
            raise HTTPException(status_code=404, detail="Chemical not found")
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record chemical usage and update stock quantity.
    """
    try:
        # Ensure the chemical_id in path matches the body
        usage_data.chemical_id = chemical_id
        
        usage_record = stock_crud.record_usage(db, usage_data=usage_data, user_id=current_user.id)
        if usage_record is None:
            raise HTTPException(status_code=404, detail="Chemical not found")
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