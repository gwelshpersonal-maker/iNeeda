
export enum Role {
  CLIENT = 'CLIENT',     // The Customer (Homeowner)
  PROVIDER = 'PROVIDER', // The "Pro" (Worker)
  ADMIN = 'ADMIN',       // Platform Admin
  EMPLOYEE = 'EMPLOYEE', // Legacy
  MANAGER = 'MANAGER',   // Legacy
  VENDOR = 'VENDOR'      // Legacy
}

export enum StaffType {
  W2 = 'W2',
  MARKETPLACE_VENDOR = 'MARKETPLACE_VENDOR'
}

export enum ShiftStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE = 'EN_ROUTE', // New: Provider is traveling
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED', // Provider marked as done
  VERIFIED = 'VERIFIED',   // Client confirmed & rated
  OPEN_REQUEST = 'OPEN_REQUEST',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

export type ShiftType = 'SCHEDULED' | 'URGENT';
export type EscrowStatus = 'PENDING' | 'SECURED' | 'DISPUTED' | 'RELEASED' | 'REFUNDED' | 'PARTIAL_REFUND' | 'FROZEN';
export type SelectionMethod = 'QUICK_BID' | 'BIDDING';
export type RateCategory = 'RECURRING' | 'STANDARD' | 'SPECIALIZED';

export type ServiceCategory = string;

export interface ServiceCategoryDef {
  id: string;
  name: string;
  description: string;
  iconName: string;
  colorClass: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  minimumFee: number;
  isActive: boolean; // Accessible to providers?
  isPublic: boolean; // Shown on public list
}

export interface Organization {
  id: string;
  name: string;
}

export interface Site {
  id: string;
  orgId: string;
  ownerId?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

// New Financial & Gating Configuration
export type InsuranceFeeType = 'FLAT' | 'PERCENTAGE';

export interface InsuranceRule {
  type: InsuranceFeeType;
  value: number; // e.g., 2.00 for FLAT, 5 for PERCENTAGE
}

export interface CategoryRule {
    rateCategory?: RateCategory; // Category determining platform fee (RECURRING, STANDARD, SPECIALIZED)
    platformFeePercent?: number; // legacy, keeping for backward compatibility
    insuranceRule: InsuranceRule;
    requiresInsurance: boolean; // Gating: If true, unverified pros cannot see these
}

export interface PlatformMessage {
  text: string;
  author?: string;
  type: 'review' | 'brand';
}

export type PlatformConfig = Record<ServiceCategory, CategoryRule>;

export type BadgeType = 
  | 'IDENTITY_VERIFIED' 
  | 'BACKGROUND_CHECKED' 
  | '717_LOCAL'
  | 'INSURED_PRO'
  | 'LICENSED_SPECIALIST'
  | 'CLEAN_SLATE'
  | 'FAST_RESPONDER'
  | 'REPEAT_PRO'
  | 'TOP_RATED'
  | 'CHILD_SAFETY_CLEARED'
  | 'PET_FRIENDLY'
  | 'AI_PREFERRED';

export interface SubscriptionPayment {
  id: string;
  userId: string;
  amount: number;
  status: string;
  description: string;
  stripeSessionId?: string;
  date: Date;
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  staffType?: StaffType;
  hourlyRate: number; // Base rate
  categoryRates?: Partial<Record<ServiceCategory, number>>; // Category specific hourly rates
  isActive: boolean;
  phone: string;
  badges?: BadgeType[];
  billingPreference?: 'CREDIT_CARD' | 'WEEKLY_INVOICE';
  
  // Custom Payouts
  payoutMethod?: 'STRIPE' | 'ZELLE';
  zelleInfo?: {
    emailOrPhone: string;
  };

  // Verification
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';

  // Provider specific fields
  companyName?: string;
  businessDescription?: string;
  profileImage?: string; // URL/Base64 of the uploaded profile image or logo
  portfolioImages?: string[]; // Array of image URLs/Base64 for the provider's portfolio
  skills?: ServiceCategory[]; 
  pendingSkills?: ServiceCategory[]; // Skills requested but not yet approved by Admin
  rating?: number;
  jobsCompleted?: number;
  vendorType?: string;
  
  // Marketing & Social
  socialLinks?: {
    youtube?: string;
    tiktok?: string;
    threads?: string;
    instagram?: string;
  };

  // Financials
  stripeAccountId?: string; // Connected account ID for payouts (Provider)
  hasPaymentMethod?: boolean; // Does user have a card on file? (Client)
  isBackgroundCheckPaid?: boolean;
  
  // Crew List (Preferred Providers)
  crewList?: string[];
  
  // Preferences
  urgentAlertsEnabled?: boolean;

  // Location
  address?: string;
  latitude?: number;
  longitude?: number;

  // Insurance
  insuranceType?: 'OWN_COI' | 'DAILY_SHIELD';
  coiUrl?: string; // URL/Base64 of the uploaded certificate
  isCoiVerified?: boolean; // Admin verification status
  coiExpiry?: Date; // Expiration date of the uploaded COI

  // Membership / Subscription
  subscriptionStatus?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'none' | 'trialing';
  subscriptionId?: string;
  subscriptionPeriodEnd?: Date;
  stripeCustomerId?: string;
  isFoundersClub?: boolean; // Founders Club members do not pay subscription fees

  // AI Marketing Tier Subscription
  aiMarketingStatus?: 'active' | 'inactive' | 'none';
  aiMarketingId?: string;
  aiMarketingPeriodEnd?: Date;

  createdAt?: Date; // When the user account was created
  noShowCount?: number;
  noShowGigs?: string[];
}

export interface PayFeedback {
  upvotes: string[];   // Users who think price is good/fair
  downvotes: string[]; // Users who think price is too low
}

export interface CounterOffer {
  id: string;
  providerId: string;
  amount: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  suggestedStart?: Date;
  suggestedEnd?: Date;
}

export interface Quote {
  id: string;
  jobId: string;
  providerId: string;
  amount: number;
  platformFee: number;
  insuranceFee: number;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  createdAt: Date;
  suggestedStart?: Date;
  suggestedEnd?: Date;
}

export interface Shift {
  id: string;
  userId: string | null; // Null if open request
  clientId?: string;     // The user who requested it
  siteId: string;
  start: Date;
  end: Date;
  description: string;
  category: ServiceCategory; 
  status: ShiftStatus;
  selectionMethod?: SelectionMethod;
  isRecurring: boolean;
  recurringFrequency?: 'TWICE_A_WEEK' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  type?: ShiftType;
  price?: number;        // Flat rate price for the job
  rateCategory?: RateCategory; // Category determining platform fee
  platformFee?: number;   // PLATFORM COMMISSION
  insuranceFee?: number;  // PROTECTION FEE
  
  // Targeted Posting
  isPublic?: boolean;    // If false, only targetedProviders can see/claim
  targetedProviders?: string[]; // Array of provider user IDs this was sent to
  groupId?: string;      // Used to group identical job postings (e.g. 1 job with 3 openings)

  // Financial State
  isPaid?: boolean;      // Has the platform/client paid the provider?
  escrowStatus?: EscrowStatus; // Status of funds held by platform
  isDisputed?: boolean;  // If true, payout is frozen pending admin review
  disputeReason?: string; // Reason for the dispute/freeze
  refundAmount?: number;  // Amount returned to client (Partial Refund logic)
  resolutionNotes?: string; // Admin notes on how dispute was resolved
  
  // Stripe Integration
  stripePaymentIntentId?: string; // ID of the hold on client's card
  payoutTimestamp?: string; // ISO string of when payout was released
  
  // Manual Payout Integration
  payoutReconciled?: boolean;
  payoutReconciledAt?: string;
  payoutReference?: string;
  
  // Job Evidence
  beforePhotos?: string[]; // Photos uploaded before starting
  afterPhotos?: string[]; // Photos uploaded after completion
  
  createdAt?: Date;      // When the request was posted
  isBoosted?: boolean;   // If the price has been bumped by the client
  payFeedback?: PayFeedback; // Vendor feedback on price
  counterOffers?: CounterOffer[]; // Negotiation history
  quotes?: Quote[]; // Bids for RFQ jobs
  
  // Specific fields for Moving
  truckNeeded?: boolean;
  distance?: string;
  
  // High Value / Insurance Logic
  hasHighValueItems?: boolean; // Client declares > $1000 items
  preWorkPhotos?: string[];    // Provider uploads proof of condition BEFORE work
  insuranceOptIn?: boolean;    // Provider opts-in for daily insurance
  
  // Historical Snapshots (Locked at time of claim)
  appliedInsuranceFee?: number; 
  appliedPlatformFee?: number; 
  
  photos?: string[];     // URLs or Base64 strings of attached job photos (Initial request)
  completionPhotos?: string[]; // URLs or Base64 strings of proof of work (Completion)
  
  // Verification Location
  completionLat?: number;
  completionLng?: number;
  checkInLat?: number;
  checkInLng?: number;

  // Job Completion Fields
  providerFeedback?: string; // Notes from the worker
  completedAt?: Date;
  checkInTime?: Date;
  
  // Provider Tracking
  enRouteAt?: Date; // When provider clicked "Start Travel"
  
  // Client Verification Fields
  clientRating?: number; // 1-5 Stars
  clientFeedback?: string;
  clientConfirmedAt?: Date;
  
  // Photos
  arrivalPhotos?: string[]; // URLs or Base64 strings of arrival photos (Check-in)

  // Geofencing and Automations
  geofenceOverridePending?: boolean;
  geofenceOverridePhoto?: string;
  geofenceOverrideReason?: string;
  geofenceOverrideApproved?: boolean;
  noShowNotificationSent?: boolean;
  noShowRecorded?: boolean;
  isFrozen?: boolean;
  reviewWindowExpiresAt?: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // mime type
  url: string; // base64 or URL
  size: number;
}

export interface Message {
  id: string;
  shiftId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  attachments?: Attachment[];
}

// Deprecated but kept for type safety in legacy components if any

export interface JobPosting {
  id: string;
  orgId: string;
  title: string;
  description: string;
  payRange: string;
  isPublic: boolean;
  department: 'INTERNAL' | 'EXTERNAL';
  status: 'OPEN' | 'CLOSED';
  createdAt: Date;
}

export interface JobApplication {
  id: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  experience: string;
  status: 'NEW' | 'REVIEWING' | 'INTERVIEWING' | 'OFFER_SENT' | 'HIRED' | 'REJECTED';
  appliedAt: Date;
  message?: string;
  resume?: string; // Base64 or URL
}

export interface Notification {
  id: string;
  targetUserId: string; 
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface Referral {
  id: string;
  referrerUserId: string; // The existing user who referred
  referredUserId: string; // The new user
  codeUsed: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  createdAt: Date;
  payoutAmount: number;
  programType: 'CLIENT_REFERRAL' | 'PRO_REFERRAL';
}

export interface FeeBreakdown {
  grossAmount: number;
  platformFee: number;
  insuranceFee: number;
  stripeProcessingFee?: number;
  providerNet: number;
  taxHoldbackEstimate: number; // Optional: helps the Pro plan for taxes
  markupPercentage?: number;
  isTaxable?: boolean;
  stateSalesTaxAmount?: number;
  localSalesTaxAmount?: number;
  totalSalesTaxAmount?: number;
  clientTotalAmount?: number;
}

export interface MarketRates {
  commissionRate: number; // e.g., 0.10 for 10%
  insuranceFlatFee: number; // e.g., 2.00
  isHighRisk: boolean;
}

// Support & Legal
export interface LegalDocument {
  id: string;
  title: string;
  content: string; // HTML or Markdown string
  lastUpdated: Date;
  category: 'TERMS' | 'PRIVACY' | 'LIABILITY' | 'OTHER';
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface CategoryRequest {
  id: string;
  userId?: string;
  email?: string;
  phoneNumber?: string;
  categoryName: string;
  description: string;
  userRole: Role;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
}

export interface SupportMessage {
  id: string;
  email: string;
  subject: string;
  body: string;
  status: 'NEW' | 'READ' | 'RESOLVED';
  createdAt: Date;
}

