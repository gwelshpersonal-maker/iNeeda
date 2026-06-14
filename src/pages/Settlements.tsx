
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Shift, ShiftStatus, Role, ServiceCategory, CategoryRule, EscrowStatus } from '../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Download, Check, AlertTriangle, FileText, Calendar, Mail, Wallet, Star, DollarSign, Clock, Info, ShieldCheck, Settings, Save, X, ToggleLeft, ToggleRight, Briefcase, CreditCard, Lock, PauseCircle, Scale, Image as ImageIcon, ArrowRight, ShieldAlert, Activity, AlertOctagon, Eye } from 'lucide-react';
import { ALL_SERVICE_CATEGORIES } from '../constants';
import { calculateMarketMetrics } from '../utils/financialMetrics';
import { AdminPayouts } from '../components/AdminPayouts';

export const Settlements = () => {
  const { shifts, updateShift, users, platformConfig, updatePlatformConfig, addNotification, serviceCategories } = useData();
  const { currentUser } = useAuth();
  
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState(platformConfig);

  // Dispute Modal
  const [disputeJob, setDisputeJob] = useState<Shift | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [resolutionRefund, setResolutionRefund] = useState<number>(0);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Job Detail/Feedback Modal
  const [viewJob, setViewJob] = useState<Shift | null>(null);

  // Initialize date range to current month
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const isAdmin = currentUser?.role === Role.ADMIN;
  const isProvider = currentUser?.role === Role.PROVIDER;

  // --- Calculations ---
  
  // Market Health Metrics (Command Center)
  const metrics = calculateMarketMetrics(shifts, users);

  const calculateFees = (shift: Shift) => {
      // 1. Determine Platform Fee %
      // Use stored snapshot if available (for historical accuracy), otherwise use current config
      // SAFETY: If feePercent is > 1 (e.g. 15), it was stored as integer % instead of decimal. 
      let feePercent = shift.appliedPlatformFee !== undefined 
          ? shift.appliedPlatformFee 
          : (platformConfig[shift.category]?.platformFeePercent || 20) / 100;
      
      if (feePercent > 1) feePercent = feePercent / 100;

      // 2. Determine Insurance Deduction
      let insuranceAmount = 0;
      let insuranceLabel = '-';

      if (shift.insuranceOptIn) {
          if (shift.appliedInsuranceFee !== undefined) {
              insuranceAmount = shift.appliedInsuranceFee;
              insuranceLabel = `$${insuranceAmount.toFixed(2)}`;
          } else {
              const rule = platformConfig[shift.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
              const gross = shift.price || 0;
              if (rule.type === 'PERCENTAGE') {
                  insuranceAmount = gross * (rule.value / 100);
                  insuranceLabel = `(${rule.value}%)`;
              } else {
                  insuranceAmount = rule.value;
                  insuranceLabel = `(Flat)`;
              }
          }
      }

      // Base Gross is the Original Price
      const baseGross = shift.price || 0;
      
      // Effective Gross is reduced by any refunds given to the client
      const refund = shift.refundAmount || 0;
      const effectiveGross = baseGross - refund;

      // Fees are calculated on the Base Gross (Platform takes its cut on the deal value) 
      // OR Effective Gross? Usually platforms take fee on what was actually paid out/processed.
      // Let's assume Platform Fee is adjusted if refund happens, to be fair to provider.
      const platformFeeAmount = effectiveGross * feePercent;
      
      const net = effectiveGross - platformFeeAmount - insuranceAmount;

      return {
          gross: baseGross,
          effectiveGross,
          refund,
          feePercent,
          platformFeeAmount,
          insuranceAmount,
          insuranceLabel,
          net
      };
  };

  const getFilteredShifts = () => {
    return shifts.filter(s => {
      // Must be COMPLETED or VERIFIED
      if (s.status !== ShiftStatus.COMPLETED && s.status !== ShiftStatus.VERIFIED) return false;
      
      // If provider is viewing, only show their own shifts
      if (currentUser?.role === Role.PROVIDER && s.userId !== currentUser.id) return false;

      const completionDate = s.completedAt ? new Date(s.completedAt) : s.end; // Fallback to end date if completion not tracked
      
      const [startY, startM, startD] = startDate.split('-').map(Number);
      const [endY, endM, endD] = endDate.split('-').map(Number);
      
      const start = new Date(startY, startM - 1, startD);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endY, endM - 1, endD);
      end.setHours(23, 59, 59, 999);

      return isWithinInterval(completionDate, { start, end });
    });
  };

  const filteredShifts = getFilteredShifts();

  const handleMarkPaid = (shift: Shift) => {
      if (shift.escrowStatus === 'DISPUTED' || shift.isDisputed) {
          alert("Cannot payout a disputed job. Resolve the dispute first.");
          return;
      }
      if (confirm(`Mark ${shift.description} as SETTLED? This confirms funds have been transferred to the provider.`)) {
          updateShift({
              ...shift,
              isPaid: true,
              escrowStatus: 'RELEASED'
          });
      }
  };

  const handleOpenDispute = (shift: Shift) => {
      setDisputeJob(shift);
      setDisputeReason(shift.disputeReason || '');
      setResolutionRefund(shift.refundAmount || 0);
      setResolutionNotes(shift.resolutionNotes || '');
  };

  const handleFreezePayout = () => {
      if (!disputeJob || !disputeReason) return;
      
      // Audit Point C: Admin Kill Switch
      // This sets the isDisputed flag to true, which the Silent Release logic in DataContext watches for.
      updateShift({
          ...disputeJob,
          escrowStatus: 'DISPUTED',
          isDisputed: true,
          disputeReason: disputeReason
      });

      // Notify Provider
      if (disputeJob.userId) {
          addNotification({
              id: `dispute_${Date.now()}`,
              targetUserId: disputeJob.userId,
              type: 'ALERT',
              message: `Payout Halted: Dispute opened for "${disputeJob.description}". Reason: ${disputeReason}. An admin will review shortly.`,
              timestamp: new Date(),
              read: false
          });
      }

      setDisputeJob(null);
      alert("Circuit Breaker Activated: Payout frozen and 48h auto-release timer paused.");
  };

  const handleResolveDispute = () => {
      if (!disputeJob) return;

      const isRefund = resolutionRefund > 0;
      const isFullRefund = resolutionRefund >= (disputeJob.price || 0);
      
      updateShift({
          ...disputeJob,
          escrowStatus: isFullRefund ? 'REFUNDED' : (isRefund ? 'PARTIAL_REFUND' : 'SECURED'), // If resolved with 0 refund, goes back to SECURED (ready for payout)
          isDisputed: false, // Clear the lock
          refundAmount: resolutionRefund,
          resolutionNotes: resolutionNotes,
          isPaid: false // Ensure it's not marked paid yet, Admin must click "Pay" manually to confirm transfer of remaining funds
      });

      setDisputeJob(null);
      alert(`Dispute resolved. Refund: $${resolutionRefund}. Payout is now unlocked for processing.`);
  };

  const handleBidUp = (gig: Shift) => {
      updateShift({
          ...gig,
          price: (gig.price || 0) + 20,
          isBoosted: true,
          createdAt: new Date() // Refresh timestamp to appear new
      });
      alert(`Bid increased by $20 for ${gig.description}`);
  };

  const exportCSV = () => {
    if (filteredShifts.length === 0) {
      alert("No completed jobs found for the selected date range.");
      return;
    }

    const headers = "Provider,Client,Date,Category,Description,Status,Gross Pay,Refund,Platform Fee %,Platform Fee $,Insurance Fee,Net Payout\n";
    const rows = filteredShifts.map(s => {
        const provider = users.find(u => u.id === s.userId);
        const client = users.find(u => u.id === s.clientId);
        const financials = calculateFees(s);
        
        return `${provider?.name},${client?.name},${format(s.completedAt || s.end, 'yyyy-MM-dd')},${s.category},${s.description},${s.status},${financials.gross.toFixed(2)},${financials.refund.toFixed(2)},${(financials.feePercent * 100).toFixed(1)}%,${financials.platformFeeAmount.toFixed(2)},${financials.insuranceAmount.toFixed(2)},${financials.net.toFixed(2)}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlement_report_${startDate}_${endDate}.csv`;
    a.click();
  };

  // --- Admin Configuration Logic ---

  const handleConfigSave = () => {
      updatePlatformConfig(tempConfig);
      setIsConfigModalOpen(false);
      alert("Category financial settings updated successfully.");
  };

  const updateCategoryRule = (category: ServiceCategory, field: keyof CategoryRule, value: any) => {
      setTempConfig(prev => ({
          ...prev,
          [category]: {
              ...prev[category],
              [field]: value
          }
      }));
  };

  const updateInsuranceRuleDeep = (category: ServiceCategory, field: 'type' | 'value', value: any) => {
      setTempConfig(prev => ({
          ...prev,
          [category]: {
              ...prev[category],
              insuranceRule: {
                  ...prev[category].insuranceRule,
                  [field]: value
              }
          }
      }));
  };

  const safeShowPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      if (e.currentTarget.showPicker) {
        e.currentTarget.showPicker();
      }
    } catch (err) {
      console.warn("showPicker error:", err);
    }
  };

  // Calculate totals for summary cards (Provider View mainly)
  const totalGross = filteredShifts.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const totalPlatformFees = filteredShifts.reduce((acc, curr) => acc + calculateFees(curr).platformFeeAmount, 0);
  const totalInsuranceFees = filteredShifts.reduce((acc, curr) => acc + calculateFees(curr).insuranceAmount, 0);
  const totalNet = filteredShifts.reduce((acc, curr) => acc + calculateFees(curr).net, 0);
  
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Settlement Command Center</h1>
            <p className="text-slate-500 mt-1">Manage float, disputes, and market liquidity.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            {isAdmin && (
                <button 
                    onClick={() => { setTempConfig(platformConfig); setIsConfigModalOpen(true); }}
                    className="flex-1 sm:flex-none flex items-center justify-center px-5 py-2.5 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-all shadow-md hover:-translate-y-0.5 text-sm font-bold"
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Category Manager
                </button>
            )}

            <div className="flex items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-1 sm:flex-none">
                <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-2 pointer-events-none" />
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={safeShowPicker}
                    className="text-sm border-none focus:ring-0 bg-transparent text-navy-900 font-bold outline-none w-full sm:w-auto cursor-pointer"
                />
                <span className="text-slate-300 mx-2 font-light">to</span>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={safeShowPicker}
                    className="text-sm border-none focus:ring-0 bg-transparent text-navy-900 font-bold outline-none w-full sm:w-auto cursor-pointer"
                />
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={exportCSV}
                    className="flex-1 sm:flex-none flex items-center justify-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 text-sm font-bold"
                >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                </button>
            </div>
        </div>
      </div>

      {/* ADMIN COMMAND CENTER */}
      {isAdmin && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* ZONE A: RED ZONE (Immediate Action) */}
              <div className="bg-red-50 rounded-2xl border border-red-100 p-6 flex flex-col">
                  <h3 className="text-lg font-bold text-red-800 flex items-center mb-4">
                      <AlertOctagon className="w-5 h-5 mr-2" /> Red Zone: Immediate Action
                  </h3>
                  
                  <div className="space-y-4 flex-1">
                      {/* Active Disputes */}
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-red-600 uppercase">Active Disputes</span>
                              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{metrics.disputedGigs.length}</span>
                          </div>
                          {metrics.disputedGigs.length === 0 ? (
                              <p className="text-sm text-slate-400">No active disputes. All good!</p>
                          ) : (
                              <div className="space-y-2">
                                  {metrics.disputedGigs.map(gig => (
                                      <div key={gig.id} className="flex justify-between items-center text-sm border-b border-red-50 pb-2 last:border-0 last:pb-0">
                                          <div className="truncate pr-2">
                                              <span className="font-bold text-navy-900 block">{gig.description}</span>
                                              <span className="text-xs text-red-500 truncate block">{gig.disputeReason}</span>
                                          </div>
                                          <button onClick={() => handleOpenDispute(gig)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Resolve</button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* Stale Gigs */}
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-amber-600 uppercase">Stale Gigs ({'>'}4h)</span>
                              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{metrics.staleGigsCount}</span>
                          </div>
                          {metrics.staleGigs.length === 0 ? (
                              <p className="text-sm text-slate-400">Market is moving fast. No stale gigs.</p>
                          ) : (
                              <div className="space-y-2">
                                  {metrics.staleGigs.slice(0, 3).map(gig => (
                                      <div key={gig.id} className="flex justify-between items-center text-sm border-b border-amber-50 pb-2 last:border-0 last:pb-0">
                                          <div className="truncate pr-2">
                                              <span className="font-bold text-navy-900">{gig.category}</span>
                                              <span className="text-xs text-slate-500 block">${gig.price} - 0 bids</span>
                                          </div>
                                          <span className="text-xs text-slate-400 italic">No bids yet</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* ZONE B: ESCROW LEDGER */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
                  <h3 className="text-lg font-bold text-navy-900 flex items-center mb-4">
                      <Wallet className="w-5 h-5 mr-2 text-blue-600" /> Escrow Ledger
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Escrow Float (In Flight)</p>
                          <p className="text-3xl font-black text-navy-900 mt-1">${metrics.escrowFloat.toFixed(2)}</p>
                          <p className="text-xs text-slate-500 mt-1">Funds currently held on Client cards.</p>
                      </div>

                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Insurance Reserve</p>
                          <p className="text-3xl font-black text-navy-900 mt-1">${metrics.insuranceReserve.toFixed(2)}</p>
                          <p className="text-xs text-slate-500 mt-1">Daily Shield fees collected (Risk Capital).</p>
                      </div>
                  </div>
              </div>

              {/* ZONE C: PIPELINE & COMPLIANCE */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
                  <h3 className="text-lg font-bold text-navy-900 flex items-center mb-4">
                      <ShieldCheck className="w-5 h-5 mr-2 text-gold-500" /> The "Pro" Pipeline
                  </h3>
                  
                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                              <p className="text-sm font-bold text-navy-900">Dispute Rate</p>
                              <p className="text-xs text-slate-500">Target: {'<'} 2%</p>
                          </div>
                          <div className={`text-xl font-black ${metrics.disputeRate > 2 ? 'text-red-500' : 'text-green-500'}`}>
                              {metrics.disputeRate.toFixed(1)}%
                          </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                              <p className="text-sm font-bold text-navy-900">Pending COIs</p>
                              <p className="text-xs text-slate-500">Require manual review</p>
                          </div>
                          <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">{metrics.pendingCOIsCount}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                              <p className="text-sm font-bold text-navy-900">Daily Shield Users</p>
                              <p className="text-xs text-slate-500">Auto-insured pros</p>
                          </div>
                          <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">{metrics.dailyShieldUsersCount}</span>
                      </div>
                  </div>
              </div>

              {/* ZONE D: ADMIN PAYOUTS (QUICK ACTION) */}
              <div className="xl:col-span-3">
                  <AdminPayouts />
              </div>
          </div>
      )}

      {/* Provider View (Earnings Summary) - kept from previous but simplified if admin */}
      {!isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Total Gross</p>
                <p className="text-3xl font-extrabold text-slate-700">${totalGross.toFixed(2)}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full z-0"></div>
                 <div className="relative z-10">
                    <p className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-2">My Deductions</p>
                    <p className="text-3xl font-extrabold text-blue-700">${(totalPlatformFees + totalInsuranceFees).toFixed(2)}</p>
                    <p className="text-[10px] text-blue-400 mt-1">Fees & Insurance</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 relative overflow-hidden group">
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs text-amber-600 uppercase font-bold tracking-wider">Pending Payout</p>
                    </div>
                    <p className="text-3xl font-extrabold text-amber-500 flex items-center">
                        ${filteredShifts.filter(s => s.status === ShiftStatus.VERIFIED && !s.isPaid).reduce((acc, curr) => acc + calculateFees(curr).net, 0).toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
                 <div className="relative z-10">
                    <p className="text-xs text-emerald-700 uppercase font-bold tracking-wider flex items-center mb-2">
                        <Wallet className="w-4 h-4 mr-1.5" /> Total Net Payout
                    </p>
                    <p className="text-3xl font-black text-emerald-800">${totalNet.toFixed(2)}</p>
                </div>
            </div>
          </div>
      )}

      {/* Shift Table (Shared View) */}
      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Job Details</th>
                        <th className="px-6 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Provider</th>
                        <th className="px-6 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs text-right">Gross</th>
                        <th className="px-6 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs text-right">Net Pay</th>
                        <th className="px-6 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredShifts.length > 0 ? (
                        filteredShifts.map(shift => {
                            const provider = users.find(u => u.id === shift.userId);
                            const financials = calculateFees(shift);
                            const isDisputed = shift.escrowStatus === 'DISPUTED' || shift.isDisputed;
                            
                            return (
                                <tr key={shift.id} className={`transition-colors ${isDisputed ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50/80'}`}>
                                    <td className="px-6 py-5">
                                        <div className="text-xs text-slate-500 font-bold mb-1">{format(shift.completedAt || shift.end, 'MMM d')}</div>
                                        <div className="font-bold text-navy-900 text-sm">{shift.category}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-[150px]">{shift.description}</div>
                                    </td>
                                    <td className="px-6 py-5 font-bold text-navy-900">{provider?.name}</td>
                                    
                                    <td className="px-6 py-5 font-mono text-slate-700 font-medium text-right">
                                        ${financials.gross.toFixed(2)}
                                    </td>
                                    
                                    <td className="px-6 py-5 font-mono text-emerald-600 font-black text-base text-right">
                                        ${financials.net.toFixed(2)}
                                    </td>
                                    
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2 items-center">
                                            {isDisputed ? (
                                                <span className="inline-flex items-center text-[10px] text-red-700 font-bold bg-white px-2.5 py-1.5 rounded-lg border border-red-200 uppercase tracking-wide">
                                                    <Lock className="w-3 h-3 mr-1" /> Disputed
                                                </span>
                                            ) : shift.isPaid ? (
                                                <span className="inline-flex items-center text-[10px] text-green-700 font-bold bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100 uppercase tracking-wide">
                                                    <Check className="w-3 h-3 mr-1" /> Paid
                                                </span>
                                            ) : (
                                                isAdmin && (
                                                    <button 
                                                        onClick={() => handleMarkPaid(shift)}
                                                        className="text-[10px] bg-navy-900 text-white px-3 py-1.5 rounded-lg hover:bg-navy-800 font-bold shadow-sm inline-flex items-center"
                                                    >
                                                        <DollarSign className="w-3 h-3 mr-1" /> Pay
                                                    </button>
                                                )
                                            )}
                                            
                                            <button 
                                                onClick={() => setViewJob(shift)}
                                                className="p-1.5 text-slate-400 hover:text-navy-600 hover:bg-white rounded-lg transition-colors"
                                                title="View Job Report & Feedback"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                                <p className="font-medium">No settlements found for this period.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Admin Dispute/Circuit Breaker Modal */}
      {disputeJob && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="bg-red-50 p-6 border-b border-red-100 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-red-800 flex items-center">
                          <AlertTriangle className="w-6 h-6 mr-3" /> Dispute Management
                      </h2>
                      <button onClick={() => setDisputeJob(null)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-400 hover:text-red-700">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                          <h3 className="font-bold text-navy-900 mb-2">{disputeJob.category}: {disputeJob.description}</h3>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-500">Provider: {users.find(u => u.id === disputeJob.userId)?.name}</span>
                              <span className="font-bold text-navy-900">${disputeJob.price}</span>
                          </div>
                          {disputeJob.stripePaymentIntentId && (
                              <div className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                                  Stripe ID: {disputeJob.stripePaymentIntentId}
                              </div>
                          )}
                      </div>

                      {/* Photo Evidence Section */}
                      <div className="mb-6 grid grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center"><ImageIcon className="w-3 h-3 mr-1"/> Pre-Work Photos</p>
                              {disputeJob.preWorkPhotos && disputeJob.preWorkPhotos.length > 0 ? (
                                  <div className="flex gap-2 overflow-x-auto">
                                      {disputeJob.preWorkPhotos.map((p, i) => (
                                          <img key={i} src={p} className="w-16 h-16 object-cover rounded-lg border border-slate-200" alt="pre" />
                                      ))}
                                  </div>
                              ) : <p className="text-xs text-slate-400 italic">None provided</p>}
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center"><ImageIcon className="w-3 h-3 mr-1"/> Completion Photos</p>
                              {disputeJob.completionPhotos && disputeJob.completionPhotos.length > 0 ? (
                                  <div className="flex gap-2 overflow-x-auto">
                                      {disputeJob.completionPhotos.map((p, i) => (
                                          <img key={i} src={p} className="w-16 h-16 object-cover rounded-lg border border-slate-200" alt="post" />
                                      ))}
                                  </div>
                              ) : <p className="text-xs text-slate-400 italic">None provided</p>}
                          </div>
                      </div>

                      {/* Determine Mode: Freeze or Resolve */}
                      {!disputeJob.isDisputed ? (
                          <div className="space-y-4">
                              <label className="block text-sm font-bold text-navy-900">Reason for Freezing Payout</label>
                              <textarea 
                                  className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                  placeholder="e.g. Client reported damage to property..."
                                  value={disputeReason}
                                  onChange={e => setDisputeReason(e.target.value)}
                              />
                              <button 
                                  onClick={handleFreezePayout}
                                  disabled={!disputeReason}
                                  className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 disabled:opacity-50"
                              >
                                  <Lock className="w-4 h-4 mr-2 inline" /> Activate Circuit Breaker
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              <div className="bg-red-50 p-3 rounded-lg text-xs text-red-800 border border-red-100">
                                  <strong>Current Status:</strong> Frozen. Reason: "{disputeJob.disputeReason}"
                              </div>

                              <div className="space-y-4">
                                  <h4 className="font-bold text-navy-900 border-b border-slate-100 pb-2">Resolution: Split the Difference</h4>
                                  
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Refund to Client ($)</label>
                                      <input 
                                          type="number"
                                          className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-navy-500"
                                          value={resolutionRefund}
                                          onChange={e => setResolutionRefund(parseFloat(e.target.value))}
                                          max={disputeJob.price}
                                      />
                                      <div className="flex justify-between text-xs mt-2 font-medium">
                                          <span className="text-slate-500">Job Total: ${disputeJob.price}</span>
                                          <span className="text-emerald-600">Provider keeps: ${(disputeJob.price || 0) - resolutionRefund} (less fees)</span>
                                      </div>
                                  </div>

                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Resolution Notes</label>
                                      <textarea 
                                          className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-navy-500 outline-none"
                                          placeholder="Explain the resolution decision..."
                                          value={resolutionNotes}
                                          onChange={e => setResolutionNotes(e.target.value)}
                                      />
                                  </div>

                                  <button 
                                      onClick={handleResolveDispute}
                                      className="w-full py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 shadow-lg flex items-center justify-center"
                                  >
                                      <Scale className="w-4 h-4 mr-2" /> 
                                      {resolutionRefund > 0 ? `Issue Partial Refund ($${resolutionRefund}) & Release Rest` : 'Dismiss Dispute & Release Funds'}
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* JOB REPORT MODAL (Feedback Viewer) */}
      {viewJob && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                      <div>
                          <h2 className="text-xl font-extrabold text-navy-900">Job Record</h2>
                          <p className="text-xs text-slate-500 font-mono mt-1 uppercase">ID: {viewJob.id}</p>
                      </div>
                      <button onClick={() => setViewJob(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      
                      {/* Job Header Info */}
                      <div className="flex justify-between items-start">
                          <div>
                              <span className="text-[10px] font-bold bg-navy-100 text-navy-700 px-2 py-1 rounded uppercase tracking-wider">{viewJob.category}</span>
                              <h3 className="font-bold text-navy-900 mt-2 text-lg">{viewJob.description}</h3>
                              <p className="text-xs text-slate-500 mt-1">{format(viewJob.completedAt || new Date(), 'PP p')}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-2xl font-black text-emerald-600">${viewJob.price?.toFixed(2)}</p>
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Gross Amount</span>
                          </div>
                      </div>

                      <hr className="border-slate-100"/>

                      {/* Financial Settlement Section */}
                      <div>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                              <DollarSign className="w-4 h-4 mr-2" /> Financial Settlement
                          </h4>
                          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                              {(() => {
                                  const fin = calculateFees(viewJob);
                                  return (
                                      <>
                                          <div className="flex justify-between items-center text-sm">
                                              <span className="text-slate-500">Gross Job Value</span>
                                              <span className="font-bold text-navy-900">${fin.gross.toFixed(2)}</span>
                                          </div>
                                          {fin.refund > 0 && (
                                              <div className="flex justify-between items-center text-sm text-red-600">
                                                  <span>Client Refund issued</span>
                                                  <span className="font-bold">-${fin.refund.toFixed(2)}</span>
                                              </div>
                                          )}
                                          <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-sm font-bold text-navy-900">
                                              <span>Adjusted Gross</span>
                                              <span>${fin.effectiveGross.toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-sm">
                                              <span className="text-slate-500">Platform Fee ({(fin.feePercent * 100).toFixed(1)}%)</span>
                                              <span className="text-slate-700">-${fin.platformFeeAmount.toFixed(2)}</span>
                                          </div>
                                          {fin.insuranceAmount > 0 && (
                                              <div className="flex justify-between items-center text-sm">
                                                  <span className="text-slate-500">Daily Shield Insurance</span>
                                                  <span className="text-slate-700">-${fin.insuranceAmount.toFixed(2)}</span>
                                              </div>
                                          )}
                                          <div className="pt-3 mt-1 border-t-2 border-slate-100 flex justify-between items-center">
                                              <span className="text-base font-bold text-navy-900">Net Provider Payout</span>
                                              <span className="text-xl font-black text-emerald-600">${fin.net.toFixed(2)}</span>
                                          </div>
                                      </>
                                  );
                              })()}
                          </div>
                          {isProvider && (
                              <p className="text-[10px] text-slate-400 mt-3 text-center">
                                  Payouts are automatically released 48h after job verification unless a dispute is filed.
                              </p>
                          )}
                      </div>

                      <hr className="border-slate-100"/>

                      {/* Client Review Section */}
                      <div>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                              <Star className="w-4 h-4 mr-2" /> Client Review
                          </h4>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <div className="flex items-center mb-2">
                                  <div className="flex text-gold-400">
                                      {[1, 2, 3, 4, 5].map(star => (
                                          <Star key={star} className={`w-4 h-4 ${star <= (viewJob.clientRating || 0) ? 'fill-current' : 'text-slate-200'}`} />
                                      ))}
                                  </div>
                                  <span className="ml-2 text-xs font-bold text-slate-500">
                                      {viewJob.clientRating ? `${viewJob.clientRating}/5` : 'No Rating'}
                                  </span>
                              </div>
                              <p className="text-sm text-navy-800 italic">
                                  "{viewJob.clientFeedback || 'No written feedback provided.'}"
                              </p>
                          </div>
                      </div>

                      {/* Provider Report Section */}
                      <div>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                              <Briefcase className="w-4 h-4 mr-2" /> Provider Report
                          </h4>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <p className="text-sm text-navy-800 mb-4 whitespace-pre-wrap">
                                  {viewJob.providerFeedback || 'No completion notes provided.'}
                              </p>
                              
                              {/* Proof of Work Gallery */}
                              {viewJob.completionPhotos && viewJob.completionPhotos.length > 0 && (
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 mb-2">Proof of Work</p>
                                      <div className="flex gap-2 overflow-x-auto pb-2">
                                          {viewJob.completionPhotos.map((p, i) => (
                                              <img key={i} src={p} className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-sm" alt="proof" />
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      )}

      {/* Config Modal (Hidden for brevity, existing code) */}
      {isConfigModalOpen && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h2 className="text-2xl font-extrabold text-navy-900 flex items-center">
                              <Briefcase className="w-6 h-6 mr-3 text-gold-500" />
                              Category Financial Manager
                          </h2>
                      </div>
                      <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                          <X className="w-6 h-6 text-slate-400 hover:text-navy-900" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                      <div className="grid grid-cols-1 gap-4">
                          {serviceCategories.map(categoryObj => {
                              const category = categoryObj.id;
                              const config = tempConfig[category] || { platformFeePercent: 20, insuranceRule: { type: 'FLAT', value: 2.00 }, requiresInsurance: false };
                              return (
                                  <div key={category} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6 transition-all hover:border-blue-200 hover:shadow-md">
                                      <div className="w-full md:w-1/4">
                                          <h3 className="font-bold text-navy-900 text-lg">{categoryObj.name}</h3>
                                          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">ID: {category}</span>
                                      </div>
                                      {/* Platform Fee Config */}
                                      <div className="flex-1 border-l border-slate-100 pl-6">
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Platform Commission</label>
                                          <div className="flex items-center gap-2">
                                              <input 
                                                  type="number" min="0" max="100" value={config.platformFeePercent}
                                                  onChange={(e) => updateCategoryRule(category, 'platformFeePercent', parseFloat(e.target.value))}
                                                  className="w-20 p-2 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-navy-900 outline-none focus:ring-2 focus:ring-gold-400"
                                              />
                                              <span className="text-sm font-bold text-slate-700">%</span>
                                          </div>
                                      </div>
                                      {/* Insurance Config */}
                                      <div className="flex-1 border-l border-slate-100 pl-6">
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                                              <ShieldCheck className="w-3 h-3 mr-1 text-blue-500" /> Daily Shield Rate
                                          </label>
                                          <div className="flex items-center gap-2">
                                              <select 
                                                  value={config.insuranceRule.type}
                                                  onChange={(e) => updateInsuranceRuleDeep(category, 'type', e.target.value as 'FLAT' | 'PERCENTAGE')}
                                                  className="text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                                              >
                                                  <option value="FLAT">Flat Rate ($)</option>
                                                  <option value="PERCENTAGE">Percentage (%)</option>
                                              </select>
                                              <input 
                                                  type="number" step="0.01" value={config.insuranceRule.value}
                                                  onChange={(e) => updateInsuranceRuleDeep(category, 'value', parseFloat(e.target.value))}
                                                  className="w-20 p-2 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                          </div>
                                      </div>
                                      {/* Gating Config */}
                                      <div className="flex-1 border-l border-slate-100 pl-6">
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Risk Gating</label>
                                          <button 
                                              onClick={() => updateCategoryRule(category, 'requiresInsurance', !config.requiresInsurance)}
                                              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${
                                                  config.requiresInsurance 
                                                  ? 'bg-red-50 border-red-200 text-red-700' 
                                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                                              }`}
                                          >
                                              {config.requiresInsurance ? <ToggleRight className="w-5 h-5 text-red-600" /> : <ToggleLeft className="w-5 h-5" />}
                                              <span className="text-xs font-bold">
                                                  {config.requiresInsurance ? 'Insurance Required' : 'Open Access'}
                                              </span>
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                      <button onClick={() => setIsConfigModalOpen(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
                      <button onClick={handleConfigSave} className="px-8 py-3 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-all shadow-lg font-bold flex items-center hover:-translate-y-0.5"><Save className="w-5 h-5 mr-2" /> Save Configuration</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
