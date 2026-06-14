import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Check, CheckCircle2, DollarSign, Zap, MapPin, Loader2, Bell, Truck, Sparkles, Wrench, Calendar, Car, Trash2, Lock,
  UserPlus, Gift, Share2, Copy, X, Siren, AlertTriangle, TrendingUp, Info, Camera, Image as ImageIcon, Monitor, MessageCircle, Send, Smartphone, Rocket, Filter, ArrowUp, ArrowDown, Equal, Edit2, Edit3, Milestone, Hammer, HardHat, ThumbsUp, ThumbsDown, Droplets, ShieldCheck, ShieldAlert, Scale, Star, Wallet, Waves, Briefcase, Clock, CreditCard, Radio, ChevronDown, ChevronUp, ChevronRight, Cpu, Bug, Code, Package, Phone, Settings, Inbox
} from 'lucide-react';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Role, Shift, ShiftStatus, ServiceCategory, CounterOffer, MarketRates, Quote, CategoryRequest } from '../types';
import { format, addHours, formatDistanceToNow, differenceInHours, differenceInDays } from 'date-fns';
import { ALL_SERVICE_CATEGORIES, AVAILABLE_SERVICE_CATEGORIES, CATEGORY_RISK_MAPPING, RISK_LEVELS } from '../constants';
import { calculateJobSplit } from '../utils/feeEngine';
import { canProviderClaimJob } from '../utils/riskGating';
import { PaymentModal } from '../components/PaymentModal';
import { CategoryRequestModal } from '../components/CategoryRequestModal';
import { AdminCatalogCMS } from '../components/AdminCatalogCMS';
import { AdminPlatformMessagesCMS } from '../components/AdminPlatformMessagesCMS';
import { AdminPayouts } from '../components/AdminPayouts';
import { AdminFoundersApplications } from '../components/AdminFoundersApplications';
import { refineJobDescription, getMarketPriceEstimate, MarketPriceEstimate, generateProfessionalQuote } from '../services/aiService';
import { getProviderStats } from '../utils/providerStats';
import { Schedule } from './Schedule';

// Haversine formula for distance in miles
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in miles
};

const ServiceCard = ({ title, icon: Icon, colorClass, onClick, isEmergency = false, disabled = false }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`p-6 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-4 group h-48 w-full relative
    ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 border border-slate-100' : 
      isEmergency 
        ? 'bg-red-50 hover:bg-red-100 shadow-sm hover:shadow-lg border-2 border-transparent hover:border-red-200' 
        : 'bg-white hover:bg-gold-50 shadow-soft hover:shadow-xl hover:-translate-y-1 border border-transparent'}`}
  >
    <div className={`p-5 rounded-2xl transition-transform duration-300 group-hover:scale-110 ${isEmergency ? 'bg-red-100 text-red-600' : 'bg-slate-50 group-hover:bg-white shadow-sm'}`}>
        <Icon className={`w-8 h-8 ${colorClass}`} />
    </div>
    <h3 className={`text-lg font-bold tracking-tight ${isEmergency ? 'text-red-700' : 'text-navy-900'}`}>{title}</h3>
    {disabled && <span className="absolute bottom-4 text-[10px] text-slate-400 font-bold uppercase bg-slate-100 px-2 py-1 rounded">No Providers</span>}
  </button>
);

const getPlaceholderForCategory = (category: ServiceCategory | null): string => {
    switch (category) {
        case 'MOVING':
            return "e.g. Moving a small 1-bedroom apartment content approx 10 miles. Includes a queen bed, sofa, 2 dressers, and about 20 boxes. 2nd floor walk-up at origin, elevator at destination.";
        case 'CLEANING':
            return "e.g. Deep clean needed for a 2-bed, 2-bath apartment. Focus on the kitchen grease and bathroom tile. Please bring your own vacuum and supplies.";
        case 'HANDYMAN':
            return "e.g. Need to mount a 65-inch TV on a brick wall, fix a loose cabinet hinge, and patch a small hole in the hallway drywall.";
        case 'LANDSCAPING':
            return "e.g. Lawn mowing and edging for front and back yard. Also need help trimming the hedges along the fence. Green waste bin is available.";
        case 'AUTO':
            return "e.g. My 2015 Honda Civic won't start. Battery seems dead. Car is parked nose-in at the grocery store lot.";
        case 'PLUMBING':
            return "e.g. Kitchen sink is draining very slowly and the garbage disposal is making a humming noise but not spinning.";
        case 'CONSTRUCTION':
            return "e.g. Need a hand carrying drywall sheets into the basement and some general site cleanup/demolition assistance.";
        case 'COMPUTER':
            return "e.g. Laptop screen is cracked, or PC is running very slow. Need virus removal and data backup.";
        case 'GENERAL_LABOR':
            return "e.g. Moving boxes, organizing garage, assembling furniture, heavy lifting assistance.";
        case 'JOBSITE_LABOR':
            return "e.g. Construction site cleanup, material handling, digging trenches, demolition support.";
        case 'POWER_WASHING':
            return "e.g. Need driveway and front walkway pressure washed. Approx 800 sq ft. Water hookup is available on side of house.";
        default:
            return "e.g. Need someone to help with a task. Please provide details.";
    }
};

import * as Icons from 'lucide-react';
export const DynamicCategoryIcon: React.FC<{ name: string, className?: string }> = ({ name, className }) => {
    const IconComponent = (Icons as any)[name] || Icons.Star;
    return <IconComponent className={className} />;
};

export const Dashboard = () => {
  const { currentUser } = useAuth();
  const { shifts, addShift, updateShift, deleteShift, claimGig, fundGig, sites, addSite, notifications, markNotificationsRead, deleteNotification, users, addNotification, isClientReferralEnabled, isProviderReferralEnabled, updateUser, messages, sendMessage, platformConfig, addQuote, updateQuote, verifyJob, addCategoryRequest, categoryRequests, updateCategoryRequest, serviceCategories, addServiceCategory } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'services' | 'calendar'>('services');
    const [adminTab, setAdminTab] = useState<'overview' | 'all-gigs' | 'waitlist' | 'catalog' | 'payouts' | 'applications'>('overview');

  const [expandedGigId, setExpandedGigId] = useState<string | null>(null);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

  const availableSites = useMemo(() => {
      const allSites = [...sites];
      if (currentUser?.address) {
          // Check if address already exists in sites to avoid duplicates
          const exists = sites.some(s => s.address === currentUser.address);
          if (!exists) {
              allSites.unshift({
                  id: `home_${currentUser.id}`,
                  orgId: currentUser.orgId,
                  ownerId: currentUser.id,
                  name: 'My Home (Profile)',
                  address: currentUser.address,
                  latitude: currentUser.latitude || 0,
                  longitude: currentUser.longitude || 0,
                  radiusMeters: 100
              });
          }
      }
      return allSites;
  }, [sites, currentUser]);

  const isClient = currentUser?.role === Role.CLIENT;
  const isProvider = currentUser?.role === Role.PROVIDER;
  const isAdmin = currentUser?.role === Role.ADMIN;

  // TEMPORARY FIX: Remove erroneous data entry
  useEffect(() => {
     if (isAdmin && shifts) {
         shifts.forEach(shift => {
             // Find shifts with negative price or crazy high amount causing negative earnings
             const gross = shift.price || 0;
             const feePercent = shift.appliedPlatformFee !== undefined 
                ? shift.appliedPlatformFee 
                : (platformConfig[shift.category]?.platformFeePercent || 20) / 100;
             const platformFee = gross * feePercent;

             let insuranceFee = 0;
             if (shift.insuranceOptIn) {
                 if (shift.appliedInsuranceFee !== undefined) insuranceFee = shift.appliedInsuranceFee;
                 else {
                     const rule = platformConfig[shift.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
                     insuranceFee = rule.type === 'PERCENTAGE' ? gross * (rule.value / 100) : rule.value;
                 }
             }

             const net = gross - platformFee - insuranceFee;

             if (net < 0 || gross < 0) {
                 console.log(`Deleting erroneous negative price/net shift: ${shift.id}, gross: ${gross}, net: ${net}`);
                 deleteShift(shift.id);
             }
         });
     }
  }, [isAdmin, shifts]);

  // Check Provider Insurance Status (Used for Risk Gating)
  const isVerifiedInsured = useMemo(() => {
      if (!isProvider || !currentUser) return false;
      return currentUser.isCoiVerified || currentUser.insuranceType === 'DAILY_SHIELD';
  }, [isProvider, currentUser]);

  // Request Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [requestDesc, setRequestDesc] = useState('');
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [requestedEndDate, setRequestedEndDate] = useState<string>('');
  const [isRefining, setIsRefining] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  
  const [targetCrewIds, setTargetCrewIds] = useState<string[]>([]);
  const [sendToPublic, setSendToPublic] = useState(true);

  const crewListPros = useMemo(() => {
     return users.filter(u => currentUser?.crewList?.includes(u.id));
  }, [users, currentUser]);

  const toggleCrewTarget = (id: string) => {
      setTargetCrewIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };
  
  // Market Estimate State
  const [marketEstimate, setMarketEstimate] = useState<MarketPriceEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

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

  const [estimatedPrice, setEstimatedPrice] = useState<string>('');
  const [requestImages, setRequestImages] = useState<string[]>([]);
  const [editingGig, setEditingGig] = useState<Shift | null>(null);
  const [showPriceExamples, setShowPriceExamples] = useState(false); // Toggle for drill down
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showBackgroundCheckPayment, setShowBackgroundCheckPayment] = useState(false);
  
  // Specific Fields
  const [truckNeeded, setTruckNeeded] = useState(false);
  const [moveDistance, setMoveDistance] = useState('');
  const [hasHighValueItems, setHasHighValueItems] = useState(false);
  
  // Emergency Toggle
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectionMethod, setSelectionMethod] = useState<'QUICK_BID' | 'BIDDING'>('QUICK_BID');

  // Boost State
  const [boostingGigId, setBoostingGigId] = useState<string | null>(null);
  const [boostSuccessId, setBoostSuccessId] = useState<string | null>(null);

  // Broadcast Result Modal (Emergency)
  const [broadcastResult, setBroadcastResult] = useState<{ count: number } | null>(null);
  
  // New: Emergency Confirm Modal State
  const [emergencyConfirmGig, setEmergencyConfirmGig] = useState<Shift | null>(null);

  // Claiming State
  const [claimingGigId, setClaimingGigId] = useState<string | null>(null);
  const [confirmingGigId, setConfirmingGigId] = useState<string | null>(null);
  const [estimatedInsuranceFee, setEstimatedInsuranceFee] = useState<number>(0);
  const [estimatedInsuranceLabel, setEstimatedInsuranceLabel] = useState<string>('');
  const [willDeductInsurance, setWillDeductInsurance] = useState(false);

  // Skill Application State
  const [skillApplyCategory, setSkillApplyCategory] = useState<ServiceCategory | null>(null);
  const [skillExperience, setSkillExperience] = useState('');

  // Counter Offer State
  const [counterGig, setCounterGig] = useState<Shift | null>(null);
  const [counterAmount, setCounterAmount] = useState<string>('');
  const [counterMessage, setCounterMessage] = useState<string>('');
  const [counterDate, setCounterDate] = useState<string>('');
  const [counterTime, setCounterTime] = useState<string>('');
  const [counterEndDate, setCounterEndDate] = useState<string>('');
  const [counterEndTime, setCounterEndTime] = useState<string>('');
  const [reviewOffersGig, setReviewOffersGig] = useState<Shift | null>(null);
  const [confirmQuote, setConfirmQuote] = useState<{ offer: Quote | CounterOffer, isQuote: boolean } | null>(null);
  const [finalDate, setFinalDate] = useState<string>('');
  const [finalEndDate, setFinalEndDate] = useState<string>('');
  const [pendingPayment, setPendingPayment] = useState<{
      amount: number;
      description: string;
      gigId: string;
      providerId: string;
      quoteId?: string;
      offerId?: string;
      insuranceOptIn: boolean;
      estimatedInsuranceFee: number;
      platformFeePercent: number;
      finalDate?: string;
      finalEndDate?: string;
      subtotal?: number;
      taxAmount?: number;
  } | null>(null);

  const isSubscribed = useMemo(() => {
    if (!isProvider) return true;
    return ['active', 'trialing'].includes(currentUser?.subscriptionStatus || '') || currentUser?.isFoundersClub === true;
  }, [isProvider, currentUser]);

  // Quote State (RFQ)
  const [quoteGig, setQuoteGig] = useState<Shift | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [quoteMessage, setQuoteMessage] = useState<string>('');
  const [quoteDate, setQuoteDate] = useState<string>('');
  const [quoteTime, setQuoteTime] = useState<string>('');
  const [quoteEndDate, setQuoteEndDate] = useState<string>('');
  const [quoteEndTime, setQuoteEndTime] = useState<string>('');
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);

  // AI Review States
  const [descriptionAiUsed, setDescriptionAiUsed] = useState(false);
  const [quoteAiUsed, setQuoteAiUsed] = useState(false);

  const handleGenerateQuote = async () => {
    if (!quoteGig || !quoteAmount) return;
    
    setIsGeneratingQuote(true);
    try {
        const generated = await generateProfessionalQuote(quoteGig.description, parseFloat(quoteAmount));
        setQuoteMessage(generated);
        setQuoteAiUsed(true);
    } catch (error) {
        console.error("Failed to generate quote", error);
    } finally {
        setIsGeneratingQuote(false);
    }
  };

  // Filter State (Provider)
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | 'ALL'>('ALL');
  const [filterMinPay, setFilterMinPay] = useState<number | ''>('');

  // Referral Modal State
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralType, setReferralType] = useState<'CLIENT' | 'PROVIDER'>('CLIENT');
  const [copySuccess, setCopySuccess] = useState(false);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Category Request State
  const [isCategoryRequestModalOpen, setIsCategoryRequestModalOpen] = useState(false);
  
  // Verification State (Client)
  const [verificationGig, setVerificationGig] = useState<Shift | null>(null);
  const [verificationRating, setVerificationRating] = useState(5);
  const [verificationFeedback, setVerificationFeedback] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyCompletion = async () => {
    if (!verificationGig) return;
    
    setIsVerifying(true);
    try {
        await verifyJob(verificationGig.id, {
            rating: verificationRating,
            feedback: verificationFeedback
        });
        alert("Success! Funds released to provider.");
        setVerificationGig(null);
        setVerificationRating(5);
        setVerificationFeedback('');
    } catch (error: any) {
        alert(`Verification Failed: ${error.message}`);
    } finally {
        setIsVerifying(false);
    }
  };

  const handleCategoryRequest = async (categoryName: string, description: string, email: string, phoneNumber: string) => {
    if (!currentUser) return;
    
    const requestId = `req_${Date.now()}`;
    await addCategoryRequest({
      id: requestId,
      userId: currentUser.id,
      email,
      phoneNumber,
      categoryName,
      description,
      userRole: currentUser.role,
      status: 'PENDING',
      createdAt: new Date()
    });
  };

  // --- Dynamic Category Availability Logic ---
  const activeCategories = useMemo(() => {
      const available = new Set<string>();
      
      // Check active providers and their skills
      users.forEach(u => {
          if (u.role === Role.PROVIDER && u.isActive) {
              // Add all skills this provider has
              u.skills?.forEach(skill => available.add(skill));
          }
      });
      
      return available;
  }, [users]);

  // --- Skill Gating Calculation for Provider ---
  const providerQualifications = useMemo(() => {
      if (!isProvider || !currentUser) return { canClaimHighValue: false };

      const generalLaborCount = shifts.filter(s => 
          s.userId === currentUser.id && 
          s.category === 'GENERAL_LABOR' && 
          (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
      ).length;

      const { numericRating: rating } = getProviderStats(currentUser.id, shifts, currentUser);

      // Rule: > 4.5 rating OR > 10 General Labor jobs
      const canClaimHighValue = rating >= 4.5 || generalLaborCount >= 10;

      return { canClaimHighValue, generalLaborCount, rating };
  }, [isProvider, currentUser, shifts]);

  // --- REAL Earnings Calculation ---
  const totalEarnings = useMemo(() => {
      if (!currentUser || !isProvider) return 0;

      return shifts
          .filter(s => 
              s.userId === currentUser.id && 
              (s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
          )
          .reduce((total, s) => {
              const gross = s.price || 0;
              
              // Fee Logic (Matched with TaxCenter/Payroll)
              const feePercent = s.appliedPlatformFee !== undefined 
                  ? s.appliedPlatformFee 
                  : (platformConfig[s.category]?.platformFeePercent || 20) / 100;
              const platformFee = gross * feePercent;

              let insuranceFee = 0;
              if (s.insuranceOptIn) {
                  if (s.appliedInsuranceFee !== undefined) {
                      insuranceFee = s.appliedInsuranceFee;
                  } else {
                      const rule = platformConfig[s.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
                      insuranceFee = rule.type === 'PERCENTAGE' ? gross * (rule.value / 100) : rule.value;
                  }
              }

              const net = gross - platformFee - insuranceFee;
              return total + net;
          }, 0);
  }, [shifts, currentUser, isProvider, platformConfig]);

  const isCategoryAvailable = (cat: string) => {
      // Admins see everything for preview purposes
      if (isAdmin) return true;
      return activeCategories.has(cat);
  };

  const handleChatClick = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation();
      navigate(`/chat/${gig.id}`);
  };

  const getChatPartner = (shift: Shift) => {
      if (currentUser?.role === Role.CLIENT) {
          return users.find(u => u.id === shift.userId);
      } else {
          return users.find(u => u.id === shift.clientId);
      }
  };

  const getChatPartnerName = (shift: Shift) => {
      if (currentUser?.role === Role.CLIENT) {
          return users.find(u => u.id === shift.userId)?.name || "Provider";
      } else {
          return users.find(u => u.id === shift.clientId)?.name || "Client";
      }
  };

  // Client: Open Request Modal
  const startRequest = (category: ServiceCategory) => {
      setEditingGig(null);
      setSelectedCategory(category);
      setRequestDesc('');
      setRequestedDate('');
      setEstimatedPrice('');
      setRequestImages([]);
      setTruckNeeded(false);
      setMoveDistance('');
      setHasHighValueItems(false);
      setIsUrgent(false); // Default to not urgent
      setShowPriceExamples(false);
      setDescriptionAiUsed(false);
      
      const riskLevel = CATEGORY_RISK_MAPPING[category]?.risk || RISK_LEVELS.LOW;
      setSelectionMethod(riskLevel === RISK_LEVELS.HIGH ? 'BIDDING' : 'QUICK_BID');

      if (availableSites.length > 0) setSelectedSiteId(availableSites[0].id);
      setIsRequestModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation();
      setEditingGig(gig);
      setSelectedCategory(gig.category);
      setRequestDesc(gig.description);
      setRequestedDate(gig.type === 'SCHEDULED' && gig.start ? new Date(gig.start).toISOString().split('T')[0] : '');
      setEstimatedPrice(gig.price?.toString() || '');
      setRequestImages(gig.photos || []);
      setSelectedSiteId(gig.siteId);
      setTruckNeeded(gig.truckNeeded || false);
      setMoveDistance(gig.distance || '');
      setHasHighValueItems(gig.hasHighValueItems || false);
      setIsUrgent(gig.type === 'URGENT');
      setShowPriceExamples(false);
      
      const riskLevel = CATEGORY_RISK_MAPPING[gig.category]?.risk || RISK_LEVELS.LOW;
      setSelectionMethod(gig.selectionMethod || (riskLevel === RISK_LEVELS.HIGH ? 'BIDDING' : 'QUICK_BID'));

      setIsRequestModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setRequestImages(prev => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    }
  };

  const removeImage = (index: number) => {
      setRequestImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitRequest = async () => {
      if (!selectedCategory || !selectedSiteId || !requestDesc || !currentUser) return;

      // GUARDRAIL: Check for Payment Method
      if (!currentUser.hasPaymentMethod) {
          setIsPaymentModalOpen(true);
          return;
      }

      // Handle virtual site (profile address) persistence
      if (selectedSiteId.startsWith('home_') && !sites.find(s => s.id === selectedSiteId)) {
           const virtualSite = availableSites.find(s => s.id === selectedSiteId);
           if (virtualSite) {
               await addSite(virtualSite);
               // The ID remains the same as we passed it to addSite, so selectedSiteId is valid
           }
      }

      const isMoving = selectedCategory === 'MOVING';
      const riskLevel = CATEGORY_RISK_MAPPING[selectedCategory]?.risk || RISK_LEVELS.LOW;
      const isHighRisk = riskLevel === RISK_LEVELS.HIGH;
      const finalSelectionMethod = isHighRisk ? 'BIDDING' : selectionMethod;

      // Emergency Fee Logic: Flat $25 fee
      // $15 to Provider, $10 to Platform
      // Base Price + Fee = Total Customer Price
      // Provider Net = Base Price + (Fee * 0.60) - Platform Fee - Insurance
      
      const EMERGENCY_FLAT_FEE = 25;
      const PROVIDER_EMERGENCY_SHARE = 0.60;

      if (editingGig) {
          // Update Existing Gig
          const basePrice = parseFloat(estimatedPrice) || 0;
          let finalPrice = basePrice;
          
          if (isUrgent) {
              const fee = EMERGENCY_FLAT_FEE;
              finalPrice = basePrice + fee;
          }

          const updatedGig: Shift = {
              ...editingGig,
              description: requestDesc,
              category: selectedCategory,
              siteId: selectedSiteId,
              start: requestedDate ? new Date(requestedDate) : new Date(),
              end: requestedEndDate ? new Date(requestedEndDate) : (requestedDate ? addHours(new Date(requestedDate), 2) : addHours(new Date(), 2)),
              price: finalPrice,
              photos: requestImages,
              truckNeeded: isMoving ? truckNeeded : undefined,
              distance: isMoving ? moveDistance : undefined,
              hasHighValueItems: isMoving ? hasHighValueItems : undefined,
              type: isUrgent ? 'URGENT' : 'SCHEDULED',
              selectionMethod: finalSelectionMethod
          };
          updateShift(updatedGig);
          setIsRequestModalOpen(false);
          setEditingGig(null);
          alert("Request updated successfully!");
          return;
      }

      // Create New Gig
      const basePrice = parseFloat(estimatedPrice) || 0;
      let finalPrice = basePrice;
      
      if (isUrgent) {
          const fee = EMERGENCY_FLAT_FEE;
          finalPrice = basePrice + fee;
      }

      const shiftId = `gig_${Date.now()}`;
      const newGig: Shift = {
          id: shiftId,
          userId: null, // No provider yet
          clientId: currentUser.id,
          siteId: selectedSiteId,
          start: requestedDate ? new Date(requestedDate) : new Date(), // Immediate/ASAP or Scheduled
          end: requestedEndDate ? new Date(requestedEndDate) : (requestedDate ? addHours(new Date(requestedDate), 2) : addHours(new Date(), 2)), // Default duration
          description: requestDesc,
          category: selectedCategory,
          status: ShiftStatus.OPEN_REQUEST,
          isRecurring: false,
          type: isUrgent ? 'URGENT' : 'SCHEDULED', 
          selectionMethod: finalSelectionMethod,
          price: finalPrice,
          photos: requestImages,
          createdAt: new Date(),
          truckNeeded: isMoving ? truckNeeded : undefined,
          distance: isMoving ? moveDistance : undefined,
          hasHighValueItems: isMoving ? hasHighValueItems : undefined,
          isPublic: sendToPublic,
          targetedProviders: targetCrewIds.length > 0 ? targetCrewIds : undefined
      };

      addShift(newGig);

      setIsRequestModalOpen(false);
      setTargetCrewIds([]);
      setSendToPublic(true);

      if (isUrgent) {
          // Send Text Alerts to opted-in providers WHO HAVE THE SKILL and are within 30 miles
          const jobSite = sites.find(s => s.id === selectedSiteId);
          
          const eligibleProviders = users.filter(u => {
              if (u.role !== Role.PROVIDER || !u.isActive || !u.urgentAlertsEnabled || !u.skills?.includes(selectedCategory)) {
                  return false;
              }
              
              if (jobSite && u.latitude && u.longitude) {
                  const distance = calculateDistance(jobSite.latitude, jobSite.longitude, u.latitude, u.longitude);
                  if (distance > 30) {
                      return false;
                  }
              }
              return true;
          });
          
          eligibleProviders.forEach(p => {
             // Simulate Sending Text via Platform
             console.log(`%c[SMS SIMULATION] To: ${p.phone} | Msg: URGENT ${selectedCategory}: ${requestDesc}`, "color: #ef4444; font-weight: bold;");
             
             addNotification({
                id: `alert_${Date.now()}_${p.id}`,
                targetUserId: p.id,
                type: 'ALERT',
                message: `🚨 URGENT ${selectedCategory}: ${requestDesc.substring(0, 30)}...`,
                timestamp: new Date(),
                read: false
             });
          });

          // Show Result Modal 
          setBroadcastResult({
              count: eligibleProviders.length
          });

      } else {
          alert("Your request has been broadcasted" + (targetCrewIds.length > 0 ? " and emails have been sent to your targeted crew!" : "!"));
      }
  };

  const handleSavePaymentMethod = () => {
      if(currentUser) {
          updateUser({
              ...currentUser,
              hasPaymentMethod: true
          });
          setIsPaymentModalOpen(false);
          alert("Card added successfully! You can now post your request.");
      }
  };

  // One-Tap Boost (Client)
  const handleBoost = async (shift: Shift) => {
      // Ensuring price is a number to prevent string concatenation bugs
      const currentPrice = typeof shift.price === 'string' ? parseFloat(shift.price) : (shift.price || 0);
      
      if (!currentUser) return;
      
      setBoostingGigId(shift.id);
      
      const BOOST_PERCENT = 0.10; // 10% increase
      const minIncrease = 5;
      
      const calculatedIncrease = Math.round(currentPrice * BOOST_PERCENT);
      const increase = Math.max(calculatedIncrease, minIncrease);
      const newPrice = currentPrice + increase;

      // Fake network delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 800));

      updateShift({
          ...shift,
          price: newPrice,
          isBoosted: true,
          createdAt: new Date() // Refresh timestamp to "bump" to top of sort if sorted by newest
      });
      
      addNotification({
          id: `notif_${Date.now()}`,
          targetUserId: currentUser.id,
          type: 'SUCCESS',
          message: `Offer Boosted! New price: $${newPrice}.`,
          timestamp: new Date(),
          read: false
      });

      setBoostingGigId(null);
      setBoostSuccessId(shift.id);
      setTimeout(() => setBoostSuccessId(null), 2000);
  };

  // Trigger Modal for Emergency Upgrade
  const handleUpgradeToEmergencyClick = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation(); // Prevent card clicks
      setEmergencyConfirmGig(gig);
  };

  // Execute Upgrade
  const executeUpgradeToEmergency = () => {
      if (!emergencyConfirmGig || !currentUser) return;
      
      const currentPrice = typeof emergencyConfirmGig.price === 'string' ? parseFloat(emergencyConfirmGig.price) : (emergencyConfirmGig.price || 0);
      
      // Apply $25 fee logic
      const EMERGENCY_FLAT_FEE = 25;
      const fee = EMERGENCY_FLAT_FEE;
      const newPrice = currentPrice + fee;

      updateShift({
          ...emergencyConfirmGig,
          type: 'URGENT',
          price: newPrice,
          createdAt: new Date() // Bump to top
      });

      // Simulate broadcast
      const eligibleProviders = users.filter(u => 
          u.role === Role.PROVIDER && 
          u.isActive && 
          u.urgentAlertsEnabled &&
          u.skills?.includes(emergencyConfirmGig.category)
      );
      
      // Close confirm modal and show result
      setEmergencyConfirmGig(null);
      setBroadcastResult({ count: eligibleProviders.length });
      
      eligibleProviders.forEach(p => {
          addNotification({
            id: `alert_upgrade_${Date.now()}_${p.id}`,
            targetUserId: p.id,
            type: 'ALERT',
            message: `🚨 URGENT UPGRADE: ${emergencyConfirmGig.category} in your area!`,
            timestamp: new Date(),
            read: false
          });
      });
  };

  // Pay Feedback Logic (Provider)
  const handlePayFeedback = (e: React.MouseEvent, gig: Shift, vote: 'up' | 'down') => {
      e.stopPropagation();
      if (!currentUser) return;

      const currentFeedback = gig.payFeedback || { upvotes: [], downvotes: [] };
      const userId = currentUser.id;

      // Create new arrays without current user to simulate toggle/switch behavior
      let newUpvotes = currentFeedback.upvotes.filter(id => id !== userId);
      let newDownvotes = currentFeedback.downvotes.filter(id => id !== userId);

      // Determine previous vote
      const wasUp = currentFeedback.upvotes.includes(userId);
      const wasDown = currentFeedback.downvotes.includes(userId);

      if (vote === 'up') {
          if (!wasUp) {
              newUpvotes.push(userId); // Add to up
          }
      } else {
          if (!wasDown) {
              newDownvotes.push(userId); // Add to down
          }
      }

      updateShift({
          ...gig,
          payFeedback: { upvotes: newUpvotes, downvotes: newDownvotes }
      });
  };

  // Calculate Price Suggestion
  const priceSuggestion = useMemo(() => {
    if (!selectedCategory) return null;

    // Base pool: Completed/Verified/Accepted jobs in this category
    const categoryShifts = shifts.filter(s => 
        s.category === selectedCategory &&
        s.price && 
        s.price > 0 &&
        (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.COMPLETED || s.status === ShiftStatus.VERIFIED)
    );

    if (categoryShifts.length === 0) return null;

    let matchedShifts = categoryShifts;
    let isSpecific = false;

    // If description has meaningful content, try to refine
    if (requestDesc.trim().length >= 3) {
        const searchTerms = requestDesc.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        
        if (searchTerms.length > 0) {
             const specific = categoryShifts.filter(s => {
                const desc = s.description.toLowerCase();
                // Match if ANY significant search term is present in historical data
                return searchTerms.some(term => desc.includes(term));
             });
             
             if (specific.length > 0) {
                 matchedShifts = specific;
                 isSpecific = true;
             }
        }
    }

    const prices = matchedShifts.map(s => s.price || 0);
    const total = prices.reduce((sum, p) => sum + p, 0);
    const avg = Math.round(total / prices.length);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return { avg, min, max, count: prices.length, isSpecific, examples: matchedShifts.slice(0, 5) };
  }, [selectedCategory, requestDesc, shifts]);

  // Provider: Claim Gig
  const handleClaimClick = (e: React.MouseEvent, gig: Shift, forceDailyShield = false) => {
      e.stopPropagation();
      e.preventDefault();

      if (!currentUser) return;

      if (!currentUser.isBackgroundCheckPaid) {
          setShowBackgroundCheckPayment(true);
          return;
      }

      if (!currentUser.isActive) {
          alert("Your account is pending admin activation. You will be able to claim or bid on jobs once your background check is verified.");
          return;
      }

      if (gig.clientId === currentUser.id) {
          alert("You cannot bid on your own job posting.");
          return;
      }

      if (confirmingGigId === gig.id) {
          executeClaim(gig, forceDailyShield || willDeductInsurance);
      } else {
          setConfirmingGigId(gig.id);
          const shouldDeduct = forceDailyShield || currentUser.insuranceType === 'DAILY_SHIELD' || (currentUser.insuranceType === 'OWN_COI' && !currentUser.isCoiVerified);
          setWillDeductInsurance(shouldDeduct);

          if (shouldDeduct) {
              const rule = platformConfig[gig.category]?.insuranceRule || { type: 'FLAT', value: 2.00 };
              const gross = gig.price || 0;
              let amount = 0;
              let label = '';

              if (rule.type === 'PERCENTAGE') {
                  amount = gross * (rule.value / 100);
                  label = `(${rule.value}%)`;
              } else {
                  amount = rule.value;
                  label = '';
              }
              setEstimatedInsuranceFee(amount);
              setEstimatedInsuranceLabel(label);
          } else {
              setEstimatedInsuranceFee(0);
              setEstimatedInsuranceLabel('');
          }
      }
  };

  const executeClaim = async (gig: Shift, forceDailyShield = false) => {
      if (!currentUser) return;
      
      setConfirmingGigId(null);
      setClaimingGigId(gig.id);
      
      const config = platformConfig[gig.category];
      const platformFeePercent = (config?.platformFeePercent || 20) / 100;

      const shouldDeduct = forceDailyShield || currentUser.insuranceType === 'DAILY_SHIELD' || (currentUser.insuranceType === 'OWN_COI' && !currentUser.isCoiVerified);
      
      try {
          await claimGig(gig.id, currentUser.id, {
              insuranceOptIn: shouldDeduct,
              estimatedInsuranceFee: shouldDeduct ? estimatedInsuranceFee : 0,
              platformFeePercent: platformFeePercent
          });

          addNotification({
              id: `notif_${Date.now()}`,
              targetUserId: currentUser.id,
              type: 'SUCCESS',
              message: `Job Accepted: ${gig.category} - ${gig.description}`,
              timestamp: new Date(),
              read: false
          });

      } catch (error: any) {
          alert(`Failed to bid on job: ${error.message}`);
      } finally {
          setClaimingGigId(null);
      }
  };

  // --- Skill Application Logic ---
  const handleOpenSkillApplication = (category: ServiceCategory) => {
      setSkillApplyCategory(category);
      setSkillExperience('');
  };

  const submitSkillApplication = () => {
      if (!skillApplyCategory || !currentUser) return;

      const currentPending = currentUser.pendingSkills || [];
      if (!currentPending.includes(skillApplyCategory)) {
          updateUser({
              ...currentUser,
              pendingSkills: [...currentPending, skillApplyCategory]
          });
      }

      addNotification({
          id: `app_skill_${Date.now()}`,
          targetUserId: currentUser.id,
          type: 'SUCCESS',
          message: `Application Submitted: Your request to add ${skillApplyCategory} has been sent to Admin for review.`,
          timestamp: new Date(),
          read: false
      });

      setSkillApplyCategory(null);
      alert(`Application sent! An admin will review your qualifications for ${skillApplyCategory}.`);
  };

  // --- Counter Offer Logic ---

  const handleOpenCounterModal = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation();
      setCounterGig(gig);
      // Default to current price, let provider adjust up or down (User specified "reverse bid" context, so open input is best)
      setCounterAmount(gig.price ? gig.price.toString() : '');
      setCounterMessage("I'm interested, but I'd like to propose a different price.");
      setCounterDate(format(gig.start, 'yyyy-MM-dd'));
      setCounterTime(format(gig.start, 'HH:mm'));
      setCounterEndDate('');
      setCounterEndTime('');
  };

  const handleCounterSubmit = async () => {
      console.log("handleCounterSubmit triggered", { counterGig, currentUser, counterAmount });
      if (!counterGig || !currentUser || !counterAmount) {
          alert("Missing information. Please ensure price is entered.");
          return;
      }

      if (counterGig.clientId === currentUser.id) {
          alert("You cannot bid on your own job posting.");
          return;
      }

      const amount = parseFloat(counterAmount);
      if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount greater than 0.");
          return;
      }

      setIsSubmitting(true);
      setSubmitSuccess(false);
      try {
          let suggestedStart: Date | undefined;
          let suggestedEnd: Date | undefined;

          if (counterDate && counterTime) {
              const dateStr = `${counterDate}T${counterTime}`;
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                  suggestedStart = d;
                  if (counterEndDate && counterEndTime) {
                      const endD = new Date(`${counterEndDate}T${counterEndTime}`);
                      suggestedEnd = !isNaN(endD.getTime()) ? endD : addHours(suggestedStart, 2);
                  } else {
                      suggestedEnd = addHours(suggestedStart, 2); // Default 2 hour duration
                  }
              }
          }

          const newOffer: CounterOffer = {
              id: `offer_${Date.now()}`,
              providerId: currentUser.id,
              amount: amount,
              message: counterMessage,
              status: 'PENDING',
              createdAt: new Date(),
              suggestedStart,
              suggestedEnd
          };

          const updatedOffers = [...(counterGig.counterOffers || []), newOffer];

          console.log("Submitting counter offer:", newOffer);
          
          // We use updateShift which handles the counterOffers array
          await updateShift({
              ...counterGig,
              counterOffers: updatedOffers
          });

          if (counterGig.clientId) {
              addNotification({
                  id: `notif_counter_${Date.now()}`,
                  targetUserId: counterGig.clientId,
                  type: 'INFO',
                  message: `New Counter Offer: A provider offered $${newOffer.amount} for "${counterGig.description}"`,
                  timestamp: new Date(),
                  read: false
              });
          }

          setSubmitSuccess(true);
          setTimeout(() => {
              setCounterGig(null);
              setSubmitSuccess(false);
          }, 1500);
      } catch (error: any) {
          console.error("Error submitting counter offer:", error);
          alert(`Failed to send counter offer: ${error.message}`);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleOpenQuoteModal = (e: React.MouseEvent, gig: Shift) => {
      e.stopPropagation();
      setQuoteGig(gig);
      
      const existingQuote = gig.quotes?.find(q => q.providerId === currentUser?.id);
      if (existingQuote) {
          setQuoteAmount(existingQuote.amount.toString());
          setQuoteMessage(existingQuote.message || '');
          if (existingQuote.suggestedStart) {
              setQuoteDate(format(existingQuote.suggestedStart, 'yyyy-MM-dd'));
              setQuoteTime(format(existingQuote.suggestedStart, 'HH:mm'));
              if (existingQuote.suggestedEnd) {
                  setQuoteEndDate(format(existingQuote.suggestedEnd, 'yyyy-MM-dd'));
                  setQuoteEndTime(format(existingQuote.suggestedEnd, 'HH:mm'));
              } else {
                  setQuoteEndDate('');
                  setQuoteEndTime('');
              }
          } else {
              setQuoteDate(format(gig.start, 'yyyy-MM-dd'));
              setQuoteTime(format(gig.start, 'HH:mm'));
              setQuoteEndDate('');
              setQuoteEndTime('');
          }
      } else {
          setQuoteAmount(gig.price ? gig.price.toString() : '');
          setQuoteMessage("I'm interested in this job. Here is my quote.");
          setQuoteDate(format(gig.start, 'yyyy-MM-dd'));
          setQuoteTime(format(gig.start, 'HH:mm'));
          setQuoteEndDate('');
          setQuoteEndTime('');
      }
      
      setIsJobDetailsOpen(false);
  };

  const handleQuoteSubmit = async () => {
      console.log("handleQuoteSubmit triggered", { quoteGig, currentUser, quoteAmount });
      if (!quoteGig || !currentUser || !quoteAmount) {
          alert("Missing information. Please ensure bid amount is entered.");
          return;
      }

      if (quoteGig.clientId === currentUser.id) {
          alert("You cannot bid on your own job posting.");
          return;
      }

      const amount = parseFloat(quoteAmount);
      if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount greater than 0.");
          return;
      }

      setIsSubmitting(true);
      setSubmitSuccess(false);
      try {
          let suggestedStart: Date | undefined;
          let suggestedEnd: Date | undefined;

          if (quoteDate && quoteTime) {
              const dateStr = `${quoteDate}T${quoteTime}`;
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                  suggestedStart = d;
                  if (quoteEndDate && quoteEndTime) {
                      const endD = new Date(`${quoteEndDate}T${quoteEndTime}`);
                      suggestedEnd = !isNaN(endD.getTime()) ? endD : addHours(suggestedStart, 2);
                  } else {
                      suggestedEnd = addHours(suggestedStart, 2); // Default 2 hour duration
                  }
              }
          }

          const provider = currentUser;
          const hasOwnInsurance = provider?.insuranceType === 'OWN_COI' && provider?.isCoiVerified;
          const isEmergency = quoteGig.type === 'URGENT';
          const rule = platformConfig?.[quoteGig.category];
          const siteAddress = sites.find(s => s.id === quoteGig.siteId)?.address || '';
          const breakdown = calculateJobSplit(amount, quoteGig.category, hasOwnInsurance, isEmergency, rule?.platformFeePercent ? rule.platformFeePercent / 100 : 0.15, rule?.insuranceRule?.value || null, siteAddress);

          const existingQuote = quoteGig.quotes?.find(q => q.providerId === currentUser.id);

          if (existingQuote) {
              const updatedQuote: Quote = {
                  ...existingQuote,
                  amount: amount,
                  platformFee: breakdown.platformFee,
                  insuranceFee: breakdown.insuranceFee,
                  message: quoteMessage,
                  createdAt: new Date(),
                  suggestedStart,
                  suggestedEnd
              };
              console.log("Updating existing quote:", updatedQuote);
              await updateQuote(updatedQuote);
          } else {
              const newQuote: Quote = {
                  id: `quote_${Date.now()}`,
                  jobId: quoteGig.id,
                  providerId: currentUser.id,
                  amount: amount,
                  platformFee: breakdown.platformFee,
                  insuranceFee: breakdown.insuranceFee,
                  message: quoteMessage,
                  status: 'PENDING',
                  createdAt: new Date(),
                  suggestedStart,
                  suggestedEnd
              };
              console.log("Adding new quote:", newQuote, "Breakdown:", breakdown);
              await addQuote(newQuote);
          }

          if (quoteGig.clientId) {
              addNotification({
                  id: `notif_quote_${Date.now()}`,
                  targetUserId: quoteGig.clientId,
                  type: 'INFO',
                  message: `${existingQuote ? 'Updated' : 'New'} Quote: A provider submitted a bid of $${amount} for "${quoteGig.description}"`,
                  timestamp: new Date(),
                  read: false
              });
          }
          
          setSubmitSuccess(true);
          setTimeout(() => {
              setQuoteGig(null);
              setSubmitSuccess(false);
          }, 1500);
      } catch (error: any) {
          console.error("Error submitting quote:", error);
          alert(`Failed to submit quote: ${error.message}`);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDeclineQuote = async (quote: Quote) => {
      if (!reviewOffersGig || !currentUser) return;

      // Update local state to reflect the change immediately in the modal
      setReviewOffersGig(prev => {
          if (!prev) return null;
          return {
              ...prev,
              quotes: prev.quotes?.map(q => q.id === quote.id ? { ...q, status: 'DECLINED' } : q)
          };
      });

      // Strip 'type' property if it exists (added in the modal mapping)
      const { type, ...cleanQuote } = quote as any;

      await updateQuote({
          ...cleanQuote,
          status: 'DECLINED'
      });

      addNotification({
          id: `notif_decline_quote_${Date.now()}`,
          targetUserId: quote.providerId,
          type: 'INFO',
          message: `Your quote of $${quote.amount} for "${reviewOffersGig.description}" was declined.`,
          timestamp: new Date(),
          read: false
      });
  };

  const handleAcceptQuote = async (quote: Quote, selectedDate?: string, selectedEndDate?: string) => {
      if (!reviewOffersGig || !currentUser) return;

      const config = platformConfig[reviewOffersGig.category];
      const platformFeePercent = (config?.platformFeePercent || 20) / 100;
      
      const winningProvider = users.find(u => u.id === quote.providerId);
      const shouldDeduct = winningProvider ? (winningProvider.insuranceType === 'DAILY_SHIELD' || (winningProvider.insuranceType === 'OWN_COI' && !winningProvider.isCoiVerified)) : false;
      
      let insuranceFee = 0;
      if (shouldDeduct) {
          const rule = config?.insuranceRule || { type: 'FLAT', value: 2.00 };
          insuranceFee = rule.type === 'PERCENTAGE' ? quote.amount * (rule.value / 100) : rule.value;
      }

      setReviewOffersGig(null); 
      setConfirmQuote(null);

      const siteAddress = sites.find(s => s.id === reviewOffersGig.siteId)?.address || '';
      const amountWithTaxBreakdown = calculateJobSplit(quote.amount, reviewOffersGig.category, !shouldDeduct, false, platformFeePercent, insuranceFee, siteAddress);

      // Open Payment Modal
      setPendingPayment({
          amount: amountWithTaxBreakdown.clientTotalAmount!,
          description: reviewOffersGig.description,
          gigId: reviewOffersGig.id,
          providerId: quote.providerId,
          quoteId: quote.id,
          insuranceOptIn: shouldDeduct,
          estimatedInsuranceFee: insuranceFee,
          platformFeePercent: platformFeePercent,
          finalDate: selectedDate,
          finalEndDate: selectedEndDate,
          subtotal: quote.amount,
          taxAmount: amountWithTaxBreakdown.totalSalesTaxAmount,
      });
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
      if (!pendingPayment) return;

      try {
          // Get the most recent gig data from shifts
          const gig = shifts.find(s => s.id === pendingPayment.gigId);
          if (!gig) {
              console.error("Gig not found for payment:", pendingPayment.gigId);
              return;
          }

          // 1. Prepare finalized shift details
          const newStart = pendingPayment.finalDate ? new Date(pendingPayment.finalDate) : gig.start;
          let newEnd = gig.end;
          if (pendingPayment.finalEndDate) {
              newEnd = new Date(pendingPayment.finalEndDate);
          } else if (pendingPayment.finalDate) {
              newEnd = addHours(new Date(pendingPayment.finalDate), 2);
          }
          
          const updatedQuotes = gig.quotes?.map(q => ({
              ...q,
              status: (pendingPayment.quoteId && q.id === pendingPayment.quoteId) ? 'ACCEPTED' as const : 'DECLINED' as const
          }));

          const updatedOffers = gig.counterOffers?.map(o => ({
              ...o,
              status: (pendingPayment.offerId && o.id === pendingPayment.offerId) ? 'ACCEPTED' as const : 'REJECTED' as const
          }));

          // Construct the complete updated shift object
          const finalShift: Shift = {
              ...gig,
              userId: pendingPayment.providerId,
              price: pendingPayment.amount, 
              status: ShiftStatus.ACCEPTED,
              start: newStart,
              end: newEnd,
              insuranceOptIn: pendingPayment.insuranceOptIn,
              appliedInsuranceFee: pendingPayment.estimatedInsuranceFee,
              appliedPlatformFee: pendingPayment.platformFeePercent,
              escrowStatus: 'SECURED',
              stripePaymentIntentId: paymentIntentId,
              quotes: updatedQuotes,
              counterOffers: updatedOffers
          };

          // 2. Perform a single update to avoid stale data overwrites
          await updateShift(finalShift);

          // 3. SECURE FUNDS (Directly call fundGig notification logic if needed, or just add the notification here)
          // We don't call fundGig(pendingPayment.gigId) because it would use stale data and overwrite our finalShift.
          
          addNotification({
              id: `funded_${Date.now()}`,
              targetUserId: pendingPayment.providerId,
              type: 'SUCCESS',
              message: `Gig Funded! The client has secured the funds for "${gig.description}". You are clear to start!`,
              timestamp: new Date(),
              read: false
          });

          addNotification({
                id: `notif_win_quote_${Date.now()}`,
                targetUserId: pendingPayment.providerId,
                type: 'SUCCESS',
                message: `Job Confirmed! You booked "${pendingPayment.description}" at $${pendingPayment.amount}. Funds are secured.`,
                timestamp: new Date(),
                read: false
          });

          setPendingPayment(null);
          alert(`Payment successful! Funds for "${gig.description}" are now secured in escrow.`);
      } catch (error: any) {
          console.error("Payment handling failed:", error);
          alert(`Error finalizing payment: ${error.message}`);
      }
  };

  const handleDeclineCounter = async (offer: CounterOffer) => {
      if (!reviewOffersGig || !currentUser) return;

      const updatedGig = {
          ...reviewOffersGig,
          counterOffers: reviewOffersGig.counterOffers?.map(o => 
              o.id === offer.id ? { ...o, status: 'REJECTED' as const } : o
          )
      };

      setReviewOffersGig(updatedGig);
      updateShift(updatedGig);

      addNotification({
          id: `notif_decline_${Date.now()}`,
          targetUserId: offer.providerId,
          type: 'INFO',
          message: `Your offer of $${offer.amount} for "${reviewOffersGig.description}" was declined.`,
          timestamp: new Date(),
          read: false
      });
  };

  const handleAcceptCounter = async (offer: CounterOffer, selectedDate?: string, selectedEndDate?: string) => {
      if (!reviewOffersGig || !currentUser) return;

      const config = platformConfig[reviewOffersGig.category];
      const platformFeePercent = (config?.platformFeePercent || 20) / 100;
      
      const winningProvider = users.find(u => u.id === offer.providerId);
      const shouldDeduct = winningProvider ? (winningProvider.insuranceType === 'DAILY_SHIELD' || (winningProvider.insuranceType === 'OWN_COI' && !winningProvider.isCoiVerified)) : false;
      
      let insuranceFee = 0;
      if (shouldDeduct) {
          const rule = config?.insuranceRule || { type: 'FLAT', value: 2.00 };
          insuranceFee = rule.type === 'PERCENTAGE' ? offer.amount * (rule.value / 100) : rule.value;
      }

      setReviewOffersGig(null); 
      setConfirmQuote(null);

      const siteAddress = sites.find(s => s.id === reviewOffersGig.siteId)?.address || '';
      const amountWithTaxBreakdown = calculateJobSplit(offer.amount, reviewOffersGig.category, !shouldDeduct, false, platformFeePercent, insuranceFee, siteAddress);

      // Open Payment Modal
      setPendingPayment({
          amount: amountWithTaxBreakdown.clientTotalAmount!,
          description: reviewOffersGig.description,
          gigId: reviewOffersGig.id,
          providerId: offer.providerId,
          offerId: offer.id,
          insuranceOptIn: shouldDeduct,
          estimatedInsuranceFee: insuranceFee,
          platformFeePercent: platformFeePercent,
          finalDate: selectedDate,
          finalEndDate: selectedEndDate,
          subtotal: offer.amount,
          taxAmount: amountWithTaxBreakdown.totalSalesTaxAmount,
      });
  };

  const openReferralModal = (type: 'CLIENT' | 'PROVIDER') => {
      setReferralType(type);
      setCopySuccess(false);
      setIsReferralModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    } else {
        alert(`Clipboard access denied. Please copy manually: ${text}`);
    }
  };

  const toggleUrgentAlerts = () => {
    if (currentUser) {
        updateUser({
            ...currentUser,
            urgentAlertsEnabled: !currentUser.urgentAlertsEnabled
        });
    }
  };

  const myNotifications = notifications.filter(n => n.targetUserId === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const availableGigs = shifts.filter(s => {
      if (s.status !== ShiftStatus.OPEN_REQUEST) return false;
      if (s.clientId === currentUser?.id) return false;

      const isMyTargeted = s.targetedProviders && s.targetedProviders.includes(currentUser?.id || '');
      const isPubliclyAvailable = s.isPublic !== false;

      if (!isPubliclyAvailable && !isMyTargeted) return false;

      if (isProvider) {
          if (filterCategory !== 'ALL' && s.category !== filterCategory) return false;
          if (filterMinPay !== '' && (s.price || 0) < filterMinPay) return false;
          return true;
      }
      return true;
  });

  // Sort available gigs: Eligible first, then Boosted, then Urgent, then createdAt descending
  // Updated Logic: Split into two explicit groups for better UI separation
  const sortedAvailableGigs = useMemo(() => {
      if (!isProvider) return { eligible: availableGigs, ineligible: [] };

      const checkEligible = (gig: Shift) => {
          if (!currentUser) return false;
          // Only filter out jobs where the provider lacks the skill.
          // Insurance and High Value locks will be displayed in the card but kept in the top list.
          return currentUser.skills?.includes(gig.category) || false;
      };

      const eligible = availableGigs.filter(g => checkEligible(g));
      const ineligible = availableGigs.filter(g => !checkEligible(g));

      const sorter = (a: Shift, b: Shift) => {
          if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
          if (a.type === 'URGENT' && b.type !== 'URGENT') return -1;
          if (a.type !== 'URGENT' && b.type === 'URGENT') return 1;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
      };

      eligible.sort(sorter);
      ineligible.sort(sorter);

      return { eligible, ineligible };
  }, [availableGigs, isProvider, currentUser, providerQualifications]);

  const myActiveGigs = shifts.filter(s => 
    (s.userId === currentUser?.id || s.clientId === currentUser?.id) && 
    (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS || s.status === ShiftStatus.OPEN_REQUEST)
  );

  // DEBUG: Check if quotes are present
  useEffect(() => {
      if (myActiveGigs.length > 0) {
          console.log("My Active Gigs:", myActiveGigs.map(g => ({ 
              id: g.id, 
              desc: g.description, 
              quotesCount: g.quotes?.length, 
              quotes: g.quotes 
          })));
      }
  }, [myActiveGigs]);

  myActiveGigs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
  });

  const pendingProviders = users.filter(u => u.role === Role.PROVIDER && u.verificationStatus === 'PENDING').length;
  const activeGigsCount = shifts.filter(s => s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS).length;
  const openRequestsCount = shifts.filter(s => s.status === ShiftStatus.OPEN_REQUEST).length;

  const hasAuthorizedSkills = isProvider && currentUser?.skills && currentUser.skills.length > 0;

  const unclaimedByCategory = useMemo(() => {
      const counts: Record<string, number> = {};
      shifts.filter(s => s.status === ShiftStatus.OPEN_REQUEST).forEach(s => {
          counts[s.category] = (counts[s.category] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]); 
  }, [shifts]);

  const todoJobs = useMemo(() => {
      if (!currentUser || !isClient) return [];

      return shifts.filter(s => {
          if (s.clientId !== currentUser.id) return false;

          // 1. Completed jobs needing verification
          if (s.status === ShiftStatus.COMPLETED) return true;

          // 2. Awaiting Funding after claim
          if (s.status === ShiftStatus.ACCEPTED && s.escrowStatus === 'PENDING') return true;

          // 3. Jobs with pending counter offers
          const hasPendingCounter = s.counterOffers?.some(o => o.status === 'PENDING');
          if (hasPendingCounter) return true;

          // 4. Jobs with quotes (if bidding)
          const hasQuotes = s.selectionMethod === 'BIDDING' && (s.quotes?.length || 0) > 0 && s.status === ShiftStatus.OPEN_REQUEST;
          if (hasQuotes) return true;

          return false;
      });
  }, [shifts, currentUser, isClient]);

  const renderToDoSection = () => {
      if (!currentUser || !isClient || todoJobs.length === 0) return null;

      return (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-xl font-bold text-navy-900 mb-4 flex items-center">
                  <Clock className="w-6 h-6 mr-2 text-gold-500" /> To Do
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todoJobs.map(job => {
                      const isCompleted = job.status === ShiftStatus.COMPLETED;
                      const isAwaitingFunding = job.status === ShiftStatus.ACCEPTED && job.escrowStatus === 'PENDING';
                      const hasPendingCounter = job.counterOffers?.some(o => o.status === 'PENDING');
                      const hasQuotes = job.selectionMethod === 'BIDDING' && (job.quotes?.length || 0) > 0;

                      let statusLabel = '';
                      let statusColor = '';
                      let actionLabel = '';

                      if (isCompleted) {
                          statusLabel = 'Needs Verification';
                          statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                          actionLabel = 'Verify & Pay';
                      } else if (isAwaitingFunding) {
                          statusLabel = 'Awaiting Funding';
                          statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
                          actionLabel = 'Fund Job';
                      } else if (hasPendingCounter) {
                          statusLabel = 'Counter Offer Received';
                          statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
                          actionLabel = 'Review Offer';
                      } else if (hasQuotes) {
                          statusLabel = `${job.quotes?.length} Quote${(job.quotes?.length || 0) > 1 ? 's' : ''} Received`;
                          statusColor = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                          actionLabel = 'Review Quotes';
                      }

                      return (
                          <div 
                              key={job.id} 
                              onClick={() => {
                                  if (isCompleted) {
                                      setVerificationGig(job);
                                  } else if (isAwaitingFunding) {
                                      const siteAddress = sites.find(s => s.id === job.siteId)?.address || '';
                                      const amountWithTaxBreakdown = calculateJobSplit(job.price || 0, job.category, !job.insuranceOptIn, false, job.appliedPlatformFee || 0.2, job.appliedInsuranceFee || 0, siteAddress);
                                      setPendingPayment({
                                          amount: amountWithTaxBreakdown.clientTotalAmount!,
                                          description: job.description,
                                          gigId: job.id,
                                          providerId: job.userId || '',
                                          insuranceOptIn: job.insuranceOptIn || false,
                                          estimatedInsuranceFee: job.appliedInsuranceFee || 0,
                                          platformFeePercent: job.appliedPlatformFee || 0.2,
                                          subtotal: job.price || 0,
                                          taxAmount: amountWithTaxBreakdown.totalSalesTaxAmount,
                                      });
                                  } else if (hasPendingCounter) {
                                      setReviewOffersGig(job);
                                  } else if (hasQuotes) {
                                      setReviewOffersGig(job); // Use same modal for quotes
                                  }
                              }}
                              className="bg-white p-5 rounded-xl shadow-sm border border-gold-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                          >
                              <div className={`absolute top-0 left-0 w-1 h-full ${isCompleted ? 'bg-emerald-500' : hasPendingCounter ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                              <div className="flex justify-between items-start mb-2">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${statusColor}`}>
                                      {statusLabel}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">
                                      {format(job.start, 'MMM d')}
                                  </span>
                              </div>
                              <h3 className="font-bold text-navy-900 mb-1 truncate">{job.description}</h3>
                              <div className="flex justify-between items-center mt-3">
                                  <span className="font-bold text-slate-500 text-sm">${job.price}</span>
                                  <button className="text-xs font-bold text-navy-600 bg-navy-50 hover:bg-navy-100 px-3 py-1.5 rounded-lg transition-colors flex items-center group-hover:bg-navy-600 group-hover:text-white">
                                      {actionLabel} <ChevronRight className="w-3 h-3 ml-1" />
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const renderServiceGrid = () => {
      const displayCategories = serviceCategories.filter(c => c.isPublic && c.isActive);
      return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayCategories.map(service => {
              const isLive = activeCategories.has(service.id);
              if (!isLive && !isAdmin) return null;

              return (
                  <ServiceCard 
                      key={service.id}
                      title={service.name} 
                      icon={(props: any) => <DynamicCategoryIcon name={service.iconName || 'Star'} className={props.className} />} 
                      colorClass={service.colorClass} 
                      onClick={() => startRequest(service.id)} 
                      disabled={!isLive} 
                  />
              );
          })}
          {isClientReferralEnabled && (
              <ServiceCard title="Refer a Friend" icon={Icons.Gift as any} colorClass="text-pink-500" onClick={() => openReferralModal('CLIENT')} />
          )}
          <button 
              onClick={() => setIsCategoryRequestModalOpen(true)}
              className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-gold-400 hover:bg-gold-50 transition-all flex flex-col items-center justify-center gap-4 group h-48 w-full group"
          >
              <div className="p-5 rounded-2xl bg-slate-50 group-hover:bg-white shadow-sm transition-colors">
                  <Icons.Rocket className="w-8 h-8 text-slate-400 group-hover:text-gold-500" />
              </div>
              <div className="text-center">
                  <h3 className="text-base font-bold text-slate-500 group-hover:text-navy-900">Request Category</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Don't see your skill?</p>
              </div>
          </button>
      </div>
      );
  };

  const renderGigCard = (gig: Shift) => {
      if (!currentUser) return null;
      const site = sites.find(s => s.id === gig.siteId);
      const isClaiming = claimingGigId === gig.id;
      const isConfirming = confirmingGigId === gig.id;
      const isEmergency = gig.type === 'URGENT';
      const isBoosted = gig.isBoosted;
      const hasUpvoted = gig.payFeedback?.upvotes.includes(currentUser.id);
      const hasDownvoted = gig.payFeedback?.downvotes.includes(currentUser.id);
      const myPendingOffer = gig.counterOffers?.find(o => o.providerId === currentUser.id && o.status === 'PENDING');
      const missingSkill = !currentUser.skills?.includes(gig.category);
      const isLocked = gig.hasHighValueItems && !providerQualifications.canClaimHighValue;
      const riskStatus = canProviderClaimJob(currentUser, gig);
      const isRiskBlocked = !riskStatus.allowed && !missingSkill;
      const hasOwnInsurance = currentUser.insuranceType === 'OWN_COI' && currentUser.isCoiVerified;
      const rule = platformConfig?.[gig.category];
      const siteAddress = sites.find(s => s.id === gig.siteId)?.address || '';
      const breakdown = calculateJobSplit(gig.price || 0, gig.category, hasOwnInsurance, isEmergency, rule?.platformFeePercent ? rule.platformFeePercent / 100 : 0.15, rule?.insuranceRule?.value || null, siteAddress);

      const isBidding = gig.selectionMethod === 'BIDDING';
      const quoteCount = gig.quotes?.length || 0;
      const hasQuoted = gig.quotes?.some(q => q.providerId === currentUser.id);
      const isBidsFull = quoteCount >= 3;

      return (
        <div key={gig.id} className={`p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all relative overflow-hidden mb-4 ${isEmergency ? 'bg-red-50/50 border border-red-100' : isBoosted ? 'bg-gradient-to-br from-white to-purple-50 border border-purple-100' : 'bg-white border border-transparent'} ${isRiskBlocked && !isConfirming || missingSkill ? 'opacity-90' : ''}`}>
            <div className="flex justify-center gap-6 mb-4 pb-4 border-b border-black/5">
                <button onClick={(e) => handlePayFeedback(e, gig, 'up')} className={`flex items-center px-4 py-2 rounded-lg transition-all border ${hasUpvoted ? 'bg-green-100 text-green-700 border-green-200 shadow-inner font-bold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`} title="Price Looks Good">
                    <ThumbsUp className={`w-4 h-4 mr-2 ${hasUpvoted ? 'fill-current' : ''}`} />
                    <span className="text-xs">Fair Price</span>
                </button>
                <button onClick={(e) => handlePayFeedback(e, gig, 'down')} className={`flex items-center px-4 py-2 rounded-lg transition-all border ${hasDownvoted ? 'bg-red-100 text-red-700 border-red-200 shadow-inner font-bold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`} title="Price Too Low">
                    <ThumbsDown className={`w-4 h-4 mr-2 ${hasDownvoted ? 'fill-current' : ''}`} />
                    <span className="text-xs">Too Low</span>
                </button>
            </div>
            <div className="absolute top-0 right-0 flex flex-col items-end gap-1 z-10">
                {isBoosted && <div className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center"><Rocket className="w-3 h-3 mr-1" /> Price Boosted!</div>}
                {gig.hasHighValueItems && <div className="bg-navy-800 text-gold-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center border-l border-b border-gold-500"><ShieldCheck className="w-3 h-3 mr-1" /> HIGH VALUE</div>}
            </div>
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full mb-3 inline-block tracking-wide uppercase ${isEmergency ? 'bg-red-600 text-white animate-pulse' : 'bg-navy-50 text-navy-700'}`}>{gig.category}</span>
                    
                    {/* Description with Read More */}
                    <div className="relative">
                        <h3 className={`font-extrabold text-xl text-navy-900 leading-tight ${expandedGigId === gig.id ? '' : 'line-clamp-4'}`}>
                            {gig.description}
                        </h3>
                        {gig.description.length > 150 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setExpandedGigId(expandedGigId === gig.id ? null : gig.id); }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1 flex items-center"
                            >
                                {expandedGigId === gig.id ? 'Show Less' : 'Read More'} <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${expandedGigId === gig.id ? '-rotate-90' : 'rotate-90'}`} />
                            </button>
                        )}
                    </div>

                    <p className="text-sm text-slate-500 flex items-center mt-2 font-medium"><MapPin className="w-3.5 h-3.5 mr-1.5"/> {site?.address || 'Unknown Location'}</p>
                    <p className="text-sm text-slate-500 flex items-center mt-1 font-medium"><Calendar className="w-3.5 h-3.5 mr-1.5"/> {gig.type === 'SCHEDULED' ? format(gig.start, 'MMM d, yyyy') : 'ASAP'}</p>
                    {(gig.category === 'MOVING') && (gig.truckNeeded || gig.distance) && (
                        <div className="flex gap-3 mt-2 text-xs font-bold text-slate-600">
                            {gig.truckNeeded && <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded flex items-center"><Truck className="w-3 h-3 mr-1" /> Truck Required</span>}
                            {gig.distance && <span className="bg-slate-100 px-2 py-1 rounded flex items-center"><Milestone className="w-3 h-3 mr-1" /> {gig.distance}</span>}
                        </div>
                    )}
                </div>
                <div className="text-right pt-6">
                    <div className={`text-xl font-bold tracking-tight text-slate-400 line-through decoration-slate-300 decoration-2`}>${gig.price}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Gross Pay</div>
                </div>
            </div>
            <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Software exp.</div>
                        <div className="text-xs font-bold text-slate-600">-${breakdown.platformFee.toFixed(2)}</div>
                    </div>
                    {breakdown.insuranceFee > 0 && (
                        <div className="text-center border-l border-slate-200 pl-4">
                            <div className="text-[10px] text-blue-400 font-bold uppercase flex items-center justify-center">Shield <ShieldCheck className="w-3 h-3 ml-1"/></div>
                            <div className="text-xs font-bold text-blue-600">-${breakdown.insuranceFee.toFixed(2)}</div>
                        </div>
                    )}
                    <div className="text-center border-l border-slate-200 pl-4">
                        <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center cursor-help" title="Recommendation only. You receive this money but should save it for taxes.">Rec. Save <Wallet className="w-3 h-3 ml-1"/></div>
                        <div className="text-xs font-bold text-slate-500 italic">~${breakdown.taxHoldbackEstimate.toFixed(2)}</div>
                    </div>
                </div>
                <div className="text-right pl-4 border-l border-slate-200">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Take Home</div>
                    <div className="text-xl font-black text-emerald-600">${breakdown.providerNet.toFixed(2)}</div>
                </div>
            </div>
            {gig.photos && gig.photos.length > 0 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {gig.photos.map((photo, i) => (
                        <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0"><img src={photo} alt="Job" className="w-full h-full object-cover" /></div>
                    ))}
                </div>
            )}
            {missingSkill ? (
                <div className="mt-6 bg-slate-100 rounded-xl p-4 border border-slate-200 text-center">
                    <div className="flex justify-center mb-3"><div className="bg-slate-200 p-2 rounded-full text-slate-500"><Briefcase className="w-6 h-6" /></div></div>
                    <p className="font-bold text-slate-700 text-sm">You are not currently authorized for this skill set.</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">If you are interested in adding a skill set, apply here.</p>
                    {currentUser.pendingSkills?.includes(gig.category) ? (
                        <div className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold shadow-sm cursor-default flex items-center justify-center"><Clock className="w-4 h-4 mr-1.5" /> Application Pending</div>
                    ) : (
                        <button onClick={() => handleOpenSkillApplication(gig.category)} className="w-full py-2 bg-white text-navy-600 border border-navy-200 rounded-lg text-xs font-bold hover:bg-navy-50 transition-colors shadow-sm flex items-center justify-center">Apply for {gig.category} Authorization</button>
                    )}
                </div>
            ) : isRiskBlocked && !isConfirming ? (
                <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-start text-amber-800 text-sm font-bold mb-3">
                        <ShieldAlert className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                        <div><p>{riskStatus.reason}</p><p className="text-xs font-normal mt-1 opacity-90">This is a high-liability category. Proof of insurance is required.</p></div>
                    </div>
                    <div className="flex gap-2">
                        {riskStatus.actionRequired === 'OPT_IN_SHIELD' && <button onClick={(e) => handleClaimClick(e, gig, true)} className="w-full py-2 bg-white text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors shadow-sm">Opt-in to Daily Shield (${breakdown.insuranceFee > 0 ? breakdown.insuranceFee.toFixed(2) : '2.00'})</button>}
                        {riskStatus.actionRequired === 'UPLOAD_COI' && <button onClick={() => navigate('/profile')} className="w-full py-2 bg-white text-navy-600 border border-navy-200 rounded-lg text-xs font-bold hover:bg-navy-50 transition-colors shadow-sm">Upload COI</button>}
                    </div>
                </div>
            ) : isLocked ? (
                <div className="mt-6 bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center text-slate-500 text-xs font-bold"><Lock className="w-4 h-4 mr-2" /><span>Requires 4.5★ or 10+ General Labor jobs.</span></div>
            ) : (
                <>
                    {isConfirming && (
                        <div className="mt-6 mb-2 bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between animate-in fade-in cursor-default">
                            <div className="flex items-center">
                                <ShieldCheck className={`w-5 h-5 mr-2 ${willDeductInsurance ? 'text-blue-600' : 'text-emerald-600'}`} />
                                <div><p className="text-xs font-bold text-navy-900">{willDeductInsurance ? 'Daily Shield Applied' : 'Insurance Verified'}</p><p className="text-xs text-slate-600">{willDeductInsurance ? 'Deduction for this job:' : 'Own coverage active. No deduction.'}</p></div>
                            </div>
                            {willDeductInsurance && <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">- ${estimatedInsuranceFee.toFixed(2)} {estimatedInsuranceLabel}</div>}
                        </div>
                    )}
                    <div className="flex gap-3 mt-4">
                        {isBidding ? (
                             !isSubscribed ? (
                                <button onClick={() => navigate('/profile')} className="w-full py-3 bg-slate-50 text-slate-500 font-bold rounded-xl border-2 border-dashed border-slate-200 hover:bg-gold-50 transition-all flex items-center justify-center">
                                    <Lock className="w-5 h-5 mr-2" /> Subscribe to Bid
                                </button>
                             ) : hasQuoted ? (
                                <button onClick={(e) => handleOpenQuoteModal(e, gig)} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center">
                                    <Edit3 className="w-5 h-5 mr-2" /> Update Quote
                                </button>
                            ) : isBidsFull ? (
                                <div className="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl flex items-center justify-center cursor-not-allowed border border-slate-200">
                                    <Lock className="w-5 h-5 mr-2" /> Bids Full / Under Review
                                </div>
                            ) : (
                                <button onClick={(e) => handleOpenQuoteModal(e, gig)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center">
                                    <Scale className="w-5 h-5 mr-2" /> Submit Quote
                                </button>
                            )
                        ) : (
                            <>
                                <button type="button" onClick={(e) => isSubscribed ? handleClaimClick(e, gig) : navigate('/profile')} disabled={isClaiming} className={`flex-1 py-3 rounded-xl font-bold transition-all transform active:scale-[0.98] flex items-center justify-center shadow-md ${!isSubscribed ? 'bg-slate-50 text-slate-500 border-2 border-dashed border-slate-200 hover:bg-gold-50 cursor-pointer' : isClaiming ? 'bg-slate-200 text-slate-400 cursor-wait' : isConfirming ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200' : isEmergency ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' : 'bg-navy-900 text-white hover:bg-navy-800 hover:shadow-lg'}`}>
                                    {!isSubscribed ? <><Lock className="w-4 h-4 mr-2"/> Subscribe to Claim</> : isClaiming ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Bidding...</> : isConfirming ? "Confirm Bid" : "Quick Bid"}
                                </button>
                                {!isConfirming && <button type="button" onClick={(e) => isSubscribed ? handleOpenCounterModal(e, gig) : navigate('/profile')} disabled={!!myPendingOffer} className={`px-4 py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center ${myPendingOffer ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:border-gold-400 hover:text-navy-900 hover:bg-gold-50'}`} title={myPendingOffer ? "Offer Pending" : "Suggest different price"}>{myPendingOffer ? "Offer Sent" : "Counter Offer"}</button>}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
      );
  };

  // --- Admin: Category Waitlist Approval Workflow ---
  const handleApproveCategoryRequest = async (request: CategoryRequest) => {
    // 1. Update the request status in the database
    await updateCategoryRequest(request.id, 'APPROVED');

    // 2. Draft the new category into the Service Catalog
    const newCategoryId = request.categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    addServiceCategory({
        id: newCategoryId,
        name: request.categoryName,
        description: request.description || `New category requested by the community.`,
        iconName: 'Wrench', // Default icon, Admin can edit
        colorClass: 'text-indigo-500', // Default color, Admin can edit
        riskLevel: 'MEDIUM', // Default risk, Admin must verify
        minimumFee: 50,
        isActive: false, // Kept false so Admin can review in CMS before Pros see it
        isPublic: false  // Kept false so Admin can review in CMS before Clients see it
    });

    // 3. Send an in-app notification to the user who requested it
    if (request.userId) {
        addNotification({
            id: `notif_cat_app_${Date.now()}`,
            targetUserId: request.userId,
            type: 'SUCCESS',
            message: `Good news! Your request for "${request.categoryName}" has been approved and is being added to the platform.`,
            timestamp: new Date(),
            read: false
        });
    }

    // 4. Prompt the Admin to finish the setup
    alert(`"${request.categoryName}" approved! Routing you to the Catalog CMS to finalize the risk level and public visibility.`);
    setAdminTab('catalog'); // Switch the admin to the CMS tab automatically
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {isProvider && !isSubscribed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6 -mx-4 sm:-mx-6 lg:-mx-8 -mt-10 mb-10 overflow-hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center">
              <span className="flex p-2 rounded-lg bg-amber-400">
                <ShieldAlert className="h-6 w-6 text-white" />
              </span>
              <p className="ml-3 font-medium text-amber-900 truncate">
                <span className="md:hidden text-sm">Membership inactive.</span>
                <span className="hidden md:inline">Your Pro membership is currently inactive. Subscribe to unlock bidding and job claims.</span>
              </p>
            </div>
            <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
              <button 
                  onClick={() => navigate('/profile?tab=financials')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-bold text-amber-700 bg-white hover:bg-amber-50 transition-all transform hover:scale-105"
              >
                Manage Membership
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight">{isClient ? "What do you need done?" : isAdmin ? "Admin Dashboard" : "Find Gigs Near You"}</h1>
            <p className="text-slate-500 font-medium text-lg mt-1">{isClient ? "we've got a pro for that." : isAdmin ? "Platform Overview & Approvals" : "Pick up a job and get paid."}</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
             <div className="relative">
                 <button onClick={() => { setIsNotifOpen(!isNotifOpen); if(currentUser) markNotificationsRead(currentUser.id); }} className="p-3 bg-white text-navy-600 rounded-full shadow-soft hover:shadow-lg hover:scale-105 transition-all relative border border-slate-100">
                     <Bell className="w-6 h-6" />
                     {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-100"></span>}
                 </button>
                 {isNotifOpen && (
                     <div className="absolute right-0 mt-3 w-72 sm:w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-5">
                         <div className="p-4 border-b border-slate-50 font-bold text-navy-900 flex justify-between items-center"><span>Notifications</span><span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500">{unreadCount} new</span></div>
                         <div className="max-h-[400px] overflow-y-auto">
                             {myNotifications.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">No new alerts</div> : 
                                 myNotifications.map(n => (
                                    <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm ${n.type === 'ALERT' ? 'bg-red-50/50 text-red-900 font-medium' : ''} relative group`}>
                                        <div className="pr-6">
                                            {n.type === 'ALERT' && <Siren className="w-4 h-4 inline mr-2 text-red-500" />}
                                            {n.message}
                                            <div className="text-[10px] text-slate-400 mt-1">{formatDistanceToNow(n.timestamp)} ago</div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                            title="Clear notification"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                             }
                         </div>
                     </div>
                 )}
             </div>
        </div>
      </div>

      {isAdmin && (
          <>
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-8 w-fit mx-auto md:mx-0">
                <button 
                    onClick={() => setAdminTab('overview')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'overview' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Overview
                </button>
                <button 
                    onClick={() => setAdminTab('all-gigs')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'all-gigs' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Calendar className="w-4 h-4" />
                    All Gigs
                </button>
                <button 
                    onClick={() => setAdminTab('waitlist')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'waitlist' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Rocket className="w-4 h-4" />
                    Waitlist
                </button>
                <button 
                    onClick={() => setAdminTab('catalog')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'catalog' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Settings className="w-4 h-4" />
                    Content & Catalog
                </button>
                <button 
                    onClick={() => setAdminTab('payouts')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${adminTab === 'payouts' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    <Wallet className="w-4 h-4" />
                    Zelle Payouts
                </button>
            </div>

            {adminTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div onClick={() => navigate('/staff')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                            <div className="flex justify-between items-start mb-4"><div className="p-4 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors"><Users className="w-8 h-8" /></div>{pendingProviders > 0 && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg shadow-red-200">{pendingProviders} Pending</span>}</div>
                            <h3 className="text-3xl font-extrabold text-navy-900 mb-1">{pendingProviders}</h3><p className="text-slate-500 font-bold">Provider Applications</p><p className="text-xs text-slate-400 mt-2">Requires verification</p>
                        </div>
                        
                        <div onClick={() => setAdminTab('applications')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors"><Inbox className="w-8 h-8" /></div>
                            </div>
                            <h3 className="text-3xl font-extrabold text-navy-900 mb-1">Founders</h3><p className="text-slate-500 font-bold">Velvet Rope Apps</p><p className="text-xs text-slate-400 mt-2">Intake form</p>
                        </div>

                        <div onClick={() => setAdminTab('all-gigs')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                            <div className="flex justify-between items-start mb-4"><div className="p-4 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors"><Zap className="w-8 h-8" /></div></div>
                            <h3 className="text-3xl font-extrabold text-navy-900 mb-1">{openRequestsCount}</h3><p className="text-slate-500 font-bold">Open Requests</p><p className="text-xs text-slate-400 mt-2">Waiting for a Pro</p>
                        </div>
                        <div onClick={() => setAdminTab('waitlist')} className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-gold-200 group">
                            <div className="flex justify-between items-start mb-4"><div className="p-4 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-100 transition-colors"><Rocket className="w-8 h-8" /></div>{categoryRequests.filter(r => r.status === 'PENDING').length > 0 && <span className="bg-gold-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg shadow-gold-200">{categoryRequests.filter(r => r.status === 'PENDING').length} New</span>}</div>
                            <h3 className="text-3xl font-extrabold text-navy-900 mb-1">{categoryRequests.length}</h3><p className="text-slate-500 font-bold">Waitlist Requests</p><p className="text-xs text-slate-400 mt-2">New category requests</p>
                        </div>
                    </div>
                    <div className="mt-8 bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-navy-900 mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-slate-500" /> Market Health: Open Gigs</h3>
                        {unclaimedByCategory.length === 0 ? <p className="text-slate-400 text-sm">All posted jobs are filled!</p> : <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{unclaimedByCategory.map(([cat, count]) => <div key={cat} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase truncate" title={cat}>{cat}</span><span className="text-2xl font-black text-navy-900 mt-1">{count}</span></div>)}</div>}
                    </div>
                    <div className="mt-12 pt-12 border-t border-slate-200">
                        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center"><Rocket className="w-5 h-5 mr-2 text-purple-600" /> Service Catalog Preview <span className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full uppercase tracking-wider font-bold">Admin View</span></h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 opacity-75 hover:opacity-100 transition-opacity">
                            {serviceCategories.map(service => (
                                <ServiceCard 
                                    key={service.id} 
                                    title={service.name} 
                                    icon={(props: any) => <DynamicCategoryIcon name={service.iconName} className={props.className} />} 
                                    colorClass={service.colorClass} 
                                    onClick={() => startRequest(service.id)} 
                                    disabled={!activeCategories.has(service.id)} 
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {adminTab === 'all-gigs' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <Schedule />
                </div>
            )}

            {adminTab === 'catalog' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-6">
                    <AdminPlatformMessagesCMS />
                    <AdminCatalogCMS />
                </div>
            )}

            {adminTab === 'payouts' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <AdminPayouts />
                </div>
            )}

            {adminTab === 'applications' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <AdminFoundersApplications />
                </div>
            )}

            {adminTab === 'waitlist' && (
                <div className="bg-white rounded-3xl p-8 shadow-soft border border-slate-100 animate-in fade-in slide-in-from-bottom-4 overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-navy-900 flex items-center gap-3">
                                <Rocket className="w-8 h-8 text-gold-500" /> Category Waitlist
                            </h2>
                            <p className="text-slate-500 font-medium">New skill and category requests from users.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Total Requests</span>
                                <div className="text-xl font-black text-navy-900 leading-none mt-1">{categoryRequests.length}</div>
                            </div>
                        </div>
                    </div>

                    {categoryRequests.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl">
                            <Rocket className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">No requests yet. The waitlist is empty.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-8 px-8">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-100">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="pb-4 px-4">Requester</th>
                                        <th className="pb-4 px-4 font-black">Category</th>
                                        <th className="pb-4 px-4 font-black">Status</th>
                                        <th className="pb-4 px-4 font-black">Date</th>
                                        <th className="pb-4 px-4 font-black text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {[...categoryRequests].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(request => {
                                        const requester = users.find(u => u.id === request.userId);
                                        return (
                                            <tr key={request.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center font-bold text-xs shadow-sm">
                                                            {requester?.name?.charAt(0) || request.email?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-navy-900 text-sm leading-tight">{requester?.name || 'Waitlist User'}</div>
                                                            <div className="text-[10px] text-slate-400 font-medium flex flex-wrap gap-x-2">
                                                                <span>{requester?.email || request.email}</span>
                                                                {(requester?.phone || request.phoneNumber) && (
                                                                    <span className="text-slate-300">• {requester?.phone || request.phoneNumber}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="font-bold text-navy-900 text-sm mb-0.5">{request.categoryName}</div>
                                                    <div className="text-[11px] text-slate-500 max-w-[200px] bg-slate-100 px-2 py-0.5 rounded leading-tight">
                                                        {request.userRole} {request.description && `• ${request.description.substring(0, 40)}${request.description.length > 40 ? '...' : ''}`}
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${
                                                        request.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                        request.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                                                    }`}>
                                                        {request.status}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    {format(request.createdAt, 'MMM d, yyyy')}
                                                </td>
                                                <td className="py-5 px-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {request.status === 'PENDING' ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleApproveCategoryRequest(request)}
                                                                    className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all shadow-sm bg-emerald-50 border border-emerald-100"
                                                                    title="Approve & Add to Catalog"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => updateCategoryRequest(request.id, 'REJECTED')}
                                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm bg-red-50 border border-red-100"
                                                                    title="Reject"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button 
                                                                onClick={() => updateCategoryRequest(request.id, 'PENDING')}
                                                                className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-all text-[10px] font-black uppercase"
                                                            >
                                                                Reset
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
          </>
      )}

      {isClient && (
          <>
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                <button 
                    onClick={() => setActiveTab('services')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'services' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    Service Menu
                </button>
                <button 
                    onClick={() => setActiveTab('calendar')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'calendar' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}`}
                >
                    Calendar
                </button>
            </div>

            {activeTab === 'services' && (
                <>
                    {renderToDoSection()}
                    {renderServiceGrid()}
                </>
            )}
            
            {activeTab === 'calendar' && (
                <div className="mt-6">
                    <Schedule />
                </div>
            )}
          </>
      )}

      {isProvider && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-navy-900 flex items-center"><Zap className="w-5 h-5 mr-2 text-gold-500" fill="currentColor" /> Available Gigs</h2>
                      {currentUser && <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-soft hover:shadow-md transition-all cursor-pointer"><label className="flex items-center cursor-pointer"><div className="relative"><input type="checkbox" className="sr-only" checked={currentUser.urgentAlertsEnabled} onChange={toggleUrgentAlerts} /><div className={`block w-9 h-5 rounded-full transition-colors ${currentUser.urgentAlertsEnabled ? 'bg-red-500' : 'bg-slate-300'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${currentUser.urgentAlertsEnabled ? 'transform translate-x-4' : ''}`}></div></div><span className="ml-3 text-xs font-bold text-navy-900 uppercase tracking-wide">Emergency Texts</span></label></div>}
                  </div>
                  {!isVerifiedInsured && <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm"><div className="flex items-start"><ShieldCheck className="w-6 h-6 text-blue-600 mr-3 shrink-0" /><div><h3 className="text-sm font-bold text-blue-800">Verify to unlock all jobs</h3><p className="text-xs text-blue-700 mt-1">Some high-risk categories are locked until your insurance is verified.</p><button onClick={() => navigate('/profile')} className="mt-2 text-xs font-bold bg-white text-blue-600 px-3 py-1 rounded border border-blue-200 shadow-sm hover:bg-blue-50">Update Insurance</button></div></div></div>}
                  <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-400" /><span className="text-xs font-bold text-slate-500 uppercase">Filters:</span></div>
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as ServiceCategory | 'ALL')} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-navy-900 outline-none focus:ring-2 focus:ring-gold-400">
                            <option value="ALL">All Categories</option>
                            {serviceCategories.filter(cat => cat.isActive).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <div className="relative"><span className="absolute left-3 top-2 text-slate-400 text-sm">$</span><input type="number" placeholder="Min Pay" value={filterMinPay ?? ''} onChange={(e) => setFilterMinPay(e.target.value ? parseFloat(e.target.value) : '')} className="w-28 pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-navy-900 outline-none focus:ring-2 focus:ring-gold-400"/></div>
                        {(filterCategory !== 'ALL' || filterMinPay !== '') && <button onClick={() => { setFilterCategory('ALL'); setFilterMinPay(''); }} className="text-xs font-bold text-red-500 hover:text-red-700 ml-auto">Clear All</button>}
                  </div>
                  {!hasAuthorizedSkills && <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-sm text-red-800 mb-6 shadow-sm"><Lock className="w-6 h-6 shrink-0 mt-0.5" /><div><p className="font-bold text-base">No Authorized Skills</p><p className="mt-1 opacity-90">You have not been authorized for any job categories yet.</p></div></div>}
                  
                  {sortedAvailableGigs.eligible.length === 0 && sortedAvailableGigs.ineligible.length === 0 ? (
                      <div className="p-12 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">No open gigs matching your filters.</div>
                  ) : (
                      <div className="space-y-4">
                          {sortedAvailableGigs.eligible.map(gig => renderGigCard(gig))}
                          {sortedAvailableGigs.ineligible.length > 0 && (
                              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-px bg-red-200 flex-1"></div>
                                    <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center bg-red-50 px-3 py-1 rounded-full border border-red-100 shadow-sm">
                                        <Lock className="w-3 h-3 mr-2" /> Requirements Not Met
                                    </span>
                                    <div className="h-px bg-red-200 flex-1"></div>
                                </div>
                                <div className="opacity-75 hover:opacity-100 transition-opacity duration-300">
                                    {sortedAvailableGigs.ineligible.map(gig => renderGigCard(gig))}
                                </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
              
              <div>
                  <h2 className="text-xl font-bold text-navy-900 mb-6">My Upcoming Schedule</h2>
                  <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                      {myActiveGigs.length === 0 ? <div className="text-slate-400 text-center py-8 text-sm">No active jobs yet.</div> : <div className="space-y-3">{myActiveGigs.map(gig => {
                          const isOwnPosting = gig.clientId === currentUser?.id;
                          return (
                              <div key={gig.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                                  <div>
                                      {gig.userId && (
                                          <div className="flex items-center gap-1.5 mb-1.5">
                                              {(() => {
                                                  const pro = users.find(u => u.id === gig.userId);
                                                  if (!pro) return null;
                                                  return (
                                                      <>
                                                          {pro.profileImage ? (
                                                              <img src={pro.profileImage} alt={pro.name} className="w-5 h-5 rounded-full object-cover shadow-sm bg-slate-100" />
                                                          ) : (
                                                              <div className="w-5 h-5 rounded-full bg-navy-100 flex items-center justify-center text-[10px] font-bold text-navy-700 shadow-sm">
                                                                  {pro.name.charAt(0)}
                                                              </div>
                                                          )}
                                                          <span className="text-xs font-bold text-navy-600">Local Pro: {pro.name}</span>
                                                      </>
                                                  );
                                              })()}
                                          </div>
                                      )}
                                      <div className="flex items-center gap-2">
                                          <div className="font-bold text-navy-900 text-sm">{gig.description}</div>
                                          {isOwnPosting && <span className="text-[10px] font-black text-navy-500 bg-navy-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">My Posting</span>}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-0.5">{format(gig.start, 'MMM d, h:mm a')}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wider">{gig.status}</span>
                                      <div className="flex gap-2 mt-1">
                                        {(isOwnPosting ? users.find(u => u.id === gig.userId) : users.find(u => u.id === gig.clientId))?.phone && (
                                            <a href={`tel:${(isOwnPosting ? users.find(u => u.id === gig.userId) : users.find(u => u.id === gig.clientId))?.phone}`} className="text-[10px] font-bold text-slate-600 hover:text-slate-800 flex items-center bg-slate-100 px-2 py-1 rounded">
                                                <Phone className="w-3 h-3 mr-1" /> Call
                                            </a>
                                        )}
                                        {((isOwnPosting && gig.userId) || (!isOwnPosting && gig.clientId)) && (
                                          <button onClick={(e) => handleChatClick(e, gig)} className="text-[10px] font-bold text-navy-600 hover:text-navy-800 flex items-center bg-navy-50 px-2 py-1 rounded">
                                            <MessageCircle className="w-3 h-3 mr-1" /> Message
                                          </button>
                                        )}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}</div>}
                      <button onClick={() => navigate('/schedule')} className="w-full mt-6 py-3 border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all text-sm">View Full Calendar</button>
                  </div>
                  <div className="mt-8 space-y-6">
                      <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full -mr-10 -mt-10 blur-2xl"></div><div className="relative z-10"><h3 className="font-bold text-gold-400 text-lg mb-1 uppercase tracking-wider text-xs">Total Earnings</h3><div className="text-5xl font-black mb-6 tracking-tight">${totalEarnings.toFixed(2)}</div><div className="flex gap-3"><button onClick={() => navigate('/payroll')} className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm border border-white/10">View Details</button></div></div></div>
                      {isProviderReferralEnabled && <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex items-center justify-between hover:shadow-lg transition-all"><div><h3 className="font-bold text-navy-900 flex items-center mb-1"><UserPlus className="w-5 h-5 mr-2 text-gold-500" /> Refer a Pro</h3><p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">Earn $50 for every skilled pro you bring to the crew.</p></div><button onClick={() => openReferralModal('PROVIDER')} className="p-4 bg-navy-50 text-navy-600 rounded-2xl hover:bg-navy-100 hover:text-navy-700 transition-colors shadow-sm" title="Share Referral Link"><Share2 className="w-5 h-5" /></button></div>}
                  </div>
              </div>
          </div>
      )}

      {/* Request Modal */}
      {isRequestModalOpen && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                  <div className={`p-6 text-white flex justify-between items-center ${isUrgent ? 'bg-red-600' : 'bg-navy-900'}`}>
                      <h3 className="font-extrabold text-xl flex items-center tracking-tight">{isUrgent ? <Siren className="w-6 h-6 mr-3 text-white animate-pulse" /> : <Zap className="w-6 h-6 mr-3 text-gold-400" />}{editingGig ? 'Update Request' : `Request a Pro: ${selectedCategory}`}</h3>
                      <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Trash2 className="w-5 h-5 text-white/70 hover:text-white" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${isUrgent ? 'bg-red-50 border-red-500 shadow-inner' : 'bg-slate-50 border-slate-200'}`} onClick={() => setIsUrgent(!isUrgent)}>
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${isUrgent ? 'bg-red-200 text-red-700' : 'bg-slate-200 text-slate-500'}`}><AlertTriangle className="w-6 h-6" /></div>
                              <div>
                                  <p className={`font-bold text-sm ${isUrgent ? 'text-red-700' : 'text-slate-600'}`}>Is this an Emergency?</p>
                                  <div className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-xs">
                                      {isUrgent ? (
                                          <span className="font-bold text-red-600">There is a flat $25 service fee added for Emergency Requests to encourage our Pro's to quickly grab these jobs. Even so, better offers=faster response.</span>
                                      ) : (
                                          "Emergency Requests will immediately directly notify local Pro's in your area and let them know of your issues. If there is risk of harm or serious damage is ongoing, please pick up a phone and call someone immediately. We want your business but....not that much."
                                      )}
                                  </div>
                              </div>
                          </div>
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isUrgent ? 'bg-red-600' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isUrgent ? 'translate-x-6' : 'translate-x-1'}`} /></div>
                      </div>

                      {/* Category Description Hint */}
                      {selectedCategory && (() => {
                          const catDef = serviceCategories.find(c => c.id === selectedCategory);
                          return catDef?.description ? (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                                  <div className="flex items-start">
                                      <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5 shrink-0" />
                                      <div>
                                          <h4 className="font-bold text-blue-900 text-sm">{catDef.name}</h4>
                                          <p className="text-xs text-blue-700 mt-1 leading-relaxed font-medium">{catDef.description}</p>
                                      </div>
                                  </div>
                              </div>
                          ) : null;
                      })()}

                      {/* Selection Method Toggle (Only for Low Risk) or RFQ Notice (High Risk) */}
                      {selectedCategory && (CATEGORY_RISK_MAPPING[selectedCategory]?.risk || RISK_LEVELS.LOW) === RISK_LEVELS.HIGH ? (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                              <div className="flex items-start">
                                  <Scale className="w-5 h-5 text-indigo-600 mr-3 mt-0.5" />
                                  <div>
                                      <h4 className="font-bold text-indigo-900 text-sm">Request for Quote (RFQ) Process</h4>
                                      <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                          For <strong>{selectedCategory}</strong>, providers will review your details and submit competitive quotes. You can review their profiles and prices before hiring.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button 
                                  onClick={() => setSelectionMethod('QUICK_BID')}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${selectionMethod === 'QUICK_BID' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}`}
                              >
                                  <Zap className={`w-3 h-3 mr-1.5 ${selectionMethod === 'QUICK_BID' ? 'text-gold-500' : ''}`} />
                                  Quick Bid
                              </button>
                              <button 
                                  onClick={() => setSelectionMethod('BIDDING')}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${selectionMethod === 'BIDDING' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}`}
                              >
                                  <Scale className={`w-3 h-3 mr-1.5 ${selectionMethod === 'BIDDING' ? 'text-indigo-500' : ''}`} />
                                  Request Quotes
                              </button>
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">What needs doing?</label>
                          <div className="relative">
                            <textarea 
                                value={requestDesc} 
                                onChange={e => {
                                    setRequestDesc(e.target.value);
                                    if (descriptionAiUsed) setDescriptionAiUsed(false);
                                }} 
                                placeholder={getPlaceholderForCategory(selectedCategory)} 
                                className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-4 outline-none h-40 resize-y min-h-[160px] transition-all text-sm ${descriptionAiUsed ? 'border-gold-400 ring-2 ring-gold-100 bg-gold-50/30' : 'border-slate-200 focus:ring-gold-100 focus:border-gold-400'}`}
                            />
                            {descriptionAiUsed && (
                                <div className="absolute top-3 right-3 animate-pulse">
                                    <Sparkles className="w-5 h-5 text-gold-500 fill-gold-200" />
                                </div>
                            )}
                          </div>
                          
                          {descriptionAiUsed && (
                              <div className="mt-2 p-3 bg-gold-100 border border-gold-200 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                                  <AlertTriangle className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs text-gold-900 font-medium">
                                      <span className="font-bold block mb-1">AI Assisted Description</span>
                                      Please review and update the text above. Ensure all details are accurate before posting.
                                  </div>
                              </div>
                          )}

                          <div className="flex justify-end mt-2">
                              <button 
                                  onClick={handleRefineDescription}
                                  disabled={isRefining || !requestDesc.trim()}
                                  className="text-xs font-bold text-gold-600 hover:text-gold-700 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                  {isRefining ? 'Refining...' : 'Auto-Refine with AI'}
                              </button>
                          </div>
                      </div>
                      
                      {/* Picture Upload */}
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Upload Pictures (Optional)</label>
                          <input 
                              type="file" 
                              accept="image/*" 
                              multiple 
                              onChange={handleImageUpload} 
                              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100 transition-colors"
                          />
                          {requestImages.length > 0 && (
                              <div className="mt-4 flex gap-2 flex-wrap">
                                  {requestImages.map((img, idx) => (
                                      <div key={idx} className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden group">
                                          <img src={img} alt={`upload-${idx}`} className="w-full h-full object-cover" />
                                          <button 
                                              onClick={() => removeImage(idx)} 
                                              className="absolute top-0 right-0 bg-red-500/90 hover:bg-red-600 text-white p-1 rounded-bl-lg transition-colors opacity-0 group-hover:opacity-100"
                                          >
                                              <X className="w-3 h-3" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      <div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-bold text-navy-900 mb-2">Start Date (Optional)</label>
                                  <input type="date" value={requestedDate} onChange={e => setRequestedDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-gold-100 focus:border-gold-400 transition-all text-sm font-medium" />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-navy-900 mb-2">End Date (Optional)</label>
                                  <input type="date" value={requestedEndDate} onChange={e => setRequestedEndDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-gold-100 focus:border-gold-400 transition-all text-sm font-medium" />
                              </div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-bold text-navy-900">Where?</label>
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
                              <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-gold-100 focus:border-gold-400 transition-all text-sm font-medium">
                                  <option value="" disabled>Select a location</option>
                                  {availableSites.map(s => <option key={s.id} value={s.id}>{s.name} - {s.address}</option>)}
                              </select>
                          )}
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-navy-900">
                                {selectedCategory && (CATEGORY_RISK_MAPPING[selectedCategory]?.risk || RISK_LEVELS.LOW) === RISK_LEVELS.HIGH 
                                    ? "Target Budget ($)" 
                                    : "Offer Price ($)"}
                            </label>
                            {priceSuggestion && (
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setEstimatedPrice(priceSuggestion.avg.toString())} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-1"><Sparkles className="w-3 h-3" /> Avg: ${priceSuggestion.avg}</button>
                                    {priceSuggestion.examples.length > 0 && (
                                        <button type="button" onClick={() => setShowPriceExamples(!showPriceExamples)} className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1">See examples {showPriceExamples ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>
                                    )}
                                </div>
                            )}
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
                        <input type="number" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} placeholder={priceSuggestion ? `e.g. ${priceSuggestion.avg}` : "50"} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none font-bold text-lg transition-all" />
                        
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
                                        className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        Use Average (${Math.round((marketEstimate.min + marketEstimate.max) / 2)})
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Improved Drill Down Visuals */}
                        {showPriceExamples && priceSuggestion && priceSuggestion.examples.length > 0 && (
                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 animate-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center border-b border-blue-200 pb-2">
                                    <Info className="w-4 h-4 mr-2" /> Recent Completed Jobs
                                </p>
                                <div className="space-y-3">
                                    {priceSuggestion.examples.map((ex: any) => (
                                        <div key={ex.id} className="flex justify-between items-start text-xs bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                            <div className="flex-1 pr-4">
                                                <span className="font-bold text-navy-900 block mb-1">{ex.description}</span>
                                                <span className="text-slate-400 block">{ex.completedAt ? formatDistanceToNow(new Date(ex.completedAt)) + ' ago' : 'Recently'}</span>
                                            </div>
                                            <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 whitespace-nowrap">${ex.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                      </div>
                      
                        {crewListPros.length > 0 && !editingGig && (
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
                                    <label className="flex items-center p-3 bg-slate-50 rounded-xl cursor-pointer mb-4">
                                        <input 
                                            type="checkbox" 
                                            checked={sendToPublic}
                                            onChange={(e) => setSendToPublic(e.target.checked)}
                                            className="w-4 h-4 text-navy-600 rounded border-slate-300 mr-3"
                                        />
                                        <span className="text-sm font-medium text-navy-900">Also post to the public market</span>
                                    </label>
                                )}
                            </div>
                        )}

                      <button onClick={submitRequest} disabled={!requestDesc || !estimatedPrice} className={`w-full py-4 text-white font-extrabold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all mt-2 disabled:opacity-50 disabled:hover:translate-y-0 ${isUrgent ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-gold-400 text-navy-900 hover:bg-gold-500 shadow-gold-200'}`}>
                          {editingGig ? 'UPDATE REQUEST' : (
                              isUrgent ? 'BROADCAST URGENT REQUEST' : (
                                  selectedCategory && (CATEGORY_RISK_MAPPING[selectedCategory]?.risk || RISK_LEVELS.LOW) === RISK_LEVELS.HIGH 
                                  ? 'REQUEST QUOTES' 
                                  : 'GET A PRO!'
                              )
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isCategoryRequestModalOpen && (
          <CategoryRequestModal 
              isOpen={isCategoryRequestModalOpen}
              onClose={() => setIsCategoryRequestModalOpen(false)}
              onSubmit={handleCategoryRequest}
              userRole={currentUser?.role || Role.CLIENT}
              initialEmail={currentUser?.email || ''}
              initialPhone={currentUser?.phone || ''}
          />
      )}

      {/* Other Modals (Payment, Counter, Review, Chat) remain mostly unchanged but included for completeness */}
      {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-[70] backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-extrabold text-navy-900 flex items-center"><CreditCard className="w-6 h-6 mr-2 text-blue-600" /> Payment Required</h2><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button></div>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">To prevent spam and ensure providers get paid, we require a valid payment method on file before you can post a request.<br/><br/><strong>No charge is made now.</strong> We only place a hold when a provider accepts your job.</p>
                  <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden group">
                          <div className="flex items-center justify-between mb-4">
                              <span className="font-bold text-navy-900 tracking-widest">4242 4242 4242 4242</span>
                              <div className="w-8 h-5 bg-red-500/20 rounded-sm"></div>
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-bold">
                              <span>Card Holder</span>
                              <span>Expires</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-navy-800">
                              <span>{currentUser?.name}</span>
                              <span>12/28</span>
                          </div>
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <span className="text-xs font-bold text-navy-900 bg-white px-2 py-1 rounded shadow-sm">Test Card</span>
                          </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-[10px] text-amber-800 font-medium">
                          <p className="font-bold mb-1 flex items-center"><Info className="w-3 h-3 mr-1" /> Test Card Info:</p>
                          <p>Number: 4242 4242 4242 4242</p>
                          <p>CVC: 123 | Exp: 12/28</p>
                      </div>
                      <button onClick={() => { if(currentUser) { updateUser({ ...currentUser, hasPaymentMethod: true }); setIsPaymentModalOpen(false); alert("Card added successfully! You can now post your request."); } }} className="w-full py-4 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center">
                          <Lock className="w-4 h-4 mr-2" /> Securely Add Card
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* ... (Other modals kept implicit to avoid exceeding token limits, logic verified in previous turns) ... */}
      {/* Skill Application Modal */}
      {skillApplyCategory && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                          <Briefcase className="w-6 h-6 mr-2 text-gold-500" /> Apply for Skill
                      </h3>
                      <button onClick={() => setSkillApplyCategory(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>
                  
                  <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-600 font-medium">You are requesting authorization for:</p>
                      <p className="text-lg font-black text-navy-900 mt-1">{skillApplyCategory}</p>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Experience / Qualifications</label>
                          <textarea 
                              value={skillExperience}
                              onChange={(e) => setSkillExperience(e.target.value)}
                              placeholder="Briefly describe your experience in this field..."
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none h-32 resize-none text-sm transition-all"
                          />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={() => setSkillApplyCategory(null)}
                              className="flex-1 py-3 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={() => {
                                  submitSkillApplication();
                                  setSkillApplyCategory(null);
                              }}
                              disabled={!skillExperience.trim()}
                              className="flex-1 py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              Submit Application
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Counter Offer Modal (Provider) */}
      {counterGig && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                          <Scale className="w-6 h-6 mr-2 text-gold-500" /> Make Counter Offer
                      </h3>
                      <button onClick={() => setCounterGig(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>
                  
                  <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Original Request</p>
                      <div className="relative">
                          <p className={`font-bold text-navy-900 text-lg ${expandedGigId === counterGig.id ? '' : 'line-clamp-4'}`}>
                              {counterGig.description}
                          </p>
                          {counterGig.description.length > 150 && (
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setExpandedGigId(expandedGigId === counterGig.id ? null : counterGig.id); }}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1 flex items-center"
                              >
                                  {expandedGigId === counterGig.id ? 'Show Less' : 'Read More'} <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${expandedGigId === counterGig.id ? '-rotate-90' : 'rotate-90'}`} />
                              </button>
                          )}
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                          <span className="text-sm text-slate-600">Client Offer:</span>
                          <span className="font-black text-emerald-600 text-lg">${counterGig.price}</span>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Your Price ($)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-4 text-slate-400 font-bold">$</span>
                              <input 
                                  type="number" 
                                  value={counterAmount}
                                  onChange={(e) => setCounterAmount(e.target.value)}
                                  className="w-full pl-8 p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none font-black text-xl text-navy-900 transition-all"
                                  placeholder="0.00"
                              />
                          </div>
                          {(() => {
                              const bidAmount = parseFloat(counterAmount) || 0;
                              if (bidAmount <= 0) return null;
                              const platformFeePercent = platformConfig?.[counterGig.category]?.platformFeePercent ? platformConfig[counterGig.category].platformFeePercent / 100 : 0.15;
                              const platformCut = bidAmount * platformFeePercent;
                              const takeHome = bidAmount - platformCut;
                              const isZelle = currentUser?.payoutMethod === 'ZELLE';
                              return (
                                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                      <div className="flex justify-between items-center text-sm font-bold mb-1">
                                          <span className="text-slate-600">Your Bid</span>
                                          <span className="text-navy-900">${bidAmount.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm font-bold mb-2">
                                          <span className="text-slate-600">Software Service Expense ({(platformFeePercent * 100).toFixed(0)}%)</span>
                                          <span className="text-red-500">-${platformCut.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-lg font-black border-t border-slate-200 pt-2">
                                          <span className="text-navy-900">Your Take Home</span>
                                          <span className="text-emerald-600">${takeHome.toFixed(2)}</span>
                                      </div>
                                      {isZelle && (
                                          <p className="mt-2 text-xs text-indigo-600 font-medium bg-indigo-50 p-2 rounded flex gap-1.5 items-start">
                                              <Zap className="w-4 h-4 shrink-0" />
                                              You are using Zelle; no further transaction or subscription fees will be deducted from this payout.
                                          </p>
                                      )}
                                  </div>
                              );
                          })()}
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Message to Client</label>
                          <textarea 
                              value={counterMessage}
                              onChange={(e) => setCounterMessage(e.target.value)}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none h-32 resize-none text-sm transition-all"
                              placeholder="Explain why you are requesting a different price..."
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Suggested Start Date</label>
                              <input 
                                  type="date" 
                                  value={counterDate}
                                  onChange={(e) => setCounterDate(e.target.value)}
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none text-sm text-navy-900 transition-all font-mono"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Suggested Start Time</label>
                              <input 
                                  type="time" 
                                  value={counterTime}
                                  onChange={(e) => setCounterTime(e.target.value)}
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none text-sm text-navy-900 transition-all font-mono"
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Suggested End Date (Optional)</label>
                              <input 
                                  type="date" 
                                  value={counterEndDate}
                                  onChange={(e) => setCounterEndDate(e.target.value)}
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none text-sm text-navy-900 transition-all font-mono"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Suggested End Time</label>
                              <input 
                                  type="time" 
                                  value={counterEndTime}
                                  onChange={(e) => setCounterEndTime(e.target.value)}
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none text-sm text-navy-900 transition-all font-mono"
                              />
                          </div>
                      </div>

                      <button 
                          type="button"
                          onClick={handleCounterSubmit}
                          disabled={isSubmitting || submitSuccess || !counterAmount || parseFloat(counterAmount) <= 0}
                          className={`w-full py-4 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center ${submitSuccess ? 'bg-green-600' : 'bg-navy-900 hover:bg-navy-800'}`}
                      >
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : submitSuccess ? <Check className="w-5 h-5 mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                          {isSubmitting ? 'Sending...' : submitSuccess ? 'Sent Successfully!' : 'Send Counter Offer'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Quote Modal (Provider) */}
      {quoteGig && (
          <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                          <Scale className="w-6 h-6 mr-2 text-indigo-500" /> Submit Quote
                      </h3>
                      <button onClick={() => setQuoteGig(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>
                  
                  <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all">
                      <div 
                          className="flex justify-between items-center cursor-pointer select-none" 
                          onClick={() => setIsJobDetailsOpen(!isJobDetailsOpen)}
                      >
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Job Details</p>
                          <button className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                              {isJobDetailsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </button>
                      </div>
                      
                      {isJobDetailsOpen ? (
                          <p className="font-bold text-navy-900 text-sm mt-2 animate-in fade-in slide-in-from-top-1 leading-relaxed border-t border-slate-200 pt-2">{quoteGig.description}</p>
                      ) : (
                          <p className="font-bold text-navy-900 text-sm mt-1 truncate opacity-70">{quoteGig.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200">
                          <span className="text-sm text-slate-600">Client Budget:</span>
                          <span className="font-black text-emerald-600 text-lg">${quoteGig.price}</span>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-navy-900 mb-2">Your Bid ($)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-4 text-slate-400 font-bold">$</span>
                              <input 
                                  type="number" 
                                  value={quoteAmount}
                                  onChange={(e) => setQuoteAmount(e.target.value)}
                                  className="w-full pl-8 p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none font-black text-xl text-navy-900 transition-all"
                                  placeholder="0.00"
                              />
                          </div>
                          {(() => {
                              const bidAmount = parseFloat(quoteAmount) || 0;
                              if (bidAmount <= 0) return null;
                              const platformFeePercent = platformConfig?.[quoteGig.category]?.platformFeePercent ? platformConfig[quoteGig.category].platformFeePercent / 100 : 0.15;
                              const platformCut = bidAmount * platformFeePercent;
                              const takeHome = bidAmount - platformCut;
                              const isZelle = currentUser?.payoutMethod === 'ZELLE';
                              return (
                                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                      <div className="flex justify-between items-center text-sm font-bold mb-1">
                                          <span className="text-slate-600">Your Bid</span>
                                          <span className="text-navy-900">${bidAmount.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm font-bold mb-2">
                                          <span className="text-slate-600">Software Service Expense ({(platformFeePercent * 100).toFixed(0)}%)</span>
                                          <span className="text-red-500">-${platformCut.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-lg font-black border-t border-slate-200 pt-2">
                                          <span className="text-navy-900">Your Take Home</span>
                                          <span className="text-emerald-600">${takeHome.toFixed(2)}</span>
                                      </div>
                                      {isZelle && (
                                          <p className="mt-2 text-xs text-indigo-600 font-medium bg-indigo-50 p-2 rounded flex gap-1.5 items-start">
                                              <Zap className="w-4 h-4 shrink-0" />
                                              You are using Zelle; no further transaction or subscription fees will be deducted from this payout.
                                          </p>
                                      )}
                                  </div>
                              );
                          })()}
                      </div>
                      
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-bold text-navy-900">Message to Client</label>
                              <button 
                                  onClick={handleGenerateQuote}
                                  disabled={isGeneratingQuote || !quoteAmount || parseFloat(quoteAmount) <= 0}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  {isGeneratingQuote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                  {isGeneratingQuote ? 'Drafting...' : 'Auto-Draft Quote'}
                              </button>
                          </div>
                          <textarea 
                              value={quoteMessage}
                              onChange={(e) => {
                                  setQuoteMessage(e.target.value);
                                  if (quoteAiUsed) setQuoteAiUsed(false);
                              }}
                              className={`w-full p-4 bg-slate-50 border rounded-xl focus:ring-4 outline-none h-32 resize-none text-sm transition-all font-mono ${quoteAiUsed ? 'border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/30' : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-400'}`}
                              placeholder="Why are you the best pro for this job?"
                          />
                          {quoteAiUsed && (
                              <div className="mt-2 p-3 bg-indigo-100 border border-indigo-200 rounded-lg flex items-start gap-2 animate-in slide-in-from-top-1 duration-300">
                                  <Info className="w-4 h-4 text-indigo-700 flex-shrink-0 mt-0.5" />
                                  <div className="text-[11px] text-indigo-900 font-medium italic">
                                      Generated by AI. <span className="font-bold underline cursor-help" title="AI may produce inaccuracies. Always review before sending.">Review and personalize</span> your message before submitting your bid.
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Suggested Start Date</label>
                              <input 
                                  type="date" 
                                  value={quoteDate}
                                  onChange={(e) => setQuoteDate(e.target.value)}
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm text-navy-900 transition-all font-mono"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Suggested Start Time</label>
                              <input 
                                  type="time" 
                                  value={quoteTime}
                                  onChange={(e) => setQuoteTime(e.target.value)}
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm text-navy-900 transition-all font-mono"
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Suggested End Date (Optional)</label>
                              <input 
                                  type="date" 
                                  value={quoteEndDate}
                                  onChange={(e) => setQuoteEndDate(e.target.value)}
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm text-navy-900 transition-all font-mono"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Suggested End Time</label>
                              <input 
                                  type="time" 
                                  value={quoteEndTime}
                                  onChange={(e) => setQuoteEndTime(e.target.value)}
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm text-navy-900 transition-all font-mono"
                              />
                          </div>
                      </div>

                      <button 
                          type="button"
                          onClick={handleQuoteSubmit}
                          disabled={isSubmitting || submitSuccess || !quoteAmount || parseFloat(quoteAmount) <= 0}
                          className={`w-full py-4 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center ${submitSuccess ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : submitSuccess ? <Check className="w-5 h-5 mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                          {isSubmitting ? 'Submitting...' : submitSuccess ? 'Submitted Successfully!' : 'Submit Bid'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Confirm Schedule Modal */}
      {confirmQuote && reviewOffersGig && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-navy-950/80 backdrop-blur-md animate-in fade-in">
              <div className="flex min-h-full items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 relative">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                              <Calendar className="w-6 h-6 mr-2 text-indigo-500" /> Confirm Schedule
                          </h3>
                          <button onClick={() => setConfirmQuote(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                              <X className="w-5 h-5 text-slate-400" />
                          </button>
                      </div>
                      
                      <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-600 mb-4">
                              Please confirm the dates for this job before proceeding to payment.
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-bold text-navy-900 mb-2">Start Date</label>
                                  <input 
                                      type="date"
                                      value={finalDate}
                                      onChange={(e) => setFinalDate(e.target.value)}
                                      className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm transition-all font-mono"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-navy-900 mb-2">End Date (Optional)</label>
                                  <input 
                                      type="date"
                                      value={finalEndDate}
                                      onChange={(e) => setFinalEndDate(e.target.value)}
                                      className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm transition-all font-mono"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-3">
                          <button 
                              onClick={() => setConfirmQuote(null)}
                              className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={() => {
                                  if (confirmQuote.isQuote) {
                                      handleAcceptQuote(confirmQuote.offer as Quote, finalDate, finalEndDate);
                                  } else {
                                      handleAcceptCounter(confirmQuote.offer as CounterOffer, finalDate, finalEndDate);
                                  }
                              }}
                              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                          >
                              Proceed to Payment
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Payment Modal */}
      {pendingPayment && (
          <PaymentModal 
              jobId={pendingPayment.gigId}
              amount={pendingPayment.amount}
              description={pendingPayment.description}
              subtotal={pendingPayment.subtotal}
              taxAmount={pendingPayment.taxAmount}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setPendingPayment(null)}
          />
      )}

      {/* Background Check Payment Modal */}
      {showBackgroundCheckPayment && (
          <PaymentModal 
              jobId="background-check"
              amount={40.00}
              description="Background Check & Activation Fee - One-time fee to run your background check and review your Local Pro application."
              onSuccess={(pi) => {
                  if (currentUser) {
                      updateUser({ ...currentUser, isBackgroundCheckPaid: true });
                      setShowBackgroundCheckPayment(false);
                      // Let them know what's next
                      alert("Payment successful! Our team will review your background check shortly. Once activated, you'll be able to bid on jobs.");
                  }
              }}
              onCancel={() => setShowBackgroundCheckPayment(false)}
          />
      )}

      {/* Verification Modal (Client) */}
      {verificationGig && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/80 backdrop-blur-md animate-in fade-in">
              <div className="flex min-h-full items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 relative">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                              <CheckCircle2 className="w-6 h-6 mr-2 text-emerald-500" /> Verify Completion
                          </h3>
                          <button onClick={() => setVerificationGig(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                              <X className="w-5 h-5 text-slate-400" />
                          </button>
                      </div>
                      
                      <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Job Completed</p>
                          <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                            <p className="font-bold text-navy-900 text-lg mb-2">{verificationGig.description}</p>
                          </div>
                          
                          <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
                              <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-500">Service Price:</span>
                                  <span className="font-bold text-navy-900">${verificationGig.price}</span>
                              </div>
                              {verificationGig.appliedPlatformFee !== undefined && (
                                  <div className="flex justify-between items-center text-xs text-slate-400 italic">
                                      <span>Platform Support Fee:</span>
                                      <span>-${((verificationGig.appliedPlatformFee > 1 ? verificationGig.appliedPlatformFee / 100 : verificationGig.appliedPlatformFee) * (verificationGig.price || 0)).toFixed(2)}</span>
                                  </div>
                              )}
                              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                  <span className="text-sm font-bold text-navy-900">Total Settlement:</span>
                                  <span className="font-black text-emerald-600 text-lg">${verificationGig.price}</span>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Rate Provider</label>
                              <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                          key={star}
                                          onClick={() => setVerificationRating(star)}
                                          className="p-1 transition-transform hover:scale-110 focus:outline-none"
                                      >
                                          <Star 
                                              className={`w-8 h-8 ${star <= verificationRating ? 'text-gold-400 fill-current' : 'text-slate-200'}`} 
                                          />
                                      </button>
                                  ))}
                              </div>
                          </div>
                          
                          <div>
                              <label className="block text-sm font-bold text-navy-900 mb-2">Feedback (Optional)</label>
                              <textarea 
                                  value={verificationFeedback}
                                  onChange={(e) => setVerificationFeedback(e.target.value)}
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none h-24 resize-none text-sm transition-all"
                                  placeholder="How did they do?"
                              />
                          </div>

                          <button 
                              onClick={handleVerifyCompletion}
                              disabled={isVerifying}
                              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center"
                          >
                              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                              {isVerifying ? 'Verifying...' : 'Release Funds & Complete'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Review Offers Modal (Client) */}
      {reviewOffersGig && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/80 backdrop-blur-md animate-in fade-in">
              <div className="flex min-h-full items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 relative">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-extrabold text-navy-900 flex items-center">
                              <Scale className="w-6 h-6 mr-2 text-indigo-600" /> Review Offers
                          </h3>
                          <button onClick={() => setReviewOffersGig(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                              <X className="w-5 h-5 text-slate-400" />
                          </button>
                      </div>

                  <div className="mb-6">
                      <div className="relative">
                          <h4 className={`font-bold text-navy-900 mb-1 ${expandedGigId === reviewOffersGig.id ? '' : 'line-clamp-4'}`}>
                              {reviewOffersGig.description}
                          </h4>
                          {reviewOffersGig.description.length > 150 && (
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setExpandedGigId(expandedGigId === reviewOffersGig.id ? null : reviewOffersGig.id); }}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1 flex items-center"
                              >
                                  {expandedGigId === reviewOffersGig.id ? 'Show Less' : 'Read More'} <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${expandedGigId === reviewOffersGig.id ? '-rotate-90' : 'rotate-90'}`} />
                              </button>
                          )}
                      </div>
                      <p className="text-sm text-slate-500">Original Budget: ${reviewOffersGig.price}</p>
                  </div>
                  
                  <div className="space-y-4">
                      {(() => {
                          const pendingCounters = reviewOffersGig.counterOffers?.filter(o => o.status === 'PENDING') || [];
                          const pendingQuotes = reviewOffersGig.quotes?.filter(q => q.status === 'PENDING') || [];
                          
                          const allOffers = [
                              ...pendingCounters.map(o => ({ ...o, type: 'COUNTER' })),
                              ...pendingQuotes.map(q => ({ ...q, type: 'QUOTE' }))
                          ];

                          if (allOffers.length === 0) {
                              return (
                                  <div className="text-center py-8 text-slate-400">
                                      No pending offers at the moment.
                                  </div>
                              );
                          }

                          return allOffers.map(offer => {
                              const provider = users.find(u => u.id === offer.providerId);
                              const isQuote = offer.type === 'QUOTE';
                              const { rating: displayRating } = getProviderStats(provider?.id, shifts, provider);
                              
                              return (
                                  <div key={offer.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors">
                                      <div className="flex justify-between items-start mb-3">
                                          <div className="flex items-center gap-3">
                                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                                                  {provider?.profileImage ? (
                                                      <img src={provider.profileImage} alt="Profile" className="h-full w-full object-cover" />
                                                  ) : (
                                                      provider?.name.charAt(0)
                                                  )}
                                              </div>
                                              <div>
                                                  <div className="font-bold text-navy-900">{provider?.name}</div>
                                                  <div className="text-xs text-slate-500 flex items-center">
                                                      <Star className="w-3 h-3 text-gold-400 mr-1 fill-current" /> {displayRating} Rating
                                                  </div>
                                                  <BadgeDisplay badges={provider?.badges} size="sm" />
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-2xl font-black text-emerald-600">${offer.amount}</div>
                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                  {offer.amount > (reviewOffersGig.price || 0) ? `+$${(offer.amount - (reviewOffersGig.price || 0)).toFixed(2)}` : 'Match'}
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="bg-white p-3 rounded-xl border border-slate-100 text-sm text-slate-600 italic mb-4 relative">
                                          <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-slate-100 transform rotate-45"></div>
                                          <div className={`relative ${expandedOfferId === offer.id ? '' : 'line-clamp-4'}`}>
                                              "{offer.message}"
                                          </div>
                                          {offer.message && offer.message.length > 150 && (
                                              <button 
                                                  onClick={(e) => { e.stopPropagation(); setExpandedOfferId(expandedOfferId === offer.id ? null : offer.id); }}
                                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1 flex items-center not-italic"
                                              >
                                                  {expandedOfferId === offer.id ? 'Show Less' : 'Read More'} <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${expandedOfferId === offer.id ? '-rotate-90' : 'rotate-90'}`} />
                                              </button>
                                          )}
                                      </div>

                                      {offer.suggestedStart && (
                                          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gold-50 border border-gold-100 rounded-xl text-gold-700 text-xs font-bold">
                                              <Clock className="w-3.5 h-3.5" />
                                              <span>Suggested Time: {format(new Date(offer.suggestedStart), 'MMM d, h:mm a')}</span>
                                          </div>
                                      )}

                                      <div className="flex gap-3">
                                          <button 
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  isQuote ? handleDeclineQuote(offer as Quote) : handleDeclineCounter(offer as CounterOffer);
                                              }}
                                              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all text-sm cursor-pointer"
                                          >
                                              Decline
                                          </button>
                                          <button 
                                              onClick={() => {
                                                  setConfirmQuote({ offer, isQuote });
                                                  const dateToUse = offer.suggestedStart 
                                                      ? new Date(offer.suggestedStart) 
                                                      : (reviewOffersGig.start ? new Date(reviewOffersGig.start) : new Date());
                                                  setFinalDate(dateToUse.toISOString().split('T')[0]);
                                                  
                                                  const endDateToUse = offer.suggestedEnd 
                                                      ? new Date(offer.suggestedEnd) 
                                                      : (offer.suggestedStart ? new Date(offer.suggestedStart) : (reviewOffersGig.end ? new Date(reviewOffersGig.end) : new Date()));
                                                  setFinalEndDate(endDateToUse.toISOString().split('T')[0]);
                                              }}
                                              className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center"
                                          >
                                              Accept {isQuote ? 'Quote' : 'Offer'}
                                          </button>
                                      </div>
                                  </div>
                              );
                          });
                      })()}
                  </div>
              </div>
          </div>
      </div>
      )}

      {/* Referral Modal */}
      {isReferralModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="flex min-h-full items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95">
                  <button 
                      onClick={() => setIsReferralModalOpen(false)}
                      className="absolute top-6 right-6 text-slate-400 hover:text-navy-900 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"
                  >
                      <X className="w-5 h-5" />
                  </button>
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Gift className="w-8 h-8 text-pink-500" />
                      </div>
                      <h2 className="text-2xl font-black text-navy-900 mb-2">
                          {referralType === 'CLIENT' ? 'Refer a Friend' : 'Refer a Pro'}
                      </h2>
                      <p className="text-slate-500 text-sm">
                          {referralType === 'CLIENT' 
                              ? 'Give a friend $20 off their first job, and you get $20 when they complete it!'
                              : 'Earn $50 for every skilled pro you bring to the crew after they complete their first job.'}
                      </p>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-2">Your Unique Link</div>
                      <div className="flex items-center gap-2">
                          <input 
                              type="text" 
                              readOnly 
                              value={`https://app.crew.com/signup?ref=${currentUser?.id}&type=${referralType.toLowerCase()}`}
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none"
                          />
                          <button 
                              onClick={() => copyToClipboard(`https://app.crew.com/signup?ref=${currentUser?.id}&type=${referralType.toLowerCase()}`)}
                              className={`p-2 rounded-xl transition-colors ${copySuccess ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                          >
                              {copySuccess ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </button>
                      </div>
                  </div>

                  <button 
                      onClick={() => setIsReferralModalOpen(false)}
                      className="w-full py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors"
                  >
                      Done
                  </button>
              </div>
          </div>
      </div>
      )}

      {/* Chat Modal Removed - Moved to /chat page */}
    </div>
  );
};