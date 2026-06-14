import React, { useState } from 'react';
import { PublicNav } from '../components/PublicNav';
import { PublicFooter } from '../components/PublicFooter';
import { useData } from '../contexts/DataContext';
import { Phone, Mail, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { CareersSection } from '../components/CareersSection';

export const PublicSupport: React.FC = () => {
  const { faqs } = useData();
  const [activeTab, setActiveTab] = useState<'SUPPORT' | 'CAREERS'>('SUPPORT');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-gold-200">
      <PublicNav />

      <main className="flex-1 pt-40 md:pt-48 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl font-extrabold text-navy-900">Support Center</h1>
              <p className="text-slate-500 mt-2">We're here to help you get the job done.</p>
            </div>
            <div className="flex bg-white p-1 rounded-lg border border-gold-200 shadow-sm hidden md:flex">
                <button 
                    onClick={() => setActiveTab('SUPPORT')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'SUPPORT' ? 'bg-navy-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Help & FAQs
                </button>
                <button 
                    onClick={() => setActiveTab('CAREERS')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'CAREERS' ? 'bg-navy-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Join iNeeda
                </button>
            </div>
          </div>

          <div className="md:hidden flex bg-white p-1 rounded-lg border border-gold-200 shadow-sm mb-8">
              <button 
                  onClick={() => setActiveTab('SUPPORT')}
                  className={`flex-1 px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'SUPPORT' ? 'bg-navy-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  Help & FAQs
              </button>
              <button 
                  onClick={() => setActiveTab('CAREERS')}
                  className={`flex-1 px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'CAREERS' ? 'bg-navy-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  Join iNeeda
              </button>
          </div>

          {activeTab === 'CAREERS' ? (
              <CareersSection />
          ) : (
            <div className="space-y-12">
              {/* Contact Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-gold-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="p-4 bg-navy-50 text-navy-600 rounded-full mb-4">
                        <Phone className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-navy-900 mb-2">Call Us</h3>
                    <p className="text-sm text-slate-600">Mon-Fri, 8am - 6pm</p>
                    <a href="tel:555-123-4567" className="text-gold-600 font-bold mt-3 hover:underline text-lg">(555) 123-4567</a>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gold-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="p-4 bg-navy-50 text-navy-600 rounded-full mb-4">
                        <Mail className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-navy-900 mb-2">Email Us</h3>
                    <p className="text-sm text-slate-600">Anytime</p>
                    <a href="mailto:support@ineeda.work" className="text-gold-600 font-bold mt-3 hover:underline text-lg">support@ineeda.work</a>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gold-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="p-4 bg-navy-50 text-navy-600 rounded-full mb-4">
                        <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-navy-900 mb-2">HQ</h3>
                    <p className="text-sm text-slate-600">123 To Be Determined St.</p>
                    <p className="text-sm text-slate-600">Camp Hill, PA 17011</p>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-navy-900 mb-8 text-center">Frequently Asked Questions</h2>
                  
                  {faqs.length > 0 ? (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {faqs.sort((a,b) => a.order - b.order).map((faq) => (
                            <div key={faq.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:border-gold-300 transition-colors">
                                <button 
                                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                                    className="w-full flex justify-between items-center p-6 text-left font-bold text-navy-900 hover:bg-slate-50"
                                >
                                    <span className="text-lg">{faq.question}</span>
                                    {openFaq === faq.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </button>
                                {openFaq === faq.id && (
                                    <div className="p-6 pt-0 text-slate-600 bg-slate-50 border-t border-slate-100 leading-relaxed">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500">No FAQs available at this time.</p>
                  )}
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
