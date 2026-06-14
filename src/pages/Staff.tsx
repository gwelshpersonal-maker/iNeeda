
import React, { useState, useEffect } from 'react';
import { User, Role, StaffType, ServiceCategory, BadgeType, Referral, SupportMessage } from '../types';
import { useData } from '../contexts/DataContext';
import { Plus, Edit2, ShieldAlert, History, Check, X, ShieldCheck, Wrench, ExternalLink, FileText, AlertCircle, Sparkles, Award, Gift, CheckCircle2, XCircle, DollarSign, Filter, Users, ArrowRight, Lock, Trash2, Rocket, MessageSquare, Mail } from 'lucide-react';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { ALL_SERVICE_CATEGORIES, BADGE_GROUPS } from '../constants';
import { format } from 'date-fns';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AuditLog {
  id: string;
  targetUserId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
  performedBy: string;
}

export const Staff = () => {
  const { 
    users, addUser, updateUser, deleteUser, isVendorSignupEnabled, toggleVendorSignup,
    referrals, updateReferral, isClientReferralEnabled, isProviderReferralEnabled, toggleClientReferral, toggleProviderReferral,
    serviceCategories
  } = useData();
  const [activeTab, setActiveTab] = useState<'users' | 'referrals' | 'support'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'PENDING'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm: () => void} | null>(null);

  const [supportMsgs, setSupportMsgs] = useState<SupportMessage[]>([]);

  useEffect(() => {
    if (activeTab !== 'support') return;
    const q = query(collection(db, 'supportMessages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as SupportMessage[];
        setSupportMsgs(msgs);
    }, (error) => {
        console.error("Error fetching support messages:", error);
    });
    return () => unsub();
  }, [activeTab]);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({ 
        role: Role.PROVIDER, 
        staffType: StaffType.MARKETPLACE_VENDOR, 
        isActive: true,
        verificationStatus: 'VERIFIED',
        hourlyRate: 35.00,
        phone: '',
        skills: [],
        pendingSkills: [], // Init empty
        badges: [], // Init empty
        insuranceType: 'DAILY_SHIELD' // Default for manual add
      });
    }
    setIsModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        if (editingUser) {
            await updateUser({ ...editingUser, ...formData } as User);
        } else {
            const newUser: User = {
                ...(formData as User),
                id: `user_${Date.now()}`,
                orgId: 'org_1',
            } as User;
            
            if(!newUser.name || !newUser.email) {
                alert("Name and Email are required");
                setIsSaving(false);
                return;
            }

            await addUser(newUser);
        }
        setIsModalOpen(false);
    } catch (e: any) {
        alert("Failed to save user: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleApprove = (user: User) => {
      setConfirmAction({
          message: `Approve ${user.name} to start accepting jobs?`,
          onConfirm: () => {
              updateUser({
                  ...user,
                  isActive: true,
                  verificationStatus: 'VERIFIED'
              });
              
              const log: AuditLog = {
                  id: Date.now().toString(),
                  targetUserId: user.id,
                  action: 'PROVIDER_APPROVED',
                  timestamp: new Date(),
                  performedBy: 'Admin'
              };
              setAuditLogs([log, ...auditLogs]);
          }
      });
  };

  const handleDeactivate = (id: string) => {
    const userToDeactivate = users.find(u => u.id === id);
    if (userToDeactivate) {
        updateUser({ ...userToDeactivate, isActive: false, verificationStatus: 'REJECTED' });
    }
  };

  const handleDelete = async (id: string) => {
    console.log("handleDelete initiated for:", id);
    try {
        await deleteUser(id);
        console.log("handleDelete successfully completed for:", id);
    } catch (error) {
        console.error("Failed to delete user", error);
        setConfirmAction({
            message: "Failed to delete user. Please check if you have admin permissions. Check console for details.",
            onConfirm: () => {}
        });
    }
  };

  const toggleSkill = (skill: ServiceCategory) => {
      setFormData(prev => {
          const currentSkills = prev.skills || [];
          if (currentSkills.includes(skill)) {
              return { ...prev, skills: currentSkills.filter(s => s !== skill) };
          } else {
              return { ...prev, skills: [...currentSkills, skill] };
          }
      });
  };

  const toggleBadge = (badge: BadgeType) => {
      setFormData(prev => {
          const currentBadges = prev.badges || [];
          if (currentBadges.includes(badge)) {
              return { ...prev, badges: currentBadges.filter(b => b !== badge) };
          } else {
              return { ...prev, badges: [...currentBadges, badge] };
          }
      });
  };

  const handlePendingSkillAction = (skill: ServiceCategory, action: 'APPROVE' | 'REJECT') => {
      setFormData(prev => {
          const currentPending = prev.pendingSkills || [];
          const currentSkills = prev.skills || [];

          // Remove from pending in all cases
          const newPending = currentPending.filter(s => s !== skill);

          let newSkills = currentSkills;
          if (action === 'APPROVE') {
              // Add to active skills if not already there
              if (!currentSkills.includes(skill)) {
                  newSkills = [...currentSkills, skill];
              }
          }

          return {
              ...prev,
              skills: newSkills,
              pendingSkills: newPending
          };
      });
  };

  const handleReferralAction = (id: string, action: 'APPROVE' | 'REJECT') => {
    const ref = referrals.find(r => r.id === id);
    if (ref) {
        const newStatus = action === 'APPROVE' ? 'PAID' : 'REJECTED';
        setConfirmAction({
            message: `Are you sure you want to mark this referral as ${newStatus}?`,
            onConfirm: () => {
                updateReferral({ ...ref, status: newStatus });
            }
        });
    }
  };

  // Filter Users
  // Logic Updated: Show user if they are pending verification OR have pending skill requests
  const displayUsers = users.filter(u => {
      if (filterType === 'PENDING') {
          const isPendingVerification = u.verificationStatus === 'PENDING';
          const hasPendingSkills = u.pendingSkills && u.pendingSkills.length > 0;
          return isPendingVerification || hasPendingSkills;
      }
      return true;
  });

  const pendingCount = users.filter(u => u.verificationStatus === 'PENDING' || (u.pendingSkills && u.pendingSkills.length > 0)).length;

  const filteredReferrals = referrals.filter(r => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING') return r.status === 'PENDING';
    if (filterStatus === 'PAID') return r.status === 'PAID';
    return true;
  });

  const pendingAmount = referrals.filter(r => r.status === 'PENDING').reduce((acc, curr) => acc + curr.payoutAmount, 0);
  const paidAmount = referrals.filter(r => r.status === 'PAID').reduce((acc, curr) => acc + curr.payoutAmount, 0);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Approvals & User Management</h1>
            <p className="text-slate-500 mt-1">Manage Clients, Providers, and Admins</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Users className="w-4 h-4" />
                    USER MGMT
                </button>
                <button 
                    onClick={() => setActiveTab('referrals')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'referrals' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Gift className="w-4 h-4" />
                    REFERRALS
                </button>
                <button 
                    onClick={() => setActiveTab('support')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'support' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <MessageSquare className="w-4 h-4" />
                    SUPPORT MSGS
                </button>
            </div>
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gold-200 shadow-sm">
                <span className="text-xs font-bold text-navy-900 uppercase tracking-wider pl-2">Public Pro Signup</span>
                <button 
                    onClick={() => toggleVendorSignup(!isVendorSignupEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isVendorSignupEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVendorSignupEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-bold px-2 ${isVendorSignupEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isVendorSignupEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
            </div>
            <div className="flex gap-3">
                <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button 
                        onClick={() => setFilterType('ALL')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterType === 'ALL' ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        ALL USERS
                    </button>
                    <button 
                        onClick={() => setFilterType('PENDING')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${filterType === 'PENDING' ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        PENDING 
                        {pendingCount > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px]">{pendingCount}</span>}
                    </button>
                </div>
                <button 
                onClick={() => handleOpenModal()}
                className="flex items-center px-5 py-2.5 bg-navy-600 text-white rounded-xl hover:bg-navy-700 transition-all shadow-md font-bold text-sm hover:-translate-y-0.5"
                >
                <Plus className="w-4 h-4 mr-2" />
                Add User
                </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Name</th>
                    <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Role</th>
                    <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Insurance</th>
                    <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs">Approval</th>
                    <th className="px-8 py-5 font-bold text-navy-900 uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-900 text-base flex items-center flex-wrap gap-2">
                            {user.name}
                            {user.isFoundersClub && (
                                <span title="Founders Club" className="bg-gradient-to-r from-gold-400 to-gold-600 text-white p-0.5 rounded-full shadow-sm flex items-center justify-center">
                                    <Rocket className="w-3 h-3" />
                                </span>
                            )}
                            {/* Dot indicator if action needed */}
                            {(user.verificationStatus === 'PENDING' || (user.pendingSkills?.length || 0) > 0) && (
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{user.email}</div>
                        <div className="text-xs text-slate-400">{user.phone}</div>
                        <BadgeDisplay badges={user.badges} size="sm" />
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === Role.ADMIN ? 'bg-purple-50 text-purple-700 border border-purple-100' : 
                          user.role === Role.PROVIDER ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-green-50 text-green-700 border border-green-100'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                         {user.role === Role.PROVIDER ? (
                             <div className="flex flex-col gap-1">
                                 {user.insuranceType === 'OWN_COI' ? (
                                     <span className={`text-[10px] font-bold flex items-center ${user.isCoiVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                         <FileText className="w-3 h-3 mr-1" />
                                         {user.isCoiVerified ? 'COI Verified' : 'COI Pending'}
                                     </span>
                                 ) : (
                                     <span className="text-[10px] font-bold text-blue-600 flex items-center">
                                         <ShieldCheck className="w-3 h-3 mr-1" /> Daily Shield
                                     </span>
                                 )}
                                 <span className={`text-[10px] font-bold flex items-center mt-1 ${user.isBackgroundCheckPaid ? 'text-green-600' : 'text-slate-400'}`}>
                                     {user.isBackgroundCheckPaid ? 'BGC Paid ($40)' : 'BGC Not Paid'}
                                 </span>
                             </div>
                         ) : (
                             <span className="text-slate-300">-</span>
                         )}
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-col gap-2">
                            {user.verificationStatus === 'PENDING' ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">ACCOUNT PENDING</span>
                                    <button 
                                        onClick={() => handleApprove(user)}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors shadow-sm"
                                        title="Approve Provider"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                    <span className="text-xs font-bold text-slate-400">ACCOUNT ACTIVE</span>
                                </div>
                            )}

                            {user.pendingSkills && user.pendingSkills.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center">
                                        <Sparkles className="w-3 h-3 mr-1" /> {user.pendingSkills.length} SKILL REQUESTS
                                    </span>
                                </div>
                            )}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right space-x-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(user); }}
                          className="text-slate-400 hover:text-navy-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setConfirmAction({
                              message: "Deactivate user?",
                              onConfirm: () => handleDeactivate(user.id)
                            });
                          }}
                          className="text-slate-400 hover:text-amber-600 transition-colors p-2 hover:bg-amber-50 rounded-lg"
                          title="Deactivate User"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setConfirmAction({
                              message: `Are you sure you want to completely delete ${user.name}? This action cannot be undone.`,
                              onConfirm: () => handleDelete(user.id)
                            });
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {displayUsers.length === 0 && (
                      <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400">No users found matching filters.</td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )} 
      
      {activeTab === 'referrals' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-navy-950">Referral Program</h2>
                    <p className="text-sm text-slate-500">Track and manage referral payouts.</p>
                </div>
                
                {/* Program Toggles */}
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Client Program */}
                    <div className="flex-1 bg-white p-5 rounded-2xl border border-pink-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-pink-50 text-pink-500 rounded-xl shrink-0">
                            <Gift className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-navy-900">Client Program</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => toggleClientReferral(!isClientReferralEnabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isClientReferralEnabled ? 'bg-pink-500' : 'bg-slate-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isClientReferralEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${isClientReferralEnabled ? 'text-pink-600' : 'text-slate-400'}`}>
                                        {isClientReferralEnabled ? 'ACTIVE' : 'OFF'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 mb-2">Give clients an incentive to invite friends.</p>
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <div className="flex items-center gap-2 text-sm font-bold text-navy-900 mb-1">
                                    <span className="text-pink-500">$20</span> Give, <span className="text-pink-500">$20</span> Get
                                </div>
                                <p className="text-xs text-slate-500">Friends get $20 off their first job. Referrer gets $20 when the friend's first job is completed.</p>
                            </div>
                        </div>
                    </div>

                    {/* Pro Program */}
                    <div className="flex-1 bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-xl shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-navy-900">Pro Program</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => toggleProviderReferral(!isProviderReferralEnabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isProviderReferralEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isProviderReferralEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${isProviderReferralEnabled ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {isProviderReferralEnabled ? 'ACTIVE' : 'OFF'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 mb-2">Grow supply by rewarding pros for recruiting.</p>
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <div className="flex items-center gap-2 text-sm font-bold text-navy-900 mb-1">
                                    <span className="text-blue-500">$50</span> Bonus
                                </div>
                                <p className="text-xs text-slate-500">Referrer earns $50 for every skilled pro they bring to the crew after the new pro completes their first job.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!isClientReferralEnabled && !isProviderReferralEnabled ? (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-12 text-center">
                    <Lock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-slate-500">Referral Program Disabled</h2>
                    <p className="text-slate-400 max-w-md mx-auto mt-2">
                        All referral features, text, and calculations are currently hidden from users. 
                        Enable the program above to resume activity and view data.
                    </p>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                    <Gift className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-navy-900">${pendingAmount.toFixed(2)}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Payouts</div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-navy-900">${paidAmount.toFixed(2)}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Paid YTD</div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gold-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-navy-900">{referrals.length}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Referrals</div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gold-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-navy-900 flex items-center">
                                <Filter className="w-4 h-4 mr-2" /> Filter List
                            </h2>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setFilterStatus('ALL')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'ALL' ? 'bg-white shadow text-navy-900' : 'text-slate-500'}`}
                                >
                                    All
                                </button>
                                <button 
                                    onClick={() => setFilterStatus('PENDING')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'PENDING' ? 'bg-white shadow text-navy-900' : 'text-slate-500'}`}
                                >
                                    Pending
                                </button>
                                <button 
                                    onClick={() => setFilterStatus('PAID')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'PAID' ? 'bg-white shadow text-navy-900' : 'text-slate-500'}`}
                                >
                                    Paid
                                </button>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Referrer</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Referred User</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Payout</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredReferrals.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                No referrals found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredReferrals.map(ref => {
                                            const referrer = users.find(u => u.id === ref.referrerUserId);
                                            const referee = users.find(u => u.id === ref.referredUserId);
                                            
                                            return (
                                                <tr key={ref.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 text-slate-600">{format(new Date(ref.createdAt), 'MMM d, yyyy')}</td>
                                                    <td className="px-6 py-4 font-bold text-navy-900">{referrer?.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 text-slate-700 flex items-center gap-2">
                                                        <ArrowRight className="w-3 h-3 text-slate-400" />
                                                        {referee?.name || 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {ref.programType === 'CLIENT_REFERRAL' 
                                                            ? <span className="text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded font-bold uppercase border border-pink-100">Client Gift</span> 
                                                            : <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase border border-blue-100">Pro Bonus</span>
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                                            ref.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                            ref.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {ref.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                                                        ${ref.payoutAmount}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {ref.status === 'PENDING' && (
                                                            <div className="flex justify-end gap-2">
                                                                <button 
                                                                    onClick={() => handleReferralAction(ref.id, 'APPROVE')}
                                                                    className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                                                                    title="Mark Paid"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleReferralAction(ref.id, 'REJECT')}
                                                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                                                    title="Reject"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
      )}

      {activeTab === 'support' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-navy-950">Support Messages</h2>
                    <p className="text-sm text-slate-500">View and respond to general inquiries submitted via the Contact page.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">From</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Subject</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Message</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {supportMsgs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-400">No support messages found.</td>
                                </tr>
                            ) : (
                                supportMsgs.map(msg => (
                                    <tr key={msg.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {format(msg.createdAt, 'MMM d, yyyy h:mm a')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-navy-900">
                                            <a href={`mailto:${msg.email}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                                <Mail className="w-4 h-4"/> {msg.email}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-navy-800">
                                            {msg.subject}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-sm truncate whitespace-normal" title={msg.body}>
                                            <div className="max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                                {msg.body}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md border ${
                                                msg.status === 'NEW' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                                msg.status === 'READ' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                                {msg.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {auditLogs.length > 0 && activeTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-navy-900 flex items-center mb-4 uppercase tracking-wider">
                <History className="w-4 h-4 mr-2 text-slate-400"/> Audit Log
            </h3>
            <ul className="text-xs text-slate-600 space-y-3">
                {auditLogs.map(log => (
                    <li key={log.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 transition-colors">
                        <span className="font-mono text-slate-400">{log.timestamp.toLocaleTimeString()}</span>
                        <span className="font-bold text-navy-800">{log.action}</span>
                        <span className="text-slate-500">for {users.find(u => u.id === log.targetUserId)?.name}</span>
                        <span className="text-slate-400 italic ml-auto">by {log.performedBy}</span>
                    </li>
                ))}
            </ul>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <h2 className="text-2xl font-extrabold mb-6 text-navy-900">{editingUser ? 'Edit User' : 'Add New User'}</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2">Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Full Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Email</label>
                    <input 
                    type="email" 
                    className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="email@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Phone</label>
                    <input 
                    type="tel" 
                    className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="555-0000"
                    />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Role</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as Role})}
                    >
                      <option value={Role.CLIENT}>Client (Homeowner)</option>
                      <option value={Role.PROVIDER}>Provider</option>
                      <option value={Role.ADMIN}>Admin</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-navy-900 mb-2">Verification</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 text-navy-900 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-navy-100 focus:border-navy-500 font-medium"
                      value={formData.verificationStatus || 'VERIFIED'}
                      onChange={e => setFormData({...formData, verificationStatus: e.target.value as any})}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                 </div>
              </div>

              {/* Insurance & Skills for Providers */}
              {formData.role === Role.PROVIDER && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-bold text-navy-900">Insurance & COI</label>
                            <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded">{formData.insuranceType === 'DAILY_SHIELD' ? 'Daily Shield Program' : 'Own Insurance'}</span>
                        </div>
                        
                        <div className="space-y-3">
                            {formData.insuranceType === 'OWN_COI' ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-200">
                                        <span className="text-xs text-slate-500 flex items-center">
                                            <FileText className="w-3 h-3 mr-1" /> Certificate on file
                                        </span>
                                        {formData.coiUrl && (
                                            <a href={formData.coiUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center">
                                                View <ExternalLink className="w-3 h-3 ml-1" />
                                            </a>
                                        )}
                                    </div>
                                    <label className="flex items-center p-2 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={formData.isCoiVerified || false}
                                            onChange={(e) => setFormData({...formData, isCoiVerified: e.target.checked})}
                                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                        />
                                        <span className="ml-2 text-xs font-bold text-emerald-800">Verify Certificate of Insurance</span>
                                    </label>
                                </div>
                            ) : (
                                <p className="text-xs text-blue-800">
                                    User is opted into the Daily Shield program. A $2.00 deduction applies to all jobs automatically.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="w-4 h-4 text-navy-600" />
                            <label className="block text-sm font-bold text-navy-900">Background Check</label>
                        </div>
                        <label className="flex items-center p-3 cursor-pointer bg-white/60 hover:bg-white rounded-lg border border-slate-200 transition-colors w-fit">
                            <input 
                                type="checkbox"
                                checked={formData.isBackgroundCheckPaid || false}
                                onChange={(e) => setFormData({...formData, isBackgroundCheckPaid: e.target.checked})}
                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            />
                            <span className="ml-2 text-xs font-bold text-navy-900">Background Check Paid</span>
                        </label>
                    </div>

                    {/* Pending Skills Section (Only if requests exist) */}
                    {formData.pendingSkills && formData.pendingSkills.length > 0 && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <label className="block text-sm font-bold text-amber-900">Skill Requests</label>
                            </div>
                            <div className="space-y-2">
                                {formData.pendingSkills.map(skill => (
                                    <div key={skill} className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                        <span className="text-sm font-bold text-navy-900">{skill}</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handlePendingSkillAction(skill, 'APPROVE')}
                                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-bold text-xs transition-colors"
                                                title="Approve Skill"
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => handlePendingSkillAction(skill, 'REJECT')}
                                                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold text-xs transition-colors"
                                                title="Reject Skill"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Wrench className="w-4 h-4 text-navy-600" />
                            <label className="block text-sm font-bold text-navy-900">Active Authorizations</label>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 font-medium">Select the categories this provider is eligible to see and accept.</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {serviceCategories.map(cat => {
                                const category = cat.id;
                                return (
                                <label key={category} className={`flex items-center p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                    formData.skills?.includes(category) 
                                    ? 'bg-navy-900 border-navy-900 text-white font-bold shadow-md' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={formData.skills?.includes(category) || false}
                                        onChange={() => toggleSkill(category)}
                                    />
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${formData.skills?.includes(category) ? 'bg-gold-400 border-gold-400' : 'bg-slate-100 border-slate-300'}`}>
                                        {formData.skills?.includes(category) && <Check className="w-3 h-3 text-navy-900" />}
                                    </div>
                                    {cat.name}
                                </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-gold-50 to-amber-50 p-4 rounded-xl border border-gold-200 mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Rocket className="w-4 h-4 text-gold-600" />
                                <label className="block text-sm font-bold text-navy-900 tracking-tight">Founders Club</label>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 mb-4 font-medium max-w-sm">Founders Club members have their Pro Membership fee permanently waived. They gain all perks of an active subscription.</p>
                        <label className="flex items-center p-3 cursor-pointer bg-white/60 hover:bg-white rounded-lg border border-gold-200/60 transition-colors w-fit">
                            <input 
                                type="checkbox"
                                checked={formData.isFoundersClub || false}
                                onChange={(e) => setFormData({...formData, isFoundersClub: e.target.checked})}
                                className="w-4 h-4 text-gold-600 rounded border-gray-300 focus:ring-gold-500"
                            />
                            <span className="ml-2 text-xs font-bold text-navy-900">Enable Founders Club Status</span>
                        </label>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Award className="w-4 h-4 text-navy-600" />
                            <label className="block text-sm font-bold text-navy-900">Badges</label>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 font-medium">Assign badges to this provider to build trust and highlight their qualifications.</p>
                        
                        <div className="space-y-4">
                            {Object.entries(BADGE_GROUPS).map(([groupName, badges]) => (
                                <div key={groupName}>
                                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">{groupName}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {badges.map(badge => (
                                            <label key={badge.id} className={`flex items-start p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                                formData.badges?.includes(badge.id) 
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                            }`}>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden"
                                                    checked={formData.badges?.includes(badge.id) || false}
                                                    onChange={() => toggleBadge(badge.id)}
                                                />
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 mt-0.5 transition-colors shrink-0 ${formData.badges?.includes(badge.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-100 border-slate-300'}`}>
                                                    {formData.badges?.includes(badge.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold">{badge.label}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{badge.description}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  </>
              )}

            </div>
            <div className="mt-8 flex justify-between items-center pt-4 border-t border-slate-100">
              <div>
                {editingUser && (
                  <button 
                    onClick={() => {
                        setConfirmAction({
                          message: `Are you sure you want to completely delete ${editingUser.name}? This action cannot be undone.`,
                          onConfirm: () => {
                              handleDelete(editingUser.id);
                              setIsModalOpen(false);
                          }
                        });
                    }}
                    className="flex items-center text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-bold text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete User
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-6 py-3 bg-navy-900 text-white rounded-xl shadow-lg font-bold transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-navy-800 hover:-translate-y-0.5'}`}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-xl font-bold text-navy-900 mb-2">Are you sure?</h3>
            <p className="text-slate-600 mb-6">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors font-bold shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
