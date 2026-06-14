import React, { useState } from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { Briefcase, TrendingUp, ShieldCheck, DollarSign, Calendar, ArrowRight, CheckCircle2, Users, PieChart, FileText, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryRequestModal } from '../components/CategoryRequestModal';
import { useData } from '../contexts/DataContext';
import { Role } from '../types';

export const PublicProServices: React.FC = () => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const { addCategoryRequest } = useData();

  const handleCategoryRequest = async (categoryName: string, description: string, email: string, phoneNumber: string) => {
    await addCategoryRequest({
      id: crypto.randomUUID(),
      categoryName,
      description,
      email,
      phoneNumber,
      status: 'PENDING',
      createdAt: new Date(),
      userRole: Role.PROVIDER,
    });
  };
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      <main className="flex-1 pt-32 md:pt-40 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Hero Section */}
          <div className="text-center mb-20 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-navy-900 mb-6 leading-tight">
              Grow Your Business with iNeeda
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              We provide independent service professionals with the tools, leads, and protection needed to manage and scale their business—all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="px-8 py-4 bg-navy-900 text-white font-bold rounded-full hover:bg-navy-800 transition-all shadow-lg hover:-translate-y-0.5"
              >
                Start Earning Today
              </Link>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="mb-24">
            <h2 className="text-3xl font-bold text-center text-navy-900 mb-12">Everything you need to succeed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">High-Quality Leads</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get matched with clients in your area actively looking for your specific skills. No bidding wars or paying for dead leads.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Smart Scheduling</h3>
                <p className="text-slate-600 leading-relaxed">
                  Manage your availability, accept jobs on your time, and keep your calendar organized with our built-in scheduling tools.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <DollarSign className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Guaranteed Payments</h3>
                <p className="text-slate-600 leading-relaxed">
                  Funds are held securely in escrow before you start. Once the job is done, you get paid directly to your bank account. No chasing invoices.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Daily Shield Insurance</h3>
                <p className="text-slate-600 leading-relaxed">
                  Don't have your own policy? Opt into our Daily Shield program for affordable coverage on a per-job basis, keeping you and the client protected.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Build Your Reputation</h3>
                <p className="text-slate-600 leading-relaxed">
                  Collect reviews, earn verified badges, and build a public profile that showcases your portfolio and expertise to attract more clients.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Hire Other Local Pros</h3>
                <p className="text-slate-600 leading-relaxed">
                  Need extra hands for a large project? Easily post jobs and hire vetted professionals directly through the portal to scale your capacity.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-6">
                  <PieChart className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Business Command Center</h3>
                <p className="text-slate-600 leading-relaxed">
                  Track your growth with real-time analytics. Monitor your revenue, job completion rates, and client satisfaction metrics from one intuitive dashboard.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Back-Office & Admin</h3>
                <p className="text-slate-600 leading-relaxed">
                  Say goodbye to paperwork. Seamlessly generate professional quotes, send invoices, handle your 1099 taxes, and manage clients with our built-in CRM.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Seamless Client Chat</h3>
                <p className="text-slate-600 leading-relaxed">
                  Communicate directly with clients through our built-in real-time chat. Send updates, share photos, and keep all project conversations securely in one place.
                </p>
              </div>

            </div>
          </div>

          {/* Missing Category Section */}
          <div className="bg-white rounded-[3rem] p-10 md:p-12 text-center border border-slate-100 shadow-sm mb-16">
            <h2 className="text-2xl font-bold text-navy-900 mb-4">Don't see your specific expertise listed?</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              We're constantly expanding our service categories. Let us know what you do, and we'll work on bringing your category to the platform.
            </p>
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center justify-center px-6 py-3 font-bold rounded-xl border-2 border-navy-900 text-navy-900 hover:bg-navy-50 transition-colors"
            >
              Request to Add a Category
            </button>
          </div>

          {/* CTA Section */}
          <div className="bg-navy-900 rounded-[3rem] p-10 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to be your own boss?</h2>
              <p className="text-lg text-slate-300 mb-10">
                Join our network of trusted professionals and take control of your career today.
              </p>
              <Link 
                to="/signup" 
                className="inline-flex items-center justify-center px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-full hover:bg-gold-500 transition-all shadow-lg hover:-translate-y-0.5"
              >
                Create Your Free Account <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
            
            {/* Background design elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-gold-400/10 rounded-full blur-3xl"></div>
          </div>

        </div>
      </main>

      <CategoryRequestModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleCategoryRequest}
        userRole={Role.PROVIDER}
      />

      <PublicFooter />
    </div>
  );
};
