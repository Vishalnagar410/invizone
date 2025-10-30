export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'admin' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export interface Chemical {
  id: number;
  name: string;
  cas_number: string;
  smiles: string;
  canonical_smiles: string;
  inchikey: string;
  molecular_formula: string | null;
  molecular_weight: number | null;
  created_at: string;
  created_by: number;
}

export interface Stock {
  chemical_id: number;
  current_quantity: number;
  unit: string;
  trigger_level: number;
  last_updated: string;
}

export interface MSDS {
  id: number;
  chemical_id: number;
  source_url: string | null;
  hazard_statements: Record<string, any> | null;
  precautionary_statements: Record<string, any> | null;
  handling_notes: string | null;
  retrieved_at: string;
}

export interface HazardSummary {
  risk_level: 'low' | 'medium' | 'high';
  ghs_pictograms: string[];
  hazard_statements: string[];
  precautionary_statements: string[];
  has_hazards?: boolean;
  hazard_count?: number;
  precaution_count?: number;
}

export interface ChemicalWithStock extends Chemical {
  stock: Stock | null;
  msds: MSDS | null;
  hazardSummary?: HazardSummary;
}

export interface Alert {
  id: number;
  chemical_id: number;
  alert_type: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
  chemical?: Chemical;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  refresh_token: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'viewer';
}

export interface ChemicalFormData {
  name: string;
  cas_number: string;
  smiles: string;
}

export interface StockFormData {
  current_quantity: number;
  unit: string;
  trigger_level: number;
}

export interface StockSummary {
  total_chemicals: number;
  low_stock_chemicals: number;
  out_of_stock_chemicals: number;
  chemicals_without_msds: number;
  // Add the missing properties that your dashboard is using
  low_stock_count: number;
  total_quantity: number;
  low_stock_percentage: number;
}