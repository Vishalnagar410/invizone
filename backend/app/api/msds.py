# backend/app/api/msds.py - UPDATED VERSION
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import os
from datetime import datetime

from ..database import get_db
from ..models import User, Chemical, MSDS
from ..schemas import MSDS, HazardSummary
from ..crud import msds_crud
from ..auth.auth import get_current_user, require_admin

logger = logging.getLogger(__name__)

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

@router.get("/{chemical_id}/hazard-summary", response_model=HazardSummary)
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
    
    hazard_summary = HazardSummary(
        risk_level=assess_risk_level(msds.hazard_statements),
        ghs_pictograms=extract_ghs_pictograms(msds.hazard_statements),
        hazard_statements=extract_hazard_statements(msds.hazard_statements),
        precautionary_statements=extract_precautionary_statements(msds.precautionary_statements),
        has_hazards=bool(msds.hazard_statements),
        hazard_count=len(msds.hazard_statements) if msds.hazard_statements else 0,
        precaution_count=len(msds.precautionary_statements) if msds.precautionary_statements else 0
    )
    
    return hazard_summary

@router.post("/{chemical_id}/upload")
async def upload_msds_file(
    chemical_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Upload MSDS file (Admin only)
    """
    try:
        # Check if chemical exists
        chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
        if not chemical:
            raise HTTPException(status_code=404, detail="Chemical not found")
        
        # Validate file type
        allowed_extensions = {'.pdf', '.doc', '.docx', '.txt'}
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads/msds"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"msds_{chemical_id}_{timestamp}{file_extension}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Update or create MSDS record
        existing_msds = msds_crud.get_msds_by_chemical_id(db, chemical_id)
        if existing_msds:
            # Update existing MSDS
            existing_msds.source_url = f"/api/msds/files/{filename}"
            existing_msds.handling_notes = f"Uploaded MSDS file: {file.filename}"
            existing_msds.retrieved_at = datetime.utcnow()
        else:
            # Create new MSDS record
            msds_data = {
                "chemical_id": chemical_id,
                "source_url": f"/api/msds/files/{filename}",
                "handling_notes": f"Uploaded MSDS file: {file.filename}",
                "hazard_statements": {},
                "precautionary_statements": {}
            }
            msds_crud.create_msds(db, msds_data)
        
        db.commit()
        
        return {
            "message": "MSDS file uploaded successfully",
            "filename": filename,
            "file_path": file_path,
            "chemical_id": chemical_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading MSDS file: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/{chemical_id}/files")
def get_msds_files(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of MSDS files for a chemical
    """
    try:
        msds = msds_crud.get_msds_by_chemical_id(db, chemical_id)
        if not msds:
            return []
        
        files = []
        if msds.source_url and msds.source_url.startswith("/api/msds/files/"):
            filename = msds.source_url.split("/")[-1]
            files.append({
                "filename": filename,
                "uploaded_at": msds.retrieved_at.isoformat() if msds.retrieved_at else None,
                "type": "uploaded"
            })
        
        return files
        
    except Exception as e:
        logger.error(f"Error getting MSDS files: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting files: {str(e)}")

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

@router.get("/stats/summary")
def get_msds_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get MSDS statistics
    """
    try:
        total_chemicals = db.query(Chemical).count()
        chemicals_with_msds = msds_crud.get_chemicals_with_msds(db, skip=0, limit=1000)
        chemicals_without_msds = msds_crud.get_chemicals_without_msds(db, skip=0, limit=1000)
        
        # Count by risk level
        risk_counts = {"high": 0, "medium": 0, "low": 0, "unknown": 0}
        for chemical in chemicals_with_msds:
            msds = msds_crud.get_msds_by_chemical_id(db, chemical.id)
            if msds:
                risk_level = assess_risk_level(msds.hazard_statements)
                risk_counts[risk_level] += 1
        
        return {
            "total_chemicals": total_chemicals,
            "chemicals_with_msds": len(chemicals_with_msds),
            "chemicals_without_msds": len(chemicals_without_msds),
            "coverage_percentage": (len(chemicals_with_msds) / total_chemicals * 100) if total_chemicals > 0 else 0,
            "risk_distribution": risk_counts
        }
        
    except Exception as e:
        logger.error(f"Error getting MSDS stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

def extract_ghs_pictograms(hazard_statements: dict) -> List[str]:
    """Extract GHS pictogram codes from hazard statements"""
    if not hazard_statements:
        return []
    
    pictograms = []
    hazard_text = " ".join(str(list(hazard_statements.values())).lower())
    
    # Enhanced GHS pictogram detection
    ghs_mapping = {
        "GHS01": ["explosive", "unstable", "self-reactive"],
        "GHS02": ["flammable", "combustible", "ignit", "pyrophoric", "self-heating"],
        "GHS03": ["oxidizing", "oxidiser", "oxidizer"],
        "GHS04": ["gas under pressure", "compressed gas", "liquefied gas", "refrigerated gas"],
        "GHS05": ["corrosive", "causes burn", "skin corrosion", "eye damage"],
        "GHS06": ["toxic", "fatal", "poison", "lethal", "acute toxicity"],
        "GHS07": ["harmful", "irritant", "hazardous", "skin irritation", "eye irritation"],
        "GHS08": ["health hazard", "carcinogen", "mutagen", "reproductive", "respiratory", "target organ"],
        "GHS09": ["environmental", "aquatic", "ecotoxic", "marine pollutant"]
    }
    
    for pictogram, keywords in ghs_mapping.items():
        if any(keyword in hazard_text for keyword in keywords):
            pictograms.append(pictogram)
    
    return pictograms

def extract_hazard_statements(hazard_statements: dict) -> List[str]:
    """Extract hazard statements as list"""
    if not hazard_statements:
        return []
    return [f"{key}: {value}" for key, value in hazard_statements.items()]

def extract_precautionary_statements(precautionary_statements: dict) -> List[str]:
    """Extract precautionary statements as list"""
    if not precautionary_statements:
        return []
    return [f"{key}: {value}" for key, value in precautionary_statements.items()]

def assess_risk_level(hazard_statements: dict) -> str:
    """Assess overall risk level based on hazard statements"""
    if not hazard_statements:
        return "low"
    
    hazard_text = " ".join(str(list(hazard_statements.values())).lower())
    
    high_risk_keywords = [
        "fatal", "lethal", "carcinogen", "explosive", "extremely flammable", 
        "acute toxicity", "mutagen", "reproductive toxicity", "respiratory sensitizer"
    ]
    medium_risk_keywords = [
        "toxic", "harmful", "flammable", "corrosive", "oxidizing", "skin corrosion",
        "serious eye damage", "target organ toxicity"
    ]
    low_risk_keywords = ["irritant", "hazardous", "warning"]
    
    high_risk_count = sum(1 for keyword in high_risk_keywords if keyword in hazard_text)
    medium_risk_count = sum(1 for keyword in medium_risk_keywords if keyword in hazard_text)
    
    if high_risk_count > 0:
        return "high"
    elif medium_risk_count > 2 or (medium_risk_count > 0 and "toxic" in hazard_text):
        return "medium"
    elif any(keyword in hazard_text for keyword in low_risk_keywords):
        return "low"
    else:
        return "low"