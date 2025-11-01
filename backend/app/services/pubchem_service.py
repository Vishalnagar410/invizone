import requests
import logging
from typing import Optional, Dict, Any
import time
from urllib.parse import quote

logger = logging.getLogger(__name__)

class PubChemService:
    def __init__(self):
        self.base_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
        self.timeout = 10
        self.retry_delay = 1
    
    def get_compound_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get compound data by name from PubChem"""
        try:
            url = f"{self.base_url}/compound/name/{quote(name)}/JSON"
            response = requests.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                logger.info(f"Compound not found in PubChem: {name}")
                return None
            else:
                logger.warning(f"PubChem API error for {name}: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"PubChem request failed for {name}: {e}")
            return None
    
    def get_compound_by_smiles(self, smiles: str) -> Optional[Dict[str, Any]]:
        """Get compound data by SMILES from PubChem"""
        try:
            url = f"{self.base_url}/compound/smiles/{quote(smiles)}/JSON"
            response = requests.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"PubChem API error for SMILES {smiles}: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"PubChem request failed for SMILES {smiles}: {e}")
            return None
    
    def get_compound_by_cas(self, cas_number: str) -> Optional[Dict[str, Any]]:
        """Get compound data by CAS number from PubChem"""
        try:
            url = f"{self.base_url}/compound/name/{quote(cas_number)}/JSON"
            response = requests.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"PubChem API error for CAS {cas_number}: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"PubChem request failed for CAS {cas_number}: {e}")
            return None
    
    def extract_safety_data(self, compound_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract safety and hazard data from PubChem compound data"""
        if not compound_data or 'PC_Compounds' not in compound_data:
            return {}
        
        try:
            compound = compound_data['PC_Compounds'][0]
            safety_data = {}
            
            # Extract basic information
            safety_data['pubchem_cid'] = compound.get('id', {}).get('id', {}).get('cid')
            
            # Extract hazard information
            safety_data['hazard_statements'] = self._extract_hazard_statements(compound)
            safety_data['precautionary_statements'] = self._extract_precautionary_statements(compound)
            safety_data['safety_notes'] = self._extract_safety_notes(compound)
            
            # Extract physical properties relevant to safety
            safety_data['physical_properties'] = self._extract_physical_properties(compound)
            
            # Extract GHS hazard codes and pictograms
            safety_data['ghs_classification'] = self._extract_ghs_classification(compound)
            
            return safety_data
            
        except Exception as e:
            logger.error(f"Error extracting safety data: {e}")
            return {}
    
    def _extract_hazard_statements(self, compound: Dict[str, Any]) -> Dict[str, Any]:
        """Extract hazard statements (H-codes)"""
        hazards = {}
        
        # Look for hazard codes in various PubChem properties
        props = compound.get('props', [])
        
        for prop in props:
            urn = prop.get('urn', {})
            label = urn.get('label', '').lower()
            
            if 'hazard' in label or 'danger' in label:
                value = prop.get('value', {})
                if value.get('sval'):
                    hazards[label] = value['sval']
                elif value.get('fval'):
                    hazards[label] = str(value['fval'])
        
        return hazards
    
    def _extract_precautionary_statements(self, compound: Dict[str, Any]) -> Dict[str, Any]:
        """Extract precautionary statements (P-codes)"""
        precautions = {}
        
        props = compound.get('props', [])
        
        for prop in props:
            urn = prop.get('urn', {})
            label = urn.get('label', '').lower()
            
            if 'precaution' in label or 'safety' in label:
                value = prop.get('value', {})
                if value.get('sval'):
                    precautions[label] = value['sval']
        
        return precautions
    
    def _extract_safety_notes(self, compound: Dict[str, Any]) -> str:
        """Extract general safety notes"""
        safety_notes = []
        
        props = compound.get('props', [])
        
        for prop in props:
            urn = prop.get('urn', {})
            label = urn.get('label', '').lower()
            
            if any(keyword in label for keyword in ['safety', 'handling', 'storage', 'risk']):
                value = prop.get('value', {})
                if value.get('sval'):
                    safety_notes.append(f"{label}: {value['sval']}")
        
        return "\n".join(safety_notes) if safety_notes else "No specific safety notes available."
    
    def _extract_physical_properties(self, compound: Dict[str, Any]) -> Dict[str, Any]:
        """Extract physical properties relevant to safety"""
        properties = {}
        
        props = compound.get('props', [])
        
        property_mapping = {
            'flash point': 'flash_point',
            'melting point': 'melting_point',
            'boiling point': 'boiling_point',
            'density': 'density',
            'vapor pressure': 'vapor_pressure',
            'solubility': 'solubility'
        }
        
        for prop in props:
            urn = prop.get('urn', {})
            label = urn.get('label', '').lower()
            
            for search_term, property_key in property_mapping.items():
                if search_term in label:
                    value = prop.get('value', {})
                    if value.get('sval'):
                        properties[property_key] = value['sval']
                    elif value.get('fval'):
                        properties[property_key] = value['fval']
                    break
        
        return properties
    
    def _extract_ghs_classification(self, compound: Dict[str, Any]) -> Dict[str, Any]:
        """Extract GHS hazard classification"""
        ghs_data = {}
        
        # This would typically involve parsing GHS codes from hazard statements
        # For now, we'll create a simplified version
        hazards = self._extract_hazard_statements(compound)
        
        ghs_pictograms = []
        ghs_hazard_codes = []
        
        # Simple mapping based on hazard keywords
        hazard_keywords = {
            'flammable': 'GHS02',
            'oxidizing': 'GHS03',
            'corrosive': 'GHS05',
            'toxic': 'GHS06',
            'health hazard': 'GHS08',
            'environmental hazard': 'GHS09'
        }
        
        for hazard_text in hazards.values():
            hazard_lower = hazard_text.lower()
            for keyword, pictogram in hazard_keywords.items():
                if keyword in hazard_lower and pictogram not in ghs_pictograms:
                    ghs_pictograms.append(pictogram)
        
        ghs_data['pictograms'] = ghs_pictograms
        ghs_data['hazard_codes'] = ghs_hazard_codes
        
        return ghs_data
    
    def get_compound_safety_data(self, identifier: str, identifier_type: str = 'name') -> Optional[Dict[str, Any]]:
        """Get comprehensive safety data for a compound"""
        compound_data = None
        
        if identifier_type == 'name':
            compound_data = self.get_compound_by_name(identifier)
        elif identifier_type == 'smiles':
            compound_data = self.get_compound_by_smiles(identifier)
        elif identifier_type == 'cas':
            compound_data = self.get_compound_by_cas(identifier)
        
        if compound_data:
            return self.extract_safety_data(compound_data)
        
        return None

# Global service instance
pubchem_service = PubChemService()
