import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, Lock } from 'lucide-react';

const CATEGORIES = [
  'Handyman',
  'Landscaping',
  'Cleaning',
  'Furniture Assembly',
  'General Labor'
];

export const VelvetRopeApplication = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        businessName: '',
        phone: '',
        email: '',
        category: '',
        biddingAnswer: '',
        escrowAnswer: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!formData.fullName || !formData.phone || !formData.email || !formData.category || !formData.biddingAnswer || !formData.escrowAnswer) {
            setError('Please complete all required fields.');
            setIsSubmitting(false);
            return;
        }

        try {
            await addDoc(collection(db, 'founders_club_applications'), {
                ...formData,
                submittedAt: serverTimestamp(),
                status: 'NEW'
            });
            setIsSuccess(true);
        } catch (err: any) {
            console.error("Error submitting application:", err);
            setError('There was an error submitting your application. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center p-6">
                <div className="max-w-md w-full bg-navy-900 rounded-3xl p-8 lg:p-12 text-center border border-navy-800 shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Application Received.</h2>
                    <p className="text-slate-300 leading-relaxed">
                        If your trade category still has an open slot, the founder will text you within 24 hours to conduct a quick 5-minute introductory screening call. Keep an eye on your phone.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-navy-950 text-slate-200 py-12 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl mb-6">
                        <Lock className="w-6 h-6 mr-2" />
                        <span className="font-bold tracking-widest uppercase text-sm">Strictly Limited</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        Apply for the iNeeda Founders Club (717 Area)
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed max-w-xl mx-auto">
                        We are selecting exactly <strong className="text-white">10 independent pros per trade</strong> in the greater Harrisburg area for our launch. Founders Club members receive a <strong className="text-white">lifetime waiver of all monthly subscription fees</strong>—you only pay standard platform transaction splits when you actually win a job and get paid. Once the 10 slots in your category are filled, the door closes.
                    </p>
                </div>

                <div className="bg-navy-900 rounded-3xl border border-navy-800 shadow-2xl overflow-hidden">
                    <div className="bg-indigo-600 px-6 py-4 flex items-center">
                        <ShieldCheck className="w-5 h-5 text-indigo-200 mr-3 hidden sm:block" />
                        <h2 className="text-lg font-bold text-white">Private Intake Form</h2>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    required
                                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Business / Hustle Name <span className="text-slate-500 font-normal">(Optional)</span></label>
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    placeholder="Doe's Handyman Services"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-1">Cell Phone Number</label>
                                <p className="text-xs text-indigo-400 mb-2 italic">Crucial – this is how we will text you to schedule your 5-minute vetting call</p>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    required
                                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    placeholder="(717) 555-0100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    required
                                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-navy-800">
                            <label className="block text-lg font-bold text-white mb-1">Select Your Launch Category</label>
                            <p className="text-sm text-slate-400 mb-4">Choose your primary trade. We are strictly limiting to 10 per category.</p>
                            <div className="space-y-3">
                                {CATEGORIES.map(cat => (
                                    <label key={cat} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-colors ${formData.category === cat ? 'bg-indigo-600/20 border-indigo-500' : 'bg-navy-950 border-navy-700 hover:border-slate-500'}`}>
                                        <input
                                            type="radio"
                                            name="category"
                                            value={cat}
                                            checked={formData.category === cat}
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            className="sr-only"
                                            required
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0 ${formData.category === cat ? 'border-indigo-400' : 'border-slate-500'}`}>
                                            {formData.category === cat && <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full" />}
                                        </div>
                                        <span className={`font-medium ${formData.category === cat ? 'text-white' : 'text-slate-300'}`}>{cat}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-navy-800 space-y-8">
                            <h3 className="text-lg font-bold text-white">Qualification Filters</h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3 leading-relaxed">
                                    <strong className="text-white">We cap customer job quotes at a maximum of 3 pros</strong> so you aren't stuck racing to the bottom against 20 other people. Why does that matter to your business?
                                </label>
                                <textarea
                                    value={formData.biddingAnswer}
                                    onChange={(e) => setFormData({...formData, biddingAnswer: e.target.value})}
                                    required
                                    rows={4}
                                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-600"
                                    placeholder="Tell us your thoughts on the race to the bottom..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3 leading-relaxed">
                                    <strong className="text-white">Our software handles secure upfront escrow payments</strong> from clients so you get paid via Stripe/Zelle the moment the job is verified, instead of chasing unpaid invoices. Have you ever been burned by a customer ghosting you on a payment before?
                                </label>
                                <textarea
                                    value={formData.escrowAnswer}
                                    onChange={(e) => setFormData({...formData, escrowAnswer: e.target.value})}
                                    required
                                    rows={4}
                                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-600"
                                    placeholder="Share your experience (or simply write 'No')..."
                                />
                            </div>
                        </div>

                        <div className="pt-8">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Verify Category Availability & Apply
                                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
