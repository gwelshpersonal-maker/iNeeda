import React, { useState, useMemo } from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import * as Icons from 'lucide-react';
import { Briefcase, TrendingUp, ShieldCheck, DollarSign, Calendar, ArrowRight, CheckCircle2, Users, PieChart, FileText, MessageSquare, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryRequestModal } from '../components/CategoryRequestModal';
import { useData } from '../contexts/DataContext';
import { Role } from '../types';

export const PublicProServices: React.FC = () => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<{title: string, subtitle: string, description: string, emoji?: string, iconName?: string, colorClass?: string} | null>(null);
  const { addCategoryRequest, serviceCategories, isLoading } = useData();

  const activeCategories = React.useMemo(() => {
    return serviceCategories.filter(c => c.isActive).map(c => c.id);
  }, [serviceCategories]);

  const getServiceDetails = (categoryId: string) => {
    const found = serviceCategories.find(c => c.id === categoryId);
    if (found) {
        return { name: found.name, iconName: found.iconName, colorClass: found.colorClass, desc: found.description };
    }
    return { name: categoryId.replace(/_/g, ' '), iconName: 'Star', colorClass: 'text-slate-500', desc: 'Specialized service category.' };
  };

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
              Grow Your Business with <span className="text-blue-600">iN</span>eeda
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

          {/* Available Services Grid */}
          <div className="mb-24">
            <h2 className="text-3xl font-bold text-center text-navy-900 mb-4">Current Opportunities</h2>
            <p className="text-lg text-slate-600 text-center max-w-2xl mx-auto mb-12">
              Browse the types of jobs currently available on our platform. Tap any category to learn more about the work.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {isLoading ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-slate-500 text-lg animate-pulse">Loading active services...</p>
                </div>
              ) : activeCategories.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-slate-500 text-lg">No services currently available. Request a category below!</p>
                </div>
              ) : activeCategories.map((cat, idx) => {
                const service = getServiceDetails(cat);
                const Icon = (Icons as any)[service.iconName || 'Wrench'] || Icons.Wrench;

                return (
                   <div key={idx} onClick={() => setSelectedCategoryInfo({ title: service.name, subtitle: '', description: service.desc, iconName: service.iconName, colorClass: service.colorClass })} className="bg-white rounded-[2rem] p-8 text-center border-2 border-slate-100 hover:border-navy-100 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-full group">
                      <div className="flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-slate-50 ${service.colorClass || ''}`}>
                          <Icon strokeWidth={1.5} className="w-8 h-8" />
                        </div>
                        <h3 className="font-extrabold text-navy-900 text-lg mb-2">{service.name}</h3>
                        <p className="text-slate-500 text-xs font-medium line-clamp-2">{service.desc}</p>
                      </div>
                      <div className="mt-6 text-blue-600 font-bold text-sm tracking-wide group-hover:text-blue-700 flex items-center justify-center">
                        Info <Icons.ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                   </div>
                );
              })}
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

      {/* Category Info Modal */}
      {selectedCategoryInfo && (
        <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedCategoryInfo(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-navy-900 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full"
            >
              <Icons.X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-6 text-navy-900">
              {selectedCategoryInfo.emoji ? (
                <div className="text-6xl">{selectedCategoryInfo.emoji}</div>
              ) : selectedCategoryInfo.iconName ? (
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center bg-slate-50 border border-slate-100 ${selectedCategoryInfo.colorClass || ''}`}>
                  {React.createElement((Icons as any)[selectedCategoryInfo.iconName] || Icons.Wrench, { className: "w-12 h-12", strokeWidth: 1.5 })}
                </div>
              ) : null}
            </div>
            <h3 className="text-2xl font-black text-navy-900 mb-3 text-center">{selectedCategoryInfo.title}</h3>
            {selectedCategoryInfo.subtitle && <p className="text-slate-600 font-medium mb-6 text-center">{selectedCategoryInfo.subtitle}</p>}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-navy-900 mb-2 flex items-center"><Icons.CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" /> Types of Jobs</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                {selectedCategoryInfo.description}
              </p>
            </div>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => setSelectedCategoryInfo(null)}
                className="flex-1 py-3 text-navy-900 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
              <Link 
                to="/signup"
                className="flex-1 py-3 text-white font-bold bg-navy-900 hover:bg-navy-800 rounded-xl transition-colors text-center"
              >
                Start Earning
              </Link>
            </div>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
};
