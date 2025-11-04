# backend/app/crud/chemical_crud.py - ENHANCED VERSION
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
import logging

from app.models import Chemical, Stock, User, Location, BarcodeImage, StockAdjustment, UsageHistory
from app.schemas import ChemicalCreate, ChemicalUpdate
from app.utils.chemical_utils import process_chemical_data, validate_chemical_structure

logger = logging.getLogger(__name__)

def get_chemical(db: Session, chemical_id: int) -> Optional[Chemical]:
    return db.query(Chemical).filter(Chemical.id == chemical_id).first()

def get_chemical_with_relationships(db: Session, chemical_id: int) -> Optional[Chemical]:
    """Get chemical with all relationships loaded"""
    return db.query(Chemical).options(
        db.joinedload(Chemical.stock),
        db.joinedload(Chemical.location),
        db.joinedload(Chemical.msds),
        db.joinedload(Chemical.barcode_images),
        db.joinedload(Chemical.stock_adjustments),
        db.joinedload(Chemical.usage_history)
    ).filter(Chemical.id == chemical_id).first()

def get_chemical_by_inchikey(db: Session, inchikey: str) -> Optional[Chemical]:
    return db.query(Chemical).filter(Chemical.inchikey == inchikey).first()

def get_chemical_by_cas(db: Session, cas_number: str) -> Optional[Chemical]:
    return db.query(Chemical).filter(Chemical.cas_number == cas_number).first()

def get_chemical_by_unique_id(db: Session, unique_id: str) -> Optional[Chemical]:
    return db.query(Chemical).filter(Chemical.unique_id == unique_id).first()

def get_chemical_by_barcode(db: Session, barcode: str) -> Optional[Chemical]:
    return db.query(Chemical).filter(Chemical.barcode == barcode).first()

def get_chemicals(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    return db.query(Chemical).offset(skip).limit(limit).all()

def search_chemicals_text(db: Session, query: str, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Search chemicals by name, CAS number, SMILES, or location
    Enhanced with location search
    """
    return db.query(Chemical).outerjoin(Location).filter(
        or_(
            Chemical.name.ilike(f"%{query}%"),
            Chemical.cas_number.ilike(f"%{query}%"),
            Chemical.smiles.ilike(f"%{query}%"),
            Chemical.canonical_smiles.ilike(f"%{query}%"),
            Chemical.molecular_formula.ilike(f"%{query}%"),
            Location.name.ilike(f"%{query}%"),
            Location.department.ilike(f"%{query}%"),
            Location.lab_name.ilike(f"%{query}%"),
            Location.room.ilike(f"%{query}%")
        )
    ).offset(skip).limit(limit).all()

def create_chemical(db: Session, chemical: ChemicalCreate, user_id: int, location_id: Optional[int] = None) -> Chemical:
    """
    Create a new chemical with RDKit processing and new fields
    Enhanced with location support
    """
    try:
        # Process chemical data with RDKit including new fields
        processed_data = process_chemical_data(
            smiles=chemical.smiles,
            name=chemical.name,
            cas_number=chemical.cas_number,
            initial_quantity=chemical.initial_quantity or 0.0,
            initial_unit=chemical.initial_unit or "g"
        )
        
        # Check if chemical already exists (by InChIKey)
        existing_chemical = get_chemical_by_inchikey(db, processed_data["inchikey"])
        if existing_chemical:
            raise ValueError(f"Chemical already exists with InChIKey: {processed_data['inchikey']}")
        
        # Check if CAS number already exists
        existing_cas = get_chemical_by_cas(db, chemical.cas_number)
        if existing_cas:
            raise ValueError(f"Chemical already exists with CAS number: {chemical.cas_number}")
        
        # Check if unique_id already exists (should be unique but just in case)
        existing_unique = get_chemical_by_unique_id(db, processed_data["unique_id"])
        if existing_unique:
            # Regenerate unique_id if collision occurs
            from app.utils.chemical_utils import generate_unique_id
            processed_data["unique_id"] = generate_unique_id()
        
        # Create new chemical with all fields including location
        db_chemical = Chemical(
            unique_id=processed_data["unique_id"],
            barcode=processed_data["barcode"],
            name=processed_data["name"],
            cas_number=processed_data["cas_number"],
            smiles=processed_data["smiles"],
            canonical_smiles=processed_data["canonical_smiles"],
            inchikey=processed_data["inchikey"],
            molecular_formula=processed_data["molecular_formula"],
            molecular_weight=processed_data["molecular_weight"],
            location_id=location_id,  # NEW: Include location
            initial_quantity=processed_data["initial_quantity"],
            initial_unit=processed_data["initial_unit"],
            created_by=user_id
        )
        
        db.add(db_chemical)
        db.commit()
        db.refresh(db_chemical)
        
        # Create initial stock entry with the initial quantity
        db_stock = Stock(
            chemical_id=db_chemical.id,
            current_quantity=processed_data["initial_quantity"],
            unit=processed_data["initial_unit"],
            trigger_level=10.0
        )
        db.add(db_stock)
        db.commit()
        
        return db_chemical
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating chemical: {e}")
        if isinstance(e, ValueError):
            raise e
        else:
            raise ValueError(f"Failed to create chemical: {str(e)}")

def update_chemical(db: Session, chemical_id: int, chemical_update: ChemicalUpdate) -> Optional[Chemical]:
    """
    Update chemical information with support for new fields
    Enhanced with location support
    """
    db_chemical = get_chemical(db, chemical_id)
    if not db_chemical:
        return None
    
    update_data = chemical_update.dict(exclude_unset=True)
    
    # If SMILES is being updated, reprocess with RDKit
    if "smiles" in update_data:
        processed_data = process_chemical_data(
            smiles=update_data["smiles"],
            name=update_data.get("name", db_chemical.name),
            cas_number=update_data.get("cas_number", db_chemical.cas_number),
            initial_quantity=update_data.get("initial_quantity", db_chemical.initial_quantity),
            initial_unit=update_data.get("initial_unit", db_chemical.initial_unit)
        )
        update_data.update(processed_data)
    
    # Update fields
    for field, value in update_data.items():
        if hasattr(db_chemical, field):
            setattr(db_chemical, field, value)
    
    db.commit()
    db.refresh(db_chemical)
    
    # If quantity or unit changed, update stock as well
    if "initial_quantity" in update_data or "initial_unit" in update_data:
        stock = db.query(Stock).filter(Stock.chemical_id == chemical_id).first()
        if stock:
            if "initial_quantity" in update_data:
                stock.current_quantity = update_data["initial_quantity"]
            if "initial_unit" in update_data:
                stock.unit = update_data["initial_unit"]
            db.commit()
    
    return db_chemical

def delete_chemical(db: Session, chemical_id: int) -> bool:
    """
    Delete a chemical and its associated data
    Enhanced to delete related records
    """
    db_chemical = get_chemical(db, chemical_id)
    if not db_chemical:
        return False
    
    # Delete associated records first (due to foreign key constraints)
    # Stock adjustments
    db.query(StockAdjustment).filter(StockAdjustment.chemical_id == chemical_id).delete()
    # Barcode images
    db.query(BarcodeImage).filter(BarcodeImage.chemical_id == chemical_id).delete()
    # Usage history
    db.query(UsageHistory).filter(UsageHistory.chemical_id == chemical_id).delete()
    # Stock
    db.query(Stock).filter(Stock.chemical_id == chemical_id).delete()
    # MSDS
    from app.models import MSDS
    db.query(MSDS).filter(MSDS.chemical_id == chemical_id).delete()
    # Alerts
    from app.models import Alert
    db.query(Alert).filter(Alert.chemical_id == chemical_id).delete()
    
    # Delete chemical
    db.delete(db_chemical)
    db.commit()
    return True

def get_chemicals_with_stock(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Get chemicals with their stock information
    Enhanced with location and relationships
    """
    chemicals = db.query(Chemical).options(
        db.joinedload(Chemical.stock),
        db.joinedload(Chemical.location),
        db.joinedload(Chemical.msds)
    ).join(Stock).offset(skip).limit(limit).all()
    
    return chemicals

def get_chemicals_by_creator(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Get chemicals created by a specific user
    """
    return db.query(Chemical).filter(Chemical.created_by == user_id).offset(skip).limit(limit).all()

def get_chemicals_with_low_stock(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Get chemicals with low stock levels
    """
    return db.query(Chemical).join(Stock).filter(
        Stock.current_quantity <= Stock.trigger_level
    ).offset(skip).limit(limit).all()

def get_chemicals_without_stock(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Get chemicals that don't have stock entries
    """
    return db.query(Chemical).outerjoin(Stock).filter(
        Stock.chemical_id == None
    ).offset(skip).limit(limit).all()

def get_chemicals_by_location(db: Session, location_id: int, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Get chemicals at a specific location
    """
    return db.query(Chemical).filter(Chemical.location_id == location_id).offset(skip).limit(limit).all()

def bulk_create_chemicals(db: Session, chemicals: List[ChemicalCreate], user_id: int) -> List[Chemical]:
    """
    Bulk create multiple chemicals
    """
    created_chemicals = []
    errors = []
    
    for chemical_data in chemicals:
        try:
            chemical = create_chemical(db, chemical_data, user_id)
            created_chemicals.append(chemical)
        except Exception as e:
            errors.append(f"Failed to create {chemical_data.name}: {str(e)}")
            continue
    
    return {
        "created_chemicals": created_chemicals,
        "errors": errors,
        "total_processed": len(chemicals),
        "successful": len(created_chemicals),
        "failed": len(errors)
    }