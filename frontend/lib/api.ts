// frontend/lib/api.ts
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
  HazardSummary
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    const response = await api.get('/api/health');
    return response.data;
  },
  
  checkDatabase: async (): Promise<any> => {
    const response = await api.get('/api/database/health');
    return response.data;
  },
  
  checkAuth: async (): Promise<any> => {
    const response = await api.get('/api/auth/health');
    return response.data;
  },
  
  checkAllServices: async (): Promise<any> => {
    try {
      const [apiHealth, dbHealth, authHealth] = await Promise.all([
        healthAPI.checkAPI(),
        healthAPI.checkDatabase(),
        healthAPI.checkAuth()
      ]);
      
      return {
        api: apiHealth,
        database: dbHealth,
        auth: authHealth
      };
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
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

  test: async (): Promise<any> => {
    console.log('🧪 Testing auth endpoint');
    const response = await api.get('/auth/test');
    return response.data;
  },

  // Debug login endpoint
  loginDebug: async (credentials: LoginFormData): Promise<any> => {
    console.log('🔧 Debug login attempt for:', credentials.email);
    
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await api.post('/auth/login-debug', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    return response.data;
  }
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
  
  getMe: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },
  
  updateMe: async (userData: Partial<User>): Promise<User> => {
    const response = await api.put('/users/me', userData);
    return response.data;
  },
  
  updatePassword: async (passwordData: { current_password: string; new_password: string }): Promise<void> => {
    await api.put('/users/me/password', passwordData);
  },
  
  create: async (userData: { email: string; password: string; full_name: string; role: string }): Promise<User> => {
    const response = await api.post('/users/', userData);
    return response.data;
  },
  
  update: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  
  toggleActive: async (id: number): Promise<User> => {
    const response = await api.patch(`/users/${id}/toggle-active`);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  }
};

// Test API connection
export const testAPI = {
  health: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },
  
  testDB: async (): Promise<any> => {
    const response = await api.get('/test-db');
    return response.data;
  }
};

// Chemicals API
export const chemicalsAPI = {
  getAll: async (skip = 0, limit = 100): Promise<ChemicalWithStock[]> => {
    const response = await api.get(`/chemicals?skip=${skip}&limit=${limit}`);
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

  // NEW: Bulk upload method
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

  // NEW: Get barcode data
  getBarcode: async (chemicalId: number): Promise<any> => {
    const response = await api.get(`/chemicals/${chemicalId}/barcode`);
    return response.data;
  }
};

// Stock API
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

  getLowStockChemicals: async (skip = 0, limit = 100): Promise<ChemicalWithStock[]> => {
    const response = await api.get(`/reports/stock/low-stock?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getStockSummary: async (): Promise<StockSummary> => {
    const response = await api.get('/reports/stock/summary');
    return response.data;
  },

  triggerDailyReport: async (): Promise<any> => {
    const response = await api.post('/reports/notifications/daily-report');
    return response.data;
  }
};

// MSDS API
export const msdsAPI = {
  getByChemicalId: async (chemicalId: number): Promise<MSDS> => {
    const response = await api.get(`/msds/${chemicalId}`);
    return response.data;
  },

  fetchMSDS: async (chemicalId: number): Promise<MSDS> => {
    const response = await api.post(`/msds/${chemicalId}/fetch`);
    return response.data;
  },

  getHazardSummary: async (chemicalId: number): Promise<HazardSummary> => {
    const response = await api.get(`/msds/${chemicalId}/hazard-summary`);
    return response.data;
  },

  getChemicalsWithoutMSDS: async (skip = 0, limit = 100): Promise<any[]> => {
    const response = await api.get(`/msds/chemicals/without-msds?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getChemicalsWithMSDS: async (skip = 0, limit = 100): Promise<any[]> => {
    const response = await api.get(`/msds/chemicals/with-msds?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  refreshMSDS: async (chemicalId: number): Promise<any> => {
    const response = await api.post(`/msds/${chemicalId}/refresh`);
    return response.data;
  }
};

// Reports API
export const reportsAPI = {
  getStockSummary: async (): Promise<StockSummary> => {
    const response = await api.get('/reports/stock/summary');
    return response.data;
  },

  getLowStockReport: async (skip = 0, limit = 100): Promise<ChemicalWithStock[]> => {
    const response = await api.get(`/reports/stock/low-stock?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  triggerDailyReport: async (): Promise<any> => {
    const response = await api.post('/reports/notifications/daily-report');
    return response.data;
  }
};

// Export all API methods
export default {
  healthAPI,
  authAPI,
  usersAPI,
  testAPI,
  chemicalsAPI,
  stockAPI,
  msdsAPI,
  reportsAPI
};