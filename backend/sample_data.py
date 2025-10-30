import asyncio
import random
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Chemical, Stock, User
from app.utils.chemical_utils import process_chemical_data
from app.auth.auth import get_password_hash

def create_sample_users(db: Session):
    """Create sample users"""
    users = [
        {
            "email": "admin@lab.com",
            "password": "admin123",
            "full_name": "Lab Administrator",
            "role": "admin"
        },
        {
            "email": "viewer@lab.com", 
            "password": "viewer123",
            "full_name": "Lab Technician",
            "role": "viewer"
        }
    ]
    
    for user_data in users:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing_user:
            user = User(
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"]
            )
            db.add(user)
    
    db.commit()
    print("✅ Sample users created")

def create_sample_chemicals(db: Session):
    """Create 50 sample chemicals"""
    sample_chemicals = [
        # Common solvents
        {"name": "Ethanol", "cas_number": "64-17-5", "smiles": "CCO"},
        {"name": "Methanol", "cas_number": "67-56-1", "smiles": "CO"},
        {"name": "Acetone", "cas_number": "67-64-1", "smiles": "CC(=O)C"},
        {"name": "Diethyl Ether", "cas_number": "60-29-7", "smiles": "CCOCC"},
        {"name": "Chloroform", "cas_number": "67-66-3", "smiles": "ClC(Cl)Cl"},
        {"name": "Dichloromethane", "cas_number": "75-09-2", "smiles": "ClCCl"},
        {"name": "Acetonitrile", "cas_number": "75-05-8", "smiles": "CC#N"},
        {"name": "Tetrahydrofuran", "cas_number": "109-99-9", "smiles": "C1CCOC1"},
        {"name": "Dimethyl Sulfoxide", "cas_number": "67-68-5", "smiles": "CS(=O)C"},
        {"name": "N,N-Dimethylformamide", "cas_number": "68-12-2", "smiles": "CN(C)C=O"},
        
        # Acids and bases
        {"name": "Acetic Acid", "cas_number": "64-19-7", "smiles": "CC(=O)O"},
        {"name": "Hydrochloric Acid", "cas_number": "7647-01-0", "smiles": "Cl"},
        {"name": "Sulfuric Acid", "cas_number": "7664-93-9", "smiles": "OS(=O)(=O)O"},
        {"name": "Nitric Acid", "cas_number": "7697-37-2", "smiles": "O[N+](=O)[O-]"},
        {"name": "Sodium Hydroxide", "cas_number": "1310-73-2", "smiles": "[Na+].[OH-]"},
        {"name": "Ammonia", "cas_number": "7664-41-7", "smiles": "N"},
        {"name": "Triethylamine", "cas_number": "121-44-8", "smiles": "CCN(CC)CC"},
        {"name": "Pyridine", "cas_number": "110-86-1", "smiles": "c1ccncc1"},
        
        # Common reagents
        {"name": "Hydrogen Peroxide", "cas_number": "7722-84-1", "smiles": "OO"},
        {"name": "Sodium Borohydride", "cas_number": "16940-66-2", "smiles": "[Na+].[BH4-]"},
        {"name": "Lithium Aluminum Hydride", "cas_number": "16853-85-3", "smiles": "[Li+].[AlH4-]"},
        {"name": "Potassium Permanganate", "cas_number": "7722-64-7", "smiles": "[K+].[O-][Mn](=O)(=O)=O"},
        {"name": "Sodium Chloride", "cas_number": "7647-14-5", "smiles": "[Na+].[Cl-]"},
        {"name": "Potassium Carbonate", "cas_number": "584-08-7", "smiles": "C(=O)([O-])[O-].[K+].[K+]"},
        {"name": "Calcium Chloride", "cas_number": "10043-52-4", "smiles": "[Cl-].[Cl-].[Ca+2]"},
        {"name": "Magnesium Sulfate", "cas_number": "7487-88-9", "smiles": "[Mg+2].[O-]S([O-])(=O)=O"},
        
        # Aromatics
        {"name": "Benzene", "cas_number": "71-43-2", "smiles": "c1ccccc1"},
        {"name": "Toluene", "cas_number": "108-88-3", "smiles": "Cc1ccccc1"},
        {"name": "Xylene", "cas_number": "1330-20-7", "smiles": "Cc1ccc(C)cc1"},
        {"name": "Aniline", "cas_number": "62-53-3", "smiles": "Nc1ccccc1"},
        {"name": "Phenol", "cas_number": "108-95-2", "smiles": "Oc1ccccc1"},
        {"name": "Nitrobenzene", "cas_number": "98-95-3", "smiles": "O=[N+]([O-])c1ccccc1"},
        {"name": "Benzaldehyde", "cas_number": "100-52-7", "smiles": "O=Cc1ccccc1"},
        {"name": "Benzoic Acid", "cas_number": "65-85-0", "smiles": "O=C(O)c1ccccc1"},
        
        # Alkanes and alkenes
        {"name": "Hexane", "cas_number": "110-54-3", "smiles": "CCCCCC"},
        {"name": "Heptane", "cas_number": "142-82-5", "smiles": "CCCCCCC"},
        {"name": "Cyclohexane", "cas_number": "110-82-7", "smiles": "C1CCCCC1"},
        {"name": "Ethylene", "cas_number": "74-85-1", "smiles": "C=C"},
        {"name": "Propylene", "cas_number": "115-07-1", "smiles": "CC=C"},
        {"name": "Acetylene", "cas_number": "74-86-2", "smiles": "C#C"},
        
        # Biochemicals
        {"name": "Glucose", "cas_number": "50-99-7", "smiles": "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O"},
        {"name": "Sucrose", "cas_number": "57-50-1", "smiles": "OC[C@H]1O[C@@](CO)(O[C@H]2O[C@H](CO)[C@@H](O)[C@H](O)[C@H]2O)[C@@H](O)[C@@H]1O"},
        {"name": "Ascorbic Acid", "cas_number": "50-81-7", "smiles": "OC1C(O)C(O)C(=O)C1O"},
        {"name": "Caffeine", "cas_number": "58-08-2", "smiles": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C"},
        {"name": "Nicotine", "cas_number": "54-11-5", "smiles": "CN1CCC[C@H]1c2cccnc2"},
        
        # Additional common chemicals
        {"name": "Urea", "cas_number": "57-13-6", "smiles": "C(=O)(N)N"},
        {"name": "Formaldehyde", "cas_number": "50-00-0", "smiles": "C=O"},
        {"name": "Glycerol", "cas_number": "56-81-5", "smiles": "OCC(O)CO"},
        {"name": "Ethylene Glycol", "cas_number": "107-21-1", "smiles": "OCCO"},
        {"name": "Isopropanol", "cas_number": "67-63-0", "smiles": "CC(O)C"},
    ]
    
    admin_user = db.query(User).filter(User.role == "admin").first()
    
    for chem_data in sample_chemicals:
        # Check if chemical already exists
        existing_chem = db.query(Chemical).filter(
            (Chemical.cas_number == chem_data["cas_number"]) | 
            (Chemical.name == chem_data["name"])
        ).first()
        
        if not existing_chem:
            try:
                # Process with RDKit
                processed_data = process_chemical_data(
                    chem_data["smiles"],
                    chem_data["name"],
                    chem_data["cas_number"]
                )
                
                chemical = Chemical(
                    **processed_data,
                    created_by=admin_user.id
                )
                db.add(chemical)
                db.flush()  # Get the ID
                
                # Create stock entry with random quantities
                stock = Stock(
                    chemical_id=chemical.id,
                    current_quantity=round(random.uniform(5, 500), 2),
                    unit="g",
                    trigger_level=round(random.uniform(10, 100), 2)
                )
                db.add(stock)
                
            except Exception as e:
                print(f"❌ Failed to create {chem_data['name']}: {e}")
                continue
    
    db.commit()
    print(f"✅ Created {len(sample_chemicals)} sample chemicals")

def main():
    """Main function to create sample data"""
    db = SessionLocal()
    try:
        create_sample_users(db)
        create_sample_chemicals(db)
        print("🎉 Sample data generation completed!")
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()