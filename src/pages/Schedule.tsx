import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Shift, ShiftStatus, Role } from '../types';
import { format, isSameDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval, addHours, isToday, isPast } from 'date-fns';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, X, Star, Loader2, ShieldCheck, AlertCircle, ImageIcon, Camera, MessageCircle, Navigation, Scale, Phone, Edit2, Zap, TrendingUp, DollarSign, Lock, List } from 'lucide-react';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { useNavigate } from 'react-router-dom';
import { getCurrentPosition } from '../utils/geo';
import { getProviderStats } from '../utils/providerStats';

// CONFIG: Set to true for production to enforce strict GPS checks
const REQUIRE_GPS_VERIFICATION = true;

export const Schedule = () => {
    const { currentUser } = useAuth();
    const { shifts, updateShift, sites, verifyJob, users, claimGig } = useData();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [confirmQuote, setConfirmQuote] = useState<{ quoteId: string } | null>(null);
    const [finalDate, setFinalDate] = useState<string>('');
    const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
    const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

    // Boost & Edit State
    const [boostingGigId, setBoostingGigId] = useState<string | null>(null);
    const [boostSuccessId, setBoostSuccessId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [editPrice, setEditPrice] = useState<string>('');

    // Client Dispute & Verification State
    const [isDisputing, setIsDisputing] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    
    // Verification Form State
    const [verificationRating, setVerificationRating] = useState(5);
    const [verificationFeedback, setVerificationFeedback] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Check-In & Completion State
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalPrice, setFinalPrice] = useState<number>(0);
    const [priceChangeReason, setPriceChangeReason] = useState('');
    const [completionImages, setCompletionImages] = useState<string[]>([]);
    const [preWorkImages, setPreWorkImages] = useState<string[]>([]);
    const [arrivalImages, setArrivalImages] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isClient = currentUser?.role === Role.CLIENT;
    const isAdmin = currentUser?.role === Role.ADMIN;
    const isProvider = currentUser?.role === Role.PROVIDER;

    const filteredShifts = useMemo(() => {
        return shifts.filter(s => {
            if (isAdmin) return true;
            if (isClient) return s.clientId === currentUser?.id;
            if (isProvider) return s.userId === currentUser?.id || s.clientId === currentUser?.id;
            return false;
        });
    }, [shifts, isAdmin, isClient, isProvider, currentUser?.id]);

    const shiftsOnDate = useMemo(() => {
        return filteredShifts.filter(s => s.start && isSameDay(new Date(s.start), selectedDate));
    }, [filteredShifts, selectedDate]);

    // Calendar Generation
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const handleOpenShift = (shift: Shift) => {
        setSelectedShift(shift);
        setIsDisputing(false);
        setDisputeReason('');
        setVerificationRating(5);
        setVerificationFeedback('');
        setIsVerifying(false);
        setFeedback('');
        setFinalPrice(shift.price || 0);
        setPriceChangeReason('');
        setCompletionImages([]);
        setPreWorkImages(shift.preWorkPhotos || []);
        setArrivalImages(shift.arrivalPhotos || []);
        setError(null);
    };

    const handleVerifyCompletion = async () => {
        if (!selectedShift) return;
        
        setIsVerifying(true);
        try {
            await verifyJob(selectedShift.id, {
                rating: verificationRating,
                feedback: verificationFeedback
            });
            alert("Success! Funds released to provider.");
            setSelectedShift(null);
        } catch (error: any) {
            alert(`Verification Failed: ${error.message}`);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSubmitDispute = async () => {
        if (!selectedShift || !disputeReason) return;
        try {
            await updateShift({
                ...selectedShift,
                isDisputed: true,
                escrowStatus: 'DISPUTED',
                disputeReason: disputeReason
            });
            alert("Dispute filed. Admin will review.");
            setSelectedShift(null);
        } catch (err) {
            console.error("Dispute submission failed", err);
            alert("Failed to submit dispute. Please try again.");
        }
    };

    const handleAcceptCounter = async (offerId: string) => {
        if (!selectedShift || !currentUser) return;
        
        const offer = selectedShift.counterOffers?.find(o => o.id === offerId);
        if (!offer) return;

        try {
            // In a real app, this would use the platform config for fees
            const platformFeePercent = 0.20;
            const winningProvider = users.find(u => u.id === offer.providerId);
            const shouldDeduct = winningProvider ? (winningProvider.insuranceType === 'DAILY_SHIELD' || (winningProvider.insuranceType === 'OWN_COI' && !winningProvider.isCoiVerified)) : false;
            
            let insuranceFee = 0;
            if (shouldDeduct) {
                insuranceFee = 2.00; // Flat fee fallback
            }

            await claimGig(selectedShift.id, offer.providerId, {
                insuranceOptIn: shouldDeduct,
                estimatedInsuranceFee: insuranceFee,
                platformFeePercent: platformFeePercent
            });

            await new Promise(resolve => setTimeout(resolve, 800));

            await updateShift({
                ...selectedShift,
                userId: offer.providerId,
                price: offer.amount, 
                status: ShiftStatus.ACCEPTED,
                insuranceOptIn: shouldDeduct,
                appliedInsuranceFee: insuranceFee,
                appliedPlatformFee: platformFeePercent,
                escrowStatus: 'SECURED', 
                counterOffers: selectedShift.counterOffers?.map(o => 
                    o.id === offer.id ? { ...o, status: 'ACCEPTED' } : { ...o, status: 'REJECTED' }
                )
            });

            alert("Offer accepted! Funds secured and provider assigned.");
            setSelectedShift(null);
        } catch (error: any) {
            alert(`Payment Failed: ${error.message}`);
        }
    };

    const handleDeclineCounter = async (offerId: string) => {
        if (!selectedShift || !currentUser) return;

        try {
            await updateShift({
                ...selectedShift,
                counterOffers: selectedShift.counterOffers?.map(o => 
                    o.id === offerId ? { ...o, status: 'REJECTED' } : o
                )
            });
        } catch (err) {
            console.error("Failed to decline offer", err);
            alert("Failed to decline offer. Please check your connection.");
        }
    };

    const handleAcceptQuote = async (quoteId: string, selectedDate?: string) => {
        if (!selectedShift || !currentUser) return;
        
        const quote = selectedShift.quotes?.find(q => q.id === quoteId);
        if (!quote) return;

        try {
            // In a real app, this would use the platform config for fees
            const platformFeePercent = 0.20;
            const winningProvider = users.find(u => u.id === quote.providerId);
            const shouldDeduct = winningProvider ? (winningProvider.insuranceType === 'DAILY_SHIELD' || (winningProvider.insuranceType === 'OWN_COI' && !winningProvider.isCoiVerified)) : false;
            
            let insuranceFee = 0;
            if (shouldDeduct) {
                insuranceFee = 2.00; // Flat fee fallback
            }

            await claimGig(selectedShift.id, quote.providerId, {
                insuranceOptIn: shouldDeduct,
                estimatedInsuranceFee: insuranceFee,
                platformFeePercent: platformFeePercent
            });

            await new Promise(resolve => setTimeout(resolve, 800));

            const newStart = selectedDate ? new Date(selectedDate) : selectedShift.start;
            const newEnd = selectedDate ? addHours(new Date(selectedDate), 2) : selectedShift.end;

            await updateShift({
                ...selectedShift,
                userId: quote.providerId,
                price: quote.amount, 
                status: ShiftStatus.ACCEPTED,
                start: newStart,
                end: newEnd,
                insuranceOptIn: shouldDeduct,
                appliedInsuranceFee: insuranceFee,
                appliedPlatformFee: platformFeePercent,
                escrowStatus: 'SECURED', 
                quotes: selectedShift.quotes?.map(q => 
                    q.id === quote.id ? { ...q, status: 'ACCEPTED' } : { ...q, status: 'DECLINED' }
                ),
                counterOffers: selectedShift.counterOffers?.map(o => ({ ...o, status: 'REJECTED' }))
            });

            setConfirmQuote(null);
            alert("Bid accepted! Funds secured and provider assigned.");
            setSelectedShift(null);
        } catch (error: any) {
            alert(`Payment Failed: ${error.message}`);
        }
    };

    const handleStartTravel = async (e: React.MouseEvent, shift: Shift) => {
        e.stopPropagation();
        try {
            await updateShift({
                ...shift,
                status: ShiftStatus.EN_ROUTE,
                enRouteAt: new Date()
            });
            alert(`Client notified: You are en route to ${shift.description}!`);
        } catch (err) {
            console.error("Failed to start travel", err);
            alert("Failed to update status. Please check your connection.");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'PRE_WORK' | 'COMPLETION' | 'ARRIVAL') => {
        const files = e.target.files;
        if (files) {
            const currentCount = type === 'PRE_WORK' ? preWorkImages.length : 
                              type === 'ARRIVAL' ? arrivalImages.length : completionImages.length;
            
            if (currentCount + files.length > 5) {
                alert("Maximum 5 photos allowed for this section.");
                return;
            }

            Array.from(files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        // Max dimension 800px, 0.6 quality for better document performance
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const maxDimension = 800;

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

                        if (type === 'PRE_WORK') {
                            setPreWorkImages(prev => [...prev, compressedBase64]);
                        } else if (type === 'ARRIVAL') {
                            setArrivalImages(prev => [...prev, compressedBase64]);
                        } else {
                            setCompletionImages(prev => [...prev, compressedBase64]);
                        }
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number, type: 'PRE_WORK' | 'COMPLETION' | 'ARRIVAL') => {
        if (type === 'PRE_WORK') {
            const newImages = preWorkImages.filter((_, i) => i !== index);
            setPreWorkImages(newImages);
            if (selectedShift) {
                updateShift({ ...selectedShift, preWorkPhotos: newImages });
            }
        } else if (type === 'ARRIVAL') {
            const newImages = arrivalImages.filter((_, i) => i !== index);
            setArrivalImages(newImages);
            if (selectedShift) {
                updateShift({ ...selectedShift, arrivalPhotos: newImages });
            }
        } else {
            setCompletionImages(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleCheckIn = async () => {
        if (!selectedShift || !currentUser) return;

        if (arrivalImages.length === 0) {
            alert("Arrival Photo Required: You MUST upload at least one photo showing the site upon arrival before checking in.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        let checkInCoords = { lat: 0, lng: 0 };
        try {
            const pos = await getCurrentPosition();
            checkInCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
        } catch (error) {
            console.error("GPS Verification Failed", error);
            if (REQUIRE_GPS_VERIFICATION) {
                alert("GPS Verification Required: We cannot verify your arrival without a location fix. Please ensure location services are enabled and try again.");
                setIsSubmitting(false);
                return;
            }
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 800));

            const now = new Date();

            const updatedJob: Shift = {
                ...selectedShift,
                status: ShiftStatus.IN_PROGRESS,
                start: now, 
                checkInTime: now,
                checkInLat: checkInCoords.lat || undefined,
                checkInLng: checkInCoords.lng || undefined,
                arrivalPhotos: arrivalImages
            };

            await updateShift(updatedJob);
            setSelectedShift(updatedJob); 
            alert("Success! You have checked in at the job site. The job is now in progress.");
        } catch (err: any) {
            console.error("Check-in failed:", err);
            let errorMessage = "Failed to submit check-in. Please try again.";
            
            try {
                // handleFirestoreError throws a JSON string
                const parsed = JSON.parse(err.message);
                if (parsed.error) errorMessage = `Submission Error: ${parsed.error}`;
                if (parsed.error && parsed.error.includes("quota")) {
                    errorMessage = "Storage quota exceeded. Please try again later or upload smaller photos.";
                }
            } catch (e) {
                if (err.message) errorMessage = err.message;
            }
            
            setError(errorMessage);
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompleteJob = async () => {
        if (!selectedShift || !currentUser) return;
        setError(null);

        if (selectedShift.hasHighValueItems && preWorkImages.length === 0) {
            alert("STOP: This job involves high-value items. You MUST upload at least one pre-work photo showing condition before you can complete the job.");
            return;
        }

        if (completionImages.length === 0) {
            alert("Proof of Work Required: You MUST upload at least one photo showing the completed work to close this job.");
            return;
        }

        const originalPrice = selectedShift.price || 0;

        if (finalPrice !== originalPrice && !priceChangeReason.trim()) {
            alert("Please provide a reason for the price adjustment.");
            return;
        }

        setIsSubmitting(true);

        let completionCoords = { lat: 0, lng: 0 };
        try {
            const pos = await getCurrentPosition();
            completionCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
        } catch (error) {
            console.error("GPS Verification Failed", error);
            if (REQUIRE_GPS_VERIFICATION && (selectedShift.hasHighValueItems || (selectedShift.price || 0) > 200)) {
                alert("GPS LOCK REQUIRED: We cannot verify service delivery without a location fix. Please ensure location services are enabled and try again.");
                setIsSubmitting(false);
                return; 
            }
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 800));

            let finalFeedback = feedback;
            if (finalPrice !== originalPrice) {
                const adjustmentNote = `[PRICE ADJUSTMENT] Changed from $${originalPrice} to $${finalPrice}.\nReason: ${priceChangeReason}`;
                finalFeedback = finalFeedback ? `${finalFeedback}\n\n${adjustmentNote}` : adjustmentNote;
            }

            const updatedJob: Shift = {
                ...selectedShift,
                status: ShiftStatus.COMPLETED,
                providerFeedback: finalFeedback,
                price: finalPrice, 
                completedAt: new Date(),
                completionPhotos: completionImages,
                preWorkPhotos: preWorkImages, 
                completionLat: completionCoords.lat || undefined,
                completionLng: completionCoords.lng || undefined
            };

            await updateShift(updatedJob);
            setIsSubmitting(false);
            setSelectedShift(null);
            alert("Great work! Job marked as complete.");
        } catch (err: any) {
            console.error("Complete job failed:", err);
            let msg = "Failed to complete job. Please check your connection and try again.";
            
            // Check for Firestore size limit
            const errorStr = err?.message || "";
            if (errorStr.includes('too large') || errorStr.includes('limit')) {
                msg = "The job data (especially photos) is too large for the current system limits. Please remove some photos or use smaller ones.";
            } else {
                try {
                    const parsed = JSON.parse(errorStr);
                    if (parsed.error) msg = parsed.error;
                } catch (e) {
                    if (err instanceof Error) msg = err.message;
                }
            }
            alert(msg);
            setIsSubmitting(false);
        }
    };

    const handleBoost = async (e: React.MouseEvent, shift: Shift) => {
        e.stopPropagation();
        setBoostingGigId(shift.id);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            await updateShift({
                ...shift,
                isBoosted: true,
                price: Math.round(shift.price * 1.1) // 10% increase
            });
            
            setBoostingGigId(null);
            setBoostSuccessId(shift.id);
            setTimeout(() => setBoostSuccessId(null), 3000);
        } catch (err) {
            console.error("Boost failed", err);
            alert("Failed to boost gig. Please try again.");
            setBoostingGigId(null);
        }
    };

    const handleEditClick = (e: React.MouseEvent, shift: Shift) => {
        e.stopPropagation();
        setEditingShift(shift);
        setEditDescription(shift.description);
        setEditPrice(shift.price.toString());
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingShift) return;
        
        try {
            await updateShift({
                ...editingShift,
                description: editDescription,
                price: parseFloat(editPrice) || editingShift.price
            });
            
            setIsEditModalOpen(false);
            setEditingShift(null);
            alert("Request updated successfully.");
        } catch (err) {
            console.error("Failed to save edits", err);
            alert("Failed to save changes. Please try again.");
        }
    };

    const readyForWorkJobs = useMemo(() => {
        if (!isProvider) return [];
        return shifts.filter(s => {
            if (s.userId !== currentUser?.id) return false;
            const isRelevantDay = isToday(s.start) || (isPast(s.start) && (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.EN_ROUTE));
            return (s.status === ShiftStatus.ACCEPTED || s.status === ShiftStatus.IN_PROGRESS || s.status === ShiftStatus.EN_ROUTE) && isRelevantDay;
        });
    }, [shifts, isProvider, currentUser?.id]);

    const renderShiftCard = (shift: Shift) => {
        const site = sites.find(s => s.id === shift.siteId);
        const isCompleted = shift.status === ShiftStatus.COMPLETED;
        const isVerified = shift.status === ShiftStatus.VERIFIED;
        const pendingOffers = shift.counterOffers?.filter(o => o.status === 'PENDING') || [];
        const pendingQuotes = shift.quotes?.filter(q => q.status === 'PENDING') || [];
        const totalPending = pendingOffers.length + pendingQuotes.length;
        const hasPendingOffers = totalPending > 0 && shift.status === ShiftStatus.OPEN_REQUEST;
        
        const isBoosting = boostingGigId === shift.id;
        const isBoostSuccess = boostSuccessId === shift.id;
        const assignedProvider = shift.userId ? users.find(u => u.id === shift.userId) : null;
        
        // Dynamic Styles for Completed Jobs
        const cardClasses = isCompleted 
            ? "bg-emerald-50/60 p-5 rounded-2xl shadow-md border-2 border-emerald-400 hover:shadow-lg transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden" 
            : isVerified 
                ? "bg-slate-50 p-5 rounded-2xl shadow-sm border border-slate-200 opacity-80 hover:opacity-100 transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                : hasPendingOffers
                    ? "bg-indigo-50 p-5 rounded-2xl shadow-sm border border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    : "bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4";

        return (
            <div 
                key={shift.id} 
                onClick={() => handleOpenShift(shift)}
                className={cardClasses}
            >
                {isCompleted && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center z-10">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        ACTION REQUIRED
                    </div>
                )}
                
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl font-bold text-center min-w-[70px] ${isCompleted ? 'bg-white text-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-500'}`}>
                        <div className="text-xs uppercase">{format(shift.start, 'MMM')}</div>
                        <div className="text-xl text-navy-900">{format(shift.start, 'd')}</div>
                    </div>
                    <div>
                        {assignedProvider && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                                {assignedProvider.profileImage ? (
                                    <img src={assignedProvider.profileImage} alt={assignedProvider.name} className="w-5 h-5 rounded-full object-cover shadow-sm bg-slate-100" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-navy-100 flex items-center justify-center text-[10px] font-bold text-navy-700 shadow-sm">
                                        {assignedProvider.name.charAt(0)}
                                    </div>
                                )}
                                <span className="text-xs font-bold text-navy-600">Assigned Local Pro: {assignedProvider.name}</span>
                            </div>
                        )}
                        <div className="relative">
                            <h3 className={`font-bold text-navy-900 text-lg ${expandedShiftId === shift.id ? '' : 'line-clamp-4'}`}>
                                {shift.description}
                            </h3>
                            {shift.description.length > 150 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setExpandedShiftId(expandedShiftId === shift.id ? null : shift.id); }}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1 flex items-center"
                                >
                                    {expandedShiftId === shift.id ? 'Show Less' : 'Read More'} <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${expandedShiftId === shift.id ? '-rotate-90' : 'rotate-90'}`} />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {format(shift.start, 'h:mm a')} - {format(shift.end, 'h:mm a')}</span>
                            <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {site?.name}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 mt-2 md:mt-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        shift.status === ShiftStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                        shift.status === ShiftStatus.VERIFIED ? 'bg-slate-200 text-slate-600' :
                        shift.status === ShiftStatus.ACCEPTED ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                    }`}>
                        {shift.status.replace('_', ' ')}
                    </span>
                    {hasPendingOffers && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center"><Scale className="w-3 h-3 mr-1" /> {totalPending} NEW BIDS</span>}
                    {shift.price && <span className={`font-black text-navy-900 ${shift.isBoosted ? 'text-purple-600' : ''}`}>${shift.price}</span>}
                    {isCompleted && isClient && <span className="text-xs font-bold text-emerald-600 animate-pulse">Verify Now &rarr;</span>}
                    
                    {/* Action Buttons for Open Requests */}
                    {isClient && shift.status === ShiftStatus.OPEN_REQUEST && (
                        <div className="flex gap-2 mt-2">
                            <button 
                                onClick={(e) => handleEditClick(e, shift)}
                                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
                                title="Edit Request"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => handleBoost(e, shift)}
                                disabled={isBoosting}
                                className={`px-3 py-2 rounded-lg text-xs font-bold text-white flex items-center transition-all ${
                                    isBoostSuccess 
                                    ? 'bg-green-500' 
                                    : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-md'
                                }`}
                            >
                                {isBoosting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                                {isBoostSuccess ? 'Boosted!' : 'Boost'}
                            </button>
                        </div>
                    )}

                    {/* Contact Buttons */}
                    {(shift.userId || shift.clientId) && (
                        <div className="flex gap-2 mt-2">
                            {(() => {
                                const contactUser = users.find(u => u.id === (isClient ? shift.userId : shift.clientId));
                                if (!contactUser) return null;
                                return (
                                    <>
                                        <a 
                                            href={`tel:${contactUser.phone}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors group"
                                            title="Call"
                                        >
                                            <Phone className="w-4 h-4 group-hover:text-gold-500" />
                                        </a>
                                        <a 
                                            href={`sms:${contactUser.phone}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors group"
                                            title="Text Message"
                                        >
                                            <MessageCircle className="w-4 h-4 group-hover:text-blue-500" />
                                        </a>
                                        <a 
                                            href={`https://maps.google.com/?q=${contactUser.address || ''}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors group"
                                            title="Get Directions"
                                        >
                                            <Navigation className="w-4 h-4 group-hover:text-emerald-500" />
                                        </a>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const sortedActiveFilteredShifts = useMemo(() => {
        return filteredShifts
            .filter(s => s.status !== ShiftStatus.VERIFIED && s.status !== ShiftStatus.COMPLETED)
            .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }, [filteredShifts]);

    const sortedPastFilteredShifts = useMemo(() => {
        return filteredShifts
            .filter(s => s.status === ShiftStatus.VERIFIED || s.status === ShiftStatus.COMPLETED)
            .sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    }, [filteredShifts]);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-navy-950">Schedule</h1>
                    <p className="text-slate-500">Manage your upcoming and past jobs.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-navy-900 border border-slate-200/50' : 'text-slate-500 hover:text-navy-700'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-navy-900 border border-slate-200/50' : 'text-slate-500 hover:text-navy-700'}`}
                            title="Calendar View"
                        >
                            <Calendar className="w-4 h-4" />
                        </button>
                    </div>
                    {viewMode === 'calendar' && (
                        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                            <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
                            <div className="px-4 py-2 font-bold text-navy-900 flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-gold-500" />
                                {format(selectedDate, 'MMM yyyy')}
                            </div>
                            <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Ready for Work (Providers Only) */}
            {isProvider && readyForWorkJobs.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-navy-900 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-gold-500" /> Ready for Work
                    </h2>
                    {readyForWorkJobs.map(job => {
                        const site = sites.find(s => s.id === job.siteId);
                        const isEnRoute = job.status === ShiftStatus.EN_ROUTE;
                        const isInProgress = job.status === ShiftStatus.IN_PROGRESS;
                        return (
                            <div 
                                key={job.id} 
                                onClick={() => handleOpenShift(job)}
                                className={`bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${isEnRoute ? 'border-blue-300 ring-2 ring-blue-100' : isInProgress ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gold-200'}`}
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${isEnRoute ? 'bg-blue-500' : isInProgress ? 'bg-emerald-500' : 'bg-gold-400 group-hover:bg-gold-500'}`}></div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold bg-navy-50 text-navy-700 px-2 py-0.5 rounded uppercase">
                                                {job.category}
                                            </span>
                                            <span className="text-xs text-slate-500 flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {format(job.start, 'h:mm a')}
                                            </span>
                                            {job.hasHighValueItems && (
                                                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 flex items-center">
                                                    <ShieldCheck className="w-3 h-3 mr-1" /> HIGH VALUE
                                                </span>
                                            )}
                                            {isEnRoute && (
                                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 flex items-center animate-pulse">
                                                    <Navigation className="w-3 h-3 mr-1" /> EN ROUTE
                                                </span>
                                            )}
                                            {isInProgress && (
                                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 flex items-center">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> IN PROGRESS
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-navy-900">{job.description}</h3>
                                        <a 
                                            href={`https://maps.google.com/?q=${encodeURIComponent(site?.address || '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-sm text-blue-600 hover:underline flex items-center mt-2"
                                        >
                                            <MapPin className="w-4 h-4 mr-1 text-blue-500" /> 
                                            {site?.address || 'Unknown Location'}
                                        </a>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xl font-black text-emerald-600">${job.price}</span>
                                        
                                        <div className="flex gap-2 mt-4">
                                            {!isEnRoute && !isInProgress && (
                                                <button 
                                                    onClick={(e) => handleStartTravel(e, job)}
                                                    className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors z-10 shadow-md animate-in zoom-in"
                                                    title="Start Travel (Notify Client)"
                                                >
                                                    <Navigation className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/chat/${job.id}`);
                                                }}
                                                className="p-2 bg-navy-50 rounded-full text-navy-600 hover:bg-navy-100 transition-colors z-10"
                                                title="Message Client"
                                            >
                                                <MessageCircle className="w-5 h-5" />
                                            </button>
                                            <button className="p-2 bg-navy-50 rounded-full text-navy-600 group-hover:bg-navy-600 group-hover:text-white transition-colors">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {viewMode === 'calendar' ? (
                <>
                    {/* Week View */}
                    <div className="grid grid-cols-7 gap-2 md:gap-4">
                        {weekDays.map(day => {
                            const isSelected = isSameDay(day, selectedDate);
                            const hasShift = filteredShifts.some(s => isSameDay(s.start, day));
                            return (
                                <button 
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${
                                        isSelected 
                                        ? 'bg-navy-900 text-white shadow-lg shadow-navy-200' 
                                        : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                                    }`}
                                >
                                    <span className="text-xs font-bold uppercase">{format(day, 'EEE')}</span>
                                    <span className={`text-lg font-black mt-1 ${isSelected ? 'text-gold-400' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                                    {hasShift && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Shift List */}
                    <div className="space-y-4">
                        <h2 className="font-bold text-navy-900 text-lg flex items-center">
                            {format(selectedDate, 'EEEE, MMM do')}
                        </h2>
                        {shiftsOnDate.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No jobs scheduled for this day.</p>
                            </div>
                        ) : (
                            shiftsOnDate.map(renderShiftCard)
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-8">
                    {sortedActiveFilteredShifts.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-navy-900 text-lg flex items-center">
                                Upcoming & Active Jobs
                            </h2>
                            <div className="space-y-3">
                                {sortedActiveFilteredShifts.map(renderShiftCard)}
                            </div>
                        </div>
                    )}
                    
                    {sortedPastFilteredShifts.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-navy-900 text-lg flex items-center opacity-70">
                                Past Jobs
                            </h2>
                            <div className="space-y-3 opacity-80">
                                {sortedPastFilteredShifts.map(renderShiftCard)}
                            </div>
                        </div>
                    )}

                    {sortedActiveFilteredShifts.length === 0 && sortedPastFilteredShifts.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                            <List className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No jobs found.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            {selectedShift && (
                <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-2xl font-bold text-navy-900">Job Details</h2>
                                    {selectedShift.hasHighValueItems && (
                                        <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-1 rounded shadow-sm flex items-center">
                                            <ShieldCheck className="w-3 h-3 mr-1" /> HIGH VALUE
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                    <p className="text-slate-500 text-sm">{selectedShift.description}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedShift(null)} className="text-slate-400 hover:text-navy-900">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Provider View - Full Details */}
                            {isProvider && (
                                <>
                                    {/* Location & Client Info */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="flex items-start gap-3 mb-3">
                                            <MapPin className="w-5 h-5 text-gold-500 mt-0.5 shrink-0" />
                                            <div>
                                                <h4 className="text-sm font-bold text-navy-900">Location</h4>
                                                <a 
                                                    href={`https://maps.google.com/?q=${encodeURIComponent(sites.find(s => s.id === selectedShift.siteId)?.address || '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline break-words"
                                                >
                                                    {sites.find(s => s.id === selectedShift.siteId)?.address || 'Unknown Address'}
                                                </a>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-5 w-5 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 text-xs font-bold shrink-0 mt-0.5">
                                                {users.find(u => u.id === selectedShift.clientId)?.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-navy-900">Client (Homeowner)</h4>
                                                <p className="text-sm text-slate-600 mb-2">{users.find(u => u.id === selectedShift.clientId)?.name || 'Unknown Client'}</p>
                                                
                                                {/* Contact Buttons in Modal */}
                                                <div className="flex gap-2">
                                                    {users.find(u => u.id === selectedShift.clientId)?.phone && (
                                                        <a href={`tel:${users.find(u => u.id === selectedShift.clientId)?.phone}`} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center hover:bg-slate-50 transition-colors">
                                                            <Phone className="w-3 h-3 mr-1" /> Call
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={() => navigate(`/chat/${selectedShift.id}`)}
                                                        className="text-xs font-bold bg-navy-50 text-navy-600 px-3 py-1.5 rounded-lg flex items-center hover:bg-navy-100 transition-colors"
                                                    >
                                                        <MessageCircle className="w-3 h-3 mr-1" /> Message
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pre-Work Photos (Read Only) */}
                                    {selectedShift.preWorkPhotos && selectedShift.preWorkPhotos.length > 0 && (
                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                                            <label className="block text-sm font-bold text-purple-900 mb-2 flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-2" /> Pre-Work Condition Photos
                                            </label>
                                            <div className="flex gap-3 overflow-x-auto pb-2">
                                                {selectedShift.preWorkPhotos.map((img, i) => (
                                                    <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-purple-200 shrink-0 shadow-sm">
                                                        <img src={img} alt={`Pre-work ${i}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Initial Site Photos */}
                                    {selectedShift.photos && selectedShift.photos.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                                                <ImageIcon className="w-4 h-4 mr-1" /> Initial Site Photos
                                            </h3>
                                            <div className="flex gap-3 overflow-x-auto pb-2">
                                                {selectedShift.photos.map((photo, i) => (
                                                    <div key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                                                        <img src={photo} alt={`Job site ${i}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Completion Photos */}
                                    {selectedShift.completionPhotos && selectedShift.completionPhotos.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                                                <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Proof of Work (Completion)
                                            </h3>
                                            <div className="flex gap-3 overflow-x-auto pb-2">
                                                {selectedShift.completionPhotos.map((photo, i) => (
                                                    <div key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                                                        <img src={photo} alt={`Completion ${i}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Financials */}
                                    <div className="bg-gold-50 p-4 rounded-xl border border-gold-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-navy-900">Final Price</span>
                                            <span className="font-black text-xl text-navy-900">${selectedShift.price}</span>
                                        </div>
                                        {selectedShift.providerFeedback && selectedShift.providerFeedback.includes('[PRICE ADJUSTMENT]') && (
                                            <div className="text-xs text-amber-700 bg-amber-100/50 p-2 rounded border border-amber-200 mt-2">
                                                <strong>Note:</strong> {selectedShift.providerFeedback}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button for Provider */}
                                    {(selectedShift.status === ShiftStatus.ACCEPTED || selectedShift.status === ShiftStatus.EN_ROUTE || selectedShift.status === ShiftStatus.IN_PROGRESS) && (
                                        <div className="mt-6 pt-6 border-t border-slate-200">
                                            {(selectedShift.status === ShiftStatus.ACCEPTED || selectedShift.status === ShiftStatus.EN_ROUTE) ? (
                                                <div className="mb-6">
                                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                                                        <label className="block text-sm font-bold text-blue-900 mb-2 flex items-center">
                                                            <MapPin className="w-4 h-4 mr-2" /> Check In at Site
                                                        </label>
                                                        <p className="text-xs text-blue-700 mb-4">
                                                            Please confirm you have arrived at the job site. We will capture your GPS location.
                                                        </p>

                                                        <label className="block text-xs font-bold text-blue-800 mb-2">
                                                            Arrival Photos (Required)
                                                        </label>
                                                        <div className="flex flex-wrap gap-3 mb-2">
                                                            {arrivalImages.map((img, idx) => (
                                                                <div key={idx} className="w-20 h-20 relative rounded-xl overflow-hidden border border-blue-200 shadow-sm group">
                                                                    <img src={img} alt="Arrival" className="w-full h-full object-cover" />
                                                                    <button 
                                                                      onClick={() => removeImage(idx, 'ARRIVAL')}
                                                                      className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            
                                                            <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-100 transition-colors text-blue-400 hover:text-blue-600">
                                                                <Camera className="w-6 h-6 mb-1" />
                                                                <span className="text-[10px] font-bold">Add</span>
                                                                <input 
                                                                  type="file" 
                                                                  accept="image/*" 
                                                                  multiple 
                                                                  className="hidden" 
                                                                  onChange={(e) => handleImageUpload(e, 'ARRIVAL')}
                                                                />
                                                            </label>
                                                        </div>
                                                        <p className="text-[10px] text-blue-600 italic">
                                                            Uploading a photo of the site upon arrival is required to document the time and/or initial condition.
                                                        </p>
                                                    </div>

                                                    <button 
                                                        onClick={handleCheckIn}
                                                        disabled={isSubmitting}
                                                        className="w-full py-4 text-white text-lg font-bold rounded-xl shadow-lg transition-all flex items-center justify-center bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                                                    >
                                                        {isSubmitting ? 'Checking In...' : (
                                                            <><MapPin className="w-6 h-6 mr-2" /> Confirm Arrival & Check In</>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Pre-Work Proof of Condition (Required for High Value) */}
                                                    {selectedShift.hasHighValueItems && (
                                                        <div className="mb-6 bg-purple-50 p-4 rounded-xl border border-purple-200">
                                                            <label className="block text-sm font-bold text-purple-900 mb-2 flex items-center">
                                                                <AlertCircle className="w-4 h-4 mr-2" /> Required: Proof of Condition
                                                            </label>
                                                            <p className="text-xs text-purple-700 mb-3">
                                                                You must upload photos of high-value items <strong>before</strong> handling them to protect against damage claims.
                                                            </p>
                                                            
                                                            <div className="flex flex-wrap gap-3">
                                                                {preWorkImages.map((img, idx) => (
                                                                    <div key={idx} className="w-20 h-20 relative rounded-xl overflow-hidden border border-purple-200 shadow-sm group">
                                                                        <img src={img} alt="Pre-work condition" className="w-full h-full object-cover" />
                                                                        <button 
                                                                          onClick={() => removeImage(idx, 'PRE_WORK')}
                                                                          className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                
                                                                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-100 transition-colors text-purple-400 hover:text-purple-600">
                                                                    <Camera className="w-6 h-6 mb-1" />
                                                                    <span className="text-[10px] font-bold">Add</span>
                                                                    <input 
                                                                      type="file" 
                                                                      accept="image/*" 
                                                                      multiple 
                                                                      className="hidden" 
                                                                      onChange={(e) => handleImageUpload(e, 'PRE_WORK')}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="bg-gold-50 p-4 rounded-xl border border-gold-200 mb-6 transition-all">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-sm font-bold text-navy-900">Final Payout ($)</span>
                                                            <input 
                                                                type="number" 
                                                                value={finalPrice}
                                                                onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
                                                                className="w-32 p-2 bg-white border border-gold-300 rounded-lg text-right font-black text-xl outline-none focus:ring-2 focus:ring-gold-400 text-navy-900"
                                                            />
                                                        </div>
                                                        
                                                        <div className="text-xs text-slate-500 mb-2">
                                                            Original Estimate: ${selectedShift.price || 0}
                                                        </div>

                                                        {/* Price Change Reason Input */}
                                                        {finalPrice !== (selectedShift.price || 0) && (
                                                            <div className="mt-3 pt-3 border-t border-gold-200 animate-in slide-in-from-top-2">
                                                                <div className="flex items-start gap-2 mb-2">
                                                                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                                                                    <span className="text-xs font-bold text-amber-700">Price changed. Please explain why:</span>
                                                                 </div>
                                                                <textarea 
                                                                    placeholder="e.g. Required extra materials ($40) and took 1 hour longer than expected..."
                                                                    className="w-full p-3 bg-white border border-gold-300 rounded-lg text-sm focus:ring-2 focus:ring-gold-400 outline-none"
                                                                    rows={2}
                                                                    value={priceChangeReason}
                                                                    onChange={(e) => setPriceChangeReason(e.target.value)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Completion Photos Upload */}
                                                    <div className="mb-6">
                                                        <label className="block text-sm font-bold text-navy-900 mb-2">Proof of Work (Completion Photos) <span className="text-red-500">*</span></label>
                                                        <div className="flex flex-wrap gap-3">
                                                            {completionImages.map((img, idx) => (
                                                                <div key={idx} className="w-20 h-20 relative rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                                                                    <img src={img} alt="Completion proof" className="w-full h-full object-cover" />
                                                                    <button 
                                                                      onClick={() => removeImage(idx, 'COMPLETION')}
                                                                      className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            
                                                            <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-gold-400 hover:bg-gold-50 transition-colors text-slate-400 hover:text-gold-600">
                                                                <Camera className="w-6 h-6 mb-1" />
                                                                <span className="text-[10px] font-bold">Add</span>
                                                                <input 
                                                                  type="file" 
                                                                  accept="image/*" 
                                                                  multiple 
                                                                  className="hidden" 
                                                                  onChange={(e) => handleImageUpload(e, 'COMPLETION')}
                                                                />
                                                            </label>
                                                        </div>
                                                        {completionImages.length === 0 && (
                                                            <p className="text-xs text-amber-600 mt-2 font-medium flex items-center">
                                                                <AlertCircle className="w-3 h-3 mr-1" /> Mandatory: Upload at least one photo.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="space-y-4">
                                                        <label className="block text-sm font-bold text-navy-900">
                                                            Job Notes / Feedback
                                                            <span className="text-slate-400 font-normal ml-2">(Optional)</span>
                                                        </label>
                                                        <textarea 
                                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-400 outline-none resize-none h-32"
                                                            placeholder="Describe work done or any issues encountered..."
                                                            value={feedback}
                                                            onChange={e => setFeedback(e.target.value)}
                                                        />
                                                        
                                                        {/* GPS Warning Box */}
                                                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start text-xs text-amber-800 shadow-sm">
                                                            <MapPin className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-amber-600" />
                                                            <p><strong>GPS Verification Required:</strong> Please mark this job complete while physically at the job site. We capture your location at the moment of completion to verify service delivery and avoid potential disputes.</p>
                                                        </div>

                                                        <button 
                                                            onClick={handleCompleteJob}
                                                            disabled={isSubmitting || (completionImages.length === 0) || (selectedShift.hasHighValueItems && preWorkImages.length === 0)}
                                                            className={`w-full py-4 text-white text-lg font-bold rounded-xl shadow-lg transition-all flex items-center justify-center ${(completionImages.length === 0) || (selectedShift.hasHighValueItems && preWorkImages.length === 0) ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                                                            title={(completionImages.length === 0) || (selectedShift.hasHighValueItems && preWorkImages.length === 0) ? "Photos required before completion" : "Complete Job"}
                                                        >
                                                            {isSubmitting ? 'Verifying Location...' : (
                                                                (completionImages.length === 0) || (selectedShift.hasHighValueItems && preWorkImages.length === 0) ? (
                                                                    selectedShift.hasHighValueItems && preWorkImages.length === 0 ? 
                                                                    <><Lock className="w-5 h-5 mr-2" /> Upload Proof of Condition</> :
                                                                    <><Camera className="w-5 h-5 mr-2" /> Upload Proof of Work</>
                                                                ) : (
                                                                    <><CheckCircle2 className="w-6 h-6 mr-2" /> Mark Job Complete</>
                                                                )
                                                            )}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Client View (Simplified Description) */}
                            {!isProvider && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-sm text-slate-500 uppercase font-bold mb-1">Description</p>
                                    <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        <p className="font-medium text-navy-900">{selectedShift.description}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <p className="text-sm text-slate-500 uppercase font-bold mb-1">Location</p>
                                        <a 
                                            href={`https://maps.google.com/?q=${encodeURIComponent(sites.find(s => s.id === selectedShift.siteId)?.address || '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline break-words flex items-center"
                                        >
                                            <MapPin className="w-4 h-4 mr-1" />
                                            {sites.find(s => s.id === selectedShift.siteId)?.address || 'Unknown Address'}
                                        </a>
                                    </div>

                                    {/* Provider Contact Info for Client */}
                                    {selectedShift.userId && (
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <p className="text-sm text-slate-500 uppercase font-bold mb-2">Assigned Provider</p>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                                                    {users.find(u => u.id === selectedShift.userId)?.name.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-navy-900 text-sm">{users.find(u => u.id === selectedShift.userId)?.name}</div>
                                                    <div className="flex gap-2 mt-2">
                                                        {users.find(u => u.id === selectedShift.userId)?.phone && (
                                                            <a href={`tel:${users.find(u => u.id === selectedShift.userId)?.phone}`} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center hover:bg-slate-50 transition-colors">
                                                                <Phone className="w-3 h-3 mr-1" /> Call
                                                            </a>
                                                        )}
                                                        <button 
                                                            onClick={() => navigate(`/chat/${selectedShift.id}`)}
                                                            className="text-xs font-bold bg-navy-50 text-navy-600 px-3 py-1.5 rounded-lg flex items-center hover:bg-navy-100 transition-colors"
                                                        >
                                                            <MessageCircle className="w-3 h-3 mr-1" /> Message
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Client View - Financials */}
                                    {(selectedShift.status === ShiftStatus.ACCEPTED || selectedShift.status === ShiftStatus.IN_PROGRESS || selectedShift.status === ShiftStatus.COMPLETED || selectedShift.status === ShiftStatus.VERIFIED) && (
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-navy-900">Agreed Price</span>
                                                <span className="font-black text-xl text-navy-900">${selectedShift.price}</span>
                                            </div>
                                            {selectedShift.providerFeedback && selectedShift.providerFeedback.includes('[PRICE ADJUSTMENT]') && (
                                                <div className="text-xs text-amber-700 bg-amber-100/50 p-2 rounded border border-amber-200 mt-2">
                                                    <strong>Price Adjustment Note:</strong> {selectedShift.providerFeedback}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Client Counter Offers & Quotes View */}
                            {isClient && selectedShift.status === ShiftStatus.OPEN_REQUEST && (
                                <div className="space-y-4">
                                    {/* Action Buttons in Modal */}
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={(e) => handleEditClick(e, selectedShift)}
                                            className="flex-1 py-3 bg-white border border-slate-200 text-navy-900 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center"
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" /> Edit Request
                                        </button>
                                        <button 
                                            onClick={(e) => handleBoost(e, selectedShift)}
                                            disabled={boostingGigId === selectedShift.id}
                                            className={`flex-1 py-3 font-bold rounded-xl text-white shadow-md transition-all flex items-center justify-center ${
                                                boostSuccessId === selectedShift.id 
                                                ? 'bg-green-500' 
                                                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg'
                                            }`}
                                        >
                                            {boostingGigId === selectedShift.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                                            {boostSuccessId === selectedShift.id ? 'Boosted!' : 'Boost Exposure'}
                                        </button>
                                    </div>

                                    {/* Counter Offers */}
                                    {selectedShift.counterOffers && selectedShift.counterOffers.length > 0 && (
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                            <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                                                <Scale className="w-5 h-5 mr-2" /> Pending Counter Offers
                                            </h3>
                                            <div className="space-y-3">
                                                {selectedShift.counterOffers.filter(o => o.status === 'PENDING').map(offer => {
                                                    const provider = users.find(u => u.id === offer.providerId);
                                                    const { rating: displayRating } = getProviderStats(provider?.id, shifts, provider);
                                                    return (
                                                        <div key={offer.id} className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                                                                        {provider?.profileImage ? (
                                                                            <img src={provider.profileImage} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            provider?.companyName?.charAt(0) || provider?.name.charAt(0)
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-sm text-navy-900">{provider?.companyName || provider?.name}</div>
                                                                        <div className="text-xs text-slate-500 flex items-center">
                                                                            <Star className="w-3 h-3 text-gold-400 mr-1 fill-current" /> {displayRating}
                                                                        </div>
                                                                        <BadgeDisplay badges={provider?.badges} size="sm" />
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-black text-emerald-600">${offer.amount}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm text-slate-600 italic mb-3 bg-slate-50 p-2 rounded">
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
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => handleDeclineCounter(offer.id)}
                                                                    className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                                                                >
                                                                    Decline
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleAcceptCounter(offer.id)}
                                                                    className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                                                                >
                                                                    Accept Offer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {selectedShift.counterOffers.filter(o => o.status === 'PENDING').length === 0 && (
                                                    <p className="text-sm text-slate-500 italic">No pending offers.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quotes (Bids) */}
                                    {selectedShift.quotes && selectedShift.quotes.length > 0 && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                            <h3 className="font-bold text-emerald-900 mb-4 flex items-center">
                                                <TrendingUp className="w-5 h-5 mr-2" /> Competitive Bids
                                            </h3>
                                            <div className="space-y-3">
                                                {selectedShift.quotes.filter(q => q.status === 'PENDING').map(quote => {
                                                    const provider = users.find(u => u.id === quote.providerId);
                                                    const { rating: displayRating } = getProviderStats(provider?.id, shifts, provider);
                                                    return (
                                                        <div key={quote.id} className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden">
                                                                        {provider?.profileImage ? (
                                                                            <img src={provider.profileImage} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            provider?.companyName?.charAt(0) || provider?.name.charAt(0)
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-sm text-navy-900">{provider?.companyName || provider?.name}</div>
                                                                        <div className="text-xs text-slate-500 flex items-center">
                                                                            <Star className="w-3 h-3 text-gold-400 mr-1 fill-current" /> {displayRating}
                                                                        </div>
                                                                        <BadgeDisplay badges={provider?.badges} size="sm" />
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-black text-emerald-600">${quote.amount}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm text-slate-600 italic mb-3 bg-slate-50 p-2 rounded">
                                                                "{quote.message}"
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                                                                >
                                                                    Decline
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        setConfirmQuote({ quoteId: quote.id });
                                                                    setFinalDate(selectedShift.type === 'SCHEDULED' && selectedShift.start ? new Date(selectedShift.start).toISOString().split('T')[0] : '');
                                                                    }}
                                                                    className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                                                                >
                                                                    Accept Bid
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {selectedShift.quotes.filter(q => q.status === 'PENDING').length === 0 && (
                                                    <p className="text-sm text-slate-500 italic">No pending bids.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Client Verification Flow */}
                            {isClient && selectedShift.status === ShiftStatus.COMPLETED && !selectedShift.isDisputed && (
                                <div className="bg-white border-2 border-emerald-400 rounded-xl p-6 shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400"></div>
                                    <h3 className="font-bold text-lg text-navy-900 mb-2 flex items-center">
                                        <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" /> Verify Completion
                                    </h3>
                                    <p className="text-slate-500 text-sm mb-4">
                                        The provider has marked this job as complete. Please review the proof of work and release funds.
                                    </p>

                                    {selectedShift.completionPhotos && (
                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                            {selectedShift.completionPhotos.map((img, i) => (
                                                <img key={i} src={img} className="w-24 h-24 rounded-lg object-cover border border-slate-200 shadow-sm" alt="Proof" />
                                            ))}
                                        </div>
                                    )}

                                    {selectedShift.providerFeedback && (
                                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 italic mb-4 border border-slate-100 max-h-32 overflow-y-auto">
                                            " {selectedShift.providerFeedback} "
                                        </div>
                                    )}

                                    {!isDisputing ? (
                                        <>
                                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-4 animate-in fade-in">
                                                <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2">Rate Provider</h4>
                                                <div className="flex gap-2 mb-3">
                                                    {[1,2,3,4,5].map(star => (
                                                        <button key={star} onClick={() => setVerificationRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                                            <Star className={`w-6 h-6 ${star <= verificationRating ? 'fill-gold-400 text-gold-400' : 'text-slate-300'}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea 
                                                    className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    placeholder="Optional feedback..."
                                                    value={verificationFeedback}
                                                    onChange={e => setVerificationFeedback(e.target.value)}
                                                />
                                            </div>

                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => setIsDisputing(true)}
                                                    className="flex-1 py-3 text-red-600 font-bold border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                                                >
                                                    Report Issue
                                                </button>
                                                <button 
                                                    onClick={handleVerifyCompletion}
                                                    disabled={isVerifying}
                                                    className="flex-[2] py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-colors flex items-center justify-center transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {isVerifying ? (
                                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Processing...</>
                                                    ) : (
                                                        <><CheckCircle2 className="w-5 h-5 mr-2" /> Verify & Release Funds</>
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in">
                                            <div>
                                                <label className="block text-sm font-bold text-red-700 mb-2 flex items-center">
                                                    <AlertTriangle className="w-4 h-4 mr-2" /> Report an Issue
                                                </label>
                                                <textarea 
                                                    className="w-full p-3 bg-white border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="Describe the issue..."
                                                    value={disputeReason}
                                                    onChange={e => setDisputeReason(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => setIsDisputing(false)}
                                                    className="flex-1 py-3 text-slate-500 hover:text-navy-900 font-bold"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleSubmitDispute}
                                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200"
                                                >
                                                    Submit Dispute
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                             {/* Dispute Status Banner */}
                             {selectedShift.isDisputed && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                                    <h4 className="font-bold text-red-800 flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2" /> Dispute Active
                                    </h4>
                                    <p className="text-sm text-red-700 mt-1">
                                        Funds are frozen pending admin review.
                                    </p>
                                    <p className="text-xs text-red-600 mt-2 italic">"{selectedShift.disputeReason}"</p>
                                </div>
                            )}

                             {/* Verified Banner */}
                             {selectedShift.status === ShiftStatus.VERIFIED && (
                                <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                    <div className="bg-white p-2 rounded-full mb-2 shadow-sm">
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    </div>
                                    <h4 className="font-bold text-navy-900">Job Verified & Paid</h4>
                                    <p className="text-xs text-slate-500 mt-1">Funds have been released to the provider.</p>
                                    <div className="flex mt-3 text-gold-400">
                                        {[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= (selectedShift.clientRating || 0) ? 'fill-current' : 'text-slate-300'}`} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Confirm Schedule Modal */}
            {confirmQuote && selectedShift && (
                <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
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
                                Please confirm the date for this job before proceeding to payment.
                            </p>
                            <label className="block text-sm font-bold text-navy-900 mb-2">Final Date</label>
                            <input 
                                type="date"
                                value={finalDate}
                                onChange={(e) => setFinalDate(e.target.value)}
                                className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm transition-all font-mono"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmQuote(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleAcceptQuote(confirmQuote.quoteId, finalDate)}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                            >
                                Confirm & Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editingShift && (
                <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-navy-900">Edit Request</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-navy-900">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-navy-900 mb-2">Description</label>
                                <textarea 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-navy-900 mb-2">Price Offer ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="number"
                                        className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={editPrice}
                                        onChange={e => setEditPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button 
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3 text-slate-500 hover:text-navy-900 font-bold"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveEdit}
                                    className="flex-1 py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 shadow-lg shadow-navy-200"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};