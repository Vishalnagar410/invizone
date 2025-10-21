from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from models import Stock, Chemical, Alert
from schemas import StockUpdate, AlertCreate

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
    
    db.commit()
    db.refresh(db_stock)
    
    # Check for low stock alert
    check_low_stock_alert(db, db_stock)
    
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