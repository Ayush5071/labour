import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Read API base URL from Expo config extra first, then from env, then fallback
const runtimeApiBase = (Constants.expoConfig?.extra as any)?.API_BASE_URL || process.env.API_BASE_URL;
const DEFAULT_LOCAL = 'http://localhost:3000/api';
const DEPLOYED_API = 'https://server-labour-steel.vercel.app/api';

// On web (especially when served via tunnel/HTTPS), prefer the deployed HTTPS API
const API_BASE_URL = Platform.OS === 'web'
  ? (runtimeApiBase || DEPLOYED_API)
  : (runtimeApiBase || DEFAULT_LOCAL);

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
    hourlyRate: number;
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

// Alias for consistency
export const workersApi = workerApi;

// Daily Entry APIs
export const entryApi = {
  getAll: (params?: { workerId?: string; startDate?: string; endDate?: string; date?: string }) => 
    api.get('/entries', { params }),
  
  getDaily: (date: string) =>
    api.get(`/entries/daily/${date}`),
  
  bulkCreate: (data: {
    date: string;
    entries: {
      workerId: string;
      status: 'present' | 'absent' | 'holiday' | 'half-day';
      hoursWorked?: number;
      notes?: string;
    }[];
  }) => api.post('/entries/bulk', data),
  
  create: (data: {
    workerId: string;
    date: string;
    status: 'present' | 'absent' | 'holiday' | 'half-day';
    hoursWorked?: number;
    notes?: string;
  }) => api.post('/entries', data),
  
  markHoliday: (data: { date: string; holidayName?: string }) =>
    api.post('/entries/mark-holiday', data),
  
  delete: (id: string) => 
    api.delete(`/entries/${id}`),
};

// Advance APIs
export const advanceApi = {
  getAll: (params?: { workerId?: string; type?: string; startDate?: string; endDate?: string }) =>
    api.get('/advances', { params }),
  
  getSummary: () =>
    api.get('/advances/summary'),
  
  getWorkerHistory: (workerId: string) =>
    api.get(`/advances/worker/${workerId}`),
  
  giveAdvance: (data: { workerId: string; amount: number; notes?: string; date?: string }) =>
    api.post('/advances/give', data),
  
  repayAdvance: (data: { workerId: string; amount: number; notes?: string; date?: string }) =>
    api.post('/advances/repay', data),
  
  recordDeposit: (data: { workerId: string; amount: number; notes?: string; date?: string }) =>
    api.post('/advances/deposit', data),
  
  makeSalaryPayment: (data: {
    workerId: string;
    periodStart: string;
    periodEnd: string;
    advanceDeduction?: number;
    notes?: string;
  }) => api.post('/advances/salary', data),
  
  getPayments: (params?: { workerId?: string; type?: string; startDate?: string; endDate?: string }) =>
    api.get('/advances/payments', { params }),
  
  calculatePayment: (workerId: string, startDate: string, endDate: string) =>
    api.get(`/advances/calculate/${workerId}`, { params: { startDate, endDate } }),
  
  exportDuesExcel: (startDate?: string, endDate?: string) =>
    api.get('/advances/export/dues', { params: { startDate, endDate } }),
  
  exportActiveExcel: (startDate?: string, endDate?: string) =>
    api.get('/advances/export/active', { params: { startDate, endDate } }),
  
  exportOverallExcel: () =>
    api.get('/advances/export/overall'),
};

// Vault/Transaction APIs
export const vaultApi = {
  getAll: (params?: { type?: string; startDate?: string; endDate?: string; category?: string }) =>
    api.get('/vault', { params }),
  
  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/vault/summary', { params }),
  
  create: (data: { type: 'income' | 'expense'; amount: number; category?: string; note: string; date?: string }) =>
    api.post('/vault', data),
  
  update: (id: string, data: any) =>
    api.put(`/vault/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/vault/${id}`),
};

// Bonus APIs
export const bonusApi = {
  getByYear: (year: number) =>
    api.get(`/bonus/${year}`),
  
  getByDateRange: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    api.get('/bonus/date-range', { params: { startYear, startMonth, endYear, endMonth } }),
  
  calculate: (data: {
    year: number;
    deductionPerAbsentDay?: number;
    deductAdvance?: boolean;
  }) => api.post('/bonus/calculate', data),
  
  calculateByDateRange: (data: {
    startYear: number;
    startMonth: number;
    endYear: number;
    endMonth: number;
    deductionPerAbsentDay?: number;
    deductAdvance?: boolean;
    persist?: boolean;
  }) => api.post('/bonus/calculate-date-range', data),
  
  updateBonus: (id: string, data: { finalBonusAmount: number; advanceDeduction: number }) =>
    api.put(`/bonus/${id}`, data),
  
  addExtraBonus: (bonusId: string, amount: number, notes?: string, workerContext?: any) => 
    api.post(`/bonus/add-extra-bonus/${bonusId}`, { 
      extraAmount: amount, 
      notes,
      ...workerContext 
    }),
  
  addEmployeeDeposit: (bonusId: string, amount: number, notes?: string, workerContext?: any) => 
    api.post(`/bonus/add-employee-deposit/${bonusId}`, { 
      depositAmount: amount, 
      notes,
      ...workerContext 
    }),
  
  pay: (id: string, amountPaid?: number) =>
    api.post(`/bonus/pay/${id}`, { amountPaid }),
  
  getSummary: (year: number) =>
    api.get(`/bonus/summary/${year}`),
  
  getSummaryByDateRange: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    api.get('/bonus/summary-date-range', { params: { startYear, startMonth, endYear, endMonth } }),
  
  exportBonusExcel: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    api.get('/bonus/export/excel', { params: { startYear, startMonth, endYear, endMonth } }),

  // Export using current UI records (useful to include unsaved deposits)
  exportBonusExcelWithRecords: (data: { startYear?: number; startMonth?: number; endYear?: number; endMonth?: number; records?: any[] }) =>
    api.post('/bonus/export/excel', data),
  
  saveBonusHistory: (data: {
    year: number;
    periodStart: string;
    periodEnd: string;
    records: Array<{
      workerId: string;
      baseBonusAmount: number;
      totalDaysWorked: number;
      totalDaysAbsent: number;
      totalPenalty: number;
      extraBonus: number;
      deposit: number;
      finalBonusAmount: number;
      amountToGiveEmployee: number;
      advanceBalanceAtSave?: number;
    }>;
    notes?: string;
  }) => api.post('/bonus/save-bonus-history', data),
  
  getBonusHistory: (year?: number) =>
    api.get('/bonus/history/all', { params: year ? { year } : {} }),
  
  getBonusHistoryById: (id: string) =>
    api.get(`/bonus/history/${id}`),
  
  exportBonusHistoryExcel: (historyId: string) =>
    api.get(`/bonus/export/history/${historyId}`),

  deleteBonusHistory: (id: string) =>
    api.delete(`/bonus/history/${id}`),
};

// Holiday APIs
export const holidayApi = {
  getAll: (year?: number) =>
    api.get('/holidays', { params: year ? { year } : {} }),
  
  create: (data: { date: string; name: string; description?: string }) =>
    api.post('/holidays', data),
  
  delete: (id: string) =>
    api.delete(`/holidays/${id}`),
};

// Report APIs
export const reportApi = {
  getWorkerSummary: (workerId: string, params?: { startDate?: string; endDate?: string }) => 
    api.get(`/reports/worker-summary/${workerId}`, { params }),

  getAllWorkersSummary: (params?: { startDate?: string; endDate?: string }) => 
    api.get('/reports/all-workers-summary', { params }),

  exportOvertimeExcel: (year: number, month: number) =>
    api.get(`/reports/export/overtime/${year}/${month}`),
  
  exportWorkSummaryExcel: (params: { startDate: string; endDate: string }) =>
    api.get('/reports/export/work-summary', { params }),

  // Export using provided records (useful for exporting current UI state including unsaved deposits)
  exportWorkSummaryWithRecords: (data: { startDate?: string; endDate?: string; records?: any[] }) =>
    api.post('/reports/export/work-summary', data),
  
  saveSalaryHistory: (data: {
    periodStart: string;
    periodEnd: string;
    records: Array<{
      workerId: string;
      totalHoursWorked: number;
      totalPay: number;
      deposit: number;
      finalAmount: number;
    }>;
    notes?: string;
  }) => api.post('/reports/save-salary-history', data),
  
  getSalaryHistory: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/salary-history', { params }),
  
  getSalaryHistoryById: (id: string) =>
    api.get(`/reports/salary-history/${id}`),
  
  exportSalaryHistoryExcel: (historyId: string) =>
    api.get(`/reports/export/salary-history/${historyId}`),
};

export default api;
