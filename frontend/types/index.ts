// frontend/types/index.ts - ENHANCED VERSION
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
  unique_id: string;
  barcode: string;
  name: string;
  cas_number: string;
  smiles: string;
  canonical_smiles: string;
  inchikey: string;
  molecular_formula: string | null;
  molecular_weight: number | null;
  location_id: number | null;
  initial_quantity: number;
  initial_unit: string;
  created_at: string;
  created_by: number;
  minimum_quantity?: number;
  storage_condition?: string;
  custom_storage_condition?: string;
  description?: string;
}

export interface Stock {
  chemical_id?: number;
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

// NEW: Location Interface
export interface Location {
  id: number;
  name: string;
  department: string | null;
  lab_name: string | null;
  room: string | null;
  shelf: string | null;
  rack: string | null;
  position: string | null;
  storage_conditions: 'RT' | '2-8°C' | '-20°C' | '-80°C' | 'Custom';
  custom_storage_condition: string | null;
  description: string | null;
  created_at: string;
}

// NEW: Barcode Image Interface
export interface BarcodeImage {
  id: number;
  chemical_id: number;
  barcode_type: 'code128' | 'qr';
  barcode_data: string;
  image_blob: string | null;
  image_path: string | null;
  created_at: string;
}

// NEW: Stock Adjustment Interface
export interface StockAdjustment {
  id: number;
  chemical_id: number;
  admin_id: number;
  before_quantity: number;
  after_quantity: number;
  change_amount: number;
  reason: 'Usage' | 'Spillage' | 'Received' | 'Correction' | 'Transfer' | 'Expired' | 'Other';
  note: string | null;
  timestamp: string;
  chemical_name?: string;
  admin?: User;
  chemical?: Chemical;
}

// NEW: Usage History Interface
export interface UsageHistory {
  id: number;
  chemical_id: number;
  quantity_used: number;
  unit: string;
  used_by: number;
  used_at: string;
  notes: string | null;
  user?: User;
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

// UPDATED: Chemical with all relationships
export interface ChemicalWithStock extends Chemical {
  stock: Stock | null;
  msds: MSDS | null;
  location: Location | null;
  hazardSummary?: HazardSummary;
  barcode_images: BarcodeImage[];
  stock_adjustments: StockAdjustment[];
  usage_history: UsageHistory[];
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

// ENHANCED: Chemical Form Data with new fields
export interface ChemicalFormData {
  name: string;
  cas_number: string;
  smiles: string;
  location_id?: number;
  initial_quantity?: number;
  initial_unit?: string;
  minimum_quantity?: number;
  storage_condition?: string;
  custom_storage_condition?: string;
  description?: string;
}

export interface StockFormData {
  current_quantity: number;
  unit: string;
  trigger_level: number;
}

// Extended Chemical Form Data with Container and Procurement fields
export interface ExtendedChemicalFormData extends ChemicalFormData {
  // Container Information (Optional)
  container_id?: string;
  container_type?: string;
  quantity?: number;
  quantity_unit?: string;
  no_of_containers?: number;
  total_weight_volume?: number;
  tare_weight?: number;
  supplier?: string;
  batch_no?: string;
  lot_no?: string;
  expiry_date?: string;
  
  // Procurement Details (Optional)
  project_code?: string;
  requisitioner_id?: number; // Reference to user ID
  approved_by_id?: number;   // Reference to user ID
  po_date?: string;
  invoice_no?: string;
  invoice_date?: string;
  date_received?: string;
  
  // Additional fields
  synonyms?: string;
}

// Enhanced Chemical with additional fields
export interface EnhancedChemicalWithStock extends ChemicalWithStock {
  container_info?: ContainerInfo;
  procurement_info?: ProcurementInfo;
}

export interface ContainerInfo {
  container_id?: string;
  container_type?: string;
  quantity?: number;
  quantity_unit?: string;
  no_of_containers?: number;
  total_weight_volume?: number;
  tare_weight?: number;
  supplier?: string;
  batch_no?: string;
  lot_no?: string;
  expiry_date?: string;
}

export interface ProcurementInfo {
  project_code?: string;
  requisitioner_id?: number;
  approved_by_id?: number;
  po_date?: string;
  invoice_no?: string;
  invoice_date?: string;
  date_received?: string;
  requisitioner?: User;
  approved_by?: User;
}

// NEW: Location Form Data
export interface LocationFormData {
  name: string;
  department?: string;
  lab_name?: string;
  room?: string;
  shelf?: string;
  rack?: string;
  position?: string;
  storage_conditions?: 'RT' | '2-8°C' | '-20°C' | '-80°C' | 'Custom';
  custom_storage_condition?: string;
  description?: string;
}

// NEW: Stock Adjustment Form Data
export interface StockAdjustmentFormData {
  chemical_id: number;
  after_quantity: number;
  change_amount: number;
  reason: 'Usage' | 'Spillage' | 'Received' | 'Correction' | 'Transfer' | 'Expired' | 'Other';
  note?: string;
}

// NEW: Barcode Generation Request
export interface BarcodeGenerationRequest {
  chemical_ids: number[];
}

// NEW: WebSocket Message
export interface WebSocketMessage {
  type: 'chemical_created' | 'chemical_updated' | 'stock_adjusted' | 'location_updated' | 'low_stock_alert';
  data: any;
  timestamp: string;
}

export interface StockSummary {
  total_chemicals: number;
  low_stock_chemicals: number;
  out_of_stock_chemicals: number;
  chemicals_without_msds: number;
  low_stock_count: number;
  total_quantity: number;
  low_stock_percentage: number;
}

// NEW: Adjustment Summary
export interface AdjustmentSummary {
  period_days: number;
  total_adjustments: number;
  adjustments_by_reason: Array<{
    reason: string;
    count: number;
    total_change: number;
  }>;
  top_adjusted_chemicals: Array<{
    chemical_id: number;
    chemical_name: string;
    adjustment_count: number;
    total_change: number;
  }>;
  active_admins: Array<{
    admin_id: number;
    admin_email: string;
    adjustment_count: number;
  }>;
}

// NEW: Barcode Download Response
export interface BarcodeDownloadResponse {
  filename: string;
  content: string; // base64 encoded
  content_type: string;
  barcode_type?: string;
  chemicals_included?: number;
}

// NEW: Location Hierarchy
export interface LocationHierarchy {
  departments: string[];
  labs: string[];
  rooms: string[];
}

// NEW: Storage Conditions
export const STORAGE_CONDITIONS = [
  'RT',
  '2-8°C', 
  '-20°C',
  '-80°C',
  'Custom'
] as const;

// NEW: Adjustment Reasons
export const ADJUSTMENT_REASONS = [
  'Usage',
  'Spillage',
  'Received',
  'Correction',
  'Transfer',
  'Expired',
  'Other'
] as const;

// NEW: Barcode Types
export const BARCODE_TYPES = [
  'code128',
  'qr'
] as const;