import React from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { ShieldCheck, HeartHandshake, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PublicAbout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      <main className="flex-1 pt-32 md:pt-40 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-navy-900 mb-6 leading-tight">We believe finding good help shouldn't be a full-time job.</h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              iNeeda was built to remove the friction from local services. No endless scrolling through directories, no playing phone tag, and no wondering if the person you hired is reliable.
            </p>
          </div>

          <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-12 mb-24">
            <div className="md:w-1/2">
                <h2 className="text-3xl font-bold text-navy-900 mb-6">Our Mission</h2>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                    We're empowering local neighborhoods by directly connecting skilled community members with the people who need their help. By keeping things local, we build trust, support local economies, and get things done faster.
                </p>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                    Whether you're a homeowner with an overgrown lawn, a renter who needs help moving a couch, or a local handyman looking to fill your weekend with productive work—we provide the platform that brings both sides together safely.
                </p>
                <Link to="/signup" className="inline-flex items-center text-gold-600 font-bold hover:text-gold-500 transition-colors text-lg">
                    Join the Community <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
            </div>
            <div className="md:w-1/2">
                <div className="grid grid-cols-2 gap-4">
                    <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format&fit=crop" alt="Cleaning" className="rounded-3xl object-cover h-48 w-full shadow-lg" />
                    <img src="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=600&auto=format&fit=crop" alt="Repair" className="rounded-3xl object-cover h-48 w-full shadow-lg mt-8" />
                </div>
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-navy-900 mb-4">The core values we stand by.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-4">Trust & Safety First</h3>
                <p className="text-slate-600 leading-relaxed">
                    We vet our pros and hold payments securely in escrow. You only pay when the job is done right.
                </p>
            </div>
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                    <Users className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-4">Community Driven</h3>
                <p className="text-slate-600 leading-relaxed">
                    We prioritize local connections. Your money stays in your community, supporting local talent.
                </p>
            </div>
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gold-50 text-gold-600 rounded-full flex items-center justify-center mb-6">
                    <HeartHandshake className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-4">Transparent Pricing</h3>
                <p className="text-slate-600 leading-relaxed">
                    No hidden fees. No surprise bills. You agree to the price before the work even begins.
                </p>
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-navy-900 mb-4 mx-auto flex flex-col items-center justify-center text-center">
              <span>Our Service Area</span>
              <span className="text-xl text-slate-500 font-medium mt-1">(For Now)</span>
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                We proudly serve the Greater Harrisburg area, providing trusted community connections within a 40-mile radius.
            </p>
            
            {/* Map SVG Container */}
            <div className="relative w-full max-w-4xl mx-auto rounded-[2rem] overflow-hidden border border-slate-200 shadow-xl bg-slate-50 flex items-center justify-center p-4 sm:p-8 group">
                <div className="w-full relative" style={{ paddingBottom: '60%' }}>
                    <svg viewBox="-20 -20 360 220" className="absolute inset-0 w-full h-full drop-shadow-xl z-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]">
                        <defs>
                            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                                <feDropShadow dx="4" dy="12" stdDeviation="12" floodOpacity="0.15" />
                            </filter>
                        </defs>
                        
                        {/* PA Outline */}
                        <path 
                            d="M 0 176 L 0 19 L 40 0 L 40 19 L 274 19 Q 295 40 303 63 Q 290 85 282 109 Q 290 120 295 132 Q 300 150 284 160 C 270 165 260 175 251 176 Z" 
                            fill="#f1f5f9" 
                            stroke="#64748b" 
                            strokeWidth="3.5"
                            filter="url(#shadow)"
                            className="transition-colors duration-300 group-hover:fill-[#e2e8f0]"
                        />
                        
                        {/* Service Area Radius (40 miles) */}
                        <circle cx="192.4" cy="138" r="40" fill="rgba(249, 115, 22, 0.15)" stroke="#f97316" strokeWidth="1.5" className="animate-pulse" style={{ animationDuration: '3s' }} />
                        <circle cx="192.4" cy="138" r="40" fill="transparent" stroke="#ea580c" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
                        
                        {/* Radius Line & Label */}
                        <line x1="192.4" y1="138" x2="232.4" y2="138" stroke="#ea580c" strokeWidth="1" opacity="0.7" />
                        <rect x="207" y="130" width="12" height="6" fill="#ffffff" opacity="0.7" rx="1" />
                        <text x="213" y="135" textAnchor="middle" className="text-[4.5px] font-bold fill-navy-900 leading-none tracking-tight">40 mi</text>

                        {/* Harrisburg */}
                        <circle cx="192.4" cy="138" r="3.5" fill="#1e293b" className="drop-shadow-md" />
                        <circle cx="192.4" cy="138" r="1.5" fill="#f97316" />
                        <text x="192.4" y="128" textAnchor="middle" className="text-[8px] font-black fill-navy-900 tracking-tight drop-shadow-sm">Harrisburg, PA</text>
                        
                        {/* Major Cities for context */}
                        <circle cx="27.6" cy="126.3" r="1.5" fill="#94a3b8" />
                        <text x="27.6" y="121" textAnchor="middle" className="text-[5px] font-medium fill-slate-500">Pittsburgh</text>

                        <circle cx="284" cy="160" r="1.5" fill="#94a3b8" />
                        <text x="284" y="155" textAnchor="middle" className="text-[5px] font-medium fill-slate-500">Philadelphia</text>

                        <circle cx="141" cy="102" r="1.5" fill="#94a3b8" />
                        <text x="141" y="97" textAnchor="middle" className="text-[5px] font-medium fill-slate-500">State College</text>
                    </svg>
                </div>
                
                {/* Visual Label overlay */}
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:bottom-6 sm:left-6 bg-white border border-slate-100 shadow-lg px-4 py-3 rounded-2xl flex items-center gap-3 z-10">
                    <div className="relative flex items-center justify-center">
                        <span className="absolute w-5 h-5 rounded-full bg-gold-400 opacity-30 animate-ping" />
                        <span className="relative w-3 h-3 rounded-full bg-gold-500 border-2 border-white shadow-sm" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-navy-900 leading-none">Service Sector</span>
                        <span className="text-xs font-semibold text-slate-500 mt-0.5">40-mi radius around HBG</span>
                    </div>
                </div>
            </div>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
