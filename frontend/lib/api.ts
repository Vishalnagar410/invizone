import axios from 'axios';
import { 
  AuthTokens, 
  ChemicalWithStock, 
  ChemicalFormData, 
  StockFormData, 
  User, 
  LoginFormData, 
  RegisterFormData,
  StockSummary,
  Alert,
  MSDS,
  HazardSummary,
  Location,
  LocationFormData,
  StockAdjustment,
  StockAdjustmentFormData,
  BarcodeImage,
  BarcodeDownloadResponse,
  AdjustmentSummary,
  LocationHierarchy
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

console.log('API Base URL:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Adding auth token to request');
      }
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} Response from: ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error('❌ Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      console.log('🔄 401 Unauthorized - clearing tokens');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Health Check API
export const healthAPI = {
  checkAPI: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Auth API
export const authAPI = {
  login: async (credentials: LoginFormData): Promise<AuthTokens> => {
    console.log('🔐 Attempting login for:', credentials.email);
    
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    console.log('✅ Login successful');
    return response.data;
  },
  
  register: async (userData: RegisterFormData): Promise<User> => {
    console.log('👤 Attempting registration for:', userData.email);
    
    const response = await api.post('/auth/register', userData);
    console.log('✅ Registration successful');
    return response.data;
  },
  
  getMe: async (): Promise<User> => {
    console.log('🔍 Getting current user info');
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users/');
    return response.data;
  },
  
  getById: async (id: number): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  getForDropdown: async (): Promise<Array<{id: number; label: string; email: string; full_name: string; role: string}>> => {
    const response = await api.get('/users/dropdown');
    return response.data;
  }
};

// Chemicals API - ENHANCED
export const chemicalsAPI = {
  getAll: async (skip = 0, limit = 100, location_id?: number, low_stock?: boolean): Promise<ChemicalWithStock[]> => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (location_id) params.append('location_id', location_id.toString());
    if (low_stock) params.append('low_stock', 'true');
    
    const response = await api.get(`/chemicals?${params}`);
    return response.data;
  },
  
  getById: async (id: number): Promise<ChemicalWithStock> => {
    const response = await api.get(`/chemicals/${id}`);
    return response.data;
  },
  
  search: async (query: string): Promise<ChemicalWithStock[]> => {
    const response = await api.get(`/chemicals/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },
  
  create: async (chemical: ChemicalFormData): Promise<ChemicalWithStock> => {
    const response = await api.post('/chemicals', chemical);
    return response.data;
  },
  
  update: async (id: number, chemical: Partial<ChemicalFormData>): Promise<ChemicalWithStock> => {
    const response = await api.put(`/chemicals/${id}`, chemical);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/chemicals/${id}`);
  },
  
  validateSMILES: async (smiles: string): Promise<any> => {
    const response = await api.post(`/chemicals/validate-smiles?smiles=${encodeURIComponent(smiles)}`);
    return response.data;
  },

  bulkUpload: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/chemicals/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getBarcode: async (chemicalId: number): Promise<any> => {
    const response = await api.get(`/chemicals/${chemicalId}/barcode`);
    return response.data;
  }
};

// Stock API - ENHANCED (WITH triggerDailyReport ADDED)
export const stockAPI = {
  getAll: async (skip = 0, limit = 100): Promise<any[]> => {
    const response = await api.get(`/stock?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  
  update: async (chemicalId: number, stockData: StockFormData): Promise<any> => {
    const response = await api.put(`/stock/${chemicalId}`, stockData);
    return response.data;
  },
  
  getAlerts: async (skip = 0, limit = 100): Promise<Alert[]> => {
    const response = await api.get(`/stock/alerts?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  
  resolveAlert: async (alertId: number): Promise<any> => {
    const response = await api.post(`/stock/alerts/${alertId}/resolve`);
    return response.data;
  },

  getChemicalsWithStock: async (skip = 0, limit = 100, low_stock_only = false, location_id?: number): Promise<ChemicalWithStock[]> => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (low_stock_only) params.append('low_stock_only', 'true');
    if (location_id) params.append('location_id', location_id.toString());
    
    const response = await api.get(`/stock/chemicals-with-stock?${params}`);
    return response.data;
  },

  getLowStockChemicals: async (skip = 0, limit = 100): Promise<ChemicalWithStock[]> => {
    const response = await api.get(`/stock/low-stock?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getStockSummary: async (): Promise<StockSummary> => {
    const response = await api.get('/stock/summary');
    return response.data;
  },

  recordUsage: async (chemicalId: number, usageData: any): Promise<any> => {
    const response = await api.post(`/stock/${chemicalId}/usage`, usageData);
    return response.data;
  },

  getUsageHistory: async (chemicalId: number, skip = 0, limit = 100): Promise<any[]> => {
    const response = await api.get(`/stock/${chemicalId}/usage?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  updateTriggerLevel: async (chemicalId: number, triggerLevel: number): Promise<any> => {
    const response = await api.put(`/stock/${chemicalId}/trigger-level`, { trigger_level: triggerLevel });
    return response.data;
  },

  // NEW: Added missing triggerDailyReport method
  triggerDailyReport: async (): Promise<{message: string}> => {
    const response = await api.post('/reports/daily');
    return response.data;
  }
};

// NEW: Locations API
export const locationsAPI = {
  getAll: async (skip = 0, limit = 100, department?: string, lab_name?: string, room?: string, storage_condition?: string): Promise<Location[]> => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (department) params.append('department', department);
    if (lab_name) params.append('lab_name', lab_name);
    if (room) params.append('room', room);
    if (storage_condition) params.append('storage_condition', storage_condition);
    
    const response = await api.get(`/locations?${params}`);
    return response.data;
  },
  
  getById: async (id: number): Promise<Location> => {
    const response = await api.get(`/locations/${id}`);
    return response.data;
  },
  
  create: async (location: LocationFormData): Promise<Location> => {
    const response = await api.post('/locations', location);
    return response.data;
  },
  
  update: async (id: number, location: Partial<LocationFormData>): Promise<Location> => {
    const response = await api.put(`/locations/${id}`, location);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/locations/${id}`);
  },
  
  getHierarchy: async (): Promise<LocationHierarchy> => {
    const [departments, labs, rooms] = await Promise.all([
      api.get('/locations/hierarchy/departments'),
      api.get('/locations/hierarchy/labs'),
      api.get('/locations/hierarchy/rooms')
    ]);
    
    return {
      departments: departments.data,
      labs: labs.data,
      rooms: rooms.data
    };
  },
  
  getChemicalsAtLocation: async (locationId: number, skip = 0, limit = 100): Promise<ChemicalWithStock[]> => {
    const response = await api.get(`/locations/${locationId}/chemicals?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  
  getStorageConditions: async (): Promise<string[]> => {
    const response = await api.get('/locations/storage-conditions/types');
    return response.data;
  }
};

// NEW: Barcodes API
export const barcodesAPI = {
  getChemicalBarcodes: async (chemicalId: number, barcode_type?: string): Promise<BarcodeImage[]> => {
    const params = new URLSearchParams();
    if (barcode_type) params.append('barcode_type', barcode_type);
    
    const response = await api.get(`/barcodes/chemical/${chemicalId}?${params}`);
    return response.data;
  },
  
  generateBarcodes: async (chemicalId: number): Promise<any> => {
    const response = await api.post(`/barcodes/chemical/${chemicalId}/generate`);
    return response.data;
  },
  
  downloadBarcode: async (chemicalId: number, barcodeType: string): Promise<BarcodeDownloadResponse> => {
    const response = await api.get(`/barcodes/chemical/${chemicalId}/download/${barcodeType}`);
    return response.data;
  },
  
  bulkGenerate: async (chemicalIds: number[]): Promise<any> => {
    const response = await api.post('/barcodes/bulk-generate', { chemical_ids: chemicalIds });
    return response.data;
  },
  
  bulkDownload: async (chemicalIds: number[], barcodeType: string): Promise<BarcodeDownloadResponse> => {
    const response = await api.post('/barcodes/bulk-download', { 
      chemical_ids: chemicalIds,
      barcode_type: barcodeType
    });
    return response.data;
  },
  
  scanBarcode: async (barcodeData: string): Promise<ChemicalWithStock> => {
    const response = await api.get(`/barcodes/scan/${encodeURIComponent(barcodeData)}`);
    return response.data;
  },
  
  getBarcodeTypes: async (): Promise<string[]> => {
    const response = await api.get('/barcodes/types');
    return response.data;
  }
};

// NEW: Stock Adjustments API
export const stockAdjustmentsAPI = {
  create: async (adjustment: StockAdjustmentFormData): Promise<StockAdjustment> => {
    const response = await api.post('/stock-adjustments', adjustment);
    return response.data;
  },
  
  getChemicalAdjustments: async (chemicalId: number, skip = 0, limit = 100, reason?: string, start_date?: string, end_date?: string): Promise<StockAdjustment[]> => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (reason) params.append('reason', reason);
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    
    const response = await api.get(`/stock-adjustments/chemical/${chemicalId}?${params}`);
    return response.data;
  },
  
  getAll: async (skip = 0, limit = 100, chemical_id?: number, admin_id?: number, reason?: string): Promise<StockAdjustment[]> => {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (chemical_id) params.append('chemical_id', chemical_id.toString());
    if (admin_id) params.append('admin_id', admin_id.toString());
    if (reason) params.append('reason', reason);
    
    const response = await api.get(`/stock-adjustments?${params}`);
    return response.data;
  },
  
  getRecent: async (hours = 24): Promise<StockAdjustment[]> => {
    const response = await api.get(`/stock-adjustments/recent?hours=${hours}`);
    return response.data;
  },
  
  getSummary: async (days = 30): Promise<AdjustmentSummary> => {
    const response = await api.get(`/stock-adjustments/summary?days=${days}`);
    return response.data;
  },
  
  getReasons: async (): Promise<string[]> => {
    const response = await api.get('/stock-adjustments/reasons');
    return response.data;
  }
};

// MSDS API
export const msdsAPI = {
  getByChemicalId: async (chemicalId: number): Promise<MSDS> => {
    const response = await api.get(`/msds/${chemicalId}`);
    return response.data;
  },

  getHazardSummary: async (chemicalId: number): Promise<HazardSummary> => {
    const response = await api.get(`/msds/${chemicalId}/hazard-summary`);
    return response.data;
  },

  fetchMSDS: async (chemicalId: number): Promise<{message: string}> => {
    const response = await api.post(`/msds/${chemicalId}/fetch`);
    return response.data;
  },

  refreshMSDS: async (chemicalId: number): Promise<{message: string}> => {
    const response = await api.post(`/msds/${chemicalId}/refresh`);
    return response.data;
  },

  uploadMSDS: async (chemicalId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/msds/${chemicalId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getMSDSFiles: async (chemicalId: number): Promise<any[]> => {
    const response = await api.get(`/msds/${chemicalId}/files`);
    return response.data;
  },

  getChemicalsWithoutMSDS: async (skip = 0, limit = 100): Promise<ChemicalWithStock[]> => {
    const response = await api.get(`/msds/chemicals/without-msds?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getChemicalsWithMSDS: async (skip = 0, limit = 100): Promise<ChemicalWithStock[]> => {
    const response = await api.get(`/msds/chemicals/with-msds?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getMSDSStats: async (): Promise<any> => {
    const response = await api.get('/msds/stats/summary');
    return response.data;
  }
};

// Reports API
export const reportsAPI = {
  getStockSummary: async (): Promise<StockSummary> => {
    const response = await api.get('/reports/stock/summary');
    return response.data;
  },
};

// WebSocket utility
export const setupWebSocket = (onMessage: (message: any) => void) => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('access_token');
  const wsUrl = `${WS_BASE_URL}/ws?token=${token}`;
  
  const socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('✅ WebSocket connected');
    // Subscribe to updates
    socket.send(JSON.stringify({
      type: 'subscribe_to_updates',
      data: {
        types: ['chemicals', 'stock', 'locations', 'alerts']
      }
    }));
  };
  
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    onMessage(message);
  };
  
  socket.onclose = () => {
    console.log('🔌 WebSocket disconnected');
  };
  
  socket.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };
  
  return socket;
};

// Export all API methods
export default {
  healthAPI,
  authAPI,
  usersAPI,
  chemicalsAPI,
  stockAPI,
  locationsAPI,
  barcodesAPI,
  stockAdjustmentsAPI,
  msdsAPI,
  reportsAPI,
  setupWebSocket
};