import axios from 'axios';

// Resolve base API URL dynamically from environment variables with localhost fallback
const getApiBaseUrl = () => {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
    (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL)) ||
    'http://localhost:5000';

  const trimmed = envUrl.trim().replace(/\/+$/, '');
  // Ensure the /api path suffix is present
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const partyService = {
  getAll: (params) => api.get('/parties', { params }),
  getById: (id) => api.get(`/parties/${id}`),
  create: (data) => api.post('/parties', data),
  bulkImport: (data) => api.post('/parties/bulk-import', data),
  delete: (id) => api.delete(`/parties/${id}`),
  getLedger: (id, params) => api.get(`/parties/${id}/ledger`, { params }),
};

export const orderService = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  bulkImport: (data) => api.post('/orders/bulk-import', data),
  delete: (id) => api.delete(`/orders/${id}`),
};

export const paymentService = {
  receive: (data) => api.post('/payments/receive', data),
  getByParty: (partyId) => api.get(`/payments/party/${partyId}`),
};

export const inventoryService = {
  getRawMaterials: () => api.get('/inventory/raw-materials'),
  inwardRawMaterial: (data) => api.post('/inventory/raw-materials/inward', data),
  bulkImportRawMaterials: (data) => api.post('/inventory/raw-materials/bulk-import', data),
  restockRawMaterial: (data) => api.post('/inventory/raw-materials/restock', data),
  deleteRawMaterial: (id) => api.delete(`/inventory/raw-materials/${id}`),
  getProducts: () => api.get('/inventory/products'),
  createProduct: (data) => api.post('/inventory/products', data),
  bulkUploadProducts: (data) => api.post('/inventory/products/bulk-upload', data),
  restockProduct: (data) => api.post('/inventory/products/restock', data),
  deleteProduct: (id) => api.delete(`/inventory/products/${id}`),
};

export const migrationService = {
  getStats: () => api.get('/migration/status'),
  importParties: (data) => api.post('/migration/parties', data),
  importProducts: (data) => api.post('/migration/products', data),
  importRawMaterials: (data) => api.post('/migration/raw-materials', data),
  importOrders: (data) => api.post('/migration/orders', data),
};

export default api;
