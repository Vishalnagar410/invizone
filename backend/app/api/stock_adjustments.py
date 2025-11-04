# backend/app/api/stock_adjustments.py - NEW FILE
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, Chemical, StockAdjustment, AdjustmentReason
from app.schemas import StockAdjustment as StockAdjustmentSchema, StockAdjustmentCreate
from app.auth.auth import get_current_user, require_admin
from app.crud import stock_crud
from app.websocket import broadcast_stock_adjustment  # WebSocket integration

router = APIRouter()

@router.post("/", response_model=StockAdjustmentSchema)
def create_stock_adjustment(
    adjustment: StockAdjustmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create stock adjustment (Admin only) - Enhanced with WebSocket
    """
    # Get current stock
    current_stock = stock_crud.get_stock(db, adjustment.chemical_id)
    if not current_stock:
        raise HTTPException(status_code=404, detail="Chemical stock not found")
    
    # Calculate new quantity
    new_quantity = adjustment.after_quantity
    
    # Validate the adjustment
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    
    # Create adjustment record
    db_adjustment = StockAdjustment(
        chemical_id=adjustment.chemical_id,
        admin_id=current_user.id,
        before_quantity=current_stock.current_quantity,
        after_quantity=new_quantity,
        change_amount=adjustment.change_amount,
        reason=adjustment.reason,
        note=adjustment.note
    )
    
    # Update stock
    current_stock.current_quantity = new_quantity
    current_stock.last_updated = datetime.utcnow()
    
    db.add(db_adjustment)
    db.commit()
    db.refresh(db_adjustment)
    
    # Check for low stock alerts
    stock_crud.check_low_stock_alert(db, current_stock)
    
    # Broadcast adjustment via WebSocket
    chemical = db.query(Chemical).filter(Chemical.id == adjustment.chemical_id).first()
    if chemical:
        background_tasks.add_task(
            broadcast_stock_adjustment,
            {
                "chemical_id": adjustment.chemical_id,
                "chemical_name": chemical.name,
                "before_quantity": current_stock.current_quantity,
                "after_quantity": new_quantity,
                "change_amount": adjustment.change_amount,
                "reason": adjustment.reason.value,
                "admin": current_user.email,
                "note": adjustment.note,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    return db_adjustment

@router.get("/chemical/{chemical_id}", response_model=List[StockAdjustmentSchema])
def get_chemical_adjustments(
    chemical_id: int,
    skip: int = 0,
    limit: int = 100,
    reason: Optional[AdjustmentReason] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get adjustment history for a chemical
    """
    query = db.query(StockAdjustment).filter(StockAdjustment.chemical_id == chemical_id)
    
    if reason:
        query = query.filter(StockAdjustment.reason == reason)
    
    if start_date:
        query = query.filter(StockAdjustment.timestamp >= start_date)
    
    if end_date:
        query = query.filter(StockAdjustment.timestamp <= end_date)
    
    adjustments = query.order_by(StockAdjustment.timestamp.desc()).offset(skip).limit(limit).all()
    return adjustments

@router.get("/", response_model=List[StockAdjustmentSchema])
def get_all_adjustments(
    skip: int = 0,
    limit: int = 100,
    chemical_id: Optional[int] = Query(None),
    admin_id: Optional[int] = Query(None),
    reason: Optional[AdjustmentReason] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # Only admins can see all adjustments
):
    """
    Get all stock adjustments (Admin only)
    """
    query = db.query(StockAdjustment)
    
    if chemical_id:
        query = query.filter(StockAdjustment.chemical_id == chemical_id)
    
    if admin_id:
        query = query.filter(StockAdjustment.admin_id == admin_id)
    
    if reason:
        query = query.filter(StockAdjustment.reason == reason)
    
    adjustments = query.order_by(StockAdjustment.timestamp.desc()).offset(skip).limit(limit).all()
    return adjustments

@router.get("/recent", response_model=List[StockAdjustmentSchema])
def get_recent_adjustments(
    hours: int = Query(24, description="Hours to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent stock adjustments
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    adjustments = db.query(StockAdjustment).filter(
        StockAdjustment.timestamp >= since
    ).order_by(StockAdjustment.timestamp.desc()).limit(50).all()
    
    return adjustments

@router.get("/summary")
def get_adjustment_summary(
    days: int = Query(30, description="Days to summarize"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get adjustment summary statistics (Admin only)
    """
    since = datetime.utcnow() - timedelta(days=days)
    
    # Total adjustments
    total_adjustments = db.query(StockAdjustment).filter(
        StockAdjustment.timestamp >= since
    ).count()
    
    # Adjustments by reason
    by_reason = db.query(
        StockAdjustment.reason,
        db.func.count(StockAdjustment.id),
        db.func.sum(db.func.abs(StockAdjustment.change_amount))
    ).filter(
        StockAdjustment.timestamp >= since
    ).group_by(StockAdjustment.reason).all()
    
    # Top adjusted chemicals
    top_chemicals = db.query(
        StockAdjustment.chemical_id,
        Chemical.name,
        db.func.count(StockAdjustment.id),
        db.func.sum(db.func.abs(StockAdjustment.change_amount))
    ).join(Chemical).filter(
        StockAdjustment.timestamp >= since
    ).group_by(
        StockAdjustment.chemical_id, Chemical.name
    ).order_by(
        db.func.count(StockAdjustment.id).desc()
    ).limit(10).all()
    
    # Most active admins
    active_admins = db.query(
        StockAdjustment.admin_id,
        User.email,
        db.func.count(StockAdjustment.id)
    ).join(User).filter(
        StockAdjustment.timestamp >= since
    ).group_by(
        StockAdjustment.admin_id, User.email
    ).order_by(
        db.func.count(StockAdjustment.id).desc()
    ).limit(5).all()
    
    return {
        "period_days": days,
        "total_adjustments": total_adjustments,
        "adjustments_by_reason": [
            {
                "reason": reason.value,
                "count": count,
                "total_change": total_change
            }
            for reason, count, total_change in by_reason
        ],
        "top_adjusted_chemicals": [
            {
                "chemical_id": chem_id,
                "chemical_name": name,
                "adjustment_count": count,
                "total_change": total_change
            }
            for chem_id, name, count, total_change in top_chemicals
        ],
        "active_admins": [
            {
                "admin_id": admin_id,
                "admin_email": email,
                "adjustment_count": count
            }
            for admin_id, email, count in active_admins
        ]
    }

@router.get("/reasons")
def get_adjustment_reasons():
    """
    Get available adjustment reasons
    """
    return [reason.value for reason in AdjustmentReason]