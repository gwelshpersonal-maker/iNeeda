import { Shift, ShiftStatus, User } from '../types';

export function getProviderStats(providerId: string | undefined, shifts: Shift[], fallbackUser?: User) {
    if (!providerId) return { rating: '5.0', numericRating: 5.0, jobsCompleted: 0 };
    
    const proShifts = shifts.filter(s => 
        s.userId === providerId && (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
    );
    
    const completedJobsCount = proShifts.length > 0 ? proShifts.length : (fallbackUser?.jobsCompleted || 0);
    
    const shiftsWithRating = proShifts.filter(s => s.clientRating && s.clientRating > 0);
    let displayRating = '5.0';
    let numericRating = 5.0;
    
    if (shiftsWithRating.length > 0) {
        const sum = shiftsWithRating.reduce((acc, s) => acc + (s.clientRating || 0), 0);
        numericRating = sum / shiftsWithRating.length;
        displayRating = numericRating.toFixed(1);
    } else if (fallbackUser && fallbackUser.rating) {
        numericRating = fallbackUser.rating;
        displayRating = fallbackUser.rating.toFixed(1);
    }

    return { 
        rating: displayRating,
        numericRating,
        jobsCompleted: completedJobsCount 
    };
}
