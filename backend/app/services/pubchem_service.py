import requests
import logging
from typing import Optional, Dict, Any
import time
from urllib.parse import quote, unquote
import re

logger = logging.getLogger(__name__)

class PubChemService:
    def __init__(self):
        self.base_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
        self.timeout = 15
        self.retry_delay = 1
        
        # Additional data sources for fallback
        self.cir_endpoint = "https://cactus.nci.nih.gov/chemical/structure"
        self.chemspider_key = None  # You can add ChemSpider API key if available
    
    def get_compound_by_smiles(self, smiles: str) -> Optional[Dict[str, Any]]:
        """Get compound data by SMILES from PubChem with multiple fallbacks"""
        try:
            # Clean SMILES first
            clean_smiles = self._clean_smiles(smiles)
            if not clean_smiles:
                logger.warning("Empty or invalid SMILES provided")
                return None
            
            # Try PubChem first
            compound_data = self._get_compound_by_smiles_pubchem(clean_smiles)
            if compound_data:
                return compound_data
            
            # If PubChem fails, try CIR (Cactus) service
            logger.info(f"PubChem failed, trying CIR for SMILES: {clean_smiles}")
            compound_data = self._get_compound_by_smiles_cir(clean_smiles)
            if compound_data:
                return compound_data
                
            # Final fallback: generate basic data from SMILES
            logger.info(f"All services failed, generating basic data for SMILES: {clean_smiles}")
            return self._generate_basic_compound_data(clean_smiles)
                
        except requests.exceptions.RequestException as e:
            logger.error(f"All SMILES lookup methods failed: {e}")
            return self._generate_basic_compound_data(self._clean_smiles(smiles))

    def get_chemical_properties_with_fallback(self, smiles: str) -> Dict[str, any]:
        """
        Enhanced chemical properties lookup with CAS fallback
        """
        base_properties = self.get_chemical_properties(smiles)
        
        # If CAS is missing, try enhanced CAS lookup
        if not base_properties.get('cas_number'):
            cas_result = cas_service.get_cas_from_smiles(smiles)
            if cas_result.get('cas_number'):
                base_properties['cas_number'] = cas_result['cas_number']
                base_properties['cas_source'] = cas_result['source']
                base_properties['cas_confidence'] = cas_result.get('confidence', 'medium')
        
        return base_properties

    def _get_compound_by_smiles_pubchem(self, smiles: str) -> Optional[Dict[str, Any]]:
        """Try PubChem SMILES lookup"""
        try:
            # Use the compound/fastidentity/smiles endpoint
            url = f"{self.base_url}/compound/fastidentity/smiles/{quote(smiles)}/JSON"
            
            logger.info(f"PubChem SMILES API call: {smiles}")
            response = requests.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('IdentifierList', {}).get('CID'):
                    cid = data['IdentifierList']['CID'][0]
                    return self.get_compound_by_cid(cid)
            
            # Fallback to direct compound/smiles endpoint
            url = f"{self.base_url}/compound/smiles/{quote(smiles)}/JSON"
            response = requests.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                return response.json()
                
        except Exception as e:
            logger.warning(f"PubChem SMILES lookup failed: {e}")
            
        return None
    
    def _get_compound_by_smiles_cir(self, smiles: str) -> Optional[Dict[str, Any]]:
        """Try CIR (Cactus) service for compound data"""
        try:
            # Get IUPAC name from CIR
            name_url = f"{self.cir_endpoint}/{quote(smiles)}/iupac_name"
            response = requests.get(name_url, timeout=self.timeout)
            
            name = None
            if response.status_code == 200:
                name = response.text.strip()
                if name and "NotFound" not in name:
                    logger.info(f"CIR returned name: {name}")
                else:
                    name = None
            
            # Get CAS from CIR
            cas_url = f"{self.cir_endpoint}/{quote(smiles)}/cas"
            response = requests.get(cas_url, timeout=self.timeout)
            
            cas_number = None
            if response.status_code == 200:
                cas_text = response.text.strip()
                if cas_text and "NotFound" not in cas_text:
                    # CIR might return multiple CAS numbers, take the first one
                    cas_numbers = cas_text.split('\n')
                    cas_number = cas_numbers[0] if cas_numbers else None
                    logger.info(f"CIR returned CAS: {cas_number}")
            
            # Get formula from CIR
            formula_url = f"{self.cir_endpoint}/{quote(smiles)}/formula"
            response = requests.get(formula_url, timeout=self.timeout)
            
            formula = None
            if response.status_code == 200:
                formula = response.text.strip()
                if formula and "NotFound" not in formula:
                    logger.info(f"CIR returned formula: {formula}")
                else:
                    formula = None
            
            # Get molecular weight from CIR
            weight_url = f"{self.cir_endpoint}/{quote(smiles)}/mw"
            response = requests.get(weight_url, timeout=self.timeout)
            
            molecular_weight = None
            if response.status_code == 200:
                try:
                    weight_text = response.text.strip()
                    if weight_text and "NotFound" not in weight_text:
                        molecular_weight = float(weight_text)
                        logger.info(f"CIR returned molecular weight: {molecular_weight}")
                except ValueError:
                    molecular_weight = None
            
            # Create compound data structure similar to PubChem
            if name or cas_number or formula:
                compound_data = {
                    'PC_Compounds': [{
                        'id': {'id': {'cid': 0}},  # Placeholder CID
                        'props': []
                    }]
                }
                
                # Add properties
                props = []
                if name:
                    props.append({
                        'urn': {'label': 'IUPAC Name'},
                        'value': {'sval': name}
                    })
                if cas_number:
                    props.append({
                        'urn': {'label': 'CAS Registry Number'},
                        'value': {'sval': cas_number}
                    })
                if formula:
                    props.append({
                        'urn': {'label': 'Molecular Formula'},
                        'value': {'sval': formula}
                    })
                if molecular_weight:
                    props.append({
                        'urn': {'label': 'Molecular Weight'},
                        'value': {'fval': molecular_weight}
                    })
                
                compound_data['PC_Compounds'][0]['props'] = props
                return compound_data
                
        except Exception as e:
            logger.warning(f"CIR service failed: {e}")
            
        return None
    
    def _generate_basic_compound_data(self, smiles: str) -> Dict[str, Any]:
        """Generate basic compound data when all external services fail"""
        # Try to extract a name from common patterns
        name = self._guess_compound_name(smiles)
        
        # Try to generate a systematic name from SMILES pattern
        systematic_name = self._generate_systematic_name(smiles)
        
        compound_data = {
            'PC_Compounds': [{
                'id': {'id': {'cid': 0}},  # Placeholder
                'props': [
                    {
                        'urn': {'label': 'IUPAC Name'},
                        'value': {'sval': name or systematic_name or 'Unknown Compound'}
                    },
                    {
                        'urn': {'label': 'Molecular Formula'},
                        'value': {'sval': 'To be calculated'}
                    },
                    {
                        'urn': {'label': 'CAS Registry Number'}, 
                        'value': {'sval': 'Not found - enter manually'}
                    }
                ]
            }]
        }
        
        logger.info(f"Generated basic compound data for SMILES: {smiles}")
        return compound_data
    
    def _guess_compound_name(self, smiles: str) -> Optional[str]:
        """Guess compound name based on SMILES patterns"""
        patterns = {
            r'CCO$': 'Ethanol',
            r'CC(=O)O$': 'Acetic Acid',
            r'CC(=O)Oc1ccccc1C(=O)O$': 'Aspirin',
            r'CN1C=NC2=C1C(=O)N(C(=O)N2C)C$': 'Caffeine',
            r'c1ccccc1$': 'Benzene',
            r'C1CCCCC1$': 'Cyclohexane',
            r'O=C=O$': 'Carbon Dioxide',
            r'C#N$': 'Hydrogen Cyanide',
            r'CCCCCC$': 'Hexane',
            r'CCOC(=O)C$': 'Ethyl Acetate',
            r'CC(N)C$': 'Isopropylamine',
        }
        
        for pattern, name in patterns.items():
            if re.search(pattern, smiles):
                return name
        
        # Check for common functional groups
        if 'C(=O)O' in smiles and 'c1ccccc1' in smiles:
            return 'Benzoic Acid Derivative'
        elif 'C(=O)O' in smiles:
            return 'Carboxylic Acid'
        elif 'C(=O)N' in smiles:
            return 'Amide'
        elif 'N' in smiles and 'C=O' in smiles:
            return 'Amide Compound'
        elif 'Oc1ccccc1' in smiles:
            return 'Phenol Derivative'
        elif 'c1ccccc1' in smiles:
            return 'Aromatic Compound'
        elif 'C#C' in smiles:
            return 'Alkyne'
        elif 'C=C' in smiles:
            return 'Alkene'
        
        return None
    
    def _generate_systematic_name(self, smiles: str) -> str:
        """Generate a systematic name based on SMILES analysis"""
        # Count carbon atoms for alkane naming
        carbon_count = smiles.count('C') - smiles.count('Cl') - smiles.count('Cc')
        
        if carbon_count <= 8 and 'c' not in smiles and '=' not in smiles and '#' not in smiles:
            # Simple alkane naming
            alkane_names = {
                1: 'Methane', 2: 'Ethane', 3: 'Propane', 4: 'Butane',
                5: 'Pentane', 6: 'Hexane', 7: 'Heptane', 8: 'Octane'
            }
            if carbon_count in alkane_names:
                return alkane_names[carbon_count]
        
        # Functional group detection
        if 'C(=O)O' in smiles:
            return 'Carboxylic Acid'
        elif 'C(=O)N' in smiles:
            return 'Amide'
        elif 'Oc1ccccc1' in smiles and smiles.count('C(=O)') == 1:
            return 'Ester'
        elif 'N' in smiles and smiles.count('C') > 2:
            return 'Amine Compound'
        elif 'O' in smiles and 'C' in smiles:
            return 'Oxygen-containing Compound'
        
        return 'Organic Compound'
    
    def extract_compound_info(self, compound_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract standardized compound information from PubChem data - ENHANCED"""
        if not compound_data or 'PC_Compounds' not in compound_data:
            return {}
        
        try:
            compound = compound_data['PC_Compounds'][0]
            info = {
                'cid': compound.get('id', {}).get('id', {}).get('cid'),
                'name': None,
                'smiles': None,
                'canonical_smiles': None,
                'molecular_formula': None,
                'molecular_weight': None,
                'cas_number': None,
                'source': 'pubchem'  # Track data source
            }
            
            props = compound.get('props', [])
            
            for prop in props:
                urn = prop.get('urn', {})
                label = urn.get('label', '').lower()
                value = prop.get('value', {})
                
                if any(name_keyword in label for name_keyword in ['iupac name', 'preferred name', 'chemical name']):
                    if value.get('sval'):
                        info['name'] = value['sval']
                elif 'canonical smiles' in label and value.get('sval'):
                    info['canonical_smiles'] = value['sval']
                    info['smiles'] = value['sval']
                elif 'molecular formula' in label and value.get('sval'):
                    info['molecular_formula'] = value['sval']
                elif 'molecular weight' in label and value.get('fval'):
                    info['molecular_weight'] = value['fval']
                elif any(cas_keyword in label for cas_keyword in ['cas', 'registry number']):
                    if value.get('sval'):
                        info['cas_number'] = value['sval']
            
            # If we got data from CIR or generated data, update source
            if info['cid'] == 0:
                if info['name'] and 'Unknown' not in info['name']:
                    info['source'] = 'cir'
                else:
                    info['source'] = 'generated'
            
            return {k: v for k, v in info.items() if v is not None}
            
        except Exception as e:
            logger.error(f"Error extracting compound info: {e}")
            return {}
    
    def get_compound_safety_data(self, identifier: str, identifier_type: str = 'name') -> Optional[Dict[str, Any]]:
        """Get comprehensive safety data for a compound with enhanced fallbacks"""
        compound_data = None
        
        if identifier_type == 'name':
            compound_data = self.get_compound_by_name(identifier)
        elif identifier_type == 'smiles':
            compound_data = self.get_compound_by_smiles(identifier)
        elif identifier_type == 'cas':
            compound_data = self.get_compound_by_cas(identifier)
        
        if compound_data:
            safety_data = self.extract_safety_data(compound_data)
            compound_info = self.extract_compound_info(compound_data)
            return {**compound_info, **safety_data}
        
        return None

    # Keep all your existing methods below (unchanged)
    def get_compound_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        # ... (existing implementation)
        pass
    
    def get_compound_by_cas(self, cas_number: str) -> Optional[Dict[str, Any]]:
        # ... (existing implementation) 
        pass
    
    def get_compound_by_cid(self, cid: int) -> Optional[Dict[str, Any]]:
        # ... (existing implementation)
        pass
    
    def _clean_smiles(self, smiles: str) -> str:
        # ... (existing implementation)
        pass
    
    def extract_safety_data(self, compound_data: Dict[str, Any]) -> Dict[str, Any]:
        # ... (existing implementation)
        pass
    
    def _extract_hazard_statements(self, compound: Dict[str, Any]) -> Dict[str, Any]:
        # ... (existing implementation)
        pass
    
    def _extract_precautionary_statements(self, compound: Dict[str, Any]) -> Dict[str, Any]:
        # ... (existing implementation)
        pass
    
    def _extract_safety_notes(self, compound: Dict[str, Any]) -> str:
        # ... (existing implementation)
        pass
    
    def _extract_physical_properties(self, compound: Dict[str, Any]) -> Dict[str, Any]:
        # ... (existing implementation)
        pass
    
    def _extract_ghs_classification(self, compound: Dict[str, Any]) -> Dict[str, Any]:
        # ... (existing implementation)
        pass

# Global service instance
pubchem_service = PubChemService()