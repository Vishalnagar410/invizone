# backend/app/api/chemicals.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
import logging

# ✅ Use absolute imports for reliability with uvicorn/app.main
from app.database import get_db
from app.models import User, Chemical, Stock
from app.schemas import Chemical as ChemicalSchema, ChemicalCreate, ChemicalUpdate, ChemicalWithStock
from app.crud import chemical_crud, stock_crud, msds_crud
from app.auth.auth import get_current_user, require_admin
from app.utils.chemical_utils import process_chemical_data, generate_barcode
from app.services.pubchem_service import pubchem_service
from app.schemas import PubChemCompound

logger = logging.getLogger(__name__)

router = APIRouter()

# --------------------------------------------------------------------
# Get all chemicals with stock information
# --------------------------------------------------------------------
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

# --------------------------------------------------------------------
# Search chemicals by text query
# --------------------------------------------------------------------
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

# --------------------------------------------------------------------
# Get single chemical by ID
# --------------------------------------------------------------------
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

# --------------------------------------------------------------------
# Create new chemical (Admin only)
# --------------------------------------------------------------------
@router.post("/", response_model=ChemicalWithStock)
def create_chemical(
    chemical: ChemicalCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create new chemical (Admin only)
    """
    try:
        # Process chemical data
        processed_data = process_chemical_data(
            chemical.smiles, 
            chemical.name, 
            chemical.cas_number,
            chemical.initial_quantity or 0.0,
            chemical.initial_unit or "g"
        )
        
        # Create chemical in database
        db_chemical = chemical_crud.create_chemical_with_data(
            db=db, 
            chemical_data=processed_data, 
            user_id=current_user.id
        )
        
        # Generate barcode
        barcode_data, barcode_image = generate_barcode(db_chemical.id, db_chemical.unique_id)
        db_chemical.barcode = barcode_data
        db.commit()
        db.refresh(db_chemical)
        
        # Create stock entry with initial quantity
        db_stock = Stock(
            chemical_id=db_chemical.id,
            current_quantity=chemical.initial_quantity or 0.0,
            unit=chemical.initial_unit or "g",
            trigger_level=10.0
        )
        db.add(db_stock)
        db.commit()
        db.refresh(db_stock)
        
        # Fetch MSDS data in background
        background_tasks.add_task(
            msds_crud.get_or_fetch_msds, 
            db, 
            db_chemical.id
        )
        
        # Return chemical with stock
        return ChemicalWithStock(
            **db_chemical.__dict__,
            stock=db_stock,
            msds=None
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating chemical: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# --------------------------------------------------------------------
# Bulk upload chemicals from CSV
# --------------------------------------------------------------------
@router.post("/bulk-upload")
async def bulk_upload_chemicals(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Bulk upload chemicals from CSV file
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported"
        )
    
    try:
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        required_columns = ['name', 'cas_number', 'smiles']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        created_chemicals = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Check if chemical already exists
                existing = db.query(Chemical).filter(
                    (Chemical.cas_number == row['cas_number']) | 
                    (Chemical.name == row['name'])
                ).first()
                
                if existing:
                    errors.append(f"Row {index + 1}: Chemical already exists - {row['name']}")
                    continue
                
                # Process chemical data
                initial_quantity = float(row.get('initial_quantity', 0))
                initial_unit = row.get('initial_unit', 'g')
                
                processed_data = process_chemical_data(
                    row['smiles'],
                    row['name'],
                    row['cas_number'],
                    initial_quantity,
                    initial_unit
                )
                
                # Create chemical
                db_chemical = chemical_crud.create_chemical_with_data(
                    db=db,
                    chemical_data=processed_data,
                    user_id=current_user.id
                )
                
                # Generate barcode
                barcode_data, barcode_image = generate_barcode(db_chemical.id, db_chemical.unique_id)
                db_chemical.barcode = barcode_data
                db.commit()
                
                # Create stock entry
                db_stock = Stock(
                    chemical_id=db_chemical.id,
                    current_quantity=initial_quantity,
                    unit=initial_unit,
                    trigger_level=10.0
                )
                db.add(db_stock)
                db.commit()
                
                # Schedule MSDS fetch
                if background_tasks:
                    background_tasks.add_task(
                        msds_crud.get_or_fetch_msds,
                        db,
                        db_chemical.id
                    )
                
                created_chemicals.append({
                    "id": db_chemical.id,
                    "name": db_chemical.name,
                    "cas_number": db_chemical.cas_number,
                    "unique_id": db_chemical.unique_id,
                    "barcode": db_chemical.barcode
                })
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                continue
        
        return {
            "message": f"Successfully created {len(created_chemicals)} chemicals",
            "created_chemicals": created_chemicals,
            "errors": errors,
            "total_processed": len(df)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

# --------------------------------------------------------------------
# Update chemical (Admin only)
# --------------------------------------------------------------------
@router.put("/{chemical_id}", response_model=ChemicalSchema)
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

# --------------------------------------------------------------------
# Delete chemical (Admin only)
# --------------------------------------------------------------------
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

# --------------------------------------------------------------------
# Validate SMILES string without creating a chemical
# --------------------------------------------------------------------
@router.post("/validate-smiles")
def validate_smiles(
    smiles: str = Query(..., description="SMILES string to validate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Validate SMILES string without creating chemical
    """
    from app.utils.chemical_utils import validate_chemical_structure, process_chemical_data

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

# --------------------------------------------------------------------
# Get barcode for chemical
# --------------------------------------------------------------------
@router.get("/{chemical_id}/barcode")
def get_chemical_barcode(
    chemical_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get barcode data for chemical
    """
    chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
    if not chemical:
        raise HTTPException(status_code=404, detail="Chemical not found")
    
    return {
        "chemical_id": chemical.id,
        "unique_id": chemical.unique_id,
        "barcode": chemical.barcode,
        "name": chemical.name,
        "cas_number": chemical.cas_number
    }


# --------------------------------------------------------------------
# Search PubChem by name, SMILES, or CAS
# --------------------------------------------------------------------
@router.get("/pubchem/search", response_model=PubChemCompound)
def search_pubchem(
    query: str = Query(..., description="Chemical name, SMILES, or CAS number to search"),
    search_type: str = Query("name", description="Search type: name, smiles, or cas"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search PubChem for chemical information
    """
    try:
        compound_data = None
        
        if search_type == "name":
            compound_data = pubchem_service.get_compound_by_name(query)
        elif search_type == "smiles":
            compound_data = pubchem_service.get_compound_by_smiles(query)
        elif search_type == "cas":
            compound_data = pubchem_service.get_compound_by_cas(query)
        else:
            raise HTTPException(status_code=400, detail="Invalid search type")
        
        if not compound_data:
            raise HTTPException(status_code=404, detail="Chemical not found in PubChem")
        
        # Extract relevant data from PubChem response
        compound = compound_data.get('PC_Compounds', [{}])[0]
        props = compound.get('props', [])
        
        # Extract basic information
        cid = compound.get('id', {}).get('id', {}).get('cid')
        
        # Extract name, SMILES, formula, etc.
        name = query if search_type == "name" else None
        smiles = query if search_type == "smiles" else None
        cas_number = query if search_type == "cas" else None
        molecular_formula = None
        molecular_weight = None
        
        for prop in props:
            urn = prop.get('urn', {})
            label = urn.get('label', '').lower()
            value = prop.get('value', {})
            
            if 'molecular formula' in label and value.get('sval'):
                molecular_formula = value['sval']
            elif 'molecular weight' in label and value.get('fval'):
                molecular_weight = value['fval']
            elif 'iupac name' in label and value.get('sval') and not name:
                name = value['sval']
            elif 'canonical smiles' in label and value.get('sval') and not smiles:
                smiles = value['sval']
            elif 'cas' in label and value.get('sval') and not cas_number:
                cas_number = value['sval']
        
        return PubChemCompound(
            cid=cid,
            name=name,
            smiles=smiles,
            canonical_smiles=smiles,  # Use the same for simplicity
            molecular_formula=molecular_formula,
            molecular_weight=molecular_weight,
            cas_number=cas_number
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PubChem search error: {e}")
        raise HTTPException(status_code=500, detail="Error searching PubChem")


# --------------------------------------------------------------------
# Get safety data from PubChem
# --------------------------------------------------------------------
@router.get("/pubchem/safety/{identifier}")
def get_pubchem_safety_data(
    identifier: str,
    identifier_type: str = Query("name", description="Identifier type: name, smiles, or cas"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get safety data from PubChem
    """
    try:
        safety_data = pubchem_service.get_compound_safety_data(identifier, identifier_type)
        
        if not safety_data:
            raise HTTPException(status_code=404, detail="Safety data not found in PubChem")
        
        return safety_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PubChem safety data error: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving safety data")