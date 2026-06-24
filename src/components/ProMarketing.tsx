import React, { useState } from 'react';
import { Share2, Facebook, Twitter, Mail, Copy, CheckCircle2, Star, Megaphone, Target, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { getProviderStats } from '../utils/providerStats';
import { ShiftStatus } from '../types';

export const ProMarketing = () => {
    const { currentUser } = useAuth();
    const { shifts } = useData();
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedTemplateIndex, setCopiedTemplateIndex] = useState<number | null>(null);

    if (!currentUser) return null;

    const stats = getProviderStats(currentUser.id, shifts, currentUser);
    
    // Find a recent 5-star review if any
    const myCompletedJobs = shifts.filter(s => s.userId === currentUser.id && (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED));
    const latest5StarReviewJob = myCompletedJobs.slice().reverse().find(s => s.clientRating === 5 && s.clientFeedback);

    const profileUrl = `https://ineeda.work/signup?ref=${currentUser.id}&type=client`;
    
    const primaryCategory = currentUser.skills && currentUser.skills.length > 0 ? currentUser.skills[0].replace('_', ' ') : 'services';

    const templates = [
        {
            title: 'General Promotion',
            icon: Megaphone,
            text: `Hi friends! 👋 I'm offering professional ${primaryCategory.toLowerCase()} services on iNeeda.Work. \n\nIf you or anyone you know needs help, you can hire me directly through the platform. Fair prices and great service guaranteed!\n\nBook me here: ${profileUrl}`
        },
        {
            title: 'Availability Alert',
            icon: Target,
            text: `Looking to get some things done this week? I have some open availability for ${primaryCategory.toLowerCase()} jobs.\n\nMessage me or book me directly on iNeeda.Work:\n${profileUrl}`
        }
    ];

    if (latest5StarReviewJob && latest5StarReviewJob.clientFeedback) {
        templates.unshift({
            title: 'Share Recent 5-Star Review',
            icon: Award,
            text: `So grateful for my amazing clients! 🙏 Just received this 5-star review on iNeeda.Work:\n\n"${latest5StarReviewJob.clientFeedback}"\n\nNeed help with your next project? Hire me today:\n${profileUrl}`
        });
    }

    const copyToClipboard = (text: string, index?: number) => {
        navigator.clipboard.writeText(text);
        if (index !== undefined) {
            setCopiedTemplateIndex(index);
            setTimeout(() => setCopiedTemplateIndex(null), 2000);
        } else {
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        }
    };

    const shareToFacebook = (text: string) => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}&quote=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'width=600,height=400');
    };

    const shareToTwitter = (text: string) => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'width=600,height=400');
    };

    const shareToEmail = (title: string, text: string) => {
        const url = `mailto:?subject=${encodeURIComponent(`Hire me on iNeeda.Work: ${title}`)}&body=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-navy-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Share2 className="w-32 h-32" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Grow Your Business</h2>
                    <p className="text-indigo-100 text-lg mb-6 leading-relaxed">
                        The easiest way to get more jobs is to let your network know you're available. Share your profile and let clients book you directly on iNeeda.Work.
                    </p>
                    
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                         <div className="flex-1 bg-black/20 rounded-xl px-4 py-3 font-mono text-sm overflow-x-auto whitespace-nowrap text-indigo-50 border border-white/10">
                             {profileUrl}
                         </div>
                         <button 
                             onClick={() => copyToClipboard(profileUrl)}
                             className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-navy-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                         >
                             {copiedUrl ? <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Copied!</> : <><Copy className="w-5 h-5 text-indigo-600" /> Copy Link</>}
                         </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 px-2">
                <Megaphone className="w-5 h-5 text-navy-900" />
                <h3 className="text-xl font-bold text-navy-900">Marketing Templates</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {templates.map((template, idx) => (
                    <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <template.icon className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-navy-900 text-lg">{template.title}</h4>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 relative group flex-1">
                            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                     onClick={() => copyToClipboard(template.text, idx)}
                                     className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-slate-100 text-slate-500 transition-colors"
                                     title="Copy text"
                                 >
                                     {copiedTemplateIndex === idx ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                 </button>
                            </div>
                            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                {template.text}
                            </div>
                        </div>

                        <div className="space-y-3 mt-auto">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Share via</div>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => shareToFacebook(template.text)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors font-semibold text-xs"
                                >
                                    <Facebook className="w-5 h-5" />
                                    Facebook
                                </button>
                                <button
                                    onClick={() => shareToTwitter(template.text)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-colors font-semibold text-xs"
                                >
                                    <Twitter className="w-5 h-5" />
                                    Post (X)
                                </button>
                                <button
                                    onClick={() => shareToEmail(template.title, template.text)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-semibold text-xs"
                                >
                                    <Mail className="w-5 h-5" />
                                    Email
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-gold-50 border border-gold-200 rounded-2xl p-6 mt-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-gold-100 text-gold-600 flex items-center justify-center rounded-full shrink-0">
                    <Star className="w-8 h-8 fill-current" />
                </div>
                <div>
                    <h4 className="font-bold text-navy-900 text-lg mb-1">Pro Tip: Ask for Reviews</h4>
                    <p className="text-slate-700 text-sm">
                        You have <span className="font-bold">{stats.jobsCompleted} completed jobs</span> and a <span className="font-bold">{stats.rating} rating</span>. 
                        Don't be afraid to remind your past clients to leave you a quick review! More 5-star reviews will boost your ranking in the Provider Directory.
                    </p>
                </div>
            </div>
        </div>
    );
};
