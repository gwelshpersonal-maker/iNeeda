import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { TrendingUp, Users, Inbox, Calendar, Rocket, Settings, Wallet, Activity, ShieldCheck, DollarSign } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { AdminPlatformMessagesCMS } from '../components/AdminPlatformMessagesCMS';
import { AdminCatalogCMS } from '../components/AdminCatalogCMS';
import { AdminPayouts } from '../components/AdminPayouts';
import { AdminFoundersApplications } from '../components/AdminFoundersApplications';
import { Schedule } from './Schedule';
import { Role } from '../types';

export const AdminDashboard = () => {
    const { currentUser, isAdmin } = useAuth();
    const { users, shifts, categoryRequests, serviceCategories, prelaunchMode, updatePrelaunchMode } = useData();
    const navigate = useNavigate();
    const [adminTab, setAdminTab] = useState<'overview' | 'all-gigs' | 'waitlist' | 'catalog' | 'payouts' | 'applications'>('overview');

    const unclaimedByCategory = React.useMemo(() => {
        const ObjectEntries = Object.entries;
        const counts: Record<string, number> = {};
        shifts.filter(s => s.status === 'OPEN_REQUEST').forEach(s => {
            counts[s.category] = (counts[s.category] || 0) + 1;
        });
        return ObjectEntries(counts).sort((a, b) => b[1] - a[1]); 
    }, [shifts]);

    if (!currentUser || !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    const pendingProviders = users.filter(u => u.role === Role.PROVIDER && u.verificationStatus === 'PENDING').length;
    const openRequestsCount = shifts.filter(s => s.status === 'OPEN_REQUEST').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight">Admin Dashboard</h1>
                    <p className="text-slate-500 font-medium text-lg mt-1">Platform Overview & Approvals</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-xl mb-8 w-fit mx-auto md:mx-0">
                <button 
                    onClick={() => setAdminTab('overview')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'overview' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <TrendingUp className="w-4 h-4" /> Overview
                </button>
                <button 
                    onClick={() => setAdminTab('all-gigs')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'all-gigs' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Calendar className="w-4 h-4" /> All Gigs
                </button>
                <button 
                    onClick={() => setAdminTab('waitlist')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'waitlist' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Rocket className="w-4 h-4" /> Waitlist
                </button>
                <button 
                    onClick={() => setAdminTab('catalog')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'catalog' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Settings className="w-4 h-4" /> Content & Catalog
                </button>
                <button 
                    onClick={() => setAdminTab('payouts')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'payouts' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Wallet className="w-4 h-4" /> Zelle Payouts
                </button>
            </div>

            {adminTab === 'overview' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div onClick={() => navigate('/staff')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                            <div className="flex justify-between items-start mb-4"><div className="p-4 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors"><Users className="w-8 h-8" /></div>{pendingProviders > 0 && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg shadow-red-200">{pendingProviders} Pending</span>}</div>
                            <h3 className="text-3xl font-extrabold text-navy-900 mb-1">{pendingProviders}</h3><p className="text-slate-500 font-bold">Provider Applications</p><p className="text-xs text-slate-400 mt-2">Requires verification</p>
                        </div>
                        
                        <div onClick={() => setAdminTab('applications')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors"><Inbox className="w-8 h-8" /></div>
                            </div>
                            <h3 className="text-3xl font-extrabold text-navy-900 mb-1">Founders</h3><p className="text-slate-500 font-bold">Velvet Rope Apps</p><p className="text-xs text-slate-400 mt-2">Intake form</p>
                        </div>

                        <div onClick={() => setAdminTab('all-gigs')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                            <div className="flex justify-between items-start mb-4"><div className="p-4 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors"><Calendar className="w-8 h-8" /></div></div>
                            <h3 className="text-3xl font-extrabold text-navy-900 mb-1">{openRequestsCount}</h3><p className="text-slate-500 font-bold">Open Requests</p><p className="text-xs text-slate-400 mt-2">Waiting for a Pro</p>
                        </div>
                    </div>

                    {/* Pre-launch Mode Dynamic Control */}
                    <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${prelaunchMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                <Rocket className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    Pre-launch Coming Soon Mode
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${prelaunchMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {prelaunchMode ? "Active" : "Disabled (Live)"}
                                    </span>
                                </h3>
                                <p className="text-sm text-slate-400 mt-1 max-w-xl">
                                    {prelaunchMode 
                                      ? "The public root URL (/) currently shows the Coming Soon splash page with the Pro registration apply links." 
                                      : "The marketplace is live! The public root URL (/) now renders the full interactive client Landing page."}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
                            <button
                                onClick={() => updatePrelaunchMode(!prelaunchMode)}
                                className={`px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap shadow-md flex items-center gap-2 ${
                                  prelaunchMode 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/20'
                                }`}
                            >
                                {prelaunchMode ? "Go Live (Enable Landing Page)" : "Activate Coming Soon Splash"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {adminTab === 'all-gigs' && (
                <div>
                    <Schedule />
                </div>
            )}

            {adminTab === 'catalog' && (
                <div className="flex flex-col gap-6">
                    <AdminPlatformMessagesCMS />
                    <AdminCatalogCMS />
                </div>
            )}

            {adminTab === 'payouts' && (
                <div>
                    <AdminPayouts />
                </div>
            )}

            {adminTab === 'applications' && (
                <div>
                    <AdminFoundersApplications />
                </div>
            )}

            {adminTab === 'waitlist' && (
                <div className="bg-white rounded-3xl p-8 shadow-soft border border-slate-100 overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-navy-900 flex items-center gap-3">
                                <Rocket className="w-8 h-8 text-gold-500" /> Category Waitlist
                            </h2>
                            <p className="text-slate-500 font-medium">New skill and category requests from users.</p>
                        </div>
                    </div>

                    {categoryRequests.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl">
                            <Rocket className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">No requests yet. The waitlist is empty.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-8 px-8">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-100">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="pb-4 px-4">Requester</th>
                                        <th className="pb-4 px-4 font-black">Category</th>
                                        <th className="pb-4 px-4 font-black">Status</th>
                                        <th className="pb-4 px-4 font-black">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {[...categoryRequests].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(request => {
                                        const requester = users.find(u => u.id === request.userId);
                                        return (
                                            <tr key={request.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="mx-auto w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">{requester?.name.charAt(0) || '?'}</div>
                                                        <div>
                                                            <p className="font-bold text-navy-900">{requester?.name || 'Unknown'}</p>
                                                            <p className="text-[10px] text-slate-500">{request.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4 font-medium text-navy-900">
                                                    {request.categoryName}
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${request.status === 'PENDING' ? 'bg-gold-100 text-gold-700' : request.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{request.status}</span>
                                                </td>
                                                <td className="py-5 px-4 text-slate-500 text-sm">
                                                    {request.createdAt.toLocaleDateString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
