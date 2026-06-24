import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Wrench, Clock, Star, ArrowRight, CheckCircle2, ChevronRight, Menu, X, ShoppingBag, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import * as Icons from 'lucide-react';
import { APP_LOGO_URL } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shift } from '../types';

import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';

export const Landing: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { currentUser } = useAuth();
  const { publicProfiles, platformMessages, serviceCategories } = useData();

  const [recentJobs, setRecentJobs] = useState<Shift[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<{title: string, subtitle: string, description: string, emoji?: string, iconName?: string, colorClass?: string} | null>(null);

  useEffect(() => {
    const fetchRecentJobs = async () => {
      try {
        const q = query(
          collection(db, 'shifts'),
          where('status', 'in', ['COMPLETED', 'VERIFIED']),
          limit(10) // fetch extra to filter locally just in case
        );
        const snapshot = await getDocs(q);
        const jobsList: Shift[] = [];
        snapshot.forEach((doc) => {
          jobsList.push({ id: doc.id, ...doc.data() } as Shift);
        });
        
        // Filter out private ones and sort descending by start
        const publicJobs = jobsList
          .filter(j => j.isPublic !== false)
          .sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt as any).seconds : 0;
            const timeB = b.createdAt ? (b.createdAt as any).seconds : 0;
            return timeB - timeA;
          })
          .slice(0, 3);
          
        setRecentJobs(publicJobs);
      } catch (error) {
        console.error("Error fetching recent jobs:", error);
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchRecentJobs();
  }, []);


  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-navy-900/5 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
              <img src="/logo.png" alt="iNeeda Logo" className="h-20 md:h-28 w-auto rounded-3xl hover:scale-105 transition-transform duration-300 shadow-md" />
            </div>
            <div className="mb-6 inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700">
              Local help made simple
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-navy-900 tracking-tight mb-8">
              Need it? Find local help in minutes.
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-6 max-w-2xl mx-auto leading-relaxed">
              Post a job, compare bids, and choose the right person for the work. <strong className="text-navy-900 font-extrabold bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-100/50 inline-flex items-center"><span className="text-blue-600">iN</span>eeda</strong> makes it simple to get local jobs, tasks, and errands done.
            </p>
            <div className="flex items-center justify-center gap-6 mb-10 text-slate-600 font-medium text-sm md:text-base">
              <span className="flex items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" /> Compare bids</span>
              <span className="flex items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" /> Choose who you trust</span>
              <span className="flex items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" /> Built for local work</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link 
                to={currentUser ? "/dashboard" : "/signup"} 
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full bg-navy-900 text-white hover:bg-navy-800 transition-all shadow-xl hover:-translate-y-1"
              >
                Post a Job
              </Link>
              <Link 
                to="/pro-services" 
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full bg-white text-navy-900 border-2 border-navy-900 hover:bg-slate-50 transition-all shadow-lg hover:-translate-y-1"
              >
                Become a Professional
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
            <div className="mb-6 inline-flex rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-xs font-bold tracking-widest text-blue-600 uppercase">
              Services
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-navy-950 mb-6">What do you need help<br/>with?</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">From handyman repairs to moving help, find local professionals ready to get the job done.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
               {/* Service categories loosely aligned to mockup emojis */}
                {(serviceCategories && serviceCategories.length > 0 ? serviceCategories.filter(c => c.isPublic) : []).slice(0, 8).map((cat) => {
                 const Icon = (Icons as any)[cat.iconName] || Icons.Wrench;
                 return (
                 <div key={cat.id} onClick={() => setSelectedCategoryInfo({ title: cat.name, subtitle: '', description: cat.description, iconName: cat.iconName, colorClass: cat.colorClass })} className="bg-white rounded-[2rem] p-8 text-center border-2 border-slate-100 hover:border-navy-100 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-full group">
                    <div className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-slate-50 ${cat.colorClass}`}>
                        <Icon strokeWidth={1.5} className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-navy-900 text-lg mb-2">{cat.name}</h3>
                      <p className="text-slate-500 text-xs font-medium line-clamp-2">{cat.description}</p>
                    </div>
                    <div className="mt-6 text-blue-600 font-bold text-sm tracking-wide group-hover:text-blue-700 flex items-center justify-center">
                      Info <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                 </div>
               )})}
          </div>
        </div>
      </section>

      {/* Example Client Jobs Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4">Recent Jobs Near You</h2>
            <p className="text-lg text-slate-500">See what your neighbors are getting done right now.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {loadingJobs ? (
              <div className="col-span-3 text-center py-12 text-slate-500">
                Loading recent jobs...
              </div>
            ) : recentJobs.length > 0 ? (
              recentJobs.map((job) => {
                const provider = job.userId ? publicProfiles.find(p => p.id === job.userId) : null;
                return (
                <div key={job.id} className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold tracking-wider text-gold-600 mb-2 uppercase">{job.category.replace('_', ' ')}</div>
                    <h3 className="text-xl font-bold text-navy-900 mb-2 line-clamp-2">{job.description}</h3>
                    <div className="flex items-center text-slate-500 text-sm mb-4">
                      <span className="mr-3">Local</span>
                    </div>
                  </div>
                  {provider && (
                    <div className="mt-4 mb-4 flex items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {provider.profileImage ? (
                        <img src={provider.profileImage} alt={provider.name} className="w-10 h-10 rounded-full object-cover mr-3 bg-white" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 border border-indigo-200">
                          {(provider.companyName || provider.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-navy-900">Completed by</p>
                        <p className="text-sm font-medium text-slate-600">{provider.companyName || provider.name || 'A Local Pro'}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                    <span className="font-semibold text-emerald-600">{job.price ? `$${job.price}` : 'Quotes Requested'}</span>
                    <span className="text-sm font-medium text-slate-400">Completed</span>
                  </div>
                </div>
              )})
            ) : (
                <div className="col-span-3 text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
                  No public jobs posted recently. Be the first!
                </div>
            )}
          </div>

          <div className="text-center">
            <Link 
              to={currentUser ? "/dashboard" : "/signup"} 
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full bg-navy-900 text-white hover:bg-navy-800 transition-all shadow-xl hover:-translate-y-1"
            >
              Find a Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="about" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <div className="mb-4 inline-flex rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-xs font-bold tracking-widest text-blue-600 uppercase">
                Why Choose Us
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-navy-950 mb-6">Why customers choose<br/><span className="text-blue-600">iN</span>eeda</h2>
              <p className="text-lg text-slate-500 leading-relaxed font-medium">You stay in control. Instead of being assigned someone, you compare your options and pick the help that feels right.</p>
            </div>
            
            <div className="flex flex-col gap-4">
               {[
                 "Compare prices before choosing",
                 "Find local help for everyday jobs",
                 "Pick based on trust, schedule, and budget",
                 "Simple, fast local tasks"
               ].map((item, idx) => (
                 <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 mr-4 shrink-0" />
                    <span className="font-extrabold text-navy-950 text-lg">{item}</span>
                 </div>
               ))}
            </div>
        </div>
      </section>

      {/* Why We Built iNeeda Section */}
      <section className="py-20 md:py-32 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#0b1e36] rounded-[2rem] p-10 md:p-16 text-white text-center md:text-left shadow-xl">
              <div className="mb-10 inline-block">
                <img src="/logo.png" alt="iNeeda Logo" className="h-14 w-auto rounded-xl" />
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-8 tracking-tight">Why we built <span className="text-blue-600">iN</span>eeda</h2>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium mb-6">
                Finding reliable local help should not require calling around, waiting for callbacks, or guessing who to trust.
              </p>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium mb-6">
                <span className="text-blue-600">iN</span>eeda was built to make local work simpler: customers post what they need, local professionals can view jobs, submit quotes, and the customer chooses the person that fits their budget, schedule, and comfort level.
              </p>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium">
                Our goal is to create a trusted local marketplace where everyday jobs get done faster and local workers get more opportunities.
              </p>
            </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-navy-950 mb-6 tracking-tight">Launching first in Central PA</h2>
            <p className="text-lg text-slate-500 leading-relaxed font-medium mb-12 max-w-3xl mx-auto">
              iNeeda is starting local so we can build trust, support customers, and grow the professional network the right way.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
               {[
                 "Camp Hill",
                 "Mechanicsburg",
                 "Harrisburg",
                 "Carlisle",
                 "Enola",
                 "Lemoyne",
                 "New Cumberland",
                 "Dillsburg",
                 "Hummelstown",
                 "And nearby areas"
               ].map((item, idx) => (
                 <div key={idx} className="bg-white rounded-full px-8 py-3 shadow-sm border border-slate-100 font-extrabold text-navy-950 hover:bg-slate-50 transition-colors cursor-pointer">
                    {item}
                 </div>
               ))}
            </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-navy-950 mb-6 tracking-tight">Frequently asked questions</h2>
            <p className="text-lg text-slate-500 leading-relaxed font-medium mb-12 max-w-2xl mx-auto">
              Simple answers for customers and professionals before launch.
            </p>
            
            <div className="flex flex-col gap-6 text-left">
               {[
                 { q: <>How does <span className="text-blue-600">iN</span>eeda work?</>, a: "A customer posts a job, local professionals can submit bids, and the customer chooses who they want to hire." },
                 { q: <>Is <span className="text-blue-600">iN</span>eeda only for home services?</>, a: "No. The first categories may include home and local services, but the brand is built for many types of everyday jobs and tasks." },
                 { q: <>Can professionals choose which jobs they want?</>, a: "Yes. Professionals can review available jobs and bid only on the work that fits their skills, area, and schedule." },
                 { q: <>What happens if I post a job but don't like any bids?</>, a: "You stay in control. You do not have to choose a bid that does not fit your budget, schedule, or comfort level." },
                 { q: <>Where is <span className="text-blue-600">iN</span>eeda launching first?</>, a: "iNeeda is being built first around Central PA, with the goal of expanding as more customers and professionals join." }
               ].map((faq, idx) => (
                 <div key={idx} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                    <h3 className="font-extrabold text-navy-950 text-xl mb-4">{faq.q}</h3>
                    <p className="text-lg text-slate-500 leading-relaxed font-medium">{faq.a}</p>
                 </div>
               ))}
            </div>
        </div>
      </section>

      <PublicFooter />

      {/* Category Info Modal */}
      {selectedCategoryInfo && (
        <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedCategoryInfo(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-navy-900 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
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
              <h4 className="font-bold text-navy-900 mb-2 flex items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" /> Types of Jobs</h4>
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
                Find Pro
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
