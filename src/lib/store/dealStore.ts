'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Deal, DealAnalysis, BuyerProfile } from '@/lib/types/deal';

const DEFAULT_BUYER_PROFILE: BuyerProfile = {
  citizenshipStatus: 'foreigner',
  nationalities: [],
  taxResidency: 'OTHER',
  isRomanianPassportHolder: false,
  isEUCitizen: false,
  brazilianCPF: false,
  isCompanyPurchase: false,
  existingPropertiesInBrazil: 0,
  existingPropertiesAbroad: 0,
  isFirstHomeBuyer: false,
};

const DEFAULT_DEAL: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'New Deal',
  status: 'draft',
  buyerProfile: DEFAULT_BUYER_PROFILE,
  property: {
    address: '',
    city: '',
    neighborhood: '',
    state: 'SP',
    country: 'BR',
    propertyType: 'apartment',
    purchaseStrategy: 'buy-to-let',
    askingPrice: 0,
    currency: 'BRL',
    sizeSqm: 0,
    rooms: 2,
    bathrooms: 1,
    parkingSpaces: 1,
    condition: 'good',
    isNewDevelopment: false,
    hasHabitese: true,
  },
  financing: {
    financingType: 'mortgage',
    downPaymentAmount: 0,
    downPaymentPercent: 20,
    loanAmount: 0,
    interestRate: 10.5,
    loanTermYears: 20,
    loanType: 'SAC',
    usesFGTS: false,
    financedByMCMV: false,
  },
  rentalAssumptions: {
    strategy: 'long-term',
    ltr: {
      monthlyRent: 0,
      annualRentGrowthPercent: 5,
      vacancyRatePercent: 5,
      managementFeePercent: 8,
      maintenancePercent: 0.5,
      insurance: 0,
    },
    str: {
      avgNightlyRate: 0,
      occupancyRatePercent: 60,
      cleaningFeePerStay: 80,
      platformCommissionPercent: 15,
      managementFeePercent: 20,
      maintenancePercent: 0.8,
      insurance: 0,
      utilitiesMontly: 400,
      monthlyMultipliers: [],
    },
  },
  userOverrides: {},
};

interface DealStore {
  deals: Deal[];
  currentDeal: Deal | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Actions
  createDeal: () => Deal;
  updateDeal: (updates: Partial<Deal>) => void;
  updateBuyerProfile: (updates: Partial<BuyerProfile>) => void;
  setCurrentDeal: (deal: Deal | null) => void;
  saveDeal: () => void;
  deleteDeal: (id: string) => void;
  setAnalysis: (analysis: DealAnalysis) => void;
  setAnalyzing: (v: boolean) => void;
  setAnalysisError: (error: string | null) => void;
}

export const useDealStore = create<DealStore>()(
  persist(
    (set, get) => ({
      deals: [],
      currentDeal: null,
      isAnalyzing: false,
      analysisError: null,

      createDeal: () => {
        const deal: Deal = {
          ...DEFAULT_DEAL,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ currentDeal: deal });
        return deal;
      },

      updateDeal: (updates) => {
        set((state) => ({
          currentDeal: state.currentDeal
            ? { ...state.currentDeal, ...updates, updatedAt: new Date().toISOString() }
            : null,
        }));
      },

      updateBuyerProfile: (updates) => {
        set((state) => ({
          currentDeal: state.currentDeal
            ? {
                ...state.currentDeal,
                buyerProfile: { ...state.currentDeal.buyerProfile, ...updates },
                updatedAt: new Date().toISOString(),
              }
            : null,
        }));
      },

      setCurrentDeal: (deal) => set({ currentDeal: deal }),

      saveDeal: () => {
        const { currentDeal, deals } = get();
        if (!currentDeal) return;
        const existing = deals.findIndex((d) => d.id === currentDeal.id);
        if (existing >= 0) {
          const updated = [...deals];
          updated[existing] = currentDeal;
          set({ deals: updated });
        } else {
          set({ deals: [...deals, currentDeal] });
        }
      },

      deleteDeal: (id) => {
        set((state) => ({
          deals: state.deals.filter((d) => d.id !== id),
          currentDeal: state.currentDeal?.id === id ? null : state.currentDeal,
        }));
      },

      setAnalysis: (analysis) => {
        set((state) => ({
          currentDeal: state.currentDeal
            ? { ...state.currentDeal, analysis, status: 'complete' }
            : null,
        }));
      },

      setAnalyzing: (v) => set({ isAnalyzing: v }),
      setAnalysisError: (error) => set({ analysisError: error }),
    }),
    {
      name: 'checkdeal-store',
      partialize: (state) => ({ deals: state.deals }),
    }
  )
);
