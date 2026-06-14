
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User, Role, ServiceCategory } from '../types';
import { UserCircle, Mail, Phone, Shield, Bell, Save, Camera, Lock, CheckCircle2, AlertCircle, ShieldCheck, FileText, Upload, ExternalLink, Hammer, Check, Clock, Plus, X, CreditCard, Wallet, ArrowRight, Info, HelpCircle, Rocket, Loader2 } from 'lucide-react';
import { ALL_SERVICE_CATEGORIES, AVAILABLE_SERVICE_CATEGORIES, SERVICE_CATEGORIES } from '../constants';
import { format } from 'date-fns';
import { db } from '../lib/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';

export const AccountProfile = () => {
    const { currentUser } = useAuth();
    const { updateUser, platformConfig, serviceCategories } = useData();
    
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [formData, setFormData] = useState<Partial<User>>({});
    const [isAddingSkill, setIsAddingSkill] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<ServiceCategory | ''>('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'financials' | 'provider'>('general');
    const [checkoutUrl, setCheckoutUrl] = useState('');

    // Password change state (mock)
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'general' || tab === 'financials' || tab === 'provider') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (sessionId && currentUser) {
            setIsLoading(true);
            fetch('/api/verify-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, userId: currentUser.id })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSuccessMsg('Membership activated successfully!');
                }
                setSearchParams({ tab: 'financials' }, { replace: true });
            })
            .catch(err => {
                console.error("Error verifying checkout session:", err);
            })
            .finally(() => setIsLoading(false));
        }
    }, [searchParams, currentUser, setSearchParams]);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone,
                address: currentUser.address,
                role: currentUser.role,
                urgentAlertsEnabled: currentUser.urgentAlertsEnabled,
                companyName: currentUser.companyName,
                businessDescription: currentUser.businessDescription,
                profileImage: currentUser.profileImage,
                portfolioImages: currentUser.portfolioImages || [],
                insuranceType: currentUser.insuranceType,
                coiUrl: currentUser.coiUrl,
                skills: currentUser.skills || [],
                pendingSkills: currentUser.pendingSkills || [],
                categoryRates: currentUser.categoryRates || {},
                hourlyRate: currentUser.hourlyRate || 0,
                stripeAccountId: currentUser.stripeAccountId,
                hasPaymentMethod: currentUser.hasPaymentMethod,
                subscriptionStatus: currentUser.subscriptionStatus,
                subscriptionId: currentUser.subscriptionId,
                subscriptionPeriodEnd: currentUser.subscriptionPeriodEnd,
                stripeCustomerId: currentUser.stripeCustomerId,
                payoutMethod: currentUser.payoutMethod || 'ZELLE',
                zelleInfo: currentUser.zelleInfo || { emailOrPhone: '' }
            });
        }
    }, [currentUser]);

    const handleSubscribe = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setErrorMsg('');
        setCheckoutUrl('');
        
        try {
            const response = await fetch('/api/create-membership-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, email: currentUser.email, returnUrl: window.location.origin })
            });
            const data = await response.json();
            if (data.url) {
                // If we're inside an iframe (like the AI Studio preview), standard location change might hit X-Frame-Options block.
                // Best is to open in a new tab. Since it's async, it might be popup blocked.
                const newWindow = window.open(data.url, '_blank');
                if (!newWindow) {
                    // Fallback: popup was blocked.
                    // Let's not try to change window.location inside iframe because it results in a blank screen.
                    setCheckoutUrl(data.url);
                    setErrorMsg("Your browser blocked the payment pop-up. Please click the link above in the banner to continue to payment.");
                }
            } else {
                throw new Error(data.error?.message || data.error || "Failed to start checkout");
            }
        } catch (error: any) {
            console.error("Subscription error:", error);
            setErrorMsg(error.message || "Failed to start membership checkout. Check Stripe configuration.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check size (e.g., 500KB limit for COI)
            if (file.size > 500 * 1024) {
                alert("File is too large (max 500KB). Please use a smaller image or compressed PDF.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setFormData(prev => ({ ...prev, coiUrl: reader.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const compressImage = (file: File, maxWidth: number = 1200, maxQuality: number = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            // Hard limit input to 10MB to prevent browser crash
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error("File is too large (max 10MB). Please use a smaller source image."));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxWidth) {
                            width = Math.round((width * maxWidth) / height);
                            height = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', maxQuality));
                };
                img.onerror = () => reject(new Error("Failed to load image for compression."));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error("Failed to read file."));
            reader.readAsDataURL(file);
        });
    };

    const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsLoading(true);
            setErrorMsg('');
            try {
                const compressed = await compressImage(file, 600, 0.7);
                setFormData(prev => ({ ...prev, profileImage: compressed }));
            } catch (error: any) {
                console.error("Compression error:", error);
                setErrorMsg(error.message || "Failed to process image.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handlePortfolioImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const currentCount = formData.portfolioImages?.length || 0;
            if (currentCount + files.length > 6) {
                alert("Maximum 6 portfolio images allowed.");
                return;
            }

            setIsLoading(true);
            setErrorMsg('');
            try {
                const newImages: string[] = [];
                for (const file of Array.from(files)) {
                    // Portfolio images need higher resolution for "clarity" 
                    const compressed = await compressImage(file, 1200, 0.7);
                    newImages.push(compressed);
                }
                setFormData(prev => ({ 
                    ...prev, 
                    portfolioImages: [...(prev.portfolioImages || []), ...newImages] 
                }));
            } catch (error: any) {
                console.error("Portfolio upload error:", error);
                setErrorMsg(error.message || "Failed to process portfolio images.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handlePortfolioImageRemove = (index: number) => {
        setFormData(prev => ({ ...prev, portfolioImages: prev.portfolioImages?.filter((_, i) => i !== index) || [] }));
    };

    const handleConnectStripe = async () => {
        // Simulate Stripe Connect Onboarding Flow
        setIsLoading(true);
        console.log("Generating Stripe Express Onboarding Link...");
        
        // Simulate redirect delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate return from Stripe
        const newStripeId = `acct_${Date.now()}`;
        setFormData(prev => ({ ...prev, stripeAccountId: newStripeId }));
        
        // Immediately save the stripe ID to the user record context
        if (currentUser) {
            updateUser({
                ...currentUser,
                stripeAccountId: newStripeId
            });
        }

        setIsLoading(false);
        setSuccessMsg("Bank connected via Stripe Express!");
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleDisconnectStripe = () => {
        if (confirm("Disconnect payout method? You will not receive funds until reconnected.")) {
            setFormData(prev => ({ ...prev, stripeAccountId: undefined }));
            if (currentUser) {
                updateUser({
                    ...currentUser,
                    stripeAccountId: undefined
                });
            }
        }
    };

    // Client Payment Method Handlers
    const handleAddPaymentMethod = () => {
        setIsLoading(true);
        // Simulate adding card
        setTimeout(() => {
            setFormData(prev => ({ ...prev, hasPaymentMethod: true }));
            if (currentUser) {
                updateUser({ ...currentUser, hasPaymentMethod: true });
            }
            setIsLoading(false);
            setSuccessMsg("Credit Card added successfully!");
            setTimeout(() => setSuccessMsg(''), 3000);
        }, 1500);
    };

    const handleRemovePaymentMethod = () => {
        if (confirm("Remove payment method? You will not be able to request jobs.")) {
            setFormData(prev => ({ ...prev, hasPaymentMethod: false }));
            if (currentUser) {
                updateUser({ ...currentUser, hasPaymentMethod: false });
            }
        }
    };

    const handleAddPendingSkill = (skill: ServiceCategory) => {
        console.log("Adding pending skill:", skill);
        const currentPending = formData.pendingSkills || [];
        
        // Check if already pending or active
        if (currentPending.includes(skill) || formData.skills?.includes(skill)) {
            console.log("Skill already pending or active");
            setIsAddingSkill(false);
            setSelectedSkill('');
            return;
        }

        const newPending = [...currentPending, skill];
        
        setFormData(prev => ({
            ...prev,
            pendingSkills: newPending
        }));

        // Save to backend immediately
        if (currentUser) {
            const updatedUser = {
                ...currentUser,
                pendingSkills: newPending
            };
            console.log("Updating user with:", updatedUser);
            updateUser(updatedUser);
            setSuccessMsg(`Request for ${skill} authorization sent!`);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
        
        setIsAddingSkill(false);
        setSelectedSkill('');
    };

    const handleRemovePendingSkill = (skill: ServiceCategory) => {
        const newPending = formData.pendingSkills?.filter(s => s !== skill) || [];
        
        setFormData(prev => ({
            ...prev,
            pendingSkills: newPending
        }));

        if (currentUser) {
            updateUser({
                ...currentUser,
                pendingSkills: newPending
            });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            let updatedUser = {
                ...currentUser,
                ...formData,
            } as User;

            console.log("Saving profile. Portfolio images count:", updatedUser.portfolioImages?.length || 0);

            // Mock geocoding if address changed
            if (formData.address && formData.address !== currentUser.address) {
                updatedUser.latitude = 37.7749 + (Math.random() - 0.5) * 0.1;
                updatedUser.longitude = -122.4194 + (Math.random() - 0.5) * 0.1;
            }

            // Auto-update verification logic if Insurance changed
            if (formData.insuranceType === 'DAILY_SHIELD' && currentUser.insuranceType !== 'DAILY_SHIELD') {
                // User opted INTO Daily Shield -> Authorized immediately
                updatedUser.verificationStatus = 'VERIFIED'; 
                updatedUser.isActive = true; 
            } else if (formData.insuranceType === 'OWN_COI' && currentUser.insuranceType !== 'OWN_COI') {
                // User switched TO Own COI -> Needs verification
                updatedUser.isCoiVerified = false; 
            }

            await updateUser(updatedUser);

            // Password handling would go to a real auth backend here
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                // Mock success for password
            }

            setSuccessMsg('Profile updated successfully!');
            // Clear password fields
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Error updating profile:", error);
            let message = "Failed to update profile. Please try again.";
            
            // Check for Firestore size limit error
            if (error?.message?.includes('too large') || error?.message?.includes('limit')) {
                message = "The total size of your profile (images + info) exceeds the limit. Please remove some portfolio images or use smaller files.";
            } else if (error instanceof Error) {
                message = error.message;
            }
            
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
        }

        // Fade out success message
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    if (!currentUser) return null;

    const isProvider = currentUser.role === Role.PROVIDER;
    const isClient = currentUser.role === Role.CLIENT;
    const isAdmin = currentUser.role === Role.ADMIN;

    // Filter skills available to add (not already active or pending)
    const availableToAdd = serviceCategories
        .filter(cat => isAdmin || (cat.isPublic && cat.isActive))
        .map(cat => cat.id)
        .filter(catId => 
            !formData.skills?.includes(catId) && !formData.pendingSkills?.includes(catId)
        );

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-navy-900 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-gold-400 overflow-hidden">
                    {formData.profileImage ? (
                        <img src={formData.profileImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                        currentUser.name?.charAt(0) || 'U'
                    )}
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight flex items-center flex-wrap gap-2">
                        Account Settings
                        {currentUser.isFoundersClub && (
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 text-sm font-bold text-white shadow-sm flex items-center">
                                <Rocket className="w-4 h-4 mr-1" />
                                Founders Club
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 font-medium">Manage your profile details and preferences.</p>
                    {isProvider && <BadgeDisplay badges={currentUser.badges} size="md" />}
                </div>
            </div>

            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center shadow-sm animate-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center shadow-sm animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 mr-2" /> {errorMsg}
                </div>
            )}

            {checkoutUrl && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-4 rounded-xl shadow-sm animate-in slide-in-from-top-2 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center">
                        <AlertCircle className="w-6 h-6 mr-3 text-blue-500" />
                        <div>
                            <p className="font-bold text-sm">Action Required</p>
                            <p className="text-sm">Click the button to securely complete your subscription via Stripe.</p>
                        </div>
                    </div>
                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors whitespace-nowrap">
                        Pay with Stripe
                    </a>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* Tabs */}
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                    <button 
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}`}
                    >
                        General Information
                    </button>
                    {(isProvider || isClient) && (
                        <button 
                            type="button"
                            onClick={() => setActiveTab('financials')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'financials' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}`}
                        >
                            Financials
                        </button>
                    )}
                    {isProvider && (
                        <button 
                            type="button"
                            onClick={() => setActiveTab('provider')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'provider' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}`}
                        >
                            Provider Settings
                        </button>
                    )}
                </div>

                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in">
                            {/* General Info */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
            <UserCircle className="w-5 h-5 mr-2 text-gold-500" /> General Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2 flex items-center gap-6 pb-6 border-b border-slate-100 mb-2">
                <div className="relative group cursor-pointer">
                    <div className="h-24 w-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                        {formData.profileImage ? (
                            <img src={formData.profileImage} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                            <UserCircle className="w-12 h-12 text-slate-300" />
                        )}
                    </div>
                        <label htmlFor="profile-image-input" className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="w-8 h-8 text-white" />
                            <input type="file" id="profile-image-input" className="hidden" accept="image/*" onChange={handleProfileImageChange} />
                        </label>
                </div>
                <div>
                    <h3 className="font-bold text-navy-900">Profile Photo / Logo</h3>
                    <p className="text-sm text-slate-500 mb-2">Upload a professional photo or business logo.</p>
                    <label htmlFor="profile-logo-upload" className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors inline-flex items-center">
                        <Upload className="w-3 h-3 mr-1.5" /> Upload Image
                        <input type="file" id="profile-logo-upload" className="hidden" accept="image/*" onChange={handleProfileImageChange} />
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
            {currentUser?.role === Role.PROVIDER && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Company Name (Optional)</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                            placeholder="Your Business Name"
                            value={formData.companyName || ''}
                            onChange={e => setFormData({...formData, companyName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Business Description / Summary</label>
                        <textarea 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900 resize-none h-32"
                            placeholder="Tell clients about yourself, your experience, and your business..."
                            value={formData.businessDescription || ''}
                            onChange={e => setFormData({...formData, businessDescription: e.target.value.substring(0, 500)})}
                            maxLength={500}
                        />
                        <div className="text-right text-xs text-slate-500 mt-1">
                            {(formData.businessDescription || '').length} / 500 characters
                        </div>
                    </div>
                </>
            )}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                    value={formData.role || currentUser.role}
                    onChange={e => setFormData({...formData, role: e.target.value as Role})}
                >
                    <option value={Role.CLIENT}>Client (Homeowner)</option>
                    <option value={Role.PROVIDER}>Provider (Local Pro)</option>
                    <option value={Role.ADMIN}>Admin</option>
                    <option value={Role.MANAGER}>Manager</option>
                    <option value={Role.EMPLOYEE}>Employee</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Change your role for testing purposes.</p>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="email" 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                        value={formData.email || ''}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="tel" 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                        value={formData.phone || ''}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                </div>
            </div>
            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Address</label>
                <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium text-navy-900"
                    placeholder="123 Main St, City, State"
                    value={formData.address || ''}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                />
            </div>
        </div>
    </div>

                            {/* Notifications */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-gold-500" /> Notifications
        </h2>
        <div className="flex items-start justify-between">
            <div>
                <span className="block font-bold text-navy-900">Urgent Alerts</span>
                <p className="text-sm text-slate-500 mb-2">Receive SMS for emergency job requests in your area.</p>
                
                {isProvider && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-3 text-xs text-blue-800">
                        <p className="font-bold mb-1 flex items-center"><Info className="w-3 h-3 mr-1"/> How Emergency Alerts Work:</p>
                        <ul className="list-disc pl-4 space-y-1 opacity-90">
                            <li>Clients pay a <strong>flat $25 Emergency Fee</strong> to expedite their request.</li>
                            <li><strong>You receive $15 of this fee</strong> as a bonus for fast response.</li>
                            <li>The platform retains $10 to cover SMS and infrastructure costs.</li>
                            <li>Alerts are sent to providers within 30 miles who have the matching skill.</li>
                        </ul>
                    </div>
                )}
            </div>
            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in mt-1">
                <input 
                    type="checkbox" 
                    name="toggle" 
                    id="toggle" 
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 transform checked:translate-x-6 checked:border-green-500"
                    checked={formData.urgentAlertsEnabled ?? false}
                    onChange={e => setFormData({...formData, urgentAlertsEnabled: e.target.checked})}
                />
                <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${formData.urgentAlertsEnabled ? 'bg-green-500' : 'bg-slate-300'}`}></label>
            </div>
        </div>
    </div>

                            {/* Password Change (Mock) */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-gold-500" /> Security
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                <input 
                    type="password" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                <input 
                    type="password" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all font-medium"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                />
            </div>
        </div>
    </div>

                    </div>
                )}

                {activeTab === 'financials' && (
                    <div className="space-y-6 animate-in fade-in">
                        {isProvider ? (
                            <>
                                    {/* Membership Section */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
             {currentUser?.isFoundersClub ? (
                 <ShieldCheck className="w-12 h-12 opacity-10 text-gold-500" />
             ) : (
                 <ShieldCheck className={`w-12 h-12 opacity-10 ${['active', 'trialing'].includes(formData.subscriptionStatus || '') ? 'text-green-600' : 'text-slate-400'}`} />
             )}
        </div>
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-gold-500" /> Pro Membership
            {currentUser?.isFoundersClub && (
                <span className="ml-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 text-[10px] font-bold uppercase text-white shadow-sm flex items-center flex-shrink-0">
                    <Rocket className="w-3 h-3 mr-1" />
                    Founders Club
                </span>
            )}
        </h2>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-navy-900 text-lg tracking-tight">Monthly Listing Fee</h3>
                    {currentUser?.isFoundersClub ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gold-100 text-gold-700">
                            Waived
                        </span>
                    ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${['active', 'trialing'].includes(formData.subscriptionStatus || '') ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {['active', 'trialing'].includes(formData.subscriptionStatus || '') ? (formData.subscriptionStatus === 'trialing' ? 'In Trial' : 'Active') : (formData.subscriptionStatus || 'Inactive')}
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-500 max-w-md">
                    {currentUser?.isFoundersClub ? (
                        "As a Founders Club member, your monthly listing fees are permanently waived. Enjoy full access to bid on jobs, claim urgent requests, and appear in the Provider Directory."
                    ) : (
                        "$20/month allows you to bid on jobs, claim urgent requests, and appear in the Provider Directory."
                    )}
                </p>
                {!currentUser?.isFoundersClub && formData.subscriptionPeriodEnd && (() => {
                    try {
                        const dateObj = new Date(formData.subscriptionPeriodEnd as any);
                        if (!isNaN(dateObj.getTime())) {
                            return (
                                <p className="text-xs text-slate-400 mt-2">
                                    Next billing date: <span className="font-bold">
                                        {format(dateObj, 'MMMM d, yyyy')}
                                    </span>
                                </p>
                            );
                        }
                    } catch (e) { console.error('Date parse error', e); }
                    return null;
                })()}
            </div>

            {!currentUser?.isFoundersClub && (
                <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                    <div className="text-2xl font-black text-navy-900">$20<span className="text-sm font-bold text-slate-400">/mo</span></div>
                    {['active', 'trialing'].includes(formData.subscriptionStatus || '') ? (
                        <button 
                            type="button"
                            onClick={() => window.open('https://billing.stripe.com/p/login/test_mock')} // Mock portal
                            className="w-full px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center"
                        >
                            Manage Billing <ExternalLink className="w-3 h-3 ml-2" />
                        </button>
                    ) : (
                        <button 
                            type="button"
                            onClick={handleSubscribe}
                            disabled={isLoading}
                            className="w-full px-8 py-3 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center transform hover:-translate-y-0.5"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
                            Activate Membership
                        </button>
                    )}
                </div>
            )}
        </div>
    </div>

                                    {/* Provider Payout Settings */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-gold-500" /> Payout Method
        </h2>
        
        <div className="space-y-4">
            <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.payoutMethod === 'ZELLE' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`} onClick={() => {
                setFormData(prev => ({ ...prev, payoutMethod: 'ZELLE' }));
                if (currentUser) {
                    updateUser({ ...currentUser, payoutMethod: 'ZELLE' });
                }
            }}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-navy-900 text-lg">Zelle (Recommended)</h3>
                            <span className="bg-gold-100 text-gold-700 text-[10px] uppercase font-black px-1.5 py-0.5 rounded">Best</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">Processed with $0 fees. Available instantly upon job completion (Admin verified).</p>
                    </div>
                    {formData.payoutMethod === 'ZELLE' && <CheckCircle2 className="w-6 h-6 text-indigo-600" />}
                </div>

                {formData.payoutMethod === 'ZELLE' && (
                    <div className="mt-4 animate-in fade-in" onClick={e => e.stopPropagation()}>
                        <label className="block text-sm font-bold text-navy-900 mb-2">Zelle Email or Phone Number</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={formData.zelleInfo?.emailOrPhone || ''}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, zelleInfo: { emailOrPhone: e.target.value } }));
                                }}
                                onBlur={(e) => {
                                    if (currentUser) {
                                        updateUser({ ...currentUser, zelleInfo: { emailOrPhone: e.target.value } });
                                    }
                                }}
                                placeholder="name@example.com or 555-123-4567"
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.payoutMethod === 'STRIPE' ? (formData.stripeAccountId ? 'border-green-400 bg-green-50' : 'border-navy-400 bg-navy-50') : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`} onClick={() => {
                setFormData(prev => ({ ...prev, payoutMethod: 'STRIPE' }));
                if (currentUser) {
                    updateUser({ ...currentUser, payoutMethod: 'STRIPE' });
                }
            }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full shadow-sm ${formData.stripeAccountId ? 'bg-green-100 text-green-600' : 'bg-white text-slate-400'}`}>
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-navy-900 text-lg">Stripe Express</h3>
                            {formData.stripeAccountId ? (
                                <div className="flex items-center text-sm text-green-600 font-bold mt-1">
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Bank Account Connected
                                    <span className="ml-2 text-slate-400 font-normal text-xs font-mono">({formData.stripeAccountId})</span>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-600 mt-1">Use Stripe to add your bank for direct deposit. May incur monthly subscription costs and % processing fees for Express accounts.</p>
                            )}
                        </div>
                    </div>
                    {formData.payoutMethod === 'STRIPE' && !formData.stripeAccountId && <CheckCircle2 className="w-6 h-6 text-navy-600" />}
                </div>
                
                {formData.payoutMethod === 'STRIPE' && (
                    <div className="mt-4 pt-4 border-t border-black/5 flex justify-end" onClick={e => e.stopPropagation()}>
                        {formData.stripeAccountId ? (
                            <button 
                                type="button"
                                onClick={handleDisconnectStripe}
                                className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors"
                            >
                                Disconnect
                            </button>
                        ) : (
                            <button 
                                type="button"
                                onClick={handleConnectStripe}
                                disabled={isLoading}
                                className="px-6 py-2 bg-[#635BFF] text-white font-bold text-sm rounded-xl hover:bg-[#534ae6] transition-all shadow-md flex items-center"
                            >
                                {isLoading ? 'Redirecting...' : (
                                    <>
                                        Connect Bank <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>

                                    {/* Insurance Section - Redesigned */}
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-lg font-bold text-navy-900 mb-4 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-blue-600" /> Insurance or Daily Shield Verification
        </h3>

        {/* What is Daily Shield Info */}
        <div className="mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                    <Info className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-navy-900 text-sm mb-1">What is Daily Shield?</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        Daily Shield is an on-demand liability insurance program designed for gig workers. 
                        Instead of purchasing an expensive annual policy, you pay a small fee only for the jobs you work.
                    </p>
                    <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                        <li><strong>Pay-As-You-Go:</strong> Fees are deducted automatically from your job payout.</li>
                        <li><strong>Risk-Based Pricing:</strong> Fees vary based on the specific skill category (e.g., Moving is higher risk than Cleaning).</li>
                        <li><strong>Instant Verification:</strong> No waiting for document approval. You can start working immediately.</li>
                    </ul>
                </div>
            </div>
        </div>

        {/* Skill Fee Breakdown */}
        {Array.isArray(formData.skills) && formData.skills.length > 0 && (
            <div className="mb-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Rates (If using Daily Shield)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {formData.skills.map(skill => {
                        // Use the new SERVICE_CATEGORIES constant as the source of truth
                        // @ts-ignore - SERVICE_CATEGORIES is typed in constants.ts
                        const fee = SERVICE_CATEGORIES[skill]?.fee || 0;
                        
                        return (
                            <div key={skill} className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-slate-200 text-xs shadow-sm">
                                <span className="font-bold text-navy-900">{skill}</span>
                                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    ${fee.toFixed(2)} / job
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Daily Shield */}
            <div 
                onClick={() => setFormData({...formData, insuranceType: 'DAILY_SHIELD'})}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between h-full ${
                    formData.insuranceType === 'DAILY_SHIELD' 
                    ? 'border-gold-400 bg-white shadow-lg shadow-gold-100 scale-[1.02]' 
                    : 'border-slate-200 bg-white hover:border-gold-200 hover:bg-gold-50/30'
                }`}
            >
                {formData.insuranceType === 'DAILY_SHIELD' && (
                    <div className="absolute top-3 right-3 text-gold-500">
                        <CheckCircle2 className="w-6 h-6 fill-gold-100" />
                    </div>
                )}
                <div>
                    <div className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center mb-4 text-gold-600">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-navy-900 text-lg">Daily Shield Program</h4>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        Pay-as-you-go coverage provided by the platform.
                    </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Fee</span>
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded">$3.00 - $12.00 / Job</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Status</span>
                        <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Instant Approval</span>
                    </div>
                </div>
            </div>

            {/* Option 2: Own COI */}
            <div 
                onClick={() => setFormData({...formData, insuranceType: 'OWN_COI'})}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between h-full ${
                    formData.insuranceType === 'OWN_COI' 
                    ? 'border-navy-600 bg-white shadow-lg shadow-navy-100 scale-[1.02]' 
                    : 'border-slate-200 bg-white hover:border-navy-200 hover:bg-navy-50/30'
                }`}
            >
                {formData.insuranceType === 'OWN_COI' && (
                    <div className="absolute top-3 right-3 text-navy-600">
                        <CheckCircle2 className="w-6 h-6 fill-navy-100" />
                    </div>
                )}
                <div>
                    <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center mb-4 text-navy-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-navy-900 text-lg">My Own Insurance</h4>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        Use your existing commercial liability policy.
                    </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Fee</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">$0.00</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Status</span>
                        <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Requires Review</span>
                    </div>
                </div>
            </div>
        </div>

        {/* COI Upload Area - Only visible if Own COI is selected */}
        {formData.insuranceType === 'OWN_COI' && (
            <div className="mt-6 bg-slate-100 p-6 rounded-xl animate-in slide-in-from-top-4 border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Upload Certificate of Insurance (COI)</label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label htmlFor="coi-update-upload" className="flex flex-col items-center justify-center w-full sm:w-40 h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white hover:border-navy-400 transition-all bg-white/50">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs text-slate-500 font-bold">Select File</span>
                        <input type="file" id="coi-update-upload" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                    </label>

                    {formData.coiUrl ? (
                        <div className="flex-1 w-full p-4 bg-white border border-green-200 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center">
                                <div className="bg-green-100 p-2 rounded-lg mr-3">
                                    <FileText className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-green-900">Certificate Uploaded</p>
                                    <p className="text-xs text-green-700 flex items-center mt-1">
                                        {currentUser.isCoiVerified ? <Check className="w-3 h-3 mr-1"/> : <Clock className="w-3 h-3 mr-1"/>}
                                        Status: {currentUser.isCoiVerified ? 'Verified' : 'Pending Admin Review'}
                                    </p>
                                </div>
                            </div>
                            <a href={formData.coiUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-white bg-green-600 px-3 py-2 rounded-lg hover:bg-green-700 transition-colors">View</a>
                        </div>
                    ) : (
                        <div className="flex-1 w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start">
                            <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Action Required</p>
                                <p className="opacity-90">Please upload your COI document (PDF or Image) to complete your profile. Daily fees will apply until this is verified.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>

                            </>
                        ) : (
                            isClient && (
                                <>
                                        {/* Client Payment Methods */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-gold-500" /> Payment Methods
        </h2>
        
        <div className={`p-5 rounded-2xl border-2 transition-all ${formData.hasPaymentMethod ? 'bg-white border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full shadow-sm ${formData.hasPaymentMethod ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400'}`}>
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-navy-900 text-lg">Credit / Debit Card</h3>
                        {formData.hasPaymentMethod ? (
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center text-sm text-blue-700 font-bold">
                                    Visa ending in 4242
                                    <span className="ml-2 text-slate-400 font-normal text-xs bg-slate-100 px-1 rounded">Exp 12/28</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">Test Card: 4242 4242 4242 4242 | CVC: 123</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 mt-1">
                                <p className="text-sm text-slate-500">Add a card to pay for services effortlessly.</p>
                                <p className="text-[10px] text-blue-600 font-bold">Use Test Card: 4242 4242 4242 4242</p>
                            </div>
                        )}
                    </div>
                </div>
                
                {formData.hasPaymentMethod ? (
                    <button 
                        type="button"
                        onClick={handleRemovePaymentMethod}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors"
                    >
                        Remove
                    </button>
                ) : (
                    <button 
                        type="button"
                        onClick={handleAddPaymentMethod}
                        disabled={isLoading}
                        className="px-6 py-3 bg-navy-900 text-white font-bold text-sm rounded-xl hover:bg-navy-800 transition-all shadow-lg flex items-center"
                    >
                        {isLoading ? 'Processing...' : (
                            <>
                                Add Card <Plus className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </button>
                )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-slate-400" />
                Your payment details are stored securely by Stripe. We do not keep full card numbers.
            </div>
        </div>
    </div>

                                </>
                            )
                        )}
                    </div>
                )}

                {activeTab === 'provider' && isProvider && (
                    <div className="space-y-6 animate-in fade-in">
                            {/* Provider Specific Settings */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        {/* Skills Display */}
        <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-slate-700">Your Skills</label>
                {!isAddingSkill && (
                    <button 
                        type="button"
                        onClick={() => setIsAddingSkill(true)}
                        className="text-xs font-bold text-navy-600 hover:text-navy-800 flex items-center"
                    >
                        <Plus className="w-3 h-3 mr-1" /> Request New Skill Authorization
                    </button>
                )}
            </div>
            
            {/* Adding Skill Modal */}
            {isAddingSkill && (
                <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-navy-900">Request Skill Authorization</h3>
                            <button onClick={() => setIsAddingSkill(false)} className="text-slate-400 hover:text-navy-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Select a skill category you would like to add to your profile. This will be sent to admin for approval.</p>
                        
                        <div className="space-y-4">
                            <select 
                                className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-navy-500 bg-white font-medium text-navy-900"
                                onChange={(e) => setSelectedSkill(e.target.value as ServiceCategory)}
                                value={selectedSkill}
                            >
                                <option value="" disabled>Select a skill...</option>
                                {availableToAdd.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            
                            <div className="flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsAddingSkill(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => selectedSkill && handleAddPendingSkill(selectedSkill as ServiceCategory)}
                                    disabled={!selectedSkill}
                                    className="flex-1 py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {/* Active Skills */}
                {Array.isArray(formData.skills) && formData.skills.length > 0 ? (
                    formData.skills.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {skill}
                        </span>
                    ))
                ) : (
                    <span className="text-sm text-slate-400 italic">No verified skills.</span>
                )}

                {/* Pending Skills */}
                {Array.isArray(formData.pendingSkills) && formData.pendingSkills.map(skill => (
                    <span key={skill} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100 flex items-center animate-pulse">
                        <Clock className="w-3 h-3 mr-1" />
                        {skill}
                        <button 
                            type="button"
                            onClick={() => handleRemovePendingSkill(skill)}
                            className="ml-2 hover:text-red-600"
                            title="Cancel Request"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
            {(formData.pendingSkills?.length || 0) > 0 && (
                <p className="text-[10px] text-amber-600 mt-2 italic">* Skills in yellow are pending admin approval.</p>
            )}
        </div>

        {/* Portfolio Images Gallery */}
        <div className="mb-8">
            <h3 className="text-lg font-bold text-navy-900 mb-2 flex items-center">
                <Camera className="w-5 h-5 mr-2 text-indigo-600" /> Portfolio Gallery
            </h3>
            <p className="text-sm text-slate-500 mb-4">Upload up to 6 high-quality photos of your past work.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.isArray(formData.portfolioImages) && formData.portfolioImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                        <img 
                            src={img} 
                            alt={`Portfolio ${idx + 1}`} 
                            className="w-full h-full object-cover cursor-zoom-in" 
                            onClick={() => setSelectedImage(img)}
                        />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                type="button" 
                                onClick={() => handlePortfolioImageRemove(idx)}
                                className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
                
                <label htmlFor="portfolio-upload" className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors bg-white">
                    <div className="flex flex-col items-center text-slate-400" id="portfolio-upload-trigger">
                        <Upload className="w-6 h-6 mb-2" />
                        <span className="text-xs font-bold">Add Photo</span>
                    </div>
                    <input type="file" id="portfolio-upload" className="hidden" accept="image/*" multiple onChange={handlePortfolioImageAdd} />
                </label>
            </div>
        </div>
        
        <div className="mb-8">
            <h3 className="text-lg font-bold text-navy-900 mb-4 flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-green-600" /> Your Hourly Rates
            </h3>
            <p className="text-sm text-slate-500 mb-4">Set your required hourly rate for each category to display on your Provider Directory profile.</p>

            {Array.isArray(formData.skills) && formData.skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formData.skills.map(skill => {
                        const currentRate = formData.categoryRates?.[skill] ?? formData.hourlyRate ?? 0;
                        
                        const handleRateChange = (rateStr: string) => {
                            const rate = parseFloat(rateStr) || 0;
                            setFormData(prev => ({
                                ...prev,
                                categoryRates: {
                                    ...prev.categoryRates,
                                    [skill]: rate
                                }
                            }));
                        }

                        return (
                            <div key={skill} className="flex flex-col gap-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="font-bold text-navy-900 text-sm">{skill.replace(/_/g, ' ')}</span>
                                <div className="flex items-center">
                                    <span className="text-slate-400 font-bold mr-2">$</span>
                                    <input 
                                        type="number" 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-100 focus:border-navy-500 outline-none transition-all text-sm font-bold text-navy-900"
                                        value={currentRate}
                                        onChange={e => handleRateChange(e.target.value)}
                                    />
                                    <span className="text-slate-400 font-bold ml-2">/ hr</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-200 border-dashed">You must add skills before you can set your rates.</p>
            )}
        </div>
    </div>

                    </div>
                )}
                <div className="flex justify-end pt-4">
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-4 bg-navy-900 hover:bg-navy-800 text-white text-lg font-bold rounded-xl shadow-lg shadow-navy-200 transition-all hover:-translate-y-1 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <Save className="w-5 h-5 mr-2" /> {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            {/* Image Lightbox */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        type="button"
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
