export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

export interface Worker {
  totalAdvance: number;
  totalDeposit: number;
  _id: string;
  workerId: string;
  name: string;
  dailyWorkingHours: number;
  hourlyRate: number;
  bankDetails: BankDetails;
  isActive: boolean;
  advanceBalance: number;
  totalAdvanceTaken: number;
  totalAdvanceRepaid: number;
  totalEarnings: number;
  totalDaysWorked: number;
  totalDaysAbsent: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyEntry {
  _id: string;
  worker: {
    _id: string;
    name: string;
    workerId: string;
    hourlyRate?: number;
    dailyWorkingHours?: number;
  };
  date: string;
  status: 'present' | 'absent' | 'holiday' | 'half-day';
  hoursWorked: number;
  totalPay: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyWorkersData {
  date: string;
  isHoliday: boolean;
  holiday: Holiday | null;
  workers: {
    worker: {
      _id: string;
      name: string;
      workerId: string;
      hourlyRate: number;
      dailyWorkingHours: number;
    };
    entry: DailyEntry | null;
  }[];
}

export interface Advance {
  _id: string;
  worker: {
    _id: string;
    name: string;
    workerId: string;
    advanceBalance: number;
  };
  type: 'advance' | 'repayment' | 'deposit';
  amount: number;
  date: string;
  notes?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Payment {
  _id: string;
  worker: {
    _id: string;
    name: string;
    workerId: string;
  };
  amount: number;
  type: 'salary' | 'bonus' | 'advance_repayment' | 'other';
  date: string;
  periodStart?: string;
  periodEnd?: string;
  advanceDeducted: number;
  netAmount: number;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  note: string;
  date: string;
  createdAt: string;
}

export interface VaultSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
}

export interface Holiday {
  _id: string;
  date: string;
  name: string;
  description?: string;
}

export interface Bonus {
  _id: string;
  year: number;
  worker: string; // Just the ID in the list response
  baseAmount: number;
  totalDaysWorked: number;
  totalDaysAbsent: number;
  absentPenalty: number;
  advanceDeduction: number;
  finalAmount: number;
  amountPaid: number;
  paid: boolean;
  paidDate?: string;
  notes?: string;
}

export interface BonusSummary {
  year: number;
  totalWorkers: number;
  totalBonusAmount: number;
  totalBonusPaid: number;
  totalBonusPending: number;
  workersPaid: number;
  workersPending: number;
}

export interface WorkerPaymentSummary {
  worker: {
    _id: string;
    name: string;
    workerId: string;
    hourlyRate: number;
    advanceBalance: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalHours: number;
    totalPay: number;
    daysPresent: number;
    daysAbsent: number;
    advanceBalance: number;
  };
  entries: DailyEntry[];
}
