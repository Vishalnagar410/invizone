# Test chemical processing
from app.utils.chemical_utils import process_chemical_data

# Test with aspirin
result = process_chemical_data(
    "CC(=O)Oc1ccccc1C(=O)O", 
    "Aspirin", 
    "50-78-2"
)
print(result)
# Should return canonical SMILES, InChIKey, formula, and molecular weight