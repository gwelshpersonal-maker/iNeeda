import React from 'react';
import { RateCategory } from '../types';
import { calculatePlatformFee } from '../utils/feeEngine';
import { ShieldCheck, DollarSign, PiggyBank } from 'lucide-react';

interface FeeBreakoutProps {
  grossAmount: number;
  rateCategory: RateCategory;
}

export const FeeBreakout: React.FC<FeeBreakoutProps> = ({ grossAmount, rateCategory }) => {
  const { platformFee, vendorNet } = calculatePlatformFee(grossAmount, rateCategory);

  const getTierLabel = (category: RateCategory) => {
    switch (category) {
      case 'RECURRING': return 'Recurring (8%)';
      case 'STANDARD': return 'Standard (15%)';
      case 'SPECIALIZED': return 'Specialized (15%, up to $60 max)';
      default: return 'Standard (15%)';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-sm w-full font-sans">
      <h3 className="text-lg font-extrabold text-navy-900 mb-4 pb-4 border-b border-slate-100 flex items-center">
        <DollarSign className="w-5 h-5 mr-2 text-slate-400" /> 
        Earnings Estimate
      </h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-medium">Job Bid (Gross)</span>
          <span className="font-bold text-navy-900">${grossAmount.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-slate-600 font-medium flex items-center">
              Platform Fee
            </span>
            <span className="text-xs text-slate-400 mt-1">{getTierLabel(rateCategory)}</span>
          </div>
          <span className="font-bold text-red-500">-${platformFee.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-emerald-50 rounded-xl p-4 flex justify-between items-center border border-emerald-100">
        <div className="flex items-center text-emerald-800 font-extrabold">
          <PiggyBank className="w-5 h-5 mr-2 text-emerald-600" />
          You Pocket
        </div>
        <span className="text-xl font-black text-emerald-600">${vendorNet.toFixed(2)}</span>
      </div>
      
      <p className="text-xs text-slate-400 mt-4 text-center px-4">
        <ShieldCheck className="w-3 h-3 inline mr-1" />
        Transparent platform fees fuel customer support and payment security.
      </p>
    </div>
  );
};
