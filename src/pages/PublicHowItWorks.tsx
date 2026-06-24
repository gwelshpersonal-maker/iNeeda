import React, { useState } from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { ShieldCheck, Search, DollarSign, CheckCircle2, UserPlus, MapPin, Zap, Star, Wallet, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PublicHowItWorks: React.FC = () => {
  const [viewMode, setViewMode] = useState<'customer' | 'pro'>('customer');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      <main className="flex-1 pt-24 md:pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-navy-900 mb-6 leading-tight">How <span className="text-blue-800"><span className="text-blue-600">iN</span>eeda</span> Works</h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-10">
              {viewMode === 'customer' 
                ? "Connecting you with verified local pros for fast, transparent, and hassle-free service. No surprises, just getting things done."
                : "A totally new way to earn on your own terms. Claim the jobs you want, safely deliver great service, and get paid fast."}
            </p>

            <div className="flex justify-center relative z-20">
              <div className="bg-slate-200/50 p-1.5 rounded-2xl flex items-center shadow-inner">
                <button 
                  onClick={() => setViewMode('customer')}
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${viewMode === 'customer' ? 'bg-white text-blue-600 shadow-sm shadow-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  For Customers
                </button>
                <button 
                  onClick={() => setViewMode('pro')}
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${viewMode === 'pro' ? 'bg-white text-amber-600 shadow-sm shadow-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  For Pros
                </button>
              </div>
            </div>
          </div>

          {/* Steps Sequence */}
          <div className="relative max-w-5xl mx-auto mb-24 mt-16">
            <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-1 -ml-0.5 bg-slate-200 rounded-full"></div>
            
            {viewMode === 'customer' ? (
              // ------- CUSTOMER STEPS -------
              <>
                {/* Step 1 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 md:mb-24 group animate-in slide-in-from-bottom-8 duration-500">
                  <div className="w-full md:w-5/12 text-center md:text-right md:pr-12 md:order-1 order-2">
                    <span className="text-5xl font-black text-slate-100 absolute -top-8 -left-4 md:-right-8 md:left-auto md:top-auto group-hover:text-blue-100 transition-colors z-0 select-none">01</span>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-navy-900 mb-3">1. Post Your Job</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          Describe what you need done, where, and when. Add photos and details in under a minute. Your request goes straight to verified pros near you.
                        </p>
                    </div>
                  </div>
                  <div className="md:w-2/12 flex justify-center order-1 md:order-2 mb-8 md:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 border-4 border-white shadow-xl flex items-center justify-center">
                      <Search className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="w-full md:w-5/12 md:pl-12 order-3">
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 transform transition-transform group-hover:scale-105">
                        <img src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=800&auto=format&fit=crop" alt="Customer posting job on phone" className="rounded-2xl w-full h-48 object-cover" />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 md:mb-24 group animate-in slide-in-from-bottom-8 duration-500 delay-100">
                  <div className="w-full md:w-5/12 md:pr-12 order-3 md:order-1">
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 transform transition-transform group-hover:scale-105">
                         <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop" alt="Local Pro accepting job" className="rounded-2xl w-full h-48 object-cover" />
                    </div>
                  </div>
                  <div className="md:w-2/12 flex justify-center order-1 md:order-2 mb-8 md:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 border-4 border-white shadow-xl flex items-center justify-center">
                      <Zap className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="w-full md:w-5/12 text-center md:text-left md:pl-12 md:order-3 order-2">
                    <span className="text-5xl font-black text-slate-100 absolute -top-8 -left-4 md:-left-8 md:top-auto group-hover:text-amber-100 transition-colors z-0 select-none">02</span>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-navy-900 mb-3">2. A Pro Grabs It</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          Available, background-checked pros see your request. The first available pro claims the job, and you instantly get their profile, ratings, and ETA.
                        </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 md:mb-24 group animate-in slide-in-from-bottom-8 duration-500 delay-200">
                  <div className="w-full md:w-5/12 text-center md:text-right md:pr-12 md:order-1 order-2">
                    <span className="text-5xl font-black text-slate-100 absolute -top-8 -left-4 md:-right-8 md:left-auto md:top-auto group-hover:text-emerald-100 transition-colors z-0 select-none">03</span>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-navy-900 mb-3">3. Work Gets Done</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          The pro arrives, assesses the job, and provides a clear price. You chat with them directly in the app. Once agreed, they get right to work.
                        </p>
                    </div>
                  </div>
                  <div className="md:w-2/12 flex justify-center order-1 md:order-2 mb-8 md:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border-4 border-white shadow-xl flex items-center justify-center">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="w-full md:w-5/12 md:pl-12 order-3">
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 transform transition-transform group-hover:scale-105">
                         <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop" alt="Live Tracking & Status Updates" className="rounded-2xl w-full h-48 object-cover object-center" />
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between group animate-in slide-in-from-bottom-8 duration-500 delay-300">
                  <div className="w-full md:w-5/12 md:pr-12 order-3 md:order-1">
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 transform transition-transform group-hover:scale-105">
                         <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop" alt="Seamless Ratings & Tips" className="rounded-2xl w-full h-48 object-cover object-center" />
                    </div>
                  </div>
                  <div className="md:w-2/12 flex justify-center order-1 md:order-2 mb-8 md:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 border-4 border-white shadow-xl flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="w-full md:w-5/12 text-center md:text-left md:pl-12 md:order-3 order-2">
                    <span className="text-5xl font-black text-slate-100 absolute -top-8 -left-4 md:-left-8 md:top-auto group-hover:text-indigo-100 transition-colors z-0 select-none">04</span>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-navy-900 mb-3">4. Secure Payment & Closing</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          You review the work, process payment securely through the platform using Stripe, leave a rating, and you're done. No cash, no hassle.
                        </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // ------- PRO STEPS -------
              <>
                {/* Step 1 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 md:mb-24 group animate-in slide-in-from-bottom-8 duration-500">
                  <div className="w-full md:w-5/12 text-center md:text-right md:pr-12 md:order-1 order-2">
                    <span className="text-5xl font-black text-slate-100 absolute -top-8 -left-4 md:-right-8 md:left-auto md:top-auto group-hover:text-emerald-100 transition-colors z-0 select-none">01</span>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-navy-900 mb-3">1. Sign Up & Get Cleared</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          Create your profile and pass our standard verification and background sweep. We make sure only serious, qualified pros enter the network.
                        </p>
                    </div>
                  </div>
                  <div className="md:w-2/12 flex justify-center order-1 md:order-2 mb-8 md:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border-4 border-white shadow-xl flex items-center justify-center">
                      <UserPlus className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="w-full md:w-5/12 md:pl-12 order-3">
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 transform transition-transform group-hover:scale-105">
                         <img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800&auto=format&fit=crop" alt="Fast Identity Verification" className="rounded-2xl w-full h-48 object-cover object-center" />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 md:mb-24 group animate-in slide-in-from-bottom-8 duration-500 delay-100">
                  <div className="w-full md:w-5/12 md:pr-12 order-3 md:order-1">
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 transform transition-transform group-hover:scale-105">
                         <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop" alt="Viewing local gigs" className="rounded-2xl w-full h-48 object-cover object-top" />
                    </div>
                  </div>
                  <div className="md:w-2/12 flex justify-center order-1 md:order-2 mb-8 md:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 border-4 border-white shadow-xl flex items-center justify-center">
                      <Zap className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="w-full md:w-5/12 text-center md:text-left md:pl-12 md:order-3 order-2">
                    <span className="text-5xl font-black text-slate-100 absolute -top-8 -left-4 md:-left-8 md:top-auto group-hover:text-blue-100 transition-colors z-0 select-none">02</span>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-navy-900 mb-3">2. Tap to Claim Jobs</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          Open the real-time job board to discover local demands in your selected categories. Review photos, location, and scopes—then accept the ones you want.
                        </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 md:mb-24 group animate-in slide-in-from-bottom-8 duration-500 delay-200">
                  <div className="w-full md:w-5/12 text-center md:text-right md:pr-12 md:order-1 order-2">
                    <span className="text-5xl font-black text-slate-100 absolute -top-8 -left-4 md:-right-8 md:left-auto md:top-auto group-hover:text-amber-100 transition-colors z-0 select-none">03</span>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-navy-900 mb-3">3. Connect & Complete</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          You either accept a price from a customer or submit a quote and are selected. Once confirmed, head to the client's location and use the app to manage progress.
                        </p>
                    </div>
                  </div>
                  <div className="md:w-2/12 flex justify-center order-1 md:order-2 mb-8 md:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 border-4 border-white shadow-xl flex items-center justify-center">
                      <Wrench className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="w-full md:w-5/12 md:pl-12 order-3">
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 transform transition-transform group-hover:scale-105">
                        <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop" alt="Contractor at site" className="rounded-2xl w-full h-48 object-cover" />
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between group animate-in slide-in-from-bottom-8 duration-500 delay-300">
                  <div className="w-full md:w-5/12 md:pr-12 order-3 md:order-1">
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 transform transition-transform group-hover:scale-105">
                         <img src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=800&auto=format&fit=crop" alt="Seamless Bank Deposits" className="rounded-2xl w-full h-48 object-cover object-center" />
                    </div>
                  </div>
                  <div className="md:w-2/12 flex justify-center order-1 md:order-2 mb-8 md:mb-0 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 border-4 border-white shadow-xl flex items-center justify-center">
                      <DollarSign className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="w-full md:w-5/12 text-center md:text-left md:pl-12 md:order-3 order-2">
                    <span className="text-5xl font-black text-slate-100 absolute -top-8 -left-4 md:-left-8 md:top-auto group-hover:text-indigo-100 transition-colors z-0 select-none">04</span>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-navy-900 mb-3">4. Fast, Secure Payouts</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          No more chasing invoices or carrying loose cash. Payments securely hit your account quickly via Zelle or Stripe, with built-in options to gain ratings and tips.
                        </p>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* CTA Section */}
          <div className="bg-navy-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-6 relative z-10">
              {viewMode === 'customer' ? "Ready to get things done?" : "Ready to start earning?"}
            </h2>
            <p className="text-navy-200 text-lg mb-8 max-w-2xl mx-auto relative z-10">
              {viewMode === 'customer' 
                ? "Join thousands of neighbors trusting local pros for everyday jobs." 
                : "Become part of the most reliable and rapidly growing pro network in the area."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 relative z-10">
                 <Link to="/signup" className={`px-8 py-4 ${viewMode === 'customer' ? 'bg-white text-navy-900' : 'bg-amber-500 text-white'} font-bold rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-black/20 w-full sm:w-auto`}>
                    {viewMode === 'customer' ? 'Sign Up Now' : 'Apply as a Pro'}
                 </Link>
                 <Link to={viewMode === 'customer' ? '/pro-services' : '/services'} className="px-8 py-4 bg-navy-800 text-white font-bold rounded-xl border border-navy-700 hover:bg-navy-700 transition-colors w-full sm:w-auto">
                    {viewMode === 'customer' ? 'Become a Pro' : 'I Need Service Instead'}
                 </Link>
            </div>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

