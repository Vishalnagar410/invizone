from sqlalchemy.orm import Session
from typing import Optional, List
import logging
from datetime import datetime

from ..models import MSDS, Chemical
from ..schemas import MSDSCreate, MSDSUpdate
from ..services.pubchem_service import pubchem_service

logger = logging.getLogger(__name__)

def get_msds_by_chemical_id(db: Session, chemical_id: int) -> Optional[MSDS]:
    """
    Get MSDS data by chemical ID
    """
    return db.query(MSDS).filter(MSDS.chemical_id == chemical_id).first()

def get_all_msds(db: Session, skip: int = 0, limit: int = 100) -> List[MSDS]:
    """
    Get all MSDS records
    """
    return db.query(MSDS).offset(skip).limit(limit).all()

def create_msds(db: Session, msds: MSDSCreate) -> MSDS:
    """
    Create a new MSDS record
    """
    db_msds = MSDS(**msds.dict())
    db.add(db_msds)
    db.commit()
    db.refresh(db_msds)
    return db_msds

def update_msds(db: Session, chemical_id: int, msds_update: MSDSUpdate) -> Optional[MSDS]:
    """
    Update MSDS data for a chemical
    """
    db_msds = get_msds_by_chemical_id(db, chemical_id)
    if not db_msds:
        return None
    
    update_data = msds_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_msds, field, value)
    
    db_msds.retrieved_at = datetime.utcnow()
    db.commit()
    db.refresh(db_msds)
    return db_msds

def delete_msds(db: Session, chemical_id: int) -> bool:
    """
    Delete MSDS data for a chemical
    """
    db_msds = get_msds_by_chemical_id(db, chemical_id)
    if not db_msds:
        return False
    
    db.delete(db_msds)
    db.commit()
    return True

def fetch_msds_from_pubchem(db: Session, chemical_id: int) -> Optional[MSDS]:
    """
    Fetch MSDS data from PubChem for a chemical
    """
    chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
    if not chemical:
        logger.error(f"Chemical with ID {chemical_id} not found")
        return None
    
    logger.info(f"Fetching MSDS data for chemical: {chemical.name} (ID: {chemical_id})")
    
    # Try different identifiers in order of preference
    safety_data = None
    identifiers = [
        (chemical.name, 'name'),
        (chemical.cas_number, 'cas'),
        (chemical.canonical_smiles, 'smiles')
    ]
    
    for identifier, id_type in identifiers:
        if identifier and identifier != "N/A":
            logger.info(f"Trying to fetch data using {id_type}: {identifier}")
            safety_data = pubchem_service.get_compound_safety_data(identifier, id_type)
            if safety_data:
                logger.info(f"Successfully fetched data using {id_type}")
                break
            else:
                logger.warning(f"No data found using {id_type}: {identifier}")
    
    if not safety_data:
        logger.warning(f"No MSDS data found for chemical ID {chemical_id}")
        return None
    
    # Create MSDS record
    msds_data = MSDSCreate(
        chemical_id=chemical_id,
        source_url=f"https://pubchem.ncbi.nlm.nih.gov/compound/{safety_data.get('pubchem_cid', '')}",
        hazard_statements=safety_data.get('hazard_statements', {}),
        precautionary_statements=safety_data.get('precautionary_statements', {}),
        handling_notes=safety_data.get('safety_notes', 'No specific safety notes available.')
    )
    
    logger.info(f"Creating MSDS record for chemical ID {chemical_id}")
    return create_msds(db, msds_data)

def get_or_fetch_msds(db: Session, chemical_id: int) -> Optional[MSDS]:
    """
    Get existing MSDS or fetch from PubChem if not exists
    """
    # Check if MSDS already exists
    msds = get_msds_by_chemical_id(db, chemical_id)
    if msds:
        logger.info(f"MSDS found in database for chemical ID {chemical_id}")
        return msds
    
    logger.info(f"No MSDS found in database for chemical ID {chemical_id}, fetching from PubChem")
    # Fetch from PubChem
    return fetch_msds_from_pubchem(db, chemical_id)

def get_chemicals_without_msds(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Get chemicals that don't have MSDS data
    """
    return db.query(Chemical).outerjoin(MSDS).filter(MSDS.id.is_(None)).offset(skip).limit(limit).all()

def get_chemicals_with_msds(db: Session, skip: int = 0, limit: int = 100) -> List[Chemical]:
    """
    Get chemicals that have MSDS data
    """
    return db.query(Chemical).join(MSDS).offset(skip).limit(limit).all()

def refresh_msds_data(db: Session, chemical_id: int) -> Optional[MSDS]:
    """
    Force refresh MSDS data from PubChem (delete existing and fetch new)
    """
    # Delete existing MSDS
    delete_msds(db, chemical_id)
    
    # Fetch new data
    return fetch_msds_from_pubchem(db, chemical_id)