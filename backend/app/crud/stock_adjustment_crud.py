from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.models import StockAdjustment, Stock, Chemical
from app.schemas import StockAdjustmentCreate, StockAdjustmentType

logger = logging.getLogger(__name__)

def create_stock_adjustment(
    db: Session, 
    adjustment_data: StockAdjustmentCreate, 
    user_id: int
) -> StockAdjustment:
    """
    Create a stock adjustment and update the stock quantity
    """
    try:
        # Get current stock
        stock = db.query(Stock).filter(Stock.chemical_id == adjustment_data.chemical_id).first()
        if not stock:
            raise ValueError("Stock not found for chemical")
        
        previous_quantity = stock.current_quantity
        new_quantity = previous_quantity + adjustment_data.quantity_change
        
        if new_quantity < 0:
            raise ValueError("Stock quantity cannot be negative")
        
        # Update stock
        stock.current_quantity = new_quantity
        stock.last_updated = datetime.utcnow()
        
        # Create adjustment record
        adjustment = StockAdjustment(
            chemical_id=adjustment_data.chemical_id,
            adjustment_type=adjustment_data.adjustment_type,
            quantity_change=adjustment_data.quantity_change,
            previous_quantity=previous_quantity,
            new_quantity=new_quantity,
            unit=stock.unit,
            adjusted_by=user_id,
            reason=adjustment_data.reason,
            notes=adjustment_data.notes
        )
        
        db.add(adjustment)
        db.commit()
        db.refresh(adjustment)
        
        return adjustment
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating stock adjustment: {e}")
        raise

def get_stock_adjustments(
    db: Session, 
    chemical_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100
) -> List[StockAdjustment]:
    """
    Get stock adjustments, optionally filtered by chemical
    """
    query = db.query(StockAdjustment)
    
    if chemical_id:
        query = query.filter(StockAdjustment.chemical_id == chemical_id)
    
    return query.order_by(StockAdjustment.adjusted_at.desc()).offset(skip).limit(limit).all()

def get_stock_adjustment_by_id(db: Session, adjustment_id: int) -> Optional[StockAdjustment]:
    """
    Get a specific stock adjustment by ID
    """
    return db.query(StockAdjustment).filter(StockAdjustment.id == adjustment_id).first()

def get_recent_adjustments(db: Session, days: int = 7, limit: int = 50) -> List[StockAdjustment]:
    """
    Get recent stock adjustments within the specified days
    """
    from datetime import timedelta
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    return db.query(StockAdjustment).filter(
        StockAdjustment.adjusted_at >= cutoff_date
    ).order_by(StockAdjustment.adjusted_at.desc()).limit(limit).all()