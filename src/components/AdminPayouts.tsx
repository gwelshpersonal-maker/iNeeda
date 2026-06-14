import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { ShiftStatus } from '../types';
import { format } from 'date-fns';
import { Copy, CheckCircle2, Wallet, RefreshCw } from 'lucide-react';
import { calculateJobSplit } from '../utils/feeEngine';

export const AdminPayouts = () => {
    const { shifts, users, updateShift } = useData();

    // Filter all 'Completed' jobs where provider chose Zelle
    // To do this, we need to join shifts with providers.
    const pendingZellePayouts = useMemo(() => {
        return shifts.filter(s => {
            if (s.status !== ShiftStatus.COMPLETED && s.status !== ShiftStatus.VERIFIED) return false;
            // Get provider
            const provider = users.find(u => u.id === s.userId);
            if (!provider || provider.payoutMethod !== 'ZELLE') return false;
            // "Zelle Payouts (Manual Ledger)" needs a reconciling flag
            if ((s as any).payoutReconciled) return false;

            return true;
        });
    }, [shifts, users]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
    };

    const handleMarkAsPaid = async (gig: any) => {
        const provider = users.find(u => u.id === gig.userId);
        const hasOwnInsurance = provider?.insuranceType === 'OWN_COI';
        const isEmergency = gig.type === 'URGENT';
        const split = calculateJobSplit(gig.price || 0, gig.category, hasOwnInsurance, isEmergency, undefined, undefined, '', 'ZELLE');
        if (!confirm(`Mark this gig ($${split.providerNet.toFixed(2)}) as Paid and reconcile commission?`)) return;
        try {
            await updateShift({
                ...gig,
                payoutReconciled: true,
                payoutReconciledAt: new Date().toISOString(),
                isPaid: true, // We should probably also mark it paid in the central ledger
                escrowStatus: 'RELEASED'
            });
            alert('Payout reconciled & marked as set!');
        } catch (e: any) {
            alert('Failed to mark as paid: ' + e.message);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 shadow-soft border border-slate-100 animate-in fade-in">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-2xl font-black text-navy-900 flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-indigo-500" />
                        Zelle Payouts (Manual Ledger)
                    </h2>
                    <p className="text-slate-500 font-bold mt-2">Manage completed gigs needing direct payouts</p>
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-xl text-indigo-700 font-bold text-sm">
                    {pendingZellePayouts.length} Pending
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200">
                            <th className="pb-3 px-4">Date / Gig</th>
                            <th className="pb-3 px-4">Provider</th>
                            <th className="pb-3 px-4">Zelle Info</th>
                            <th className="pb-3 px-4 text-right">Gross</th>
                            <th className="pb-3 px-4 text-right">Platform Cut</th>
                            <th className="pb-3 px-4 text-right">Net to Pay</th>
                            <th className="pb-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pendingZellePayouts.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-500">
                                    No pending Zelle payouts found.
                                </td>
                            </tr>
                        ) : (
                            pendingZellePayouts.map(gig => {
                                const provider = users.find(u => u.id === gig.userId);
                                const hasOwnInsurance = provider?.insuranceType === 'OWN_COI';
                                const isEmergency = gig.type === 'URGENT';
                                const split = calculateJobSplit(gig.price || 0, gig.category, hasOwnInsurance, isEmergency, undefined, undefined, '', 'ZELLE');
                                
                                return (
                                    <tr key={gig.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="font-bold text-navy-900 line-clamp-1">{gig.description}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {format(new Date(gig.end), 'MMM d, yyyy h:mm a')}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 font-bold text-slate-700">
                                            {provider?.name || 'Unknown'}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                    {provider?.zelleInfo?.emailOrPhone || 'N/A'}
                                                </span>
                                                {provider?.zelleInfo?.emailOrPhone && (
                                                    <button 
                                                        onClick={() => handleCopy(provider.zelleInfo!.emailOrPhone)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-slate-200"
                                                        title="Copy Zelle Info"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right font-medium text-slate-600">
                                            ${split.grossAmount.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-4 text-right font-medium text-red-500">
                                            -${split.platformFee.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-4 text-right font-black text-emerald-600 text-lg">
                                            ${split.providerNet.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-4 flex justify-end">
                                            <button
                                                onClick={() => handleMarkAsPaid(gig)}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 font-bold text-sm rounded-xl transition-colors"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Mark as Paid
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
