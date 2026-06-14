
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User, Role, StaffType, ServiceCategory, Referral, Site, CategoryRequest } from '../types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, UserPlus, Home, Hammer, Gift, ShieldCheck, Upload, FileText, ChevronRight, X, Rocket } from 'lucide-react';
import { APP_LOGO_URL, INSURANCE_FEES, CATEGORY_RISK_MAPPING, RISK_LEVELS } from '../constants';
import { CategoryRequestModal } from '../components/CategoryRequestModal';

export const Signup = () => {
    const { signup, loginWithGoogle } = useAuth();
    const { addUser, addSite, users, addReferral, isClientReferralEnabled, isProviderReferralEnabled, isVendorSignupEnabled, addCategoryRequest, serviceCategories } = useData();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [isLoading, setIsLoading] = useState(false);
    const [isCategoryRequestModalOpen, setIsCategoryRequestModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState<Role>(Role.CLIENT);
    const [referralCode, setReferralCode] = useState('');
    const [showLegalModal, setShowLegalModal] = useState(false);
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [legalAccepted, setLegalAccepted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        password: '', 
        phone: '',
        address: '',
        // Provider specific
        skills: [] as ServiceCategory[],
        insuranceType: 'DAILY_SHIELD' as 'OWN_COI' | 'DAILY_SHIELD' | undefined,
        coiFile: null as string | null,
        payoutMethod: 'ZELLE' as 'STRIPE' | 'ZELLE',
        zelleEmailOrPhone: ''
    });

    // Populate referral code from URL if present, only if enabled
    useEffect(() => {
        if (isClientReferralEnabled || isProviderReferralEnabled) {
            const refParam = searchParams.get('ref');
            if (refParam) {
                setReferralCode(refParam);
            }
        }
    }, [searchParams, isClientReferralEnabled, isProviderReferralEnabled]);

    const toggleSkill = (skill: ServiceCategory) => {
        if (formData.skills.includes(skill)) {
            setFormData({...formData, skills: formData.skills.filter(s => s !== skill)});
        } else {
            setFormData({...formData, skills: [...formData.skills, skill]});
        }
    };

    const handleCategoryRequest = async (categoryName: string, description: string, email: string, phoneNumber: string) => {
        const requestId = `req_${Date.now()}`;
        await addCategoryRequest({
            id: requestId,
            email,
            phoneNumber,
            categoryName,
            description,
            userRole: role,
            status: 'PENDING',
            createdAt: new Date()
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = (event) => {
                const result = event.target?.result as string;
                if (!result) return;

                // For images, we can compress using canvas
                if (file.type.startsWith('image/')) {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const maxDimension = 1000;

                        if (width > height) {
                            if (width > maxDimension) {
                                height = Math.round((height * maxDimension) / width);
                                width = maxDimension;
                            }
                        } else {
                            if (height > maxDimension) {
                                width = Math.round((width * maxDimension) / height);
                                height = maxDimension;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                        setFormData({ ...formData, coiFile: compressedBase64 });
                    };
                    img.src = result;
                } else {
                    // Non-image files (PDFs)
                    if (file.size > 800 * 1024) {
                        setError("File is too large (max 800KB). Please use a smaller or compressed file.");
                        return;
                    }
                    setFormData({ ...formData, coiFile: result });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGoogleSignup = async () => {
        setError(null);

        if (role === Role.CLIENT && !legalAccepted) {
            setShowLegalModal(true);
            return;
        }

        if (role === Role.PROVIDER) {
            if ((formData.insuranceType === 'OWN_COI' && !formData.coiFile) || (formData.skills.includes('PEST_CONTROL') && !formData.coiFile)) {
                setError("A Certificate of Insurance is required for your selected options.");
                return;
            }
        }

        setIsLoading(true);

        try {
            const isProvider = role === Role.PROVIDER;
            
            let verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' = 'VERIFIED'; 
            
            if (isProvider) {
                if (formData.insuranceType === 'DAILY_SHIELD') {
                    verificationStatus = 'VERIFIED'; 
                } else {
                    verificationStatus = 'PENDING'; 
                }
            }

            const firebaseUser = await loginWithGoogle();
            const newUserId = firebaseUser.uid;
            
            // Check if user already exists
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            const userDocRef = doc(db, 'users', newUserId);
            const userDocSnap = await getDoc(userDocRef);
            
            if (!userDocSnap.exists()) {
                const cleanEmail = firebaseUser.email || '';
                const isKnownAdmin = cleanEmail === 'gwelshpersonal@gmail.com' || cleanEmail === 'admin@ineeda.work';

                const newUser: User = {
                    id: newUserId,
                    orgId: 'org_1',
                    name: formData.name || firebaseUser.displayName || cleanEmail.split('@')[0],
                    companyName: formData.companyName || undefined,
                    email: cleanEmail,
                    role: isKnownAdmin ? Role.ADMIN : role,
                    staffType: isProvider ? StaffType.MARKETPLACE_VENDOR : undefined,
                    
                    isActive: isProvider ? false : true,
                    isBackgroundCheckPaid: isProvider ? false : true,
                    verificationStatus: verificationStatus,
                    
                    hourlyRate: isProvider ? 35 : 0, 
                    phone: formData.phone || firebaseUser.phoneNumber || '',
                    address: formData.address || '',
                    latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
                    longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
                    urgentAlertsEnabled: true,
                    skills: isProvider ? formData.skills : undefined,
                    
                    insuranceType: isProvider ? formData.insuranceType : undefined,
                    coiUrl: isProvider && formData.insuranceType === 'OWN_COI' ? (formData.coiFile || undefined) : undefined,
                    isCoiVerified: false 
                };

                await addUser(newUser);

                const newSite: Site = {
                    id: `site_${Date.now()}`,
                    orgId: newUser.orgId,
                    ownerId: newUser.id,
                    name: "Home",
                    address: newUser.address || formData.address,
                    latitude: newUser.latitude || 0,
                    longitude: newUser.longitude || 0,
                    radiusMeters: 500
                };
                await addSite(newSite);

                const isReferralActive = (role === Role.PROVIDER && isProviderReferralEnabled) || (role === Role.CLIENT && isClientReferralEnabled);

                if (isReferralActive && referralCode) {
                    const normalizedCode = referralCode.trim().toUpperCase();
                    const referrer = users.find(u => {
                        const expectedCode = `${u.name.split(' ')[0].toUpperCase()}2024`;
                        return expectedCode === normalizedCode;
                    });

                    if (referrer) {
                        const newReferral: Referral = {
                            id: `ref_${Date.now()}`,
                            referrerUserId: referrer.id,
                            referredUserId: newUser.id,
                            codeUsed: normalizedCode,
                            status: 'PENDING',
                            createdAt: new Date(),
                            programType: isProvider ? 'PRO_REFERRAL' : 'CLIENT_REFERRAL',
                            payoutAmount: isProvider ? 50 : 20
                        };
                        addReferral(newReferral);
                    }
                }
            }

            navigate('/dashboard');
        } catch (error: any) {
            console.error("Google Signup error:", error);
            let message = "An error occurred during Google signup. Please try again.";
            
            // Check for size limit error which might be inside the JSON message
            const errorStr = error.message || "";
            if (errorStr.includes('too large') || errorStr.includes('limit')) {
                message = "The account information (including uploaded documents) is too large for the system. Please try with a smaller certificate image.";
            } else if (error instanceof Error) {
                message = error.message;
            }
            
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.address) {
            setError("Please fill in all required fields.");
            return;
        }

        if (role === Role.CLIENT && !legalAccepted) {
            setShowLegalModal(true);
            return;
        }

        if (role === Role.PROVIDER) {
            if ((formData.insuranceType === 'OWN_COI' && !formData.coiFile) || (formData.skills.includes('PEST_CONTROL') && !formData.coiFile)) {
                setError("A Certificate of Insurance is required for your selected options.");
                return;
            }
        }

        setIsLoading(true);

        try {
            const isProvider = role === Role.PROVIDER;
            
            // Determine Verification Status
            // If Provider chooses Daily Shield, they can be auto-verified
            // If Own COI or Skipped (undefined), they are PENDING (restricted from claiming)
            let verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' = 'VERIFIED'; 
            
            if (isProvider) {
                if (formData.insuranceType === 'DAILY_SHIELD') {
                    verificationStatus = 'VERIFIED'; 
                } else {
                    verificationStatus = 'PENDING'; 
                }
            }

            // 1. Create User in Firebase Auth
            const firebaseUser = await signup(formData.email.trim(), formData.password);
            const newUserId = firebaseUser.uid;

            // 2. Create User in local mock data
            const newUser: User = {
                id: newUserId,
                orgId: 'org_1',
                name: formData.name,
                companyName: formData.companyName || undefined,
                email: formData.email.trim(),
                role: role,
                staffType: isProvider ? StaffType.MARKETPLACE_VENDOR : undefined,
                
                isActive: isProvider ? false : true,
                isBackgroundCheckPaid: isProvider ? false : true,
                verificationStatus: verificationStatus,
                
                hourlyRate: isProvider ? 35 : 0, 
                phone: formData.phone,
                address: formData.address,
                latitude: 37.7749 + (Math.random() - 0.5) * 0.1, // Mock geocoding
                longitude: -122.4194 + (Math.random() - 0.5) * 0.1, // Mock geocoding
                urgentAlertsEnabled: true,
                skills: isProvider ? formData.skills : undefined,
                
                // Insurance Data
                insuranceType: isProvider ? formData.insuranceType : undefined,
                coiUrl: isProvider && formData.insuranceType === 'OWN_COI' ? (formData.coiFile || undefined) : undefined,
                isCoiVerified: false,
                
                // Payout
                payoutMethod: isProvider ? formData.payoutMethod : undefined,
                zelleInfo: isProvider && formData.payoutMethod === 'ZELLE' ? {
                    emailOrPhone: formData.zelleEmailOrPhone
                } : undefined
            };

            await addUser(newUser);

            // Create Default Site (Location) for the user
            const newSite: Site = {
                id: `site_${Date.now()}`,
                orgId: newUser.orgId,
                ownerId: newUser.id,
                name: "Home", // Default name
                address: newUser.address || formData.address,
                latitude: newUser.latitude || 0,
                longitude: newUser.longitude || 0,
                radiusMeters: 500
            };
            await addSite(newSite);

            // 2. Handle Referral Logic (only if enabled)
            const isReferralActive = (role === Role.PROVIDER && isProviderReferralEnabled) || (role === Role.CLIENT && isClientReferralEnabled);

            if (isReferralActive && referralCode) {
                const normalizedCode = referralCode.trim().toUpperCase();
                const referrer = users.find(u => {
                    const expectedCode = `${u.name.split(' ')[0].toUpperCase()}2024`;
                    return expectedCode === normalizedCode;
                });

                if (referrer) {
                    const newReferral: Referral = {
                        id: `ref_${Date.now()}`,
                        referrerUserId: referrer.id,
                        referredUserId: newUser.id,
                        codeUsed: normalizedCode,
                        status: 'PENDING',
                        createdAt: new Date(),
                        programType: isProvider ? 'PRO_REFERRAL' : 'CLIENT_REFERRAL',
                        payoutAmount: isProvider ? 50 : 20
                    };
                    addReferral(newReferral);
                }
            }

            // Login immediately regardless of status, Dashboard will handle restrictions
            // Firebase Auth already signs the user in after createUserWithEmailAndPassword
            navigate('/dashboard');
        } catch (error: any) {
            console.error("Signup error:", error);
            if (error.code === 'auth/email-already-in-use' || (error.message && error.message.includes('email-already-in-use'))) {
                setError("This email is already linked to an account. Try logging in or using Google instead.");
            } else {
                setError(error.message || "An error occurred during signup. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans bg-white relative">
            {/* Left Side - Visual Branding (Hidden on mobile) */}
            <div className="hidden xl:flex w-1/2 bg-navy-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950 z-0"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0"></div>
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[100px] animate-pulse z-0"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] z-0"></div>

                <div className="relative z-10 text-center px-16">
                    <img 
                        src={APP_LOGO_URL} 
                        alt="iNeeda Logo" 
                        className="h-96 w-auto mx-auto object-contain drop-shadow-2xl mb-8 rounded-3xl"
                    />
                    <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Join the Community</h2>
                    <p className="text-navy-200 text-lg leading-relaxed max-w-md mx-auto font-medium">Get started with iNeeda and connect with the best pros in your area.</p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full xl:w-1/2 flex flex-col justify-center p-6 sm:p-12 pb-24 bg-slate-50 relative min-h-screen">
                <div className="w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Mobile Logo Header */}
                    <div className="xl:hidden text-center mb-8 text-navy-900">
                        <img 
                            src={APP_LOGO_URL} 
                            alt="iNeeda Logo" 
                            className="h-40 w-auto mx-auto object-contain drop-shadow-md mb-4 rounded-3xl"
                        />
                        <h1 className="text-3xl font-extrabold tracking-tight">Get Started</h1>
                        <p className="text-slate-500 mt-2 font-medium">Join the community.</p>
                    </div>
                    
                    <div className="hidden xl:block mb-8">
                        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Create an Account</h1>
                        <p className="text-slate-500 mt-2 font-medium">Please enter your details to sign up.</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col max-h-[80vh]">
                        <div className="p-8 sm:p-10 overflow-y-auto custom-scrollbar">
                            <div className="mb-6 text-center xl:text-left">
                                <span className="text-slate-500 text-sm font-medium mr-2">Already have an account?</span>
                                <Link to="/login" className="text-gold-600 font-extrabold hover:text-gold-500 transition-colors text-sm inline-block">
                                    Sign In
                                </Link>
                            </div>

                            {isVendorSignupEnabled && (
                        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                            <button 
                                type="button"
                                onClick={() => setRole(Role.CLIENT)}
                                className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${role === Role.CLIENT ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Home className="w-4 h-4 mr-2" /> I Need a Pro
                            </button>
                            <button 
                                 type="button"
                                 onClick={() => setRole(Role.PROVIDER)}
                                 className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${role === Role.PROVIDER ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Hammer className="w-4 h-4 mr-2" /> I am a Pro
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Full Name</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="Joe Smith"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                        {role === Role.PROVIDER && (
                            <div>
                                <label className="block text-sm font-bold text-navy-900 mb-1">Company Name (Optional)</label>
                                <input 
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                    placeholder="Smith's Plumbing LLC"
                                    value={formData.companyName}
                                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Email Address</label>
                            <input 
                                type="email"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="name@company.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Phone</label>
                            <input 
                                type="tel"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="(555) 555-5555"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Address</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="123 Main St, City, State"
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                            {role === Role.CLIENT && (
                                <button 
                                    type="button"
                                    onClick={() => setIsCategoryRequestModalOpen(true)}
                                    className="mt-2 text-[10px] font-bold text-slate-400 hover:text-navy-900 transition-colors flex items-center gap-1"
                                >
                                    <Rocket className="w-3 h-3" />
                                    Looking for a service we don't list? Let us know.
                                </button>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-1">Create Password</label>
                            <input 
                                type="password"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>

                         {((role === Role.CLIENT && isClientReferralEnabled) || (role === Role.PROVIDER && isProviderReferralEnabled)) && (
                            <div>
                                <label className="block text-sm font-bold text-navy-900 mb-1">Referral Code (Optional)</label>
                                <div className="relative">
                                    <Gift className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-medium text-navy-900 uppercase"
                                        placeholder="FRIEND2024"
                                        value={referralCode}
                                        onChange={e => setReferralCode(e.target.value)}
                                    />
                                </div>
                            </div>
                         )}

                        {/* Provider Specific Steps */}
                        {role === Role.PROVIDER && (
                            <>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-navy-900 mb-2">What are you good at?</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {serviceCategories.filter(cat => cat.isPublic && cat.isActive).map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => toggleSkill(cat.id)}
                                                className={`text-xs p-2 rounded-lg border text-left transition-all ${
                                                    formData.skills.includes(cat.id) 
                                                    ? 'bg-navy-600 text-white border-navy-600 font-bold' 
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsCategoryRequestModalOpen(true)}
                                        className="mt-4 w-full p-3 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-gold-600 hover:border-gold-300 hover:bg-gold-50 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                    >
                                        <Rocket className="w-4 h-4" />
                                        DON'T SEE YOUR SKILL? JOIN THE WAITLIST
                                    </button>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-navy-900 mb-3 flex items-center">
                                        <ShieldCheck className="w-4 h-4 mr-2 text-gold-500" /> Insurance Setup
                                    </label>
                                    
                                    <div className="space-y-3">
                                        <label className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.insuranceType === 'DAILY_SHIELD' ? 'border-gold-400 bg-gold-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                            <div className="flex items-start">
                                                <input 
                                                    type="radio" 
                                                    name="insurance" 
                                                    className="mt-1 mr-3"
                                                    checked={formData.insuranceType === 'DAILY_SHIELD'}
                                                    onChange={() => setFormData({...formData, insuranceType: 'DAILY_SHIELD'})}
                                                />
                                                <div>
                                                    <span className="block font-bold text-navy-900 text-sm">Join "iNeeda Daily Shield"</span>
                                                    <span className="block text-xs text-slate-500 mt-1">
                                                        Authorized to claim jobs immediately. 
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFeeModal(true); }} 
                                                            className="text-red-500 font-bold hover:underline"
                                                        > small fee deducted per job.</button>
                                                    </span>
                                                </div>
                                            </div>
                                        </label>

                                        <label className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.insuranceType === 'OWN_COI' ? 'border-navy-500 bg-navy-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                            <div className="flex items-start">
                                                <input 
                                                    type="radio" 
                                                    name="insurance" 
                                                    className="mt-1 mr-3"
                                                    checked={formData.insuranceType === 'OWN_COI'}
                                                    onChange={() => setFormData({...formData, insuranceType: 'OWN_COI'})}
                                                />
                                                <div>
                                                    <span className="block font-bold text-navy-900 text-sm">I have my own Insurance</span>
                                                    <span className="block text-xs text-slate-500 mt-1">
                                                        No per-job deduction. 
                                                        <span className="text-amber-600 font-bold"> Requires Admin verification before active.</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </label>

                                        {/* Skip Option */}
                                        <div className="text-center pt-2">
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, insuranceType: undefined})}
                                                className={`text-xs font-bold transition-colors flex items-center justify-center mx-auto ${formData.insuranceType === undefined ? 'text-navy-600 underline' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Skip for now 
                                                {formData.insuranceType === undefined && <span className="ml-1 text-navy-600">(Will complete later)</span>}
                                            </button>
                                            {formData.insuranceType === undefined && (
                                                <p className="text-[10px] text-red-500 mt-1">Note: You won't be able to claim jobs until insurance is added.</p>
                                            )}
                                        </div>

                                        {(formData.insuranceType === 'OWN_COI' || formData.skills.includes('PEST_CONTROL')) && (
                                            <div className="mt-2 animate-in slide-in-from-top-2">
                                                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white transition-colors bg-slate-50/50">
                                                    {formData.coiFile ? (
                                                        <div className="flex items-center text-green-600 text-xs font-bold">
                                                            <FileText className="w-4 h-4 mr-2" /> Document Uploaded
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center text-slate-400 text-xs">
                                                            <Upload className="w-4 h-4 mb-1" />
                                                            <span>Upload {formData.skills.includes('PEST_CONTROL') ? 'State License (Required)' : 'Certificate (PDF/IMG)'}</span>
                                                        </div>
                                                    )}
                                                    <input type="file" id="coi-upload" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ADDED PAYOUT METHOD SELECTION */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-navy-900 mb-3 flex items-center">
                                        Payout Method
                                    </label>
                                    
                                    <div className="space-y-3">
                                        <label className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.payoutMethod === 'ZELLE' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                            <div className="flex items-start">
                                                <input 
                                                    type="radio" 
                                                    name="payout" 
                                                    className="mt-1 mr-3"
                                                    checked={formData.payoutMethod === 'ZELLE'}
                                                    onChange={() => setFormData({...formData, payoutMethod: 'ZELLE'})}
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="block font-bold text-navy-900 text-sm">Zelle (Recommended)</span>
                                                        <span className="bg-gold-100 text-gold-700 text-[10px] uppercase font-black px-1.5 py-0.5 rounded">Best</span>
                                                    </div>
                                                    <span className="block text-xs text-slate-500 mt-1">
                                                        Processed with $0 fees. Available instantly upon job completion.
                                                    </span>
                                                    {formData.payoutMethod === 'ZELLE' && (
                                                        <div className="mt-3 animate-in fade-in">
                                                            <input 
                                                                type="text" 
                                                                value={formData.zelleEmailOrPhone}
                                                                onChange={(e) => setFormData({...formData, zelleEmailOrPhone: e.target.value})}
                                                                placeholder="Zelle Email or Phone Number"
                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </label>

                                        <label className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.payoutMethod === 'STRIPE' ? 'border-navy-400 bg-navy-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                            <div className="flex items-start">
                                                <input 
                                                    type="radio" 
                                                    name="payout" 
                                                    className="mt-1 mr-3"
                                                    checked={formData.payoutMethod === 'STRIPE'}
                                                    onChange={() => setFormData({...formData, payoutMethod: 'STRIPE'})}
                                                />
                                                <div>
                                                    <span className="block font-bold text-navy-900 text-sm">Stripe Account</span>
                                                    <span className="block text-xs text-slate-500 mt-1">
                                                        Use Stripe to add your bank for direct deposit. May incur monthly subscription costs and % processing fees for Express accounts.
                                                    </span>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-navy-900 hover:bg-navy-800 text-white text-lg font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>Create Account <UserPlus className="w-5 h-5 ml-2" /></>
                            )}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500 font-medium">Or continue with</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleSignup}
                            disabled={isLoading}
                            className="w-full py-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-navy-900 text-lg font-bold rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <svg className="w-[27px] h-[27px]" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </button>
                    </form>
                </div>
                </div>
            </div>

            {/* Bottom Home Link */}
                <div className="absolute bottom-6 left-0 right-0 text-center xl:left-auto xl:right-auto xl:w-full max-w-lg mx-auto px-6">
                    <Link to="/" className="text-slate-400 hover:text-navy-900 transition-colors text-sm font-medium inline-flex items-center">
                        ← Back to Home Public Page
                    </Link>
                </div>
            </div>

            {/* Legal Modal */}
            {showLegalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-navy-900 flex items-center">
                                <ShieldCheck className="w-6 h-6 mr-2 text-gold-500" />
                                Client Registration Agreement
                            </h2>
                            <button 
                                onClick={() => setShowLegalModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar text-sm text-slate-600 space-y-4">
                            <p className="font-bold text-red-600 uppercase tracking-wider text-xs">IMPORTANT: READ CAREFULLY BEFORE CONTINUING</p>
                            <p className="font-bold text-navy-900">BY CREATING AN ACCOUNT AND USING THE "iNeeda" APP, YOU EXPRESSLY AGREE TO THE FOLLOWING:</p>
                            
                            <div className="space-y-4 mt-4">
                                <div>
                                    <h3 className="font-bold text-navy-900 mb-1">NO AGENCY RELATIONSHIP:</h3>
                                    <p>"iNeeda" IS A TECHNOLOGY PLATFORM ONLY. WE ARE A "MIDDLEMAN" CONNECTING INDEPENDENT CONTRACTORS (PROS) WITH CLIENTS. WE DO NOT EMPLOY THE PROS, WE DO NOT DIRECT THEIR WORK, AND WE DO NOT GUARANTEE THE QUALITY, SAFETY, OR LEGALITY OF THE SERVICES PERFORMED.</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-navy-900 mb-1">WAIVER OF JURY TRIAL:</h3>
                                    <p>YOU AGREE THAT ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING OUT OF YOUR USE OF THIS APP OR THE SERVICES PROVIDED BY A PRO SHALL BE SETTLED BY BINDING ARBITRATION IN DAUPHIN COUNTY, PENNSYLVANIA. YOU ARE VOLUNTARILY WAIVING YOUR CONSTITUTIONAL RIGHT TO A JURY TRIAL.</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-navy-900 mb-1">LIMITATION OF LIABILITY:</h3>
                                    <p>TO THE FULLEST EXTENT PERMITTED BY PENNSYLVANIA LAW, "iNeeda" SHALL NOT BE LIABLE FOR ANY DAMAGES, INJURIES, OR LOSSES RESULTING FROM THE ACTIONS OR OMISSIONS OF A PRO.</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-navy-900 mb-1">DAILY SHIELD PROGRAM:</h3>
                                    <p>ANY PROTECTION PROVIDED UNDER THE "DAILY SHIELD" PROGRAM IS A LIMITED CONTRACTUAL INDEMNITY PROVIDED BY THE COMPANY AND IS NOT A CONTRACT OF INSURANCE.</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-navy-900 mb-1">MARKETPLACE TAXES:</h3>
                                    <p>AS A MARKETPLACE FACILITATOR, "iNeeda" WILL COLLECT AND REMIT APPLICABLE PENNSYLVANIA SALES TAX ON SERVICE FEES AS REQUIRED BY LAW.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                            <label className="flex items-start gap-3 cursor-pointer group mb-6">
                                <div className="relative flex items-center justify-center mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={legalAccepted}
                                        onChange={(e) => setLegalAccepted(e.target.checked)}
                                    />
                                    <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-navy-600 peer-checked:border-navy-600 transition-colors flex items-center justify-center group-hover:border-navy-400">
                                        <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-navy-900 select-none">
                                    I HAVE READ THE ABOVE AND AGREE TO WAIVE MY RIGHT TO A JURY TRIAL AND PROCEED WITH REGISTRATION.
                                </span>
                            </label>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowLegalModal(false)}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={(e) => {
                                        if (legalAccepted) {
                                            setShowLegalModal(false);
                                            handleSignup(e as any);
                                        }
                                    }}
                                    disabled={!legalAccepted || isLoading}
                                    className="flex-1 px-4 py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Register'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fee Modal */}
            {showFeeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-navy-900 flex items-center">
                                <ShieldCheck className="w-6 h-6 mr-2 text-gold-500" />
                                Daily Shield Fee Structure
                            </h2>
                            <button 
                                onClick={() => setShowFeeModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
                            <p className="mb-2 font-medium">
                                The Daily Shield insurance fee is deducted per job based on the risk category of the service provided:
                            </p>
                            
                            {[RISK_LEVELS.LOW, RISK_LEVELS.MEDIUM, RISK_LEVELS.HIGH].map(riskLevel => {
                                const fee = INSURANCE_FEES[riskLevel as keyof typeof RISK_LEVELS];
                                const categories = Object.entries(CATEGORY_RISK_MAPPING)
                                    .filter(([_, data]) => data.risk === riskLevel)
                                    .map(([cat]) => cat.replace(/_/g, ' '));
                                    
                                return (
                                    <div key={riskLevel} className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm hover:border-gold-300 transition-colors">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-navy-900">{riskLevel} RISK</h3>
                                            <span className="font-bold text-red-500">${fee.toFixed(2)}/job</span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                            {categories.join(', ')}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                            <button 
                                onClick={() => setShowFeeModal(false)}
                                className="w-full px-4 py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CategoryRequestModal 
                isOpen={isCategoryRequestModalOpen}
                onClose={() => setIsCategoryRequestModalOpen(false)}
                onSubmit={handleCategoryRequest}
                userRole={role}
                initialEmail={formData.email}
                initialPhone={formData.phone}
            />
        </div>
    );
};
