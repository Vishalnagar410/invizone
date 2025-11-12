// ===== VALIDATION UTILITIES =====
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ===== STORAGE UTILITIES =====
export const storage = {
  get: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  
  set: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
};

// ===== SETTINGS MANAGEMENT =====
export const settings = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const stored = storage.get(`settings_${key}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`Failed to parse setting ${key}:`, error);
    }
    return defaultValue;
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      storage.set(`settings_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  },
  
  remove: (key: string): void => {
    storage.remove(`settings_${key}`);
  },
  
  reset: (): void => {
    if (typeof window === 'undefined') return;
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('settings_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// ===== EXPORT UTILITIES =====
export const exportUtils = {
  chemicalsToCSV: (chemicals: any[]): string => {
    if (!chemicals.length) return '';
    
    const headers = ['Name', 'CAS Number', 'SMILES', 'Molecular Formula', 'Molecular Weight', 'Stock Quantity', 'Location'];
    const csvRows = [headers.join(',')];
    
    chemicals.forEach(chemical => {
      const row = [
        `"${(chemical.name || '').replace(/"/g, '""')}"`,
        `"${(chemical.cas_number || '').replace(/"/g, '""')}"`,
        `"${(chemical.smiles || '').replace(/"/g, '""')}"`,
        `"${(chemical.molecular_formula || '').replace(/"/g, '""')}"`,
        chemical.molecular_weight || '',
        chemical.stock?.quantity || '',
        `"${(chemical.stock?.location || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  },
  
  downloadData: (data: string, filename: string, mimeType: string): void => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// ===== IMPORT UTILITIES =====
export const importUtils = {
  readFileAsText: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
  
  parseCSV: (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(header => 
      header.replace(/^"|"$/g, '').trim()
    );
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => 
        value.replace(/^"|"$/g, '').trim()
      );
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
      });
      data.push(row);
    }
    
    return data;
  },
  
  validateChemicalData: (data: any[]): { valid: any[]; errors: string[] } => {
    const valid: any[] = [];
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      
      if (!row.name || !row.name.trim()) {
        rowErrors.push('Name is required');
      }
      
      if (!row.cas_number || !row.cas_number.trim()) {
        rowErrors.push('CAS Number is required');
      } else {
        const casRegex = /^\d{1,7}-\d{2}-\d$/;
        if (!casRegex.test(row.cas_number)) {
          rowErrors.push('Invalid CAS number format');
        }
      }
      
      if (!row.smiles || !row.smiles.trim()) {
        rowErrors.push('SMILES is required');
      }
      
      if (rowErrors.length === 0) {
        valid.push({
          name: row.name.trim(),
          cas_number: row.cas_number.trim(),
          smiles: row.smiles.trim(),
          molecular_formula: row.molecular_formula?.trim() || null,
          molecular_weight: row.molecular_weight ? parseFloat(row.molecular_weight) : null
        });
      } else {
        errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
      }
    });
    
    return { valid, errors };
  }
};

// ===== NOTIFICATION SYSTEM =====
export const notification = {
  success: (message: string): void => {
    console.log(`✅ ${message}`);
    if (typeof window !== 'undefined') {
      // Simple alert for now - you can integrate with toast library later
      // alert(`Success: ${message}`);
    }
  },
  
  error: (message: string): void => {
    console.error(`❌ ${message}`);
    if (typeof window !== 'undefined') {
      alert(`Error: ${message}`);
    }
  },
  
  warning: (message: string): void => {
    console.warn(`⚠️ ${message}`);
  },
  
  info: (message: string): void => {
    console.info(`ℹ️ ${message}`);
  }
};

// ===== RBAC (ROLE-BASED ACCESS CONTROL) =====
export const rbac = {
  canManageUsers: (role: string): boolean => {
    return role === 'admin';
  },
  
  canManageChemicals: (role: string): boolean => {
    return role === 'admin';
  },
  
  canViewSensitiveData: (role: string): boolean => {
    return role === 'admin';
  },
  
  canExportData: (role: string): boolean => {
    return role === 'admin';
  },
  
  canImportData: (role: string): boolean => {
    return role === 'admin';
  },
  
  getPermissions: (role: string): string[] => {
    const permissions: string[] = ['view_chemicals', 'view_stock'];
    
    if (role === 'admin') {
      permissions.push(
        'manage_users',
        'manage_chemicals', 
        'manage_stock',
        'export_data',
        'import_data',
        'view_reports',
        'system_settings'
      );
    }
    
    return permissions;
  }
};

// ===== GENERAL UTILITIES =====
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Chemical-specific utilities
export const chemicalUtils = {
  validateSMILES: (smiles: string): boolean => {
    if (!smiles) return false;
    const smilesRegex = /^[A-Za-z0-9@+\-\[\]\(\)\\\/%=#\.]+$/;
    return smilesRegex.test(smiles) && smiles.length > 0;
  },
  
  formatMolecularWeight: (weight: number): string => {
    return weight ? `${weight.toFixed(2)} g/mol` : 'N/A';
  },
  
  parseCAS: (cas: string): string => {
    return cas.replace(/\s/g, '');
  }
};

// Stock management utilities
export const stockUtils = {
  calculateStockStatus: (quantity: number, minQuantity: number): 'adequate' | 'low' | 'critical' => {
    if (quantity <= 0) return 'critical';
    if (quantity <= minQuantity * 0.3) return 'critical';
    if (quantity <= minQuantity * 0.7) return 'low';
    return 'adequate';
  },
  
  formatQuantity: (quantity: number, unit: string = 'g'): string => {
    return `${quantity} ${unit}`;
  }
};

// Export all utilities as default object
export default {
  validateEmail,
  validatePassword,
  storage,
  settings,
  exportUtils,
  importUtils,
  notification,
  rbac,
  formatDate,
  formatDateTime,
  debounce,
  generateId,
  capitalize,
  chemicalUtils,
  stockUtils
};