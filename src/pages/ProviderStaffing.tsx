import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Role, Shift, ShiftStatus, ServiceCategory } from '../types';
import { PaymentModal } from '../components/PaymentModal';
import { formatDistanceToNow, format } from 'date-fns';
import { Plus, Sparkles, MessageCircle, MapPin, Calendar, Clock, DollarSign, CheckCircle2, TrendingUp, Info, Loader2, AlertTriangle } from 'lucide-react';
import { CompletedGigs } from './CompletedGigs';
import { refineJobDescription, getMarketPriceEstimate, MarketPriceEstimate } from '../services/aiService';

export const ProviderStaffing = () => {
  const { currentUser } = useAuth();
  const { shifts, users, addShift, updateShift, deleteShift, sites, addSite, fundGig, serviceCategories } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
      amount: number;
      description: string;
      gigId: string;
      category?: string;
      hasOwnInsurance?: boolean;
      isEmergency?: boolean;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [requestDesc, setRequestDesc] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [deletingGigId, setDeletingGigId] = useState<string | null>(null);
  
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');

  const [targetCrewIds, setTargetCrewIds] = useState<string[]>([]);
  const [sendToPublic, setSendToPublic] = useState(true);
  const [numberOfPros, setNumberOfPros] = useState(1);

  const [descriptionAiUsed, setDescriptionAiUsed] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [marketEstimate, setMarketEstimate] = useState<MarketPriceEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const handleRefineDescription = async () => {
    if (!requestDesc.trim()) return;
    
    setIsRefining(true);
    try {
        const refined = await refineJobDescription(requestDesc);
        setRequestDesc(refined);
        setDescriptionAiUsed(true);
    } catch (error: any) {
        console.error("Failed to refine description", error);
        alert(`AI Refinement failed: ${error.message || 'Check your AI configuration.'}`);
    } finally {
        setIsRefining(false);
    }
  };

  const handleGetMarketEstimate = async () => {
    if (!selectedCategory || !requestDesc.trim()) return;

    setIsEstimating(true);
    setMarketEstimate(null);
    try {
        const estimate = await getMarketPriceEstimate(selectedCategory, requestDesc);
        setMarketEstimate(estimate);
    } catch (error: any) {
        console.error("Failed to get market estimate", error);
        alert(`Market Estimate failed: ${error.message || 'Check your AI configuration.'}`);
    } finally {
        setIsEstimating(false);
    }
  };

  const activeCategories = useMemo(() => {
    const activeSkills = new Set<ServiceCategory>();
    users.forEach(u => {
      if (u.role === Role.PROVIDER && u.verificationStatus === 'VERIFIED' && u.skills) {
        u.skills.forEach(skill => activeSkills.add(skill));
      }
    });
    // Also include any categories selected by the user to avoid breaking the select if the selected category is somehow no longer active
    if (selectedCategory) activeSkills.add(selectedCategory);
    
    return serviceCategories.filter(cat => activeSkills.has(cat.id)).map(cat => cat.id);
  }, [users, selectedCategory, serviceCategories]);

  const crewListPros = useMemo(() => {
     return users.filter(u => currentUser?.crewList?.includes(u.id));
  }, [users, currentUser]);

  const toggleCrewTarget = (id: string) => {
      setTargetCrewIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const myPostedGigs = useMemo(() => {
    return shifts.filter(s => 
      s.clientId === currentUser?.id && 
      (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS || s.status === ShiftStatus.OPEN_REQUEST || s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED || s.status === ShiftStatus.SUSPENDED)
    ).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
  }, [shifts, currentUser]);

  const handleSaveInlineSite = async () => {
      if (!newLocationName.trim() || !newLocationAddress.trim() || !currentUser) return;
      const newId = `site_${Date.now()}`;
      await addSite({
          id: newId,
          orgId: currentUser.orgId,
          ownerId: currentUser.id,
          name: newLocationName,
          address: newLocationAddress,
          latitude: 40.2732, // placeholder
          longitude: -76.8867, // placeholder
          radiusMeters: 50
      });
      setSelectedSiteId(newId);
      setIsAddingLocation(false);
      setNewLocationName('');
      setNewLocationAddress('');
  };

  const submitRequest = () => {
      if (!selectedCategory || !selectedSiteId || !requestDesc || !currentUser) return;

      const baseGroupId = `grp_${Date.now()}`;
      
      for (let i = 0; i < numberOfPros; i++) {
          const newGig: Shift = {
              id: `gig_${Date.now()}_${i}`,
              userId: null,
              clientId: currentUser.id,
              siteId: selectedSiteId,
              start: new Date(),
              end: new Date(Date.now() + 2 * 60 * 60 * 1000),
              description: numberOfPros > 1 ? `${requestDesc} (Position ${i + 1} of ${numberOfPros})` : requestDesc,
              category: selectedCategory,
              status: ShiftStatus.OPEN_REQUEST,
              isRecurring: false,
              type: 'SCHEDULED', 
              price: parseFloat(estimatedPrice) || 0,
              createdAt: new Date(),
              isPublic: sendToPublic,
              targetedProviders: targetCrewIds.length > 0 ? targetCrewIds : undefined,
              groupId: numberOfPros > 1 ? baseGroupId : undefined
          };

          addShift(newGig);
      }

      setIsModalOpen(false);
      setSelectedCategory(null);
      setRequestDesc('');
      setEstimatedPrice('');
      setTargetCrewIds([]);
      setSendToPublic(true);
      setNumberOfPros(1);
      alert(`Your ${numberOfPros > 1 ? numberOfPros + ' ' : ''}staffing request${numberOfPros > 1 ? 's have' : ' has'} been posted${targetCrewIds.length > 0 ? " and alerts sent to your targeted crew!" : "!"}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Staffing</h1>
          <p className="text-slate-500 mt-1">Hire and manage staff for your gigs</p>
        </div>
        <button 
          onClick={() => {
              if (sites.length > 0) setSelectedSiteId(sites[0].id);
              setIsModalOpen(true);
          }}
          className="flex items-center px-5 py-2.5 bg-navy-600 text-white rounded-xl hover:bg-navy-700 transition-all shadow-md font-bold text-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Post a Gig
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
            <BriefcaseIcon className="w-5 h-5 mr-2 text-gold-500" /> My Posted Gigs
        </h2>
        {myPostedGigs.length === 0 ? (
            <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-500 flex flex-col items-center">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Sparkles className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold text-navy-900">No active staffing requests.</p>
                <p className="text-sm mt-1">Post a gig to hire another provider to help you.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {myPostedGigs.map(gig => {
                    const assignedProvider = users.find(u => u.id === gig.userId);
                    return (
                    <div key={gig.id} className="p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
                        <div className="flex-1">
                             <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                                    gig.status === 'OPEN_REQUEST' ? 'bg-amber-100 text-amber-700' : 
                                    gig.status === 'SUSPENDED' ? 'bg-slate-200 text-slate-700' :
                                    (gig.status === 'ACCEPTED' && gig.escrowStatus === 'PENDING') ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                    {gig.status === 'ACCEPTED' && gig.escrowStatus === 'PENDING' ? 'Awaiting Funding' : gig.status.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">Posted {gig.createdAt ? formatDistanceToNow(gig.createdAt) : 'recently'} ago</span>
                            </div>
                            <h3 className="font-bold text-navy-900 text-lg">{gig.category}</h3>
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{gig.description}</p>
                            
                            {assignedProvider && (
                                <div className="mt-3 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 inline-flex">
                                    <div className="w-6 h-6 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-bold text-xs">
                                        {assignedProvider.name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-bold text-navy-900">Assigned to {assignedProvider.name}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-3 min-w-[120px]">
                            <div className="text-2xl font-black text-navy-900">${gig.price?.toFixed(2)}</div>
                            {gig.status === 'ACCEPTED' && gig.escrowStatus === 'PENDING' && (
                                <button 
                                    onClick={() => setPendingPayment({
                                        amount: gig.price || 0,
                                        description: gig.description,
                                        gigId: gig.id,
                                        category: gig.category,
                                        isEmergency: gig.type === 'URGENT'
                                    })}
                                    className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg font-bold text-xs hover:bg-gold-400 transition-all shadow-sm"
                                >
                                    Fund Job
                                </button>
                            )}
                            {(gig.status === 'OPEN_REQUEST' || gig.status === 'SUSPENDED') && (
                                <div className="flex flex-col gap-2 w-full">
                                    <button 
                                        onClick={() => updateShift({ ...gig, status: gig.status === 'OPEN_REQUEST' ? ShiftStatus.SUSPENDED : ShiftStatus.OPEN_REQUEST })}
                                        className="px-4 py-2 bg-slate-200 text-navy-900 rounded-lg font-bold text-xs hover:bg-slate-300 transition-all text-center w-full"
                                    >
                                        {gig.status === 'OPEN_REQUEST' ? 'Suspend' : 'Resume'}
                                    </button>
                                    {deletingGigId === gig.id ? (
                                        <div className="flex gap-2 w-full mt-1">
                                            <button 
                                                onClick={() => setDeletingGigId(null)}
                                                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 transition-all text-center w-1/2"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    try {
                                                        const oldId = gig.id;
                                                        setDeletingGigId(null);
                                                        await deleteShift(oldId);
                                                    } catch(err: any) {
                                                        const message = err?.message || 'Failed to delete';
                                                        try {
                                                            const json = JSON.parse(message);
                                                            alert("Delete failed: " + json.error);
                                                        } catch(error) {
                                                            alert("Delete failed: " + message);
                                                        }
                                                    }
                                                }}
                                                className="px-3 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-all text-center w-1/2"
                                            >
                                                Confirm
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDeletingGigId(gig.id);
                                            }}
                                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold text-xs hover:bg-red-200 transition-all text-center w-full"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        )}
      </div>

      <div className="mt-8">
        <CompletedGigs />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <h2 className="text-2xl font-extrabold mb-6 text-navy-900">Post a Staffing Gig</h2>
            
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Category</label>
                    <select 
                        className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                        value={selectedCategory || ''}
                        onChange={e => setSelectedCategory(e.target.value as ServiceCategory)}
                    >
                        <option value="" disabled>Select a category</option>
                        {activeCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {sites.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-navy-900">Location</label>
                            {!isAddingLocation && (
                                <button type="button" onClick={() => setIsAddingLocation(true)} className="text-xs font-bold text-navy-600 hover:text-navy-800 transition-colors">
                                    + Add New Location
                                </button>
                            )}
                        </div>
                        
                        {isAddingLocation ? (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location Name</label>
                                    <input type="text" placeholder="e.g. Grandma's House" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-navy-100 text-sm font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                                    <input type="text" placeholder="123 Main St, City, ST" value={newLocationAddress} onChange={e => setNewLocationAddress(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-navy-100 text-sm font-medium" />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button type="button" onClick={() => setIsAddingLocation(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                                    <button type="button" onClick={handleSaveInlineSite} disabled={!newLocationName || !newLocationAddress} className="px-4 py-2 text-sm font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-xl transition-colors disabled:opacity-50">Save & Use</button>
                                </div>
                            </div>
                        ) : (
                            <select 
                                className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                                value={selectedSiteId}
                                onChange={e => setSelectedSiteId(e.target.value)}
                            >
                                <option value="" disabled>Select a location</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name} - {site.address}</option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Description</label>
                    <div className="relative">
                        <textarea 
                            className={`w-full px-4 py-3 bg-slate-50 text-navy-900 border rounded-xl outline-none focus:ring-4 font-medium min-h-[120px] transition-all ${descriptionAiUsed ? 'border-navy-400 ring-2 ring-navy-100 bg-navy-50/30 text-sm' : 'border-slate-200 focus:ring-navy-100 focus:border-navy-400 text-sm'}`}
                            placeholder="Describe the work you need help with..."
                            value={requestDesc}
                            onChange={e => {
                                setRequestDesc(e.target.value);
                                if (descriptionAiUsed) setDescriptionAiUsed(false);
                            }}
                        />
                        {descriptionAiUsed && (
                            <div className="absolute top-3 right-3 animate-pulse">
                                <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-200" />
                            </div>
                        )}
                    </div>
                    {descriptionAiUsed && (
                        <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                            <AlertTriangle className="w-5 h-5 text-indigo-700 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-indigo-900 font-medium">
                                <span className="font-bold block mb-1">AI Assisted Description</span>
                                Please review and update the text above. Ensure all details are accurate before posting.
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end mt-2">
                        <button 
                            type="button"
                            onClick={handleRefineDescription}
                            disabled={isRefining || !requestDesc.trim()}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {isRefining ? 'Refining...' : 'Auto-Refine with AI'}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Number of Local Pros Needed</label>
                    <input 
                        type="number" 
                        min="1"
                        step="1"
                        className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                        placeholder="Select how many people you need..."
                        value={numberOfPros}
                        onChange={e => setNumberOfPros(parseInt(e.target.value) || 1)}
                    />
                    <p className="text-xs text-slate-500 mt-1">We'll create multiple matching requests if you need more than one local pro.</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-navy-900">Estimated Pay Per Local Pro ($)</label>
                        <button 
                            type="button"
                            onClick={handleGetMarketEstimate}
                            disabled={isEstimating || !requestDesc.trim()}
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                            {isEstimating ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                            {isEstimating ? 'Analyzing...' : 'Get Market Price'}
                        </button>
                    </div>
                    <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                        placeholder="e.g. 150"
                        value={estimatedPrice}
                        onChange={e => setEstimatedPrice(e.target.value)}
                    />
                    
                    {/* Market Estimate Display */}
                    {marketEstimate && (
                        <div className="mt-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-1">
                                <Sparkles className="w-12 h-12 text-indigo-500 opacity-5 -mr-4 -mt-4 rotate-12" />
                            </div>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-navy-900 uppercase tracking-wide flex items-center gap-1">
                                            Market Insight
                                            <span className="bg-indigo-100 text-indigo-700 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">AI</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400">Harrisburg, PA Area • Apr 2026</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-indigo-900 leading-none">
                                        ${marketEstimate.min} - ${marketEstimate.max}
                                    </p>
                                    <p className="text-[10px] font-bold text-indigo-400 mt-1 uppercase tracking-wider">Suggested Range</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 bg-white/50 p-3 rounded-lg border border-indigo-50 mb-3">
                                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-indigo-800 mb-0.5">CEO Tip:</p>
                                    <p className="text-xs text-indigo-600 leading-relaxed italic">"{marketEstimate.tip}"</p>
                                </div>
                            </div>

                            <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2 mb-3">
                                <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] text-amber-800 leading-tight">
                                    <strong>AI Disclaimer:</strong> This estimate is based on typical rates for similar jobs. AI content can be inaccurate; always review and adjust to your specific needs.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setEstimatedPrice(Math.round((marketEstimate.min + marketEstimate.max) / 2).toString())}
                                    className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                                    type="button"
                                >
                                    Use Average (${Math.round((marketEstimate.min + marketEstimate.max) / 2)})
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {crewListPros.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-bold text-navy-900 mb-2">Target Your Crew (Optional)</label>
                        <p className="text-xs text-slate-500 mb-3">Send this opportunity directly to professionals on your Crew List.</p>
                        
                        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
                            {crewListPros.map(pro => (
                                <div 
                                    key={pro.id} 
                                    onClick={() => toggleCrewTarget(pro.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${targetCrewIds.includes(pro.id) ? 'border-navy-500 bg-navy-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 mr-3 flex items-center justify-center overflow-hidden">
                                           {pro.profileImage ? <img src={pro.profileImage} className="w-full h-full object-cover" /> : pro.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-navy-900 text-sm">{pro.name}</p>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${targetCrewIds.includes(pro.id) ? 'border-navy-500 bg-navy-500 text-white' : 'border-slate-300'}`}>
                                        {targetCrewIds.includes(pro.id) && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {targetCrewIds.length > 0 && (
                            <label className="flex items-center p-3 bg-slate-50 rounded-xl cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={sendToPublic}
                                    onChange={(e) => setSendToPublic(e.target.checked)}
                                    className="w-4 h-4 text-navy-600 rounded border-slate-300 mr-3"
                                />
                                <span className="text-sm font-medium text-navy-900">Also post to the public job board</span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitRequest}
                disabled={!selectedCategory || !requestDesc || !estimatedPrice}
                className="px-6 py-3 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-all shadow-lg font-bold hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Gig
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPayment && (
          <PaymentModal 
              jobId={pendingPayment.gigId}
              onCancel={() => setPendingPayment(null)}
              amount={pendingPayment.amount}
              description={pendingPayment.description}
              isEmergency={pendingPayment.isEmergency}
              onSuccess={async () => {
                  try {
                      await fundGig(pendingPayment.gigId);
                      setPendingPayment(null);
                      alert("Gig successfully funded! Funds are now secured in escrow.");
                  } catch (error: any) {
                      alert(`Funding failed: ${error.message}`);
                  }
              }}
          />
      )}
    </div>
  );
};

function BriefcaseIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  )
}
