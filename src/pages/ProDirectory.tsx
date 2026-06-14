import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Role, ShiftStatus } from '../types';
import { Users, Search, Filter, ShieldCheck, MapPin, Star, UserPlus, CheckCircle2, X } from 'lucide-react';
import { ALL_SERVICE_CATEGORIES } from '../constants';
import { BadgeDisplay } from '../components/BadgeDisplay';

import { getProviderStats } from '../utils/providerStats';

export const ProDirectory = () => {
    const { users, updateUser, serviceCategories, shifts } = useData();
    const { currentUser } = useAuth();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'ALL' | 'CREW'>('ALL');
    const [expandedPros, setExpandedPros] = useState<Set<string>>(new Set());

    const toggleExpandPro = (proId: string) => {
        setExpandedPros(prev => {
            const next = new Set(prev);
            if (next.has(proId)) next.delete(proId);
            else next.add(proId);
            return next;
        });
    };

    // Only show VERIFIED providers, but let current user see their own card
    const directoryPros = users.filter(u => 
        u.role === Role.PROVIDER && 
        (u.verificationStatus === 'VERIFIED' || u.id === currentUser?.id)
    );

    const filteredPros = directoryPros.filter(pro => {
        if (viewMode === 'CREW' && !currentUser?.crewList?.includes(pro.id)) return false;

        const matchesSearch = pro.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              pro.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || (pro.skills && pro.skills.includes(categoryFilter as any));
        return matchesSearch && matchesCategory;
    });

    const handleToggleCrew = async (proId: string) => {
        if (!currentUser) return;
        
        let newCrewList = [...(currentUser.crewList || [])];
        if (newCrewList.includes(proId)) {
            newCrewList = newCrewList.filter(id => id !== proId);
        } else {
            newCrewList.push(proId);
        }
        
        await updateUser({
            ...currentUser,
            crewList: newCrewList
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Provider Directory</h1>
                    <p className="text-slate-500 mt-1">Find and save verified professionals to your Crew List.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
                    <button 
                        onClick={() => setViewMode('ALL')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'ALL' ? 'bg-white text-navy-900 shadow' : 'text-slate-500 hover:text-navy-700'}`}
                    >
                        All Providers
                    </button>
                    <button 
                        onClick={() => setViewMode('CREW')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'CREW' ? 'bg-white text-navy-900 shadow' : 'text-slate-500 hover:text-navy-700'}`}
                    >
                        My Crew
                    </button>
                </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-gold-400"
                    />
                </div>
                <div className="relative md:w-64">
                    <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-gold-400 appearance-none"
                    >
                        <option value="ALL">All Categories</option>
                        {serviceCategories.filter(cat => cat.isActive && cat.isPublic).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPros.map(pro => {
                    const inCrew = currentUser?.crewList?.includes(pro.id);
                    
                    const { rating: displayRating, jobsCompleted: completedJobsCount } = getProviderStats(pro.id, shifts, pro);

                    return (
                        <div key={pro.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="relative h-20 bg-gradient-to-r from-navy-800 via-navy-700 to-indigo-900">
                                {/* Optional: add a subtle pattern or banner image here later */}
                            </div>
                            <div className="px-6 pb-6 mt-[-32px]">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <div className="w-16 h-16 rounded-2xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center text-navy-900 font-bold text-xl mb-3 relative z-10">
                                            {pro.profileImage ? (
                                                <img src={pro.profileImage} alt={pro.name} className="w-full h-full object-cover rounded-xl" />
                                            ) : (
                                                <div className="w-full h-full bg-navy-50 rounded-xl flex items-center justify-center text-navy-600">
                                                    {pro.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-navy-900 text-lg flex items-center tracking-tight flex-wrap gap-1">
                                                {pro.companyName || pro.name}
                                                <ShieldCheck className="w-5 h-5 text-blue-500 ml-0.5" />
                                                {pro.isFoundersClub && (
                                                    <span title="Founders Club Client" className="ml-1 bg-gradient-to-r from-gold-400 to-gold-600 text-white rounded-full p-0.5 shadow-sm inline-flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                                                    </span>
                                                )}
                                            </h3>
                                            {pro.companyName && (
                                                <p className="text-sm text-slate-500 font-medium mb-1">
                                                    {pro.name}
                                                </p>
                                            )}
                                            <div className="flex flex-col text-sm text-slate-500 mt-1">
                                                <div className="flex items-center font-medium bg-slate-50 py-1 px-2 rounded-lg self-start">
                                                    <Star className="w-3.5 h-3.5 text-amber-500 mr-1.5 fill-current" /> 
                                                    <span className="text-navy-900 font-bold mr-1">{displayRating}</span>
                                                    <span className="mx-2 text-slate-300">•</span> 
                                                    {completedJobsCount} jobs done
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {pro.businessDescription && (
                                    <div className="mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 relative">
                                        <p className={`leading-relaxed whitespace-pre-wrap ${expandedPros.has(pro.id) ? '' : 'line-clamp-3'}`}>
                                            {pro.businessDescription}
                                        </p>
                                        {pro.businessDescription.length > 150 && (
                                            <button 
                                                onClick={() => toggleExpandPro(pro.id)}
                                                className="text-navy-600 font-semibold hover:text-navy-800 mt-1 text-xs"
                                            >
                                                {expandedPros.has(pro.id) ? 'Show less' : 'Read more'}
                                            </button>
                                        )}
                                    </div>
                                )}
                                
                                <div className="mb-4">
                                    <p className="text-sm text-slate-600 mb-2 font-medium">Categories & Rates:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {pro.skills && pro.skills.length > 0 ? pro.skills.map((skill, idx) => {
                                            const rate = pro.categoryRates?.[skill as any] ?? pro.hourlyRate ?? 0;
                                            const catDef = serviceCategories.find(c => c.id === skill);
                                            // Only render if we have a valid definition, or fallback to the raw ID
                                            const displayName = catDef ? catDef.name : skill.replace(/_/g, ' ');
                                            
                                            return (
                                                <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md flex items-center">
                                                    {displayName}
                                                    <span className="ml-1.5 pl-1.5 border-l border-slate-300 text-slate-500">
                                                        ${rate}/hr
                                                    </span>
                                                </span>
                                            );
                                        }) : (
                                            <span className="text-sm text-slate-400 italic">No categories listed</span>
                                        )}
                                    </div>
                                </div>

                                {pro.badges && pro.badges.length > 0 && (
                                    <div className="mb-4 pt-2">
                                        <BadgeDisplay badges={pro.badges} size="sm" />
                                    </div>
                                )}

                                {pro.portfolioImages && pro.portfolioImages.length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        <p className="text-sm text-slate-600 font-medium">Portfolio Gallery:</p>
                                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                                            {pro.portfolioImages.map((img, idx) => (
                                                <button 
                                                    key={idx} 
                                                    onClick={() => setSelectedImage(img)}
                                                    className="flex-none w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors cursor-zoom-in"
                                                >
                                                    <img src={img} alt={`Portfolio ${idx}`} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100 flex justify-end items-center">
                                    <button 
                                        onClick={() => handleToggleCrew(pro.id)}
                                        className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center text-sm ${inCrew ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {inCrew ? (
                                            <><CheckCircle2 className="w-4 h-4 mr-1" /> Crew List</>
                                        ) : (
                                            <><UserPlus className="w-4 h-4 mr-1" /> Add to Crew</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredPros.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                        No professionals found matching your search.
                    </div>
                )}
            </div>

            {/* Image Lightbox */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img 
                        src={selectedImage} 
                        alt="Portfolio Large" 
                        className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in duration-300" 
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
