from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

# ✅ Supports both absolute and relative imports
try:
    from ..database import get_db
    from ..models import User
    from ..schemas import Stock, StockUpdate, Alert
    from ..crud import stock_crud
    from ..auth.auth import get_current_user, require_admin
except ImportError:
    from app.database import get_db
    from app.models import User
    from app.schemas import Stock, StockUpdate, Alert
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
