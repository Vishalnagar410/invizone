from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from datetime import datetime

from models import Stock, Chemical, Alert
from schemas import StockUpdate, AlertCreate
from utils.notifications import check_and_notify_low_stock

logger = logging.getLogger(__name__)

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
    
    # Calculate total stock value (placeholder - could be enhanced with pricing data)
    total_quantity = db.query(db.func.sum(Stock.current_quantity)).scalar() or 0
    
    return {
        "total_chemicals": total_chemicals,
        "low_stock_count": low_stock_count,
        "total_quantity": total_quantity,
        "low_stock_percentage": (low_stock_count / total_chemicals * 100) if total_chemicals > 0 else 0
    }