import { FinancingDetails } from '@/lib/types/deal';

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// PRICE system (French amortization) - equal monthly payments
export function calculatePRICE(
  principal: number,
  annualRate: number,
  termYears: number
): { monthlyPayment: number; totalInterest: number; schedule: AmortizationRow[] } {
  const monthlyRate = annualRate / 100 / 12;
  const n = termYears * 12;

  if (monthlyRate === 0) {
    const monthlyPayment = principal / n;
    return {
      monthlyPayment,
      totalInterest: 0,
      schedule: Array.from({ length: n }, (_, i) => ({
        month: i + 1,
        payment: monthlyPayment,
        principal: monthlyPayment,
        interest: 0,
        balance: principal - monthlyPayment * (i + 1),
      })),
    };
  }

  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
    (Math.pow(1 + monthlyRate, n) - 1);

  const schedule: AmortizationRow[] = [];
  let balance = principal;

  for (let month = 1; month <= n; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPaid);
    schedule.push({ month, payment: monthlyPayment, principal: principalPaid, interest, balance });
  }

  const totalInterest = monthlyPayment * n - principal;
  return { monthlyPayment, totalInterest, schedule };
}

// SAC system (Constant Amortization) - common in Brazil (Caixa)
// Principal portion is constant; interest decreases over time; payment decreases
export function calculateSAC(
  principal: number,
  annualRate: number,
  termYears: number
): { firstPayment: number; lastPayment: number; avgPayment: number; totalInterest: number; schedule: AmortizationRow[] } {
  const monthlyRate = annualRate / 100 / 12;
  const n = termYears * 12;
  const amortization = principal / n;

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let month = 1; month <= n; month++) {
    const interest = balance * monthlyRate;
    const payment = amortization + interest;
    balance = Math.max(0, balance - amortization);
    totalInterest += interest;
    schedule.push({ month, payment, principal: amortization, interest, balance });
  }

  return {
    firstPayment: schedule[0].payment,
    lastPayment: schedule[n - 1].payment,
    avgPayment: (schedule[0].payment + schedule[n - 1].payment) / 2,
    totalInterest,
    schedule,
  };
}

// Get balance remaining at year Y
export function getLoanBalanceAtYear(
  schedule: AmortizationRow[],
  year: number
): number {
  const monthIndex = Math.min(year * 12, schedule.length) - 1;
  return monthIndex >= 0 ? schedule[monthIndex].balance : 0;
}

// Calculate financing details for a deal
export function calculateFinancing(financing: FinancingDetails): {
  monthlyPayment: number;
  totalInterest: number;
  effectiveAnnualRate: number;
  amortizationType: string;
  firstPayment?: number;
  lastPayment?: number;
  schedule: AmortizationRow[];
} {
  if (financing.financingType === 'cash') {
    return {
      monthlyPayment: 0,
      totalInterest: 0,
      effectiveAnnualRate: 0,
      amortizationType: 'Cash Purchase',
      schedule: [],
    };
  }

  const loan = financing.loanAmount;
  const rate = financing.interestRate;
  const term = financing.loanTermYears;

  if (financing.loanType === 'SAC') {
    const result = calculateSAC(loan, rate, term);
    return {
      monthlyPayment: result.avgPayment,
      totalInterest: result.totalInterest,
      effectiveAnnualRate: rate,
      amortizationType: 'SAC (Constant Amortization)',
      firstPayment: result.firstPayment,
      lastPayment: result.lastPayment,
      schedule: result.schedule,
    };
  }

  // Default: PRICE (French)
  const result = calculatePRICE(loan, rate, term);
  return {
    monthlyPayment: result.monthlyPayment,
    totalInterest: result.totalInterest,
    effectiveAnnualRate: rate,
    amortizationType: 'PRICE (French Amortization)',
    schedule: result.schedule,
  };
}
