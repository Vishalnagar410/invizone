from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
import logging

from models import Chemical, Stock, User
from schemas import ChemicalCreate, ChemicalUpdate
from utils.chemical_utils import process_chemical_data, validate_chemical_structure

logger = logging.getLogger(__name__)

def get_chemical(db: Session, chemical_id: int) -> Optional[Chemical]:
    return db.query(Chemical).filter(Chemical.id == chemical_id).first()

def get_chemical_by_inchikey(db: Session, inchikey: str) -> Optional[Chemical]:
    return db.query(Chemical).filter(Chemical.inchikey == inchikey).first()

def get_chemical_by_cas(db: Session, cas_number: str) -> Optional[Chemical]:
    return db.query(Chemical).filter(Chemical.cas_number == cas_number).first()

def get_chemicals(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    return db.query(Chemical).offset(skip).limit(limit).all()

def search_chemicals_text(db: Session, query: str) -> List[Chemical]:
    """
    Search chemicals by name, CAS number, or SMILES
    """
    return db.query(Chemical).filter(
        or_(
            Chemical.name.ilike(f"%{query}%"),
            Chemical.cas_number.ilike(f"%{query}%"),
            Chemical.smiles.ilike(f"%{query}%"),
            Chemical.canonical_smiles.ilike(f"%{query}%"),
            Chemical.molecular_formula.ilike(f"%{query}%")
        )
    ).all()

def create_chemical(db: Session, chemical: ChemicalCreate, user_id: int) -> Chemical:
    """
    Create a new chemical with RDKit processing
    """
    # Process chemical data with RDKit
    processed_data = process_chemical_data(
        smiles=chemical.smiles,
        name=chemical.name,
        cas_number=chemical.cas_number
    )
    
    # Check if chemical already exists (by InChIKey)
    existing_chemical = get_chemical_by_inchikey(db, processed_data["inchikey"])
    if existing_chemical:
        raise ValueError(f"Chemical already exists with InChIKey: {processed_data['inchikey']}")
    
    # Check if CAS number already exists
    existing_cas = get_chemical_by_cas(db, chemical.cas_number)
    if existing_cas:
        raise ValueError(f"Chemical already exists with CAS number: {chemical.cas_number}")
    
    # Create new chemical
    db_chemical = Chemical(
        **processed_data,
        created_by=user_id
    )
    
    db.add(db_chemical)
    db.commit()
    db.refresh(db_chemical)
    
    # Create initial stock entry
    db_stock = Stock(
        chemical_id=db_chemical.id,
        current_quantity=0.0,
        unit="g",
        trigger_level=10.0
    )
    db.add(db_stock)
    db.commit()
    
    return db_chemical

def update_chemical(db: Session, chemical_id: int, chemical_update: ChemicalUpdate) -> Optional[Chemical]:
    db_chemical = get_chemical(db, chemical_id)
    if not db_chemical:
        return None
    
    update_data = chemical_update.dict(exclude_unset=True)
    
    # If SMILES is being updated, reprocess with RDKit
    if "smiles" in update_data:
        processed_data = process_chemical_data(
            smiles=update_data["smiles"],
            name=update_data.get("name", db_chemical.name),
            cas_number=update_data.get("cas_number", db_chemical.cas_number)
        )
        update_data.update(processed_data)
    
    for field, value in update_data.items():
        setattr(db_chemical, field, value)
    
    db.commit()
    db.refresh(db_chemical)
    return db_chemical

def delete_chemical(db: Session, chemical_id: int) -> bool:
    db_chemical = get_chemical(db, chemical_id)
    if not db_chemical:
        return False
    
    db.delete(db_chemical)
    db.commit()
    return True

def get_chemicals_with_stock(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Get chemicals with their stock information
    """
    return db.query(Chemical).join(Stock).offset(skip).limit(limit).all()