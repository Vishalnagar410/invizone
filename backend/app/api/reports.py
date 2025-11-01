from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

# ✅ Flexible imports (works whether run as module or script)
try:
    from ..database import get_db
    from ..models import User
    from ..schemas import Stock, ChemicalWithStock
    from ..crud import stock_crud
    from ..auth.auth import get_current_user, require_admin
    from ..utils.notifications import send_daily_stock_report
except ImportError:
    from app.database import get_db
    from app.models import User
    from app.schemas import Stock, ChemicalWithStock
    from app.crud import stock_crud
    from auth.auth import get_current_user, require_admin
    from app.utils.notifications import send_daily_stock_report

router = APIRouter()

@router.get("/stock/low-stock", response_model=List[ChemicalWithStock])
def get_low_stock_chemicals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chemicals with low stock"""
    return stock_crud.get_low_stock_chemicals(db, skip=skip, limit=limit)


@router.get("/stock/summary")
def get_stock_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get stock summary statistics"""
    return stock_crud.get_stock_summary(db)


@router.post("/notifications/daily-report")
def trigger_daily_report(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Trigger daily stock report (Admin only)"""
    background_tasks.add_task(send_daily_stock_report, db)
    return {"message": "Daily report generation started"}
