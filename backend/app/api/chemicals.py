from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User
from schemas import Chemical, ChemicalCreate, ChemicalUpdate, ChemicalWithStock
from crud import chemical_crud, stock_crud
from auth.auth import get_current_user, require_admin

router = APIRouter()

@router.get("/", response_model=List[ChemicalWithStock])
def read_chemicals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all chemicals with stock information
    """
    chemicals = chemical_crud.get_chemicals_with_stock(db, skip=skip, limit=limit)
    return chemicals

@router.get("/search", response_model=List[ChemicalWithStock])
def search_chemicals(
    query: str = Query(..., description="Search by name, CAS, SMILES, or formula"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search chemicals by text query
    """
    chemicals = chemical_crud.search_chemicals_text(db, query=query)
    return chemicals

@router.get("/{chemical_id}", response_model=ChemicalWithStock)
def read_chemical(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get chemical by ID
    """
    db_chemical = chemical_crud.get_chemical(db, chemical_id=chemical_id)
    if db_chemical is None:
        raise HTTPException(status_code=404, detail="Chemical not found")
    return db_chemical

@router.post("/", response_model=Chemical)
def create_chemical(
    chemical: ChemicalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create new chemical (Admin only)
    """
    try:
        return chemical_crud.create_chemical(db=db, chemical=chemical, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{chemical_id}", response_model=Chemical)
def update_chemical(
    chemical_id: int,
    chemical_update: ChemicalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update chemical (Admin only)
    """
    db_chemical = chemical_crud.update_chemical(db, chemical_id=chemical_id, chemical_update=chemical_update)
    if db_chemical is None:
        raise HTTPException(status_code=404, detail="Chemical not found")
    return db_chemical

@router.delete("/{chemical_id}")
def delete_chemical(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete chemical (Admin only)
    """
    success = chemical_crud.delete_chemical(db, chemical_id=chemical_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chemical not found")
    return {"message": "Chemical deleted successfully"}

@router.post("/validate-smiles")
def validate_smiles(
    smiles: str = Query(..., description="SMILES string to validate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Validate SMILES string without creating chemical
    """
    from utils.chemical_utils import validate_chemical_structure, process_chemical_data
    
    try:
        if not validate_chemical_structure(smiles):
            return {"valid": False, "message": "Invalid chemical structure"}
        
        processed_data = process_chemical_data(smiles, "Validation", "N/A")
        return {
            "valid": True,
            "canonical_smiles": processed_data["canonical_smiles"],
            "inchikey": processed_data["inchikey"],
            "molecular_formula": processed_data["molecular_formula"],
            "molecular_weight": processed_data["molecular_weight"]
        }
    except Exception as e:
        return {"valid": False, "message": str(e)}