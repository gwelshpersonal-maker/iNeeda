
import { User, Shift } from '../types';
import { CATEGORY_RISK_MAPPING, RISK_LEVELS } from '../constants';

export type RiskGatingResult = {
  allowed: boolean;
  reason?: string;
  actionRequired?: 'UPLOAD_COI' | 'OPT_IN_SHIELD';
};

export const canProviderClaimJob = (provider: User, job: Shift): RiskGatingResult => {
  // Subscription Check
  if (provider.subscriptionStatus !== 'active' && !provider.isFoundersClub) {
    return { allowed: false, reason: "Active Pro Membership required to claim jobs." };
  }

  // 1. Skill Check
  // Note: Dashboard filter usually handles this, but middleware doubles check for security
  if (provider.skills && !provider.skills.includes(job.category)) {
    return { allowed: false, reason: "You are not authorized for this skill." };
  }

  // 2. High Risk Enforcement (Contingent Liability Model)
  const riskConfig = CATEGORY_RISK_MAPPING[job.category] || { risk: RISK_LEVELS.LOW };
  const isHighRisk = riskConfig.risk === RISK_LEVELS.HIGH;
  
  // Check COI status
  const hasValidOwnInsurance = provider.insuranceType === 'OWN_COI' && provider.isCoiVerified;
  
  // Check Expiry if present
  if (hasValidOwnInsurance && provider.coiExpiry) {
      if (new Date(provider.coiExpiry) < new Date()) {
          return {
              allowed: false,
              reason: "Your insurance certificate has expired.",
              actionRequired: 'UPLOAD_COI'
          };
      }
  }

  // Check Daily Shield status
  const isDailyShieldUser = provider.insuranceType === 'DAILY_SHIELD';

  if (isHighRisk) {
      // High-Risk Enforcement:
      // If provider DOES NOT have verified own insurance, they MUST use Daily Shield.
      
      if (hasValidOwnInsurance) {
          return { allowed: true };
      }
      
      if (isDailyShieldUser) {
          return { allowed: true }; 
      }
      
      // If neither, they are BLOCKED but can opt-in to Daily Shield immediately
      return {
          allowed: false,
          reason: "High-risk jobs require valid insurance or Daily Shield coverage.",
          actionRequired: 'OPT_IN_SHIELD' 
      };
  }

  return { allowed: true };
};
