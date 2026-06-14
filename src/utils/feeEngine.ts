
import { FeeBreakdown, ServiceCategory } from '../types';
import { CATEGORY_RISK_MAPPING, INSURANCE_FEES, RISK_LEVELS, ALL_SERVICE_CATEGORIES } from '../constants';

// PA Sales Tax info
export const TAXABLE_CATEGORIES: Record<ServiceCategory, boolean> = {
  CLEANING: true,            // Building maintenance
  LANDSCAPING: true,         // Lawn care
  GUTTER_CLEANING: true,     // Building maintenance
  PEST_CONTROL: true,        // Disinfecting/pest control
  AUTO: true,                // Motor vehicle repair
  COMPUTER: true,            // Tangible property repair
  FURNITURE_ASSEMBLY: true,  // Assembling tangible property
  POWER_WASHING: true,       // Building maintenance
  SMART_HOME_INSTALL: true,  // Tangible property setup
  MOVING: false,             // Freight/Moving generally non-taxable
  PLUMBING: false,           // Fixture to real estate (construction)
  CONSTRUCTION: false,       // Improvements to real estate
  HANDYMAN: false,           // Assuming mostly real estate repairs
  GENERAL_LABOR: false,      // Non-taxable
  JOBSITE_LABOR: false,      // Non-taxable
  WEB_APP_DEV: false         // Custom software not taxable in PA
};

// Returns { stateTax: number, localTax: number } as percentages
export const getSalesTaxRates = (address: string) => {
    const lowerAddress = address.toLowerCase();
    let localTax = 0;
    
    // Philadelphia adds 2% local sales tax
    if (lowerAddress.includes('philadelphia')) {
        localTax = 0.02;
    } 
    // Allegheny County (Pittsburgh) adds 1% local sales tax
    else if (lowerAddress.includes('pittsburgh') || lowerAddress.includes('allegheny')) {
        localTax = 0.01;
    }
    // Note: Harrisburg and other PA municipalities do NOT have a local sales tax surcharge. 
    // They only pay the 6% state tax.

    return {
        stateTax: 0.06,
        localTax: localTax
    };
};

/**
 * FeeCalculator logic for "iNeeda" 
 * Restored Actuals: 15% Platform Fee + Tiered ($3, $5, $12) Protection.
 */
export const calculateJobSplit = (
  jobAmount: number,
  category: ServiceCategory,
  hasOwnInsurance: boolean = false,
  isEmergency: boolean = false,
  platformFeePercent: number = 0.15,
  insuranceFeeValue: number | null = null,
  siteAddress: string = '',
  paymentMethod?: 'STRIPE' | 'ZELLE'
): FeeBreakdown => {
  
  // Custom or Base Platform Commission 
  let platformFee = jobAmount * platformFeePercent; 
  
  if (isEmergency) {
      const emergencyFeeTotal = 25;
      const platformEmergencyShare = emergencyFeeTotal * 0.40;
      platformFee += platformEmergencyShare;
  }
  
  // Tiered Protection Fee 
  let baseProtectionFee = 3.00;
  if (insuranceFeeValue !== null) {
      baseProtectionFee = insuranceFeeValue;
  } else {
      const mapping = (CATEGORY_RISK_MAPPING as any)[category];
      const riskLevel = mapping ? mapping.risk : RISK_LEVELS.LOW;
      baseProtectionFee = (INSURANCE_FEES as any)[riskLevel] || 3.00;
  }
  
  const protectionFee = hasOwnInsurance ? 0 : baseProtectionFee;
  
  // Calculate Stripe fee (estimate 2.9% + $0.30)
  // But if Zelle, it's $0.
  let stripeProcessingFee = 0;
  if (paymentMethod !== 'ZELLE') {
      stripeProcessingFee = 0; // The instruction says "set the stripeProcessingFee to $0. It must output a 'Net to Provider' amount that reflects the full bid minus only the platform's cut." Wait! "whereas Stripe may incur monthly subscription costs". Maybe stripe processing fee is currently just 0, but we explicitly set it? Wait, let's keep it 0 as the instructions didn't specify adding a stripe fee for regular jobs, but just returning 0. Let's make sure providerNet = jobAmount - platformFee (if Zelle). Wait! If Zelle, no protection fee? No, the instruction says "reflects the full bid minus only the platform's cut". I will adjust providerNet accordingly.
  }

  // If Zelle, is protection fee waived? "full bid minus only the platform's cut".
  const totalDeductions = paymentMethod === 'ZELLE' ? platformFee : (platformFee + protectionFee + stripeProcessingFee);
  const providerNet = jobAmount - totalDeductions;

  // Tax Estimate (2026 Suggestion: 20% for self-withholding)
  const taxHoldbackEstimate = providerNet * 0.20;

  // Total Markup / Take Rate Percentage
  const totalMarkup = platformFee + protectionFee;
  const markupPercentage = (totalMarkup / jobAmount) * 100;

  // --- SALES TAX CALCULATION (CHARGED TO CLIENT) ---
  const isTaxable = TAXABLE_CATEGORIES[category as keyof /* type hole */ typeof TAXABLE_CATEGORIES] ?? false;
  let stateSalesTaxAmount = 0;
  let localSalesTaxAmount = 0;

  if (isTaxable) {
      const rates = getSalesTaxRates(siteAddress);
      stateSalesTaxAmount = jobAmount * rates.stateTax;
      localSalesTaxAmount = jobAmount * rates.localTax;
  }

  const totalSalesTaxAmount = stateSalesTaxAmount + localSalesTaxAmount;
  const clientTotalAmount = jobAmount + totalSalesTaxAmount;

  return {
    grossAmount: jobAmount,
    platformFee: Number(platformFee.toFixed(2)),
    insuranceFee: Number(protectionFee.toFixed(2)),
    stripeProcessingFee: Number(stripeProcessingFee.toFixed(2)),
    providerNet: Number(providerNet.toFixed(2)),
    taxHoldbackEstimate: Number(taxHoldbackEstimate.toFixed(2)),
    markupPercentage: Number(markupPercentage.toFixed(2)),
    
    isTaxable,
    stateSalesTaxAmount: Number(stateSalesTaxAmount.toFixed(2)),
    localSalesTaxAmount: Number(localSalesTaxAmount.toFixed(2)),
    totalSalesTaxAmount: Number(totalSalesTaxAmount.toFixed(2)),
    clientTotalAmount: Number(clientTotalAmount.toFixed(2))
  };
};
