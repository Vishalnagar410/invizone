from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import MSDS
from auth.auth import get_current_user

router = APIRouter()

@router.get("/{chemical_id}", response_model=MSDS)
def get_msds(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get MSDS data for chemical (placeholder - will be implemented in Phase 4)
    """
    # TODO: Implement MSDS fetching from PubChem/ChemSpider
    raise HTTPException(status_code=501, detail="MSDS functionality coming soon")