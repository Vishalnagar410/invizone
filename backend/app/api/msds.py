from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, Chemical
from ..schemas import MSDS
from ..crud import msds_crud
from ..auth.auth import get_current_user, require_admin

router = APIRouter()

@router.get("/{chemical_id}", response_model=MSDS)
def get_msds(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get MSDS data for chemical. Fetches from PubChem if not exists.
    """
    msds = msds_crud.get_or_fetch_msds(db, chemical_id=chemical_id)
    if not msds:
        raise HTTPException(status_code=404, detail="MSDS data not found for this chemical")
    return msds

@router.post("/{chemical_id}/fetch")
def fetch_msds(
    chemical_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Force fetch MSDS data from PubChem
    """
    # In background to avoid long request times
    background_tasks.add_task(msds_crud.fetch_msds_from_pubchem, db, chemical_id)
    
    return {"message": "MSDS fetch initiated in background"}

@router.post("/{chemical_id}/refresh")
def refresh_msds(
    chemical_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Force refresh MSDS data from PubChem (Admin only)
    """
    background_tasks.add_task(msds_crud.refresh_msds_data, db, chemical_id)
    
    return {"message": "MSDS refresh initiated in background"}

@router.get("/{chemical_id}/hazard-summary")
def get_hazard_summary(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get simplified hazard summary for quick overview
    """
    msds = msds_crud.get_or_fetch_msds(db, chemical_id=chemical_id)
    if not msds:
        raise HTTPException(status_code=404, detail="MSDS data not found")
    
    hazard_summary = {
        "has_hazards": bool(msds.hazard_statements),
        "hazard_count": len(msds.hazard_statements) if msds.hazard_statements else 0,
        "precaution_count": len(msds.precautionary_statements) if msds.precautionary_statements else 0,
        "ghs_pictograms": extract_ghs_pictograms(msds.hazard_statements),
        "risk_level": assess_risk_level(msds.hazard_statements)
    }
    
    return hazard_summary

@router.get("/chemicals/without-msds")
def get_chemicals_without_msds(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get chemicals that don't have MSDS data
    """
    chemicals = msds_crud.get_chemicals_without_msds(db, skip=skip, limit=limit)
    return chemicals

@router.get("/chemicals/with-msds")
def get_chemicals_with_msds(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get chemicals that have MSDS data
    """
    chemicals = msds_crud.get_chemicals_with_msds(db, skip=skip, limit=limit)
    return chemicals

def extract_ghs_pictograms(hazard_statements: dict) -> List[str]:
    """Extract GHS pictogram codes from hazard statements"""
    if not hazard_statements:
        return []
    
    pictograms = []
    hazard_text = " ".join(str(hazard_statements.values()).lower())
    
    # Simple keyword-based pictogram detection
    ghs_mapping = {
        "GHS01": ["explosive", "unstable"],
        "GHS02": ["flammable", "combustible", "ignit"],
        "GHS03": ["oxidizing", "oxidiser", "oxidizer"],
        "GHS04": ["gas under pressure", "compressed gas"],
        "GHS05": ["corrosive", "causes burn", "skin corrosion"],
        "GHS06": ["toxic", "fatal", "poison", "lethal"],
        "GHS07": ["harmful", "irritant", "hazardous"],
        "GHS08": ["health hazard", "carcinogen", "mutagen", "reproductive"],
        "GHS09": ["environmental", "aquatic", "ecotoxic"]
    }
    
    for pictogram, keywords in ghs_mapping.items():
        if any(keyword in hazard_text for keyword in keywords):
            pictograms.append(pictogram)
    
    return pictograms

def assess_risk_level(hazard_statements: dict) -> str:
    """Assess overall risk level based on hazard statements"""
    if not hazard_statements:
        return "low"
    
    hazard_text = " ".join(str(hazard_statements.values()).lower())
    
    high_risk_keywords = ["fatal", "lethal", "carcinogen", "explosive", "extremely flammable"]
    medium_risk_keywords = ["toxic", "harmful", "flammable", "corrosive", "oxidizing"]
    
    if any(keyword in hazard_text for keyword in high_risk_keywords):
        return "high"
    elif any(keyword in hazard_text for keyword in medium_risk_keywords):
        return "medium"
    else:
        return "low"