# backend/reset_database.py
import os
import sys

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import User, Chemical, Stock, MSDS, Alert
from app.auth.auth import get_password_hash

def reset_database():
    """Completely reset the database and create initial data"""
    
    # Drop all tables
    print("🗑️  Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    # Create all tables
    print("🔄 Creating new tables...")
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = SessionLocal()
    
    try:
        # Create admin user
        print("👤 Creating admin user...")
        admin_user = User(
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Administrator",
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Create some sample chemicals
        print("🧪 Creating sample chemicals...")
        sample_chemicals = [
            {
                "name": "Acetone",
                "cas_number": "67-64-1", 
                "smiles": "CC(=O)C",
                "molecular_formula": "C3H6O",
                "initial_quantity": 500.0,
                "initial_unit": "mL"
            },
            {
                "name": "Ethanol",
                "cas_number": "64-17-5",
                "smiles": "CCO", 
                "molecular_formula": "C2H6O",
                "initial_quantity": 1000.0,
                "initial_unit": "mL"
            },
            {
                "name": "Sodium Chloride",
                "cas_number": "7647-14-5",
                "smiles": "[Na+].[Cl-]",
                "molecular_formula": "NaCl",
                "initial_quantity": 250.0,
                "initial_unit": "g"
            }
        ]
        
        for chem_data in sample_chemicals:
            from app.utils.chemical_utils import process_chemical_data
            
            try:
                # Process chemical data
                processed_data = process_chemical_data(
                    chem_data["smiles"],
                    chem_data["name"],
                    chem_data["cas_number"],
                    chem_data["initial_quantity"],
                    chem_data["initial_unit"]
                )
                
                # Create chemical
                chemical = Chemical(
                    unique_id=processed_data["unique_id"],
                    name=processed_data["name"],
                    cas_number=processed_data["cas_number"],
                    smiles=processed_data["smiles"],
                    canonical_smiles=processed_data["canonical_smiles"],
                    inchikey=processed_data["inchikey"],
                    molecular_formula=processed_data["molecular_formula"],
                    molecular_weight=processed_data["molecular_weight"],
                    initial_quantity=chem_data["initial_quantity"],
                    initial_unit=chem_data["initial_unit"],
                    created_by=admin_user.id
                )
                
                db.add(chemical)
                db.commit()
                db.refresh(chemical)
                
                # Generate barcode
                from app.utils.chemical_utils import generate_barcode
                barcode_data, barcode_image = generate_barcode(chemical.id, chemical.unique_id)
                chemical.barcode = barcode_data
                db.commit()
                
                # Create stock entry
                stock = Stock(
                    chemical_id=chemical.id,
                    current_quantity=chem_data["initial_quantity"],
                    unit=chem_data["initial_unit"],
                    trigger_level=50.0
                )
                db.add(stock)
                db.commit()
                
                print(f"  ✅ Created {chemical.name}")
                
            except Exception as e:
                print(f"  ❌ Failed to create {chem_data['name']}: {e}")
                continue
        
        print("🎉 Database reset completed successfully!")
        print("📧 Admin login: admin@example.com")
        print("🔑 Admin password: admin123")
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()