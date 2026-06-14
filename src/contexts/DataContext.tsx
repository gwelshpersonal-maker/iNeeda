import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, Shift, Site, Notification, JobPosting, JobApplication, Role, Referral, Message, PlatformConfig, PlatformMessage, ServiceCategory, ServiceCategoryDef, ShiftStatus, LegalDocument, FaqItem, Quote, Attachment, CategoryRequest, SubscriptionPayment } from '../types';
import { MOCK_USERS, MOCK_SHIFTS, MOCK_SITES, MOCK_JOBS, MOCK_APPLICATIONS, ALL_SERVICE_CATEGORIES, CATEGORY_RISK_MAPPING, INSURANCE_FEES, RISK_LEVELS, ESCROW_WINDOW_HOURS, DEFAULT_PLATFORM_MESSAGES } from '../constants';
import { sendSMS, sendEmail, sendPush } from '../services/notificationService';
import { differenceInHours, subDays } from 'date-fns';
import { calculateJobSplit } from '../utils/feeEngine';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  getDocFromServer,
  addDoc
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function stripUndefined(val: any): any {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (Array.isArray(val)) {
    return val.map(item => stripUndefined(item)).filter(item => item !== undefined);
  }
  if (typeof val === 'object' && !(val instanceof Date) && !(val instanceof Timestamp)) {
    const newObj: any = {};
    Object.keys(val).forEach(key => {
      const stripped = stripUndefined(val[key]);
      if (stripped !== undefined) {
        newObj[key] = stripped;
      }
    });
    return newObj;
  }
  return val;
}

// Helper to convert Firestore Timestamp or string to Date
const toDate = (timestamp: any): Date => {
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
    return new Date();
};

// Helper to convert Date to ISO string for storage (consistent with existing pattern)
const fromDate = (date: any): string => {
    if (date instanceof Date) return date.toISOString();
    if (date instanceof Timestamp) return date.toDate().toISOString();
    if (date && typeof date === 'object' && 'seconds' in date) return new Timestamp(date.seconds, date.nanoseconds).toDate().toISOString();
    if (typeof date === 'string') return date;
    return new Date().toISOString();
};

interface DataContextType {
  users: User[];
  publicProfiles: Partial<User>[];
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => Promise<void>;

  sites: Site[];
  addSite: (site: Site) => void;
  updateSite: (site: Site) => void;
  deleteSite: (id: string) => void;

  shifts: Shift[];
  addShift: (shift: Shift) => void;
  updateShift: (shift: Shift) => Promise<{ error: any } | void>;
  deleteShift: (id: string) => Promise<void>;
  claimGig: (gigId: string, providerId: string, options: { insuranceOptIn: boolean, estimatedInsuranceFee: number, platformFeePercent: number }) => Promise<void>;
  fundGig: (gigId: string) => Promise<void>;
  verifyJob: (jobId: string, review: { rating: number, feedback: string }) => Promise<void>;
  seedMarketData: () => void;
  seedPricingData: () => void;
  importHistoricalData: (shifts: Shift[]) => Promise<void>;

  quotes: Quote[];
  addQuote: (quote: Quote) => Promise<void>;
  updateQuote: (quote: Quote) => Promise<void>;

  notifications: Notification[];
  addNotification: (note: Notification) => void;
  markNotificationsRead: (userId: string) => void;
  deleteNotification: (id: string) => void;
  broadcastNotification: (userIds: string[], message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT') => void;

  // Recruitment
  jobs: JobPosting[];
  addJob: (job: JobPosting) => void;
  updateJob: (job: JobPosting) => void;
  deleteJob: (id: string) => void;
  applications: JobApplication[];
  submitApplication: (app: JobApplication) => void;
  updateApplication: (app: JobApplication) => void;

  // Referrals
  referrals: Referral[];
  addReferral: (referral: Referral) => void;
  updateReferral: (referral: Referral) => void;
  isClientReferralEnabled: boolean;
  isProviderReferralEnabled: boolean;
  toggleClientReferral: (enabled: boolean) => void;
  toggleProviderReferral: (enabled: boolean) => void;

  isVendorSignupEnabled: boolean;
  toggleVendorSignup: (enabled: boolean) => void;

  // Messaging
  messages: Message[];
  sendMessage: (shiftId: string, senderId: string, content: string, attachments?: Attachment[]) => void;

  subscriptionPayments: SubscriptionPayment[];

  // Platform Config (Fees & Gating)
  platformConfig: PlatformConfig;
  updatePlatformConfig: (newConfig: PlatformConfig) => Promise<void>;
  platformMessages: PlatformMessage[];
  updatePlatformMessages: (messages: PlatformMessage[]) => Promise<void>;

  // Dynamic Service Catalog
  serviceCategories: ServiceCategoryDef[];
  addServiceCategory: (category: ServiceCategoryDef) => Promise<void>;
  updateServiceCategory: (id: string, updates: Partial<ServiceCategoryDef>) => Promise<void>;
  deleteServiceCategory: (id: string) => Promise<void>;

  // Support & Legal
  legalDocuments: LegalDocument[];
  updateLegalDocument: (doc: LegalDocument) => void;
  faqs: FaqItem[];
  addFaq: (faq: FaqItem) => void;
  updateFaq: (faq: FaqItem) => void;
  deleteFaq: (id: string) => void;
  categoryRequests: CategoryRequest[];
  addCategoryRequest: (request: CategoryRequest) => Promise<void>;
  updateCategoryRequest: (requestId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Default Platform Config
const DEFAULT_PLATFORM_CONFIG: PlatformConfig = ALL_SERVICE_CATEGORIES.reduce((acc, cat) => {
    const mapping = CATEGORY_RISK_MAPPING[cat];
    const riskLevel = mapping ? mapping.risk : RISK_LEVELS.LOW;
    const insuranceFee = INSURANCE_FEES[riskLevel] || 3.00; 

    acc[cat] = { 
        platformFeePercent: 15, 
        insuranceRule: { type: 'FLAT', value: insuranceFee },
        requiresInsurance: false 
    };
    return acc;
}, {} as PlatformConfig);

import { generateDefaultCategories } from '../utils/seedCategories';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [publicProfiles, setPublicProfiles] = useState<Partial<User>[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [subscriptionPayments, setSubscriptionPayments] = useState<SubscriptionPayment[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [platformMessages, setPlatformMessages] = useState<PlatformMessage[]>(DEFAULT_PLATFORM_MESSAGES);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryDef[]>(generateDefaultCategories());
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<CategoryRequest[]>([]);

  // Local state for toggles (could be moved to DB config table)
  const [isClientReferralEnabled, setIsMemberReferralEnabled] = useState<boolean>(false);
  const [isProviderReferralEnabled, setIsProviderReferralEnabled] = useState<boolean>(false);
  const [isVendorSignupEnabled, setIsVendorSignupEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);

  // Track Auth State for Subscriptions
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        // If not authenticated, we can stop loading for users if it was waiting
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Real-time Subscriptions
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const subscribe = (
      target: string | any, 
      setter: (data: any[]) => void, 
      mapper: (doc: any) => any, 
      isPublic: boolean = false
    ) => {
      // Only subscribe to private collections if authenticated
      if (!isPublic && !authUser) {
        setter([]);
        return;
      }

      let q;
      let collectionName: string;

      if (typeof target === 'string') {
        collectionName = target;
        q = query(collection(db, collectionName));
      } else {
        // It's a query object
        q = target;
        // We need the collection name for the error logging
        collectionName = q._query?.path?.segments?.[0] || 'unknown';
      }

      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => mapper({ ...doc.data(), id: doc.id }));
        setter(data);
        if (collectionName === 'users') setIsLoading(false);
      }, (error) => {
        // Only log error if we think we should have access
        if (isPublic || authUser) {
          const errInfo = {
            error: error instanceof Error ? error.message : String(error),
            operationType: OperationType.LIST,
            path: collectionName,
            authInfo: {
              userId: auth.currentUser?.uid,
              email: auth.currentUser?.email
            }
          };
          console.warn('Firestore Subscription Warning (Permission likely):', JSON.stringify(errInfo));
          setter([]); // Set to empty if we can't read it
          if (collectionName === 'users') setIsLoading(false);
        }
      });
      unsubscribers.push(unsub);
    };

    // --- Subscriptions ---
    subscribe('public_profiles', setPublicProfiles, (p) => p, true);

    // 1. Users (Private - but we allow reading all for now per rules)
    subscribe('users', setUsers, (u) => ({
      ...u,
      createdAt: toDate(u.createdAt),
      coiExpiry: u.coiExpiry ? toDate(u.coiExpiry) : undefined,
      subscriptionPeriodEnd: u.subscriptionPeriodEnd ? toDate(u.subscriptionPeriodEnd) : undefined
    }));

    // 2. Sites (Private)
    subscribe('sites', setSites, (s) => ({
      ...s,
      createdAt: toDate(s.createdAt)
    }));

    // 3. Shifts (Private - but we allow reading all for marketplace)
    subscribe('shifts', setShifts, (s) => ({
      ...s,
      start: toDate(s.start),
      end: toDate(s.end),
      createdAt: toDate(s.createdAt),
      completedAt: s.completedAt ? toDate(s.completedAt) : undefined,
      checkInTime: s.checkInTime ? toDate(s.checkInTime) : undefined,
      enRouteAt: s.enRouteAt ? toDate(s.enRouteAt) : undefined,
      clientConfirmedAt: s.clientConfirmedAt ? toDate(s.clientConfirmedAt) : undefined,
      counterOffers: (s.counterOffers || []).map((co: any) => ({
        ...co,
        createdAt: toDate(co.createdAt),
        suggestedStart: co.suggestedStart ? toDate(co.suggestedStart) : undefined,
        suggestedEnd: co.suggestedEnd ? toDate(co.suggestedEnd) : undefined
      })),
      quotes: (s.quotes || []).map((q: any) => ({
        ...q,
        createdAt: toDate(q.createdAt),
        suggestedStart: q.suggestedStart ? toDate(q.suggestedStart) : undefined,
        suggestedEnd: q.suggestedEnd ? toDate(q.suggestedEnd) : undefined
      }))
    }));

    // 4. Quotes (Private)
    subscribe('quotes', setQuotes, (q) => ({
      ...q,
      createdAt: toDate(q.createdAt),
      suggestedStart: q.suggestedStart ? toDate(q.suggestedStart) : undefined,
      suggestedEnd: q.suggestedEnd ? toDate(q.suggestedEnd) : undefined
    }));

    // 5. Notifications (Scoped to User)
    if (authUser) {
      const q = query(collection(db, 'notifications'), where('targetUserId', '==', authUser.uid));
      subscribe(q, setNotifications, (n) => ({
        ...n,
        timestamp: toDate(n.timestamp)
      }));
    }

    // 6. Messages (Private)
    subscribe('messages', setMessages, (m) => ({
      ...m,
      timestamp: toDate(m.timestamp)
    }));

    // 6.5 Subscription Payments (Private)
    if (authUser) {
      const q = query(collection(db, 'subscription_payments'), where('userId', '==', authUser.uid));
      subscribe(q, setSubscriptionPayments, (p) => ({
        ...p,
        date: toDate(p.date)
      }));
    }

    // 7. Job Applications (Private - Admins only or scoped)
    subscribe('job_applications', setApplications, (a) => ({
      ...a,
      appliedAt: toDate(a.appliedAt)
    }));

    // 8. Referrals (Private)
    subscribe('referrals', setReferrals, (r) => ({
      ...r,
      createdAt: toDate(r.createdAt)
    }));

    // 9. Public Collections
    subscribe('job_postings', setJobs, (j) => ({
      ...j,
      createdAt: toDate(j.createdAt)
    }), true);

    subscribe('legal_documents', setLegalDocuments, (d) => ({
      ...d,
      lastUpdated: toDate(d.lastUpdated)
    }), true);

    subscribe('faqs', setFaqs, (f) => f, true);

    // 10. Category Requests (Admins see all)
    subscribe('categoryRequests', setCategoryRequests, (r) => ({
      ...r,
      createdAt: toDate(r.createdAt)
    }));

  // 11. Platform Settings (Global)
  const settingsUnsub = onSnapshot(doc(db, 'platform_settings', 'globals'), async (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.serviceCategories) {
        let needsUpdate = false;
        const updatedCats = data.serviceCategories.map(cat => {
          if (cat.id === 'MOVING' && cat.name === 'Moving & Packing') {
            needsUpdate = true;
            return {
              ...cat,
              name: 'Moving (With Travel)',
              description: 'Vehicle relocations, loading/unloading with transport, and A-to-B moves. If you just need heavy lifting or moving items within the same location, please select General Labor.'
            };
          }
          if (cat.id === 'GENERAL_LABOR' && cat.name === 'General Labor') {
            needsUpdate = true;
            return {
              ...cat,
              name: 'General Labor & Lifting',
              description: 'On-site heavy lifting, furniture rearranging, loading/unloading, and event setup. Perfect for physical tasks and moving items that do not require traveling to a second location.'
            };
          }
          return cat;
        });

        if (needsUpdate) {
          try {
            await setDoc(doc(db, 'platform_settings', 'globals'), { serviceCategories: updatedCats }, { merge: true });
          } catch (e) {
            console.error('Failed to update categories', e);
          }
          setServiceCategories(updatedCats);
        } else {
          setServiceCategories(data.serviceCategories);
        }
      }
      if (data.platformConfig) setPlatformConfig(data.platformConfig);
      if (data.platformMessages) setPlatformMessages(data.platformMessages);
    } else {
      // Only if log in specifically requests default init. But we don't need to do it here over-aggressively.
    }
  });
    unsubscribers.push(settingsUnsub);

    return () => unsubscribers.forEach(unsub => unsub());
  }, [authUser]);

  // --- Silent Release Logic ---
  const processingShiftsRef = React.useRef<Set<string>>(new Set());
  const shiftsRef = React.useRef(shifts);
  const usersRef = React.useRef(users);
  const platformConfigRef = React.useRef(platformConfig);

  useEffect(() => {
    shiftsRef.current = shifts;
    usersRef.current = users;
    platformConfigRef.current = platformConfig;
  }, [shifts, users, platformConfig]);

  useEffect(() => {
    if (!authUser) return;
    
    const checkSilentRelease = async () => {
      const now = new Date();
      const shiftsToRelease = shiftsRef.current.filter(s => 
        s.status === 'COMPLETED' && 
        s.escrowStatus === 'SECURED' && 
        !s.isPaid && 
        !s.isDisputed && 
        s.completedAt && 
        differenceInHours(now, s.completedAt) >= ESCROW_WINDOW_HOURS
      );

      for (const shift of shiftsToRelease) {
        if (processingShiftsRef.current.has(shift.id)) continue;
        
        processingShiftsRef.current.add(shift.id);
        try {
          const provider = usersRef.current.find(u => u.id === shift.userId);
          const hasOwnInsurance = provider?.insuranceType === 'OWN_COI' && provider?.isCoiVerified;
          const isEmergency = shift.type === 'URGENT';
          
          const rule = platformConfigRef.current?.[shift.category];
          const breakdown = calculateJobSplit(shift.price || 0, shift.category, hasOwnInsurance, isEmergency, rule?.platformFeePercent ? rule.platformFeePercent / 100 : 0.15, rule?.insuranceRule?.value || null);
          
          const payoutAmountCents = Math.round(breakdown.providerNet * 100);
          
          console.log(`[Silent Release] Releasing $${breakdown.providerNet} (${payoutAmountCents} cents) to ${provider?.name} for shift ${shift.id}`);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await updateShift({
            ...shift,
            isPaid: true,
            escrowStatus: 'RELEASED'
          });
          
        } catch (error) {
          console.error(`Failed to silent release shift ${shift.id}:`, error);
        } finally {
          processingShiftsRef.current.delete(shift.id);
        }
      }
    };

    const interval = setInterval(checkSilentRelease, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [authUser]);

  // --- Actions ---

  const addUser = async (user: User) => {
    try {
      await setDoc(doc(db, 'users', user.id), stripUndefined({
        ...user,
        createdAt: fromDate(user.createdAt),
        coiExpiry: user.coiExpiry ? fromDate(user.coiExpiry) : null,
        subscriptionPeriodEnd: user.subscriptionPeriodEnd ? fromDate(user.subscriptionPeriodEnd) : null
      }), { merge: true });

      if (user.role === 'PROVIDER') {
        await setDoc(doc(db, 'public_profiles', user.id), stripUndefined({
          id: user.id,
          name: user.name,
          role: user.role,
          skills: user.skills || [],
          isActive: user.isActive,
          rating: user.rating,
          badges: user.badges || [],
          profileImage: user.profileImage,
          companyName: user.companyName
        }), { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
    }
  };

  const updateUser = async (updatedUser: User) => {
    console.log("[DataContext] updateUser called for:", updatedUser.id, "Fields:", Object.keys(updatedUser));
    try {
      const userRef = doc(db, 'users', updatedUser.id);
      const firestoreUpdates = { ...updatedUser } as any;
      if (updatedUser.createdAt) firestoreUpdates.createdAt = fromDate(updatedUser.createdAt);
      if (updatedUser.coiExpiry) firestoreUpdates.coiExpiry = fromDate(updatedUser.coiExpiry);
      if (updatedUser.subscriptionPeriodEnd) firestoreUpdates.subscriptionPeriodEnd = fromDate(updatedUser.subscriptionPeriodEnd);
      
      await updateDoc(userRef, stripUndefined(firestoreUpdates));

      if (updatedUser.role === 'PROVIDER') {
        await setDoc(doc(db, 'public_profiles', updatedUser.id), stripUndefined({
          id: updatedUser.id,
          name: updatedUser.name,
          role: updatedUser.role,
          skills: updatedUser.skills || [],
          isActive: updatedUser.isActive,
          rating: updatedUser.rating,
          badges: updatedUser.badges || [],
          profileImage: updatedUser.profileImage,
          companyName: updatedUser.companyName
        }), { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${updatedUser.id}`);
    }
  };

  const deleteUser = async (id: string) => {
    console.log("deleteUser called for id:", id);
    try {
      await deleteDoc(doc(db, 'users', id));
      console.log("Successfully deleted user document for id:", id);
    } catch (error) {
      console.error("deleteUser failed:", error);
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const addSite = async (site: Site) => {
    try {
      await setDoc(doc(db, 'sites', site.id), stripUndefined(site));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sites/${site.id}`);
    }
  };

  const updateSite = async (site: Site) => {
    try {
      await updateDoc(doc(db, 'sites', site.id), stripUndefined(site as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sites/${site.id}`);
    }
  };

  const deleteSite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sites', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sites/${id}`);
    }
  };

  const addShift = async (shift: Shift) => {
    try {
      const firestoreShift = {
        ...shift,
        start: fromDate(shift.start),
        end: fromDate(shift.end),
        createdAt: fromDate(shift.createdAt),
        completedAt: shift.completedAt ? fromDate(shift.completedAt) : null,
        checkInTime: shift.checkInTime ? fromDate(shift.checkInTime) : null,
        enRouteAt: shift.enRouteAt ? fromDate(shift.enRouteAt) : null,
        clientConfirmedAt: shift.clientConfirmedAt ? fromDate(shift.clientConfirmedAt) : null,
        counterOffers: (shift.counterOffers || []).map((co: any) => ({
          ...co,
          createdAt: fromDate(co.createdAt),
          suggestedStart: co.suggestedStart ? fromDate(co.suggestedStart) : null,
          suggestedEnd: co.suggestedEnd ? fromDate(co.suggestedEnd) : null
        }))
      };
      await setDoc(doc(db, 'shifts', shift.id), stripUndefined(firestoreShift));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `shifts/${shift.id}`);
    }
  };

  const updateShift = async (shift: Shift) => {
    try {
      const { id, ...rest } = shift;
      const firestoreShift = {
        ...rest,
        start: fromDate(shift.start),
        end: fromDate(shift.end),
        createdAt: fromDate(shift.createdAt),
        completedAt: shift.completedAt ? fromDate(shift.completedAt) : null,
        checkInTime: shift.checkInTime ? fromDate(shift.checkInTime) : null,
        enRouteAt: shift.enRouteAt ? fromDate(shift.enRouteAt) : null,
        clientConfirmedAt: shift.clientConfirmedAt ? fromDate(shift.clientConfirmedAt) : null,
        counterOffers: (shift.counterOffers || []).map((co: any) => ({
          ...co,
          createdAt: fromDate(co.createdAt),
          suggestedStart: co.suggestedStart ? fromDate(co.suggestedStart) : null,
          suggestedEnd: co.suggestedEnd ? fromDate(co.suggestedEnd) : null
        }))
      } as any;
      
      await updateDoc(doc(db, 'shifts', id), stripUndefined(firestoreShift));
      handleShiftNotifications(shift);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shifts/${shift.id}`);
      return { error };
    }
  };

  const deleteShift = async (id: string) => {
      console.log("deleteShift called for id:", id);
      try {
          await deleteDoc(doc(db, 'shifts', id));
          console.log("deleteShift: deleteDoc completed successfully");
      } catch (error) {
          console.error("deleteShift: deleteDoc threw an error", error);
          handleFirestoreError(error, OperationType.DELETE, `shifts/${id}`);
      }
  };

  const addQuote = async (quote: Quote) => {
    try {
      const firestoreQuote = {
        ...quote,
        createdAt: fromDate(quote.createdAt),
        suggestedStart: quote.suggestedStart ? fromDate(quote.suggestedStart) : null,
        suggestedEnd: quote.suggestedEnd ? fromDate(quote.suggestedEnd) : null
      };
      await setDoc(doc(db, 'quotes', quote.id), stripUndefined(firestoreQuote));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `quotes/${quote.id}`);
    }
  };

  const updateQuote = async (quote: Quote) => {
    try {
      const { id, ...rest } = quote;
      const firestoreQuote = {
        ...rest,
        createdAt: fromDate(quote.createdAt),
        suggestedStart: quote.suggestedStart ? fromDate(quote.suggestedStart) : null,
        suggestedEnd: quote.suggestedEnd ? fromDate(quote.suggestedEnd) : null
      } as any;
      await updateDoc(doc(db, 'quotes', id), stripUndefined(firestoreQuote));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quotes/${quote.id}`);
    }
  };

  const handleShiftNotifications = (shift: Shift) => {
      const oldShift = shiftsRef.current.find(s => s.id === shift.id);
      if (!oldShift) return;
      
      const client = usersRef.current.find(u => u.id === shift.clientId);
      const provider = usersRef.current.find(u => u.id === shift.userId);
      const timestamp = new Date();

      // 1. En Route
      if (oldShift.status !== 'EN_ROUTE' && shift.status === 'EN_ROUTE' && client && provider) {
          addNotification({
              id: `notif_${Date.now()}_enroute`,
              targetUserId: client.id,
              type: 'INFO',
              message: `${provider.name} is on the way.`,
              timestamp,
              read: false
          });
      }
      // 2. Completed
      if (oldShift.status !== 'COMPLETED' && shift.status === 'COMPLETED' && client) {
          addNotification({
              id: `notif_${Date.now()}_complete`,
              targetUserId: client.id,
              type: 'SUCCESS',
              message: `Job Completed: ${shift.description}. Please verify.`,
              timestamp,
              read: false
          });
      }
      // 3. Paid
      if (oldShift.escrowStatus !== 'RELEASED' && shift.escrowStatus === 'RELEASED' && provider) {
          addNotification({
              id: `notif_${Date.now()}_paid`,
              targetUserId: provider.id,
              type: 'SUCCESS',
              message: `Payment Released: $${shift.price} for ${shift.description}.`,
              timestamp,
              read: false
          });
      }
  };

  const addNotification = async (note: Notification) => {
    try {
      await setDoc(doc(db, 'notifications', note.id), stripUndefined({
        ...note,
        timestamp: fromDate(note.timestamp)
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notifications/${note.id}`);
    }
  };

  const markNotificationsRead = async (userId: string) => {
    try {
      const q = query(collection(db, 'notifications'), where('targetUserId', '==', userId), where('read', '==', false));
      const snapshot = await getDocs(q);
      const batch: Promise<void>[] = [];
      snapshot.forEach(d => {
        batch.push(updateDoc(doc(db, 'notifications', d.id), { read: true }));
      });
      await Promise.all(batch);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const broadcastNotification = async (userIds: string[], message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT') => {
    try {
      const batch: Promise<void>[] = [];
      userIds.forEach(uid => {
        const id = `notif_${Date.now()}_${uid}`;
        batch.push(setDoc(doc(db, 'notifications', id), {
          id,
          targetUserId: uid,
          type,
          message,
          timestamp: fromDate(new Date()),
          read: false
        }));
      });
      await Promise.all(batch);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  };

  const addJob = async (job: JobPosting) => {
    try {
      await setDoc(doc(db, 'job_postings', job.id), {
        ...job,
        createdAt: fromDate(job.createdAt)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `job_postings/${job.id}`);
    }
  };

  const updateJob = async (job: JobPosting) => {
    try {
      const { id, ...rest } = job;
      await updateDoc(doc(db, 'job_postings', id), {
        ...rest,
        createdAt: fromDate(job.createdAt)
      } as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `job_postings/${job.id}`);
    }
  };

  const deleteJob = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'job_postings', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `job_postings/${id}`);
    }
  };

  const submitApplication = async (app: JobApplication) => {
    try {
      await setDoc(doc(db, 'job_applications', app.id), {
        ...app,
        appliedAt: fromDate(app.appliedAt)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `job_applications/${app.id}`);
    }
  };

  const updateApplication = async (app: JobApplication) => {
    try {
      const { id, ...rest } = app;
      await updateDoc(doc(db, 'job_applications', id), {
        ...rest,
        appliedAt: fromDate(app.appliedAt)
      } as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `job_applications/${app.id}`);
    }
  };

  const addReferral = async (referral: Referral) => {
    try {
      await setDoc(doc(db, 'referrals', referral.id), referral);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `referrals/${referral.id}`);
    }
  };

  const updateReferral = async (referral: Referral) => {
    try {
      const { id, ...rest } = referral;
      await updateDoc(doc(db, 'referrals', id), rest as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `referrals/${referral.id}`);
    }
  };

  const sendMessage = async (shiftId: string, senderId: string, content: string, attachments?: Attachment[]) => {
    try {
      const newMessage: Message = {
        id: crypto.randomUUID?.() || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        shiftId,
        senderId,
        content,
        timestamp: new Date(),
        read: false,
        attachments: attachments || []
      };

      await setDoc(doc(db, 'messages', newMessage.id), {
        ...newMessage,
        timestamp: fromDate(newMessage.timestamp)
      });

      // Find the gig/shift to know who to notify
      const shiftOrig = shifts.find(s => s.id === shiftId);
      if (shiftOrig) {
        const targetUserId = senderId === shiftOrig.clientId ? shiftOrig.userId : shiftOrig.clientId;
        if (targetUserId) {
          const senderName = users.find(u => u.id === senderId)?.name || 'Someone';
          addNotification({
            id: `notif_${Date.now()}`,
            targetUserId: targetUserId,
            type: 'INFO',
            message: `New Message from ${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            timestamp: new Date(),
            read: false,
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
  };

  const updatePlatformConfig = async (newConfig: PlatformConfig) => {
      setPlatformConfig(newConfig);
      try {
        await setDoc(doc(db, 'platform_settings', 'globals'), { platformConfig: newConfig }, { merge: true });
      } catch (error) {
        console.error("Failed to save platform config", error);
      }
  };

  const updatePlatformMessages = async (messages: PlatformMessage[]) => {
      setPlatformMessages(messages);
      try {
        await setDoc(doc(db, 'platform_settings', 'globals'), { platformMessages: messages }, { merge: true });
      } catch (error) {
        console.error("Failed to save platform messages", error);
      }
  };

  const addServiceCategory = async (category: ServiceCategoryDef) => {
      const newCategories = [...serviceCategories, category];
      const newConfig: PlatformConfig = {
          ...platformConfig,
          [category.id]: {
              platformFeePercent: 15,
              insuranceRule: { type: 'FLAT', value: category.riskLevel === 'HIGH' ? 12 : category.riskLevel === 'MEDIUM' ? 5 : 3 },
              requiresInsurance: category.riskLevel === 'HIGH'
          }
      };
      
      setServiceCategories(newCategories);
      setPlatformConfig(newConfig);

      try {
        await setDoc(doc(db, 'platform_settings', 'globals'), stripUndefined({ 
          serviceCategories: newCategories,
          platformConfig: newConfig
        }), { merge: true });
      } catch (error) {
        console.error("Failed to add service category", error);
      }
  };

  const updateServiceCategory = async (id: string, updates: Partial<ServiceCategoryDef>) => {
      const newCategories = serviceCategories.map(c => c.id === id ? { ...c, ...updates } : c);
      setServiceCategories(newCategories);
      
      let newConfig = platformConfig;
      if (updates.riskLevel) {
          newConfig = {
              ...platformConfig,
              [id]: {
                  ...platformConfig[id],
                  insuranceRule: { type: 'FLAT', value: updates.riskLevel === 'HIGH' ? 12 : updates.riskLevel === 'MEDIUM' ? 5 : 3 },
                  requiresInsurance: updates.riskLevel === 'HIGH'
              }
          } as PlatformConfig;
          setPlatformConfig(newConfig);
      }

      try {
        await setDoc(doc(db, 'platform_settings', 'globals'), stripUndefined({ 
          serviceCategories: newCategories,
          platformConfig: newConfig
        }), { merge: true });
      } catch (error) {
        console.error("Failed to update service category", error);
      }
  };

  const deleteServiceCategory = async (id: string) => {
      const newCategories = serviceCategories.filter(c => c.id !== id);
      setServiceCategories(newCategories);
      
      try {
        await setDoc(doc(db, 'platform_settings', 'globals'), { serviceCategories: newCategories }, { merge: true });
      } catch (error) {
        console.error("Failed to delete service category", error);
      }
  };

  const updateLegalDocument = async (docData: LegalDocument) => {
    try {
      const { id, ...rest } = docData;
      await updateDoc(doc(db, 'legal_documents', id), {
        ...rest,
        lastUpdated: fromDate(docData.lastUpdated)
      } as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `legal_documents/${docData.id}`);
    }
  };

  const addFaq = async (faq: FaqItem) => {
    try {
      await setDoc(doc(db, 'faqs', faq.id), faq);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `faqs/${faq.id}`);
    }
  };

  const addCategoryRequest = async (request: CategoryRequest) => {
    try {
      await setDoc(doc(db, 'categoryRequests', request.id), stripUndefined({
        ...request,
        createdAt: fromDate(request.createdAt)
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `categoryRequests/${request.id}`);
    }
  };

  const updateCategoryRequest = async (requestId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    try {
      await updateDoc(doc(db, 'categoryRequests', requestId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categoryRequests/${requestId}`);
    }
  };

  const updateFaq = async (faq: FaqItem) => {
    try {
      const { id, ...rest } = faq;
      await updateDoc(doc(db, 'faqs', id), rest as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `faqs/${faq.id}`);
    }
  };

  const deleteFaq = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'faqs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `faqs/${id}`);
    }
  };

  const toggleClientReferral = (enabled: boolean) => setIsMemberReferralEnabled(enabled);
  const toggleProviderReferral = (enabled: boolean) => setIsProviderReferralEnabled(enabled);
  const toggleVendorSignup = (enabled: boolean) => setIsVendorSignupEnabled(enabled);

  // --- Complex Actions (Claim/Verify) ---
  
  const claimGig = async (gigId: string, providerId: string, options: { insuranceOptIn: boolean, estimatedInsuranceFee: number, platformFeePercent: number }) => {
      const provider = users.find(u => u.id === providerId);
      if (!provider) throw new Error("Provider not found");

      // Optimistic Update
      const job = shifts.find(s => s.id === gigId);
      if (!job) throw new Error("Job not found");

      const updatedShift: Shift = {
          ...job,
          userId: providerId,
          status: ShiftStatus.ACCEPTED,
          insuranceOptIn: options.insuranceOptIn,
          appliedInsuranceFee: options.estimatedInsuranceFee,
          appliedPlatformFee: options.platformFeePercent,
          escrowStatus: 'PENDING', // Now requires explicit funding step
          stripePaymentIntentId: `pi_mock_${Date.now()}`
      };

      await updateShift(updatedShift);
      
      // Notify Client
      const client = users.find(u => u.id === job.clientId);
      if (client) {
          addNotification({
              id: `notif_${Date.now()}`,
              targetUserId: client.id,
              type: 'SUCCESS',
              message: `${provider.name} claimed your job! Please fund the job to secure the pro and start the work.`,
              timestamp: new Date(),
              read: false
          });
      }
  };

  const fundGig = async (gigId: string) => {
      const job = shifts.find(s => s.id === gigId);
      if (!job) throw new Error("Job not found");

      const updatedShift: Shift = {
          ...job,
          escrowStatus: 'SECURED',
      };

      await updateShift(updatedShift);
      
      const provider = users.find(u => u.id === job.userId);
      if (provider) {
          addNotification({
              id: `funded_${Date.now()}`,
              targetUserId: provider.id,
              type: 'SUCCESS',
              message: `Gig Funded! The client has secured the funds for "${job.description}". You are clear to start!`,
              timestamp: new Date(),
              read: false
          });
      }
  };

  const verifyJob = async (jobId: string, review: { rating: number, feedback: string }) => {
      const job = shifts.find(s => s.id === jobId);
      if (!job) throw new Error("Job not found");

      const updatedShift: Shift = {
          ...job,
          status: ShiftStatus.VERIFIED,
          clientRating: review.rating,
          clientFeedback: review.feedback,
          clientConfirmedAt: new Date(),
          escrowStatus: 'RELEASED',
          isPaid: true,
          payoutTimestamp: new Date().toISOString()
      };

      await updateShift(updatedShift);

      if (job.userId) {
          addNotification({
              id: `verify_${Date.now()}`,
              targetUserId: job.userId,
              type: 'SUCCESS',
              message: `Job Verified! Funds released. Rating: ${review.rating} Stars.`,
              timestamp: new Date(),
              read: false
          });
      }
  };

  // Seed Data
  const seedMarketData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      if (!snapshot.empty) {
        alert("Database already has data. Skipping seed.");
        return;
      }

      console.log("Seeding Database...");
      
      const seedCollection = async (name: string, data: any[], mapper: (item: any) => any) => {
        const batch: Promise<void>[] = [];
        data.forEach(item => {
          batch.push(setDoc(doc(db, name, item.id), mapper(item)));
        });
        await Promise.all(batch);
      };

      await seedCollection('users', MOCK_USERS, (u) => ({ ...u, createdAt: fromDate(u.createdAt), coiExpiry: u.coiExpiry ? fromDate(u.coiExpiry) : null }));
      await seedCollection('sites', MOCK_SITES, (s) => s);
      await seedCollection('shifts', MOCK_SHIFTS, (s) => ({
        ...s,
        start: fromDate(s.start),
        end: fromDate(s.end),
        createdAt: fromDate(s.createdAt),
        completedAt: s.completedAt ? fromDate(s.completedAt) : null,
        checkInTime: s.checkInTime ? fromDate(s.checkInTime) : null,
        enRouteAt: s.enRouteAt ? fromDate(s.enRouteAt) : null,
        clientConfirmedAt: s.clientConfirmedAt ? fromDate(s.clientConfirmedAt) : null
      }));
      await seedCollection('job_postings', MOCK_JOBS, (j) => ({ ...j, createdAt: fromDate(j.createdAt) }));

      alert("Database seeded successfully!");
    } catch (error) {
      console.error("Error seeding data:", error);
      alert("Error seeding data: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const seedPricingData = async () => {
    try {
      console.log("Seeding Pricing Data...");
      
      const newShifts: Shift[] = [];
      
      // Generate 5-10 completed jobs per category to populate averages
      serviceCategories.forEach(catObj => {
          const cat = catObj.id;
          const count = Math.floor(Math.random() * 5) + 5; // 5 to 10 jobs
          
          for (let i = 0; i < count; i++) {
              // Base price ranges per category (rough estimates)
              let basePrice = 100;
              if (cat === 'PLUMBING' || cat === 'CONSTRUCTION') basePrice = 300;
              if (cat === 'LANDSCAPING' || cat === 'CLEANING') basePrice = 150;
              if (cat === 'WEB_APP_DEV') basePrice = 1000;
              
              const variance = Math.floor(Math.random() * (basePrice * 0.4)) - (basePrice * 0.2); // +/- 20%
              const price = basePrice + variance;
              
              const shift: Shift = {
                  id: `seed_price_${cat}_${Date.now()}_${i}`,
                  userId: `provider_${Math.floor(Math.random() * 5)}`, // Random provider
                  clientId: `client_${Math.floor(Math.random() * 5)}`, // Random client
                  siteId: sites[0]?.id || 'site_1',
                  start: subDays(new Date(), Math.floor(Math.random() * 30)), // Past 30 days
                  end: subDays(new Date(), Math.floor(Math.random() * 30)),
                  description: `Historical ${cat.toLowerCase().replace('_', ' ')} job`,
                  category: cat,
                  status: ShiftStatus.COMPLETED,
                  selectionMethod: 'QUICK_BID',
                  isRecurring: false,
                  price: price,
                  isPaid: true,
                  escrowStatus: 'RELEASED',
                  completedAt: subDays(new Date(), Math.floor(Math.random() * 30))
              };
              newShifts.push(shift);
          }
      });

      const batch: Promise<void>[] = [];
      newShifts.forEach(s => {
        batch.push(setDoc(doc(db, 'shifts', s.id), {
          ...s,
          start: fromDate(s.start),
          end: fromDate(s.end),
          createdAt: fromDate(new Date()),
          completedAt: s.completedAt ? fromDate(s.completedAt) : null
        }));
      });
      await Promise.all(batch);
      
      alert(`Successfully seeded ${newShifts.length} historical pricing records.`);
    } catch (error) {
      console.error("Error seeding pricing data:", error);
      alert("Failed to seed pricing data.");
    }
  };

  const importHistoricalData = async (newShifts: Shift[]) => {
    try {
      const batch: Promise<void>[] = [];
      newShifts.forEach(s => {
        batch.push(setDoc(doc(db, 'shifts', s.id), {
          ...s,
          start: fromDate(s.start),
          end: fromDate(s.end),
          createdAt: fromDate(new Date()),
          completedAt: s.completedAt ? fromDate(s.completedAt) : null
        }));
      });
      await Promise.all(batch);
    } catch (error) {
      console.error("Error importing historical data:", error);
      throw error;
    }
  };

  // --- Derived State ---
  
  const enrichedShifts = useMemo(() => {
      // Create a map of quotes by jobId for O(1) lookup
      const quotesByJobId: Record<string, Quote[]> = {};
      quotes.forEach(q => {
          if (!quotesByJobId[q.jobId]) quotesByJobId[q.jobId] = [];
          quotesByJobId[q.jobId].push(q);
      });

      return shifts.map(shift => ({
          ...shift,
          quotes: quotesByJobId[shift.id] || []
      }));
  }, [shifts, quotes]);

  return (
    <DataContext.Provider value={{ 
      users, publicProfiles, addUser, updateUser, deleteUser,
      sites, addSite, updateSite, deleteSite,
      shifts: enrichedShifts, addShift, updateShift, deleteShift, claimGig, fundGig, verifyJob, seedMarketData, seedPricingData, importHistoricalData,
      quotes, addQuote, updateQuote,
      notifications, addNotification, markNotificationsRead, deleteNotification, broadcastNotification,
      jobs, addJob, updateJob, deleteJob, applications, submitApplication, updateApplication,
      referrals, addReferral, updateReferral,
      isClientReferralEnabled, isProviderReferralEnabled, toggleClientReferral, toggleProviderReferral,
      isVendorSignupEnabled, toggleVendorSignup,
      messages, sendMessage,
      subscriptionPayments,
      platformConfig, updatePlatformConfig, platformMessages, updatePlatformMessages,
      serviceCategories, addServiceCategory, updateServiceCategory, deleteServiceCategory,
      legalDocuments, updateLegalDocument, faqs, addFaq, updateFaq, deleteFaq, 
      categoryRequests, addCategoryRequest, updateCategoryRequest,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
