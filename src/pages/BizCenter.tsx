import React, { useState } from 'react';
import { Earnings } from './Earnings';
import { Settlements } from './Settlements';
import { ProviderStaffing } from './ProviderStaffing';
import { InfoCenter } from './InfoCenter';
import { ProMarketing } from '../components/ProMarketing';
import { DollarSign, Users, BookOpen, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

export const BizCenter = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'settlements' | 'staffing' | 'marketing' | 'info'>('settlements');

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Biz Center</h1>
           <p className="text-slate-500 mt-1">Manage your business finances, marketing, and resources.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-xl inline-flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'settlements' 
              ? 'bg-white text-navy-900 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-500 hover:text-navy-700 hover:bg-slate-200/50'
          }`}
        >
          <DollarSign className={`w-4 h-4 mr-2 ${activeTab === 'settlements' ? 'text-gold-500' : ''}`} />
          {currentUser?.role === Role.ADMIN ? 'Settlements' : 'Earnings'}
        </button>
        <button
          onClick={() => setActiveTab('staffing')}
          className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'staffing' 
              ? 'bg-white text-navy-900 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-500 hover:text-navy-700 hover:bg-slate-200/50'
          }`}
        >
          <Users className={`w-4 h-4 mr-2 ${activeTab === 'staffing' ? 'text-emerald-500' : ''}`} />
          Staffing
        </button>
        <button
          onClick={() => setActiveTab('marketing')}
          className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'marketing' 
              ? 'bg-white text-navy-900 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-500 hover:text-navy-700 hover:bg-slate-200/50'
          }`}
        >
          <Share2 className={`w-4 h-4 mr-2 ${activeTab === 'marketing' ? 'text-blue-500' : ''}`} />
          Marketing
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'info' 
              ? 'bg-white text-navy-900 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-500 hover:text-navy-700 hover:bg-slate-200/50'
          }`}
        >
          <BookOpen className={`w-4 h-4 mr-2 ${activeTab === 'info' ? 'text-indigo-500' : ''}`} />
          Info Center
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        <div className={activeTab === 'settlements' ? 'block' : 'hidden'}>
            {currentUser?.role === Role.ADMIN ? <Settlements /> : <Earnings />}
        </div>
        <div className={activeTab === 'staffing' ? 'block' : 'hidden'}>
            <ProviderStaffing />
        </div>
        <div className={activeTab === 'marketing' ? 'block' : 'hidden'}>
            <ProMarketing />
        </div>
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
            <InfoCenter />
        </div>
      </div>
    </div>
  );
};
