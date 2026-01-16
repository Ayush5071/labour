export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

export interface Worker {
  _id: string;
  workerId: string;
  name: string;
  dailyWorkingHours: number;
  dailyPay: number;
  overtimeRate: number;
  bankDetails: BankDetails;
  isActive: boolean;
  totalEarnings: number;
  totalOvertimeHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyEntry {
  _id: string;
  worker: {
    _id: string;
    name: string;
    workerId: string;
  };
  date: string;
  hoursWorked: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeReport {
  month: number;
  year: number;
  report: {
    worker: Worker;
    totalOvertimeHours: number;
    totalOvertimePay: number;
    entries: {
      date: string;
      overtimeHours: number;
      overtimePay: number;
    }[];
  }[];
}

export interface WorkerSummary {
  totalEntries: number;
  totalHoursWorked: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalRegularPay: number;
  totalOvertimePay: number;
  totalPay: number;
  entries: DailyEntry[];
}
