import { Deal } from '@/lib/types/deal';
import { calculateBrazilTaxes, calculateBrazilRentalTax } from './brazil';
import { calculateIsraelTaxes, calculateIsraelRentalTax } from './israel';
import { calculateUSATaxes, calculateUSARentalTax } from './usa';

export function calculateTaxes(deal: Deal) {
  switch (deal.property.country) {
    case 'IL':
      return calculateIsraelTaxes(deal);
    case 'US':
      return calculateUSATaxes(deal);
    case 'BR':
    default:
      return calculateBrazilTaxes(deal);
  }
}

export function calculateRentalTax(
  deal: Deal,
  monthlyRent: number
): number {
  const { buyerProfile, property } = deal;
  const isForeigner = buyerProfile.citizenshipStatus === 'foreigner';
  const isCompany = buyerProfile.isCompanyPurchase;

  switch (property.country) {
    case 'IL':
      return calculateIsraelRentalTax(monthlyRent, isForeigner, isCompany);
    case 'US':
      return calculateUSARentalTax(monthlyRent, property.state, isForeigner, isCompany);
    case 'BR':
    default: {
      const isNonResident = isForeigner && !buyerProfile.brazilianCPF;
      return calculateBrazilRentalTax(monthlyRent, isNonResident, isCompany);
    }
  }
}
