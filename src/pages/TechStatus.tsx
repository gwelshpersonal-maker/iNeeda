import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Role } from '../types';
import { Navigate } from 'react-router-dom';
import { 
    Server, Database, Activity, Shield, AlertTriangle, 
    CheckCircle, Clock, Cpu, HardDrive, Network, TrendingUp
} from 'lucide-react';
import { PriceGuide } from '../components/PriceGuide';

export const TechStatus = () => {
    const { currentUser } = useAuth();
    const { users, shifts, sites, notifications, jobs, applications } = useData();
    const [activeTab, setActiveTab] = useState<'status' | 'market'>('status');

    if (currentUser?.role !== Role.ADMIN) {
        return <Navigate to="/dashboard" replace />;
    }

    const systemHealth = [
        { name: 'Database', status: 'Operational', latency: '24ms', icon: <Database className="w-5 h-5" /> },
        { name: 'API Gateway', status: 'Operational', latency: '45ms', icon: <Network className="w-5 h-5" /> },
        { name: 'Auth Service', status: 'Operational', latency: '12ms', icon: <Shield className="w-5 h-5" /> },
        { name: 'Storage', status: 'Operational', usage: '64%', icon: <HardDrive className="w-5 h-5" /> },
    ];

    const stats = [
        { label: 'Total Users', value: users.length, icon: <Activity className="w-4 h-4 text-blue-500" /> },
        { label: 'Total Shifts', value: shifts.length, icon: <Activity className="w-4 h-4 text-green-500" /> },
        { label: 'Active Sites', value: sites.length, icon: <Activity className="w-4 h-4 text-purple-500" /> },
        { label: 'Job Postings', value: jobs.length, icon: <Activity className="w-4 h-4 text-gold-500" /> },
        { label: 'Applications', value: applications.length, icon: <Activity className="w-4 h-4 text-red-500" /> },
        { label: 'Notifications', value: notifications.length, icon: <Activity className="w-4 h-4 text-indigo-500" /> },
    ];

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="bg-navy-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                            <Server className="w-8 h-8 text-gold-400" />
                            Tech & Market Ops
                        </h1>
                        <p className="text-navy-300">Technical performance and market calibration metrics.</p>
                    </div>
                    
                    <div className="flex bg-navy-800/50 p-1 rounded-xl border border-navy-700/50 backdrop-blur-sm self-start">
                        <button 
                            onClick={() => setActiveTab('status')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'status' ? 'bg-gold-400 text-navy-900 shadow-lg' : 'text-navy-300 hover:text-white'}`}
                        >
                            <Activity className="w-4 h-4" />
                            System Status
                        </button>
                        <button 
                            onClick={() => setActiveTab('market')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'market' ? 'bg-gold-400 text-navy-900 shadow-lg' : 'text-navy-300 hover:text-white'}`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            Market Data
                        </button>
                    </div>

                    <div className="hidden lg:flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-bold text-sm">All Systems Operational</span>
                    </div>
                </div>
            </div>

            {activeTab === 'status' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {systemHealth.map((item) => (
                            <div key={item.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-600">{item.icon}</div>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded tracking-wider">
                                        {item.status}
                                    </span>
                                </div>
                                <h3 className="font-bold text-navy-900">{item.name}</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {item.latency ? `Latency: ${item.latency}` : `Usage: ${item.usage}`}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-50">
                                <h3 className="font-bold text-navy-900 flex items-center gap-2">
                                    <Database className="w-5 h-5 text-slate-400" />
                                    Database Statistics
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-slate-100">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="bg-white p-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            {stat.icon}
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                                        </div>
                                        <p className="text-2xl font-black text-navy-900">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="font-bold text-navy-900 mb-6 flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-slate-400" />
                                Environment Info
                            </h3>
                            <div className="space-y-4">
                                <InfoRow label="Environment" value="Production" />
                                <InfoRow label="Version" value="v2.4.0-beta" />
                                <InfoRow label="Region" value="us-east-1" />
                                <InfoRow label="Cloud Provider" value="Google Cloud" />
                                <InfoRow label="Node Version" value="v18.16.0" />
                                <InfoRow label="Memory Usage" value="456MB / 1024MB" />
                                <InfoRow label="Uptime" value="14d 2h 15m" />
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Incidents</h4>
                                <div className="space-y-3">
                                    <div className="flex gap-3 items-start">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-navy-900">Scheduled Maintenance</p>
                                            <p className="text-[10px] text-slate-500">2 days ago • Completed</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <AlertTriangle className="w-4 h-4 text-gold-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-navy-900">High Latency Alert</p>
                                            <p className="text-[10px] text-slate-500">5 days ago • Resolved</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <PriceGuide />
            )}
        </div>
    );
};

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono font-medium text-navy-900 bg-slate-50 px-2 py-1 rounded">{value}</span>
    </div>
);
