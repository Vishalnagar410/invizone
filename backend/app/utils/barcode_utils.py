# backend/app/utils/barcode_utils.py
import io
import segno
from barcode import Code128
from barcode.writer import ImageWriter
from app.schemas import BarcodeType

def generate_barcode_image(data: str, barcode_type: BarcodeType) -> io.BytesIO:
    """Generate barcode image"""
    if barcode_type == BarcodeType.CODE128:
        return generate_code128_barcode(data)
    else:
        raise ValueError(f"Unsupported barcode type: {barcode_type}")

def generate_code128_barcode(data: str) -> io.BytesIO:
    """Generate Code128 barcode"""
    buffer = io.BytesIO()
    
    # Generate barcode
    code128 = Code128(data, writer=ImageWriter())
    code128.write(buffer)
    
    buffer.seek(0)
    return buffer

def generate_qr_code(data: str) -> io.BytesIO:
    """Generate QR code"""
    buffer = io.BytesIO()
    
    # Generate QR code
    qr = segno.make(data)
    qr.save(buffer, kind='png', scale=5)
    
    buffer.seek(0)
    return buffer

def generate_barcode_data(chemical_id: int, unique_id: str) -> str:
    """Generate barcode data string"""
    return f"CHEM{chemical_id:06d}_{unique_id[:8]}"