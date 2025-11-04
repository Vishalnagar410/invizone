# backend/app/api/barcodes.py - NEW FILE
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import base64
import json
from datetime import datetime
import zipfile

from app.database import get_db
from app.models import User, Chemical, BarcodeImage, BarcodeType
from app.schemas import BarcodeImage as BarcodeImageSchema, BarcodeImageCreate
from app.auth.auth import get_current_user, require_admin
from app.utils.barcode_utils import generate_barcode_image, generate_qr_code

router = APIRouter()

@router.get("/chemical/{chemical_id}", response_model=List[BarcodeImageSchema])
def get_chemical_barcodes(
    chemical_id: int,
    barcode_type: Optional[BarcodeType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get barcodes for a specific chemical
    """
    chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
    if not chemical:
        raise HTTPException(status_code=404, detail="Chemical not found")
    
    query = db.query(BarcodeImage).filter(BarcodeImage.chemical_id == chemical_id)
    if barcode_type:
        query = query.filter(BarcodeImage.barcode_type == barcode_type)
    
    barcodes = query.all()
    return barcodes

@router.post("/chemical/{chemical_id}/generate")
def generate_chemical_barcodes(
    chemical_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Generate barcodes for a chemical (Admin only)
    """
    chemical = db.query(Chemical).filter(Chemical.id == chemical_id).first()
    if not chemical:
        raise HTTPException(status_code=404, detail="Chemical not found")
    
    # Generate QR Code with full chemical data
    chemical_data = {
        "id": chemical.id,
        "unique_id": chemical.unique_id,
        "name": chemical.name,
        "cas_number": chemical.cas_number,
        "molecular_formula": chemical.molecular_formula,
        "molecular_weight": chemical.molecular_weight,
        "smiles": chemical.smiles,
        "barcode": chemical.barcode,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    qr_data = json.dumps(chemical_data, indent=2)
    
    # Generate barcodes in background
    background_tasks.add_task(
        generate_and_store_barcodes,
        db,
        chemical_id,
        chemical.barcode,
        qr_data
    )
    
    return {"message": "Barcode generation started"}

def generate_and_store_barcodes(db: Session, chemical_id: int, code128_data: str, qr_data: str):
    """Generate and store barcode images"""
    try:
        # Generate Code128 barcode
        code128_image = generate_barcode_image(code128_data, BarcodeType.CODE128)
        
        # Generate QR code
        qr_image = generate_qr_code(qr_data)
        
        # Store Code128
        code128_barcode = BarcodeImage(
            chemical_id=chemical_id,
            barcode_type=BarcodeType.CODE128,
            barcode_data=code128_data,
            image_blob=code128_image.getvalue(),
            image_path=f"barcodes/chemical_{chemical_id}_code128.png"
        )
        db.add(code128_barcode)
        
        # Store QR code
        qr_barcode = BarcodeImage(
            chemical_id=chemical_id,
            barcode_type=BarcodeType.QR,
            barcode_data=qr_data,
            image_blob=qr_image.getvalue(),
            image_path=f"barcodes/chemical_{chemical_id}_qr.png"
        )
        db.add(qr_barcode)
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"Error generating barcodes: {e}")

@router.get("/chemical/{chemical_id}/download/{barcode_type}")
def download_barcode(
    chemical_id: int,
    barcode_type: BarcodeType,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download barcode image for a chemical
    """
    barcode = db.query(BarcodeImage).filter(
        BarcodeImage.chemical_id == chemical_id,
        BarcodeImage.barcode_type == barcode_type
    ).first()
    
    if not barcode or not barcode.image_blob:
        raise HTTPException(status_code=404, detail="Barcode not found")
    
    # Determine content type and filename
    content_type = "image/png"
    filename = f"chemical_{chemical_id}_{barcode_type.value}.png"
    
    return {
        "filename": filename,
        "content": base64.b64encode(barcode.image_blob).decode('utf-8'),
        "content_type": content_type,
        "barcode_type": barcode_type.value
    }

@router.post("/bulk-generate")
def bulk_generate_barcodes(
    chemical_ids: List[int],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Generate barcodes for multiple chemicals (Admin only)
    """
    chemicals = db.query(Chemical).filter(Chemical.id.in_(chemical_ids)).all()
    
    if not chemicals:
        raise HTTPException(status_code=404, detail="No chemicals found")
    
    for chemical in chemicals:
        chemical_data = {
            "id": chemical.id,
            "unique_id": chemical.unique_id,
            "name": chemical.name,
            "cas_number": chemical.cas_number,
            "molecular_formula": chemical.molecular_formula,
            "molecular_weight": chemical.molecular_weight,
            "smiles": chemical.smiles,
            "barcode": chemical.barcode,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        qr_data = json.dumps(chemical_data, indent=2)
        
        background_tasks.add_task(
            generate_and_store_barcodes,
            db,
            chemical.id,
            chemical.barcode,
            qr_data
        )
    
    return {
        "message": f"Barcode generation started for {len(chemicals)} chemicals",
        "chemicals_processed": len(chemicals)
    }

@router.get("/scan/{barcode_data}")
def scan_barcode(
    barcode_data: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scan barcode and return chemical information
    """
    # Try to find by barcode string first
    chemical = db.query(Chemical).filter(Chemical.barcode == barcode_data).first()
    
    if not chemical:
        # Try to parse QR code data
        try:
            qr_data = json.loads(barcode_data)
            if 'id' in qr_data:
                chemical = db.query(Chemical).filter(Chemical.id == qr_data['id']).first()
        except:
            pass
    
    if not chemical:
        raise HTTPException(status_code=404, detail="Chemical not found for this barcode")
    
    from app.schemas import ChemicalWithStock
    return ChemicalWithStock(
        **chemical.__dict__,
        stock=chemical.stock,
        msds=chemical.msds,
        location=chemical.location
    )

@router.delete("/{barcode_id}")
def delete_barcode(
    barcode_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete barcode image (Admin only)
    """
    barcode = db.query(BarcodeImage).filter(BarcodeImage.id == barcode_id).first()
    if not barcode:
        raise HTTPException(status_code=404, detail="Barcode not found")
    
    db.delete(barcode)
    db.commit()
    
    return {"message": "Barcode deleted successfully"}

@router.post("/bulk-download")
def bulk_download_barcodes(
    chemical_ids: List[int],
    barcode_type: BarcodeType = Query(..., description="Type of barcode to download"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download multiple barcodes as a ZIP file
    """
    chemicals = db.query(Chemical).filter(Chemical.id.in_(chemical_ids)).all()
    
    if not chemicals:
        raise HTTPException(status_code=404, detail="No chemicals found")
    
    # Create ZIP file in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
        for chemical in chemicals:
            barcode = db.query(BarcodeImage).filter(
                BarcodeImage.chemical_id == chemical.id,
                BarcodeImage.barcode_type == barcode_type
            ).first()
            
            if barcode and barcode.image_blob:
                filename = f"{chemical.name}_{barcode_type.value}_{chemical.id}.png"
                zip_file.writestr(filename, barcode.image_blob)
    
    zip_buffer.seek(0)
    zip_data = base64.b64encode(zip_buffer.getvalue()).decode('utf-8')
    
    return {
        "filename": f"chemical_barcodes_{barcode_type.value}.zip",
        "content": zip_data,
        "content_type": "application/zip",
        "chemicals_included": len(chemicals)
    }

@router.get("/types")
def get_barcode_types():
    """
    Get available barcode types
    """
    return [btype.value for btype in BarcodeType]