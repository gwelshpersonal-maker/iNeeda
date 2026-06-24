import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, Lock, Check, Sparkles } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export const VelvetRopeApplication = () => {
    const { serviceCategories } = useData();
    const providerCategories = serviceCategories && serviceCategories.length > 0
        ? serviceCategories.filter(cat => cat.isActive).map(cat => cat.name)
        : [
            'Handyman',
            'Landscaping',
            'Cleaning',
            'Furniture Assembly',
            'General Labor'
          ];

    const [formData, setFormData] = useState({
        fullName: '',
        businessName: '',
        phone: '',
        email: '',
        categories: [] as string[],
        category: '',
        requestedCategory: '',
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

        const finalCategoriesText = formData.categories.join(', ') || formData.category;

        if (!formData.fullName || !formData.phone || !formData.email || (!finalCategoriesText && !formData.requestedCategory) || !formData.biddingAnswer || !formData.escrowAnswer) {
            setError('Please complete all required fields. Select at least one category or request a new one.');
            setIsSubmitting(false);
            return;
        }

        try {
            await addDoc(collection(db, 'founders_club_applications'), {
                ...formData,
                category: finalCategoriesText,
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
                        The founder will text you within 24 hours to conduct a quick 5-minute introductory screening call to verify your business and get you onboarded. Keep an eye on your phone.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-navy-950 text-slate-200 py-12 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl mb-6 border border-indigo-500/20">
                        <Sparkles className="w-6 h-6 mr-2 text-indigo-400 animate-pulse" />
                        <span className="font-bold tracking-widest uppercase text-sm">Founders Club Application</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        Apply for the iNeeda Founders Club (717 Area)
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed max-w-xl mx-auto">
                        The first <strong className="text-white">5 independent pros per trade</strong> in the greater Harrisburg area who register and verify will join our elite <strong className="text-white">Founders Club</strong>. Founders receive a <strong className="text-white">lifetime waiver of the $20 monthly subscription fee</strong>—paying only the standard platform fees when you win a job. Category registration remains open for all, but this subscription waiver is strictly reserved for the first 5!
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
                            <label className="block text-lg font-bold text-white mb-1">Select Your Launch Categories</label>
                            <p className="text-sm text-slate-400 mb-4">Choose one or more trades you practice. The first 5 active pros per trade secure lifetime waived fees and Founders Club status!</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {providerCategories.map(cat => {
                                    const isSelected = formData.categories.includes(cat);
                                    return (
                                        <label key={cat} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-600/20 border-indigo-500' : 'bg-navy-950 border-navy-700 hover:border-slate-500'}`}>
                                            <input
                                                type="checkbox"
                                                name="category"
                                                value={cat}
                                                checked={isSelected}
                                                onChange={() => {
                                                    setFormData(prev => {
                                                        const alreadySelected = prev.categories.includes(cat);
                                                        const updated = alreadySelected
                                                            ? prev.categories.filter(c => c !== cat)
                                                            : [...prev.categories, cat];
                                                        return {
                                                            ...prev,
                                                            categories: updated,
                                                            category: '', // clear single category if any
                                                            requestedCategory: '' // clear manually requested category since they clicked a preset
                                                        };
                                                    });
                                                }}
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center mr-4 flex-shrink-0 transition-all ${isSelected ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-slate-500 bg-transparent'}`}>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                            </div>
                                            <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>{cat}</span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="mt-6 p-5 bg-navy-950 rounded-xl border border-navy-800">
                                <label className="block text-sm font-bold text-white mb-2">Request to Add a Job Category</label>
                                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                                    Don't see your trade above? Request it here. If there is enough response, we will add it immediately for launch. If not, we will be continuing to add new categories in the future and we will contact you if we add it.
                                </p>
                                <input
                                    type="text"
                                    value={formData.requestedCategory}
                                    onChange={(e) => setFormData({...formData, requestedCategory: e.target.value, categories: [], category: ''})}
                                    className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-500"
                                    placeholder="Enter your specific trade (e.g., Plumbing, Electrician)"
                                />
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
