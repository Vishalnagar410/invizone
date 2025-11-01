from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import logging
from datetime import datetime

from app.models import Stock, Chemical, Alert, UsageHistory
from app.schemas import StockUpdate, AlertCreate, UsageHistoryCreate
from app.utils.notifications import check_and_notify_low_stock

logger = logging.getLogger(__name__)

def get_stock(db: Session, chemical_id: int) -> Optional[Stock]:
    return db.query(Stock).filter(Stock.chemical_id == chemical_id).first()

def get_all_stock(db: Session, skip: int = 0, limit: int = 100) -> List[Stock]:
    return db.query(Stock).offset(skip).limit(limit).all()

def update_stock(db: Session, chemical_id: int, stock_update: StockUpdate) -> Optional[Stock]:
    db_stock = get_stock(db, chemical_id)
    if not db_stock:
        return None
    
    for field, value in stock_update.dict(exclude_unset=True).items():
        setattr(db_stock, field, value)
    
    db_stock.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(db_stock)
    
    # Check for low stock alert and send notifications
    check_low_stock_alert(db, db_stock)
    check_and_notify_low_stock(db, chemical_id)
    
    return db_stock

def check_low_stock_alert(db: Session, stock: Stock):
    """
    Check if stock level triggers an alert and create one if needed
    """
    if stock.current_quantity <= stock.trigger_level:
        # Check if there's already an unresolved alert
        existing_alert = db.query(Alert).filter(
            Alert.chemical_id == stock.chemical_id,
            Alert.alert_type == "low_stock",
            Alert.is_resolved == False
        ).first()
        
        if not existing_alert:
            # Create new alert
            chemical = db.query(Chemical).filter(Chemical.id == stock.chemical_id).first()
            alert = Alert(
                chemical_id=stock.chemical_id,
                alert_type="low_stock",
                message=f"Low stock alert for {chemical.name}: {stock.current_quantity} {stock.unit} remaining (trigger: {stock.trigger_level} {stock.unit})",
                is_resolved=False
            )
            db.add(alert)
            db.commit()

def get_active_alerts(db: Session, skip: int = 0, limit: int = 100) -> List[Alert]:
    return db.query(Alert).filter(Alert.is_resolved == False).offset(skip).limit(limit).all()

def resolve_alert(db: Session, alert_id: int) -> Optional[Alert]:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None
    
    alert.is_resolved = True
    db.commit()
    db.refresh(alert)
    return alert

def get_low_stock_chemicals(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """Get chemicals with low stock"""
    return db.query(Chemical).join(Stock).filter(
        Stock.current_quantity <= Stock.trigger_level
    ).offset(skip).limit(limit).all()

def get_stock_summary(db: Session) -> dict:
    """Get stock summary statistics"""
    total_chemicals = db.query(Chemical).count()
    low_stock_count = db.query(Chemical).join(Stock).filter(
        Stock.current_quantity <= Stock.trigger_level
    ).count()
    
    # Calculate total stock value with SQLAlchemy 2.0 compatible func.sum()
    total_quantity_result = db.query(func.sum(Stock.current_quantity)).scalar()
    total_quantity = total_quantity_result or 0
    
    return {
        "total_chemicals": total_chemicals,
        "low_stock_count": low_stock_count,
        "total_quantity": total_quantity,
        "low_stock_percentage": (low_stock_count / total_chemicals * 100) if total_chemicals > 0 else 0
    }

# NEW METHODS FOR COMPREHENSIVE STOCK MANAGEMENT

def get_all_chemicals_with_stock(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """Get all chemicals with their stock and location information"""
    return db.query(Chemical).options(
        db.joinedload(Chemical.stock),
        db.joinedload(Chemical.location),
        db.joinedload(Chemical.usage_history)
    ).offset(skip).limit(limit).all()

def record_usage(db: Session, usage_data: UsageHistoryCreate, user_id: int) -> Optional[UsageHistory]:
    """Record chemical usage and update stock"""
    # Get current stock
    db_stock = get_stock(db, usage_data.chemical_id)
    if not db_stock:
        return None
    
    # Check if enough stock is available
    if db_stock.current_quantity < usage_data.quantity_used:
        raise ValueError(f"Insufficient stock. Available: {db_stock.current_quantity} {db_stock.unit}")
    
    # Create usage record
    usage_record = UsageHistory(
        chemical_id=usage_data.chemical_id,
        quantity_used=usage_data.quantity_used,
        unit=usage_data.unit,
        used_by=user_id,
        notes=usage_data.notes
    )
    db.add(usage_record)
    
    # Update stock
    db_stock.current_quantity -= usage_data.quantity_used
    db_stock.last_updated = datetime.utcnow()
    
    db.commit()
    db.refresh(usage_record)
    
    # Check for low stock alert
    check_low_stock_alert(db, db_stock)
    check_and_notify_low_stock(db, usage_data.chemical_id)
    
    return usage_record

def get_usage_history(db: Session, chemical_id: int, skip: int = 0, limit: int = 100) -> List[UsageHistory]:
    """Get usage history for a chemical"""
    return db.query(UsageHistory).filter(
        UsageHistory.chemical_id == chemical_id
    ).order_by(UsageHistory.used_at.desc()).offset(skip).limit(limit).all()

def update_stock_trigger_level(db: Session, chemical_id: int, trigger_level: float) -> Optional[Stock]:
    """Update the low stock trigger level for a chemical"""
    db_stock = get_stock(db, chemical_id)
    if not db_stock:
        return None
    
    db_stock.trigger_level = trigger_level
    db_stock.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(db_stock)
    
    # Check if current quantity now triggers an alert
    check_low_stock_alert(db, db_stock)
    
    return db_stock