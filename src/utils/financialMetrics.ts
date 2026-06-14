
import { Shift, ShiftStatus } from '../types';
import { differenceInHours } from 'date-fns';

export interface MarketHealthMetrics {
  escrowFloat: number;
  operatingRevenue: number; // Pure Platform Fee Revenue
  insuranceReserve: number; // Protection Reserve (Risk Capital)
  disputeRate: number;
  staleGigsCount: number;
  pendingCOIsCount: number;
  dailyShieldUsersCount: number;
  staleGigs: Shift[];
  disputedGigs: Shift[];
}

export const calculateMarketMetrics = (shifts: Shift[], users: any[]): MarketHealthMetrics => {
  // 1. Escrow Float: Sum of prices held in SECURED or DISPUTED status
  const escrowFloat = shifts
    .filter(s => s.escrowStatus === 'SECURED' || s.escrowStatus === 'DISPUTED')
    .reduce((sum, s) => sum + (s.price || 0), 0);

  // 2. Protection Reserve: Sum of collected insurance fees from completed/paid jobs
  // This helps show broker the deductible coverage reserve.
  const insuranceReserve = shifts
    .filter(s => s.escrowStatus === 'RELEASED' || s.escrowStatus === 'REFUNDED') 
    .reduce((sum, s) => sum + (s.appliedInsuranceFee || 0), 0);

  // 3. Operating Revenue: Sum of platform fees collected (15% etc)
  const operatingRevenue = shifts
    .filter(s => s.escrowStatus === 'RELEASED')
    .reduce((sum, s) => {
        // Calculate the platform fee portion. 
        // Note: s.price is Gross. appliedPlatformFee is the %. 
        const gross = s.price || 0;
        const feePercent = s.appliedPlatformFee || 0.15;
        return sum + (gross * feePercent);
    }, 0);

  // 4. Dispute Rate
  const disputedCount = shifts.filter(s => s.isDisputed).length;
  const totalCompletedOrActive = shifts.filter(s => s.status !== 'OPEN_REQUEST' && s.status !== 'PENDING').length;
  const disputeRate = totalCompletedOrActive > 0 ? (disputedCount / totalCompletedOrActive) * 100 : 0;

  // 5. Stale Gigs
  const staleGigs = shifts.filter(s => 
    s.status === ShiftStatus.OPEN_REQUEST && 
    differenceInHours(new Date(), s.createdAt || new Date()) > 4
  );

  // 6. Active Disputes
  const disputedGigs = shifts.filter(s => s.isDisputed || s.escrowStatus === 'DISPUTED');

  // 7. Compliance Stats
  const pendingCOIsCount = users.filter(u => u.role === 'PROVIDER' && u.insuranceType === 'OWN_COI' && !u.isCoiVerified && u.coiUrl).length;
  const dailyShieldUsersCount = users.filter(u => u.role === 'PROVIDER' && u.insuranceType === 'DAILY_SHIELD').length;

  return {
    escrowFloat,
    operatingRevenue,
    insuranceReserve,
    disputeRate,
    staleGigsCount: staleGigs.length,
    staleGigs,
    disputedGigs,
    pendingCOIsCount,
    dailyShieldUsersCount
  };
};
