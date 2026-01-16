import axios from 'axios';
import Constants from 'expo-constants';

// Read API base URL from Expo config extra first, then from env, then fallback
const runtimeApiBase = (Constants.expoConfig?.extra as any)?.API_BASE_URL || process.env.API_BASE_URL;
const API_BASE_URL = runtimeApiBase || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Worker APIs
export const workerApi = {
  getAll: (active?: boolean) => 
    api.get('/workers', { params: active !== undefined ? { active } : {} }),
  
  getById: (id: string) => 
    api.get(`/workers/${id}`),
  
  create: (data: {
    workerId: string;
    name: string;
    dailyWorkingHours: number;
    dailyPay: number;
    overtimeRate: number;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
  }) => api.post('/workers', data),
  
  update: (id: string, data: any) => 
    api.put(`/workers/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/workers/${id}`),
};

// Daily Entry APIs
export const entryApi = {
  getAll: (params?: { workerId?: string; startDate?: string; endDate?: string; date?: string }) => 
    api.get('/entries', { params }),
  
  getById: (id: string) => 
    api.get(`/entries/${id}`),
  
  create: (data: {
    workerId: string;
    date: string;
    hoursWorked: number;
    notes?: string;
  }) => api.post('/entries', data),
  
  update: (id: string, data: { hoursWorked: number; notes?: string }) => 
    api.put(`/entries/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/entries/${id}`),
};

// Report APIs
export const reportApi = {
  getMonthlyOvertime: (year: number, month: number) => 
    api.get(`/reports/overtime/${year}/${month}`),
  
  getWorkerSummary: (workerId: string, params?: { startDate?: string; endDate?: string }) => 
    api.get(`/reports/worker-summary/${workerId}`, { params }),
  
  exportOvertimeExcel: (year: number, month: number) => 
    api.get(`/reports/export/overtime/${year}/${month}`, { responseType: 'arraybuffer' }),
};

export default api;
