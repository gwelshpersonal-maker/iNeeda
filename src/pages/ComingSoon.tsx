import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Mail, MapPin, Loader2, 
  Wrench, Hammer, Trash2, Scissors, Paintbrush, Heart, Star, ChevronRight 
} from 'lucide-react';

export const ComingSoon: React.FC = () => {
  const [email, setEmail] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [userType, setUserType] = useState<'CLIENT' | 'PROVIDER'>('CLIENT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'prelaunch_leads'), {
        email,
        zipCode: zipCode || 'N/A',
        rolePreference: userType,
        subscribedAt: serverTimestamp()
      });
      setSubmitted(true);
      setEmail('');
      setZipCode('');
    } catch (err: any) {
      console.error("Error saving lead:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const LAUNCH_AREAS = [
    "Camp Hill", "Mechanicsburg", "Harrisburg", "Carlisle", 
    "Enola", "Lemoyne", "New Cumberland", "Dillsburg"
  ];

  const LAUNCH_TRADES = [
    { name: "Handyman & Assembly", desc: "Small repairs, mounting, furniture assembly" },
    { name: "Lawn & Landscaping", desc: "Mowing, cleanups, mulching, planting" },
    { name: "Home & Office Cleaning", desc: "Standard cleaning, deep cleaning, moving prep" },
    { name: "Specialist Trades", desc: "Plumbing, electrical, painting, and drywall" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* Visual Ambient Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-16 flex-1 flex flex-col justify-center relative z-10">
        
        {/* Header/Logo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 sm:mb-20 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="iNeeda Logo" 
              className="h-14 w-auto rounded-2xl shadow-xl shadow-indigo-950/50 border border-slate-800 p-1 bg-slate-900" 
            />
            <span className="text-xl font-black text-white tracking-tight">
              <span className="text-indigo-400">iN</span>eeda.Work
            </span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Launching First in Central PA
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-6 leading-[1.1]">
            The Local Trade &amp; Task Marketplace
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We are building Pennsylvania's most trusted, direct-to-pro marketplace. Post your project, receive quotes, and pick who you trust.
          </p>
        </div>

        {/* Dynamic Dual split: Pros vs Clients */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          
          {/* Pro Card: Focus on Recruitment and /apply */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden backdrop-blur-md group hover:border-slate-700/80 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
                PRO ACTIVE
              </span>
            </div>
            
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-400" /> For Local Professionals
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Are you an independent provider, handyman, cleaner, or tradesperson? We are filling our exclusive <strong>Founders Club Pro Roster</strong> now! Apply today to claim your launch slot.
              </p>

              <div className="space-y-3.5 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-white">No $20 monthly subscription:</strong> Founders Club members enjoy a lifetime waiver of our monthly platform subscription fee.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-white">Founders benefits:</strong> The first 5 verified pros per trade secure free accounts and premium launch perks.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-white">Verified badges:</strong> Stand out to local clients with credential verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Link 
                to="/apply"
                className="w-full inline-flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl hover:shadow-indigo-950/50 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Apply for Founders Roster <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Client Card: Focus on Lead Generation */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden backdrop-blur-md group hover:border-slate-700/80 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                LAUNCHING SOON
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400 animate-pulse" /> For Property Owners &amp; Everyone
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Need landscaping, cleaning, odd-jobs, or specialty trades done? Sign up to get notified the second verified pros are available in your specific neighborhood.
              </p>

              {submitted ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle2 className="w-5 h-5" /> You're on the launch list!
                  </div>
                  We'll email you with early platform access as soon as verified pros in your zip code go live.
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-3 mb-6">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <input 
                        type="text" 
                        required
                        maxLength={5}
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Zip Code"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600 text-center"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Get Launch Notification <Mail className="w-4 h-4" /></>
                    )}
                  </button>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                </form>
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-4 text-center">
              <p className="text-[11px] text-slate-500">
                🔒 We respect your privacy. No spam. Unsubscribe at any time.
              </p>
            </div>
          </div>

        </div>

        {/* Feature Grid: Launch Trades */}
        <div className="mb-16">
          <h3 className="text-center font-bold text-slate-400 text-sm uppercase tracking-widest mb-8">
            🛠️ Main launch service categories
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LAUNCH_TRADES.map((trade, idx) => (
              <div key={idx} className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-colors">
                <h4 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {trade.name}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">{trade.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pennsylvania Pennsylvania launch areas */}
        <div className="text-center py-6 border-t border-slate-900">
          <p className="text-xs text-slate-500 font-medium mb-3">Launching in Central PA neighborhoods:</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {LAUNCH_AREAS.map((area, idx) => (
              <span key={idx} className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-900/60 text-slate-400 font-medium">
                {area}
              </span>
            ))}
            <span className="text-xs px-3 py-1 rounded-full text-indigo-400 font-bold">&amp; nearby areas</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 bg-slate-950 relative z-10 text-center">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div>
            &copy; {new Date().getFullYear()} iNeeda. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <span className="text-slate-800">&bull;</span>
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <span className="text-slate-800">&bull;</span>
            <Link to="/contact" className="hover:text-slate-300 transition-colors">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
