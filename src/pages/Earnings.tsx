import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Shift, ShiftStatus, Role } from '../types';
import { format, isWithinInterval, startOfMonth, endOfMonth, differenceInMonths, addMonths } from 'date-fns';
import { Download, Shield, DollarSign, Wallet, Calendar, Briefcase, TrendingUp, CreditCard, CheckCircle2 } from 'lucide-react';

export const Earnings = () => {
    const { currentUser } = useAuth();
    const { shifts, platformConfig, subscriptionPayments: allSubscriptionPayments } = useData();
    
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    const yearlyShifts = useMemo(() => {
        if (!currentUser) return [];
        return shifts.filter(s => {
            if (s.status !== ShiftStatus.COMPLETED && s.status !== ShiftStatus.VERIFIED) return false;
            
            const isWorker = s.userId === currentUser.id;
            const isClient = s.clientId === currentUser.id;

            if (!isWorker && !isClient) return false;

            // Link Settlements to Deductions:
            // Only include Staffing Expenses (where they are the client) if the payout has been settled to the other pro.
            if (isClient && !isWorker) {
                if (!s.isPaid && s.escrowStatus !== 'RELEASED') return false;
            }

            const dateToCheck = s.completedAt ? new Date(s.completedAt) : s.end;
            
            const [startY, startM, startD] = startDate.split('-').map(Number);
            const [endY, endM, endD] = endDate.split('-').map(Number);
            
            const start = new Date(startY, startM - 1, startD);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(endY, endM - 1, endD);
            end.setHours(23, 59, 59, 999);

            return isWithinInterval(dateToCheck, { start, end });
        }).sort((a, b) => {
            const dateA = a.completedAt ? new Date(a.completedAt) : a.end;
            const dateB = b.completedAt ? new Date(b.completedAt) : b.end;
            return dateB.getTime() - dateA.getTime();
        });
    }, [shifts, currentUser, startDate, endDate]);

    const calculateFees = (shift: Shift) => {
        const isStaffingExpense = currentUser && shift.clientId === currentUser.id;

        if (isStaffingExpense) {
            return {
                gross: -(shift.price || 0),
                effectiveGross: -(shift.price || 0),
                refund: 0,
                feePercent: 0,
                platformFeeAmount: 0,
                insuranceAmount: 0,
                net: -(shift.price || 0),
                isStaffingExpense: true
            };
        }

        let feePercent = shift.appliedPlatformFee !== undefined 
            ? shift.appliedPlatformFee 
            : (platformConfig[shift.category]?.platformFeePercent || 20) / 100;
        
        if (feePercent > 1) feePercent = feePercent / 100;

        let insuranceAmount = 0;
        if (shift.insuranceOptIn) {
            if (shift.appliedInsuranceFee !== undefined) {
                insuranceAmount = shift.appliedInsuranceFee;
            } else {
                const rule = platformConfig[shift.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
                const gross = shift.price || 0;
                if (rule.type === 'PERCENTAGE') {
                    insuranceAmount = gross * (rule.value / 100);
                } else {
                    insuranceAmount = rule.value;
                }
            }
        }

        const baseGross = shift.price || 0;
        const refund = shift.refundAmount || 0;
        const effectiveGross = baseGross - refund;
        const platformFeeAmount = effectiveGross * feePercent;
        const net = effectiveGross - platformFeeAmount - insuranceAmount;

        return {
            gross: baseGross,
            effectiveGross,
            refund,
            feePercent,
            platformFeeAmount,
            insuranceAmount,
            net,
            isStaffingExpense: false
        };
    };

    const financials = useMemo(() => {
        let totalGross = 0;
        let totalPlatformFees = 0;
        let totalInsuranceFees = 0;
        let totalNet = 0;

        yearlyShifts.forEach(shift => {
            const fees = calculateFees(shift);
            totalGross += fees.gross;
            totalPlatformFees += fees.platformFeeAmount;
            totalInsuranceFees += fees.insuranceAmount;
            totalNet += fees.net;
        });

        return {
            totalGross,
            totalPlatformFees,
            totalInsuranceFees,
            totalNet,
        };
    }, [yearlyShifts, platformConfig]);

    // Filter real subscription payments based on date range
    const subscriptionPayments = useMemo(() => {
        if (!currentUser) return [];

        const payments = [];
        
        const [startY, startM, startD] = startDate.split('-').map(Number);
        const [endY, endM, endD] = endDate.split('-').map(Number);
        
        const periodStart = new Date(startY, startM - 1, startD);
        const periodEnd = new Date(endY, endM - 1, endD);

        // Map over our real fetched subscription_payments collection
        allSubscriptionPayments.forEach(sp => {
            // Only show for this user
            if (sp.userId !== currentUser.id) return;
            
            const pDate = sp.date instanceof Date ? sp.date : new Date(sp.date);
            if (isWithinInterval(pDate, { start: periodStart, end: periodEnd })) {
                payments.push({
                    id: sp.id,
                    date: pDate,
                    amount: sp.amount,
                    status: sp.status,
                    description: sp.description
                });
            }
        });

        return payments.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [startDate, endDate, currentUser, allSubscriptionPayments]);

    const ledgerItems = useMemo(() => {
        const items = [];
        yearlyShifts.forEach(shift => {
            const fees = calculateFees(shift);
            items.push({
                type: 'shift',
                date: shift.completedAt ? new Date(shift.completedAt) : new Date(shift.end),
                id: shift.id,
                data: shift,
                fees: fees
            });
        });

        subscriptionPayments.forEach(payment => {
            items.push({
                type: 'subscription',
                date: payment.date,
                id: payment.id,
                data: payment,
                fees: null
            });
        });

        return items.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [yearlyShifts, subscriptionPayments]);

    const handleDownloadCSV = () => {
        const headers = "Date,Type,Description,Gross Amount,Software Service Expense,Insurance Fee,Net Payout/Cost\n";
        
        const jobRows = yearlyShifts.map(s => {
            const date = format(s.completedAt || s.end, 'yyyy-MM-dd');
            const fees = calculateFees(s);
            const safeDesc = `"${s.description.replace(/"/g, '""')}"`;
            if (fees.isStaffingExpense) {
                return `${date},Staffing Expense,${safeDesc},0.00,0.00,0.00,${fees.net.toFixed(2)}`;
            } else {
                return `${date},Job,${safeDesc},${fees.gross.toFixed(2)},${fees.platformFeeAmount.toFixed(2)},${fees.insuranceAmount.toFixed(2)},${fees.net.toFixed(2)}`;
            }
        });

        const subRows = subscriptionPayments.map(p => {
            const date = format(p.date, 'yyyy-MM-dd');
            return `${date},Subscription,"${p.description}",0.00,0.00,0.00,-${p.amount.toFixed(2)}`;
        });

        const rows = [...jobRows, ...subRows].join("\n");

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `earnings_report_${startDate}_to_${endDate}.csv`;
        a.click();
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

    if (!currentUser) return null;

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Earnings &amp; Payouts</h1>
                    <p className="text-slate-500 mt-1">Track your job history, platform fees, and subscription costs.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-2 pointer-events-none" />
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            onClick={safeShowPicker}
                            className="text-sm border-none focus:ring-0 bg-transparent text-navy-900 font-bold outline-none w-[130px] cursor-pointer"
                        />
                        <span className="text-slate-300 mx-1 font-light">to</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            onClick={safeShowPicker}
                            className="text-sm border-none focus:ring-0 bg-transparent text-navy-900 font-bold outline-none w-[130px] cursor-pointer"
                        />
                    </div>
                    <button 
                        onClick={handleDownloadCSV}
                        className="flex items-center justify-center px-4 py-2 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors shadow-md"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export
                    </button>
                </div>
            </div>

            {/* Pro Compliance & Earnings Notice */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm text-slate-600">
                <h3 className="text-navy-900 font-bold mb-2 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-emerald-600" />
                    Tax &amp; Business Information for Pros
                </h3>
                <p className="mb-3">
                    As an independent business owner utilizing the "iNeeda" platform, you are solely responsible for your own tax reporting and compliance.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Your Earnings:</strong> The "Net Income" shown below represents the direct payments you received from Clients, minus the Software Service Expense paid to "iNeeda" for lead generation and platform access.</li>
                    <li><strong>Tax Reporting (1099-K):</strong> Because you are paid by customers via a Third-Party Settlement Organization (Stripe), you will not receive a 1099-NEC from us. Instead, Stripe will issue a Form 1099-K directly to you at year-end if your transaction volume meets the IRS reporting thresholds.</li>
                    <li><strong>Tax Withholding:</strong> We do not withhold income taxes. We strongly recommend saving a portion of your payouts for your self-employment taxes.</li>
                </ul>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Gross Earnings</p>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">${financials.totalGross.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Before deductions</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Software Expenses</p>
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-700">${financials.totalPlatformFees.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Software service expense</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Daily Shield</p>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Shield className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-700">${financials.totalInsuranceFees.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Deductible insurance expense</p>
                </div>

                <div className="bg-gradient-to-br from-navy-900 to-navy-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs text-gold-400 uppercase font-bold tracking-wider">Net Income</p>
                            <div className="p-2 bg-white/10 rounded-lg text-gold-400 backdrop-blur-sm">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-white">${financials.totalNet.toFixed(2)}</p>
                        <p className="text-[10px] text-navy-200 mt-1">Taxable job earnings</p>
                    </div>
                </div>
            </div>

            {/* Job History Ledger */}
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center">
                    <Briefcase className="w-5 h-5 mr-3 text-emerald-500" />
                    <div>
                        <h3 className="font-bold text-navy-900 text-lg">Job History Ledger</h3>
                        <p className="text-xs text-slate-500 mt-1">Detailed breakdown of gross earnings, fees, and final net payouts.</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider">Date</th>
                                <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider">Details</th>
                                <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Gross</th>
                                <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Software Exp.</th>
                                <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Insurance</th>
                                <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Net Payout</th>
                                <th className="px-6 py-4 font-bold text-navy-900 uppercase text-xs tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {ledgerItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        No items in this period.
                                    </td>
                                </tr>
                            ) : (
                                ledgerItems.map((item) => {
                                    if (item.type === 'shift') {
                                        const shift = item.data;
                                        const fees = item.fees;
                                        return (
                                            <tr key={shift.id} className={`hover:bg-slate-50/80 transition-colors ${fees.isStaffingExpense ? 'bg-red-50/10' : ''}`}>
                                                <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                                                    {format(item.date, 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-navy-900">
                                                        {shift.category} {fees.isStaffingExpense && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase tracking-wider">Staffing Expense</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{shift.description}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-500">
                                                    {fees.isStaffingExpense ? '-' : `$${fees.gross.toFixed(2)}`}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-rose-500">
                                                    {fees.isStaffingExpense ? '-' : `-$${fees.platformFeeAmount.toFixed(2)}`}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-blue-500">
                                                    {fees.isStaffingExpense ? '-' : `-$${fees.insuranceAmount.toFixed(2)}`}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold text-base ${fees.isStaffingExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {fees.isStaffingExpense ? `-$${Math.abs(fees.net).toFixed(2)}` : `$${fees.net.toFixed(2)}`}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {shift.isPaid ? (
                                                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-md border uppercase ${fees.isStaffingExpense ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-green-700 bg-green-50 border-green-100'}`}>
                                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-md border uppercase ${fees.isStaffingExpense ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}>
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    } else {
                                        const payment = item.data;
                                        return (
                                            <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors bg-amber-50/10">
                                                <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                                                    {format(item.date, 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-navy-900">Platform Subscription</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{payment.description}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-500">-</td>
                                                <td className="px-6 py-4 text-right font-mono text-rose-500">-</td>
                                                <td className="px-6 py-4 text-right font-mono text-blue-500">-</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-rose-600 text-base">
                                                    -${payment.amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="inline-flex items-center text-[10px] text-green-700 font-bold bg-green-50 px-2 py-1 rounded-md border border-green-100 uppercase">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> {payment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
