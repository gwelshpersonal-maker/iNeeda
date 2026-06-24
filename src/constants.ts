
import { Organization, Site, User, Role, StaffType, Shift, ShiftStatus, JobPosting, JobApplication, ServiceCategory, BadgeType, PlatformMessage } from './types';
import { addDays, setHours, subDays, addHours, subHours } from 'date-fns';

export const DEFAULT_PLATFORM_MESSAGES: PlatformMessage[] = [
  { text: '"Super easy to use. Found help in minutes."', author: 'Sarah M.', type: 'review' },
  { text: 'Choose Who You Trust', type: 'brand' },
  { text: '"Saved me so much time with yard work."', author: 'David P.', type: 'review' },
  { text: 'Get the Job Done', type: 'brand' },
  { text: '"The handyman was professional and quick."', author: 'Mike T.', type: 'review' },
  { text: 'Fair Prices. Local Professionals.', type: 'brand' }
];

// REPLACE THIS URL WITH YOUR UPLOADED IMAGE URL
export const APP_LOGO_URL = "/logo.png";

export const BADGE_GROUPS: Record<string, { id: BadgeType, label: string, description: string }[]> = {
  'Trust': [
    { id: 'IDENTITY_VERIFIED', label: 'Identity Verified', description: 'Matched photo ID to profile' },
    { id: 'BACKGROUND_CHECKED', label: 'Background Checked', description: 'Clean PA State Police (PATCH) report' },
    { id: '717_LOCAL', label: '717 Local', description: 'Physical address in Harrisburg/York/Lancaster' }
  ],
  'Professional': [
    { id: 'INSURED_PRO', label: 'Insured Pro', description: 'Uploaded Certificate of Insurance (COI)' },
    { id: 'LICENSED_SPECIALIST', label: 'Licensed Specialist', description: 'PA registration (like HIC)' },
    { id: 'CLEAN_SLATE', label: 'Clean Slate', description: '3+ year "clean" streak on platform' },
    { id: 'AI_PREFERRED', label: 'AI Partner Pro', description: 'Priority recommendation in search and AI engine' }
  ],
  'Service': [
    { id: 'FAST_RESPONDER', label: 'Fast Responder', description: 'Average reply time under 30 mins' },
    { id: 'REPEAT_PRO', label: 'Repeat Pro', description: 'Hired by same client > 3 times' },
    { id: 'TOP_RATED', label: 'Top Rated', description: '4.9+ star average after 10+ jobs' }
  ],
  'Safety': [
    { id: 'CHILD_SAFETY_CLEARED', label: 'Child Safety Cleared', description: 'PA Act 33/34 clearances' },
    { id: 'PET_FRIENDLY', label: 'Pet Friendly', description: 'Great with dogs/cats' }
  ]
};

export const ALL_SERVICE_CATEGORIES: ServiceCategory[] = [
    'LANDSCAPING', 'MOVING', 'CLEANING', 'HANDYMAN', 'PLUMBING', 'AUTO', 'AUTO_DETAILING', 'CONSTRUCTION', 'COMPUTER', 'GENERAL_LABOR', 'JOBSITE_LABOR', 'POWER_WASHING', 'SMART_HOME_INSTALL', 'PEST_CONTROL', 'WEB_APP_DEV', 'FURNITURE_ASSEMBLY', 'GUTTER_CLEANING', 'LISTING_TOUCH_UP'
];

export const AVAILABLE_SERVICE_CATEGORIES: ServiceCategory[] = [
    'MOVING', 'CLEANING', 'HANDYMAN', 'PLUMBING', 'LANDSCAPING', 'POWER_WASHING', 'GENERAL_LABOR', 'JOBSITE_LABOR', 'AUTO', 'AUTO_DETAILING', 'COMPUTER', 'SMART_HOME_INSTALL', 'PEST_CONTROL', 'WEB_APP_DEV', 'FURNITURE_ASSEMBLY', 'GUTTER_CLEANING', 'LISTING_TOUCH_UP'
];

export const SERVICE_CATEGORIES = {
  COMPUTER:      { risk: 'LOW',    fee: 3.00 },
  CLEANING:      { risk: 'LOW',    fee: 3.00 },
  WEB_APP_DEV:   { risk: 'LOW',    fee: 3.00 },
  LISTING_TOUCH_UP: { risk: 'LOW', fee: 3.00 },
  LANDSCAPING:   { risk: 'MEDIUM', fee: 5.00 },
  HANDYMAN:      { risk: 'MEDIUM', fee: 5.00 },
  GENERAL_LABOR: { risk: 'MEDIUM', fee: 5.00 },
  SMART_HOME_INSTALL: { risk: 'MEDIUM', fee: 5.00 },
  FURNITURE_ASSEMBLY: { risk: 'MEDIUM', fee: 5.00 },
  AUTO_DETAILING: { risk: 'MEDIUM', fee: 5.00 },
  MOVING:        { risk: 'HIGH',   fee: 12.00 },
  PLUMBING:      { risk: 'HIGH',   fee: 12.00 },
  CONSTRUCTION:  { risk: 'HIGH',   fee: 12.00 },
  AUTO:          { risk: 'HIGH',   fee: 12.00 },
  JOBSITE_LABOR: { risk: 'HIGH',   fee: 12.00 },
  POWER_WASHING: { risk: 'HIGH',   fee: 12.00 },
  PEST_CONTROL:  { risk: 'HIGH',   fee: 12.00 },
  GUTTER_CLEANING: { risk: 'HIGH', fee: 12.00 }
};

export const PLATFORM_COMMISSION = 0.15; // 15%
export const TAX_THRESHOLD = 2000.00;    // 2026 IRS Limit
export const ESCROW_WINDOW_HOURS = 48;

export const RISK_LEVELS = {
  LOW: 'LOW',       // Yard work, cleaning
  MEDIUM: 'MEDIUM', // General labor, assembly
  HIGH: 'HIGH'      // Moving, Electrical, Plumbing
} as const;

export const INSURANCE_FEES = {
  [RISK_LEVELS.LOW]: 3.00,    // Restored from 2.00
  [RISK_LEVELS.MEDIUM]: 5.00, 
  [RISK_LEVELS.HIGH]: 12.00   // Restored from 10.00
};

export const CATEGORY_RISK_MAPPING: Record<ServiceCategory, { risk: keyof typeof RISK_LEVELS }> = {
  MOVING: { risk: RISK_LEVELS.HIGH },
  PLUMBING: { risk: RISK_LEVELS.HIGH },
  AUTO: { risk: RISK_LEVELS.HIGH },
  CONSTRUCTION: { risk: RISK_LEVELS.HIGH },
  JOBSITE_LABOR: { risk: RISK_LEVELS.HIGH }, 
  POWER_WASHING: { risk: RISK_LEVELS.HIGH }, // Corrected for 2026 liability
  PEST_CONTROL: { risk: RISK_LEVELS.HIGH },
  GUTTER_CLEANING: { risk: RISK_LEVELS.HIGH },
  HANDYMAN: { risk: RISK_LEVELS.MEDIUM },
  GENERAL_LABOR: { risk: RISK_LEVELS.MEDIUM },
  LANDSCAPING: { risk: RISK_LEVELS.MEDIUM },
  SMART_HOME_INSTALL: { risk: RISK_LEVELS.MEDIUM },
  FURNITURE_ASSEMBLY: { risk: RISK_LEVELS.MEDIUM },
  AUTO_DETAILING: { risk: RISK_LEVELS.MEDIUM },
  CLEANING: { risk: RISK_LEVELS.LOW },
  COMPUTER: { risk: RISK_LEVELS.LOW },
  WEB_APP_DEV: { risk: RISK_LEVELS.LOW },
  LISTING_TOUCH_UP: { risk: RISK_LEVELS.LOW }
};


export const MOCK_ORG: Organization = {
  id: 'org_1',
  name: 'iNeeda Platform',
};

export const MOCK_SITES: Site[] = [
  {
    id: 'site_1',
    orgId: 'org_1',
    name: 'Home Address',
    address: '123 Maple Ave, Suburbia',
    latitude: 37.7749, 
    longitude: -122.4194,
    radiusMeters: 500,
  },
  {
    id: 'site_2',
    orgId: 'org_1',
    name: 'Rental Property',
    address: '45 Downtown St, City',
    latitude: 37.7849, 
    longitude: -122.4094,
    radiusMeters: 500,
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'admin_1',
    orgId: 'org_1',
    name: 'Admin User',
    email: 'admin@ineeda.work',
    role: Role.ADMIN,
    hourlyRate: 0,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-ADMIN',
    urgentAlertsEnabled: true,
  },
  {
    id: 'user_1',
    orgId: 'org_1',
    name: 'Alice Client',
    email: 'alice@homeowner.com',
    role: Role.CLIENT,
    hourlyRate: 0,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-0100',
    urgentAlertsEnabled: true,
    hasPaymentMethod: true, // Alice has a card on file
  },
  {
    id: 'user_2',
    orgId: 'org_1',
    name: 'Bob The Builder',
    email: 'bob@provider.com',
    role: Role.PROVIDER,
    staffType: StaffType.MARKETPLACE_VENDOR,
    hourlyRate: 45.00,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-0101',
    skills: ALL_SERVICE_CATEGORIES, // Bob can do it all
    categoryRates: { PLUMBING: 85, CONSTRUCTION: 60, HANDYMAN: 45, GENERAL_LABOR: 35 },
    rating: 4.8,
    jobsCompleted: 124,
    urgentAlertsEnabled: true,
    stripeAccountId: 'acct_test_123', // Required for claiming jobs
  },
  {
    id: 'user_3',
    orgId: 'org_1',
    name: 'Charlie Cleaner',
    email: 'charlie@clean.com',
    role: Role.PROVIDER,
    staffType: StaffType.MARKETPLACE_VENDOR,
    hourlyRate: 30.00,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-0102',
    skills: ['CLEANING', 'MOVING'],
    categoryRates: { CLEANING: 30, MOVING: 45 },
    rating: 4.9,
    jobsCompleted: 56,
    urgentAlertsEnabled: true,
    stripeAccountId: 'acct_test_456',
  },
  {
    id: 'user_4',
    orgId: 'org_1',
    name: 'Dave Decorator',
    email: 'dave@handy.com',
    role: Role.PROVIDER,
    staffType: StaffType.MARKETPLACE_VENDOR,
    hourlyRate: 40.00,
    isActive: true,
    verificationStatus: 'VERIFIED',
    phone: '555-0103',
    skills: ['HANDYMAN', 'LANDSCAPING', 'POWER_WASHING'],
    rating: 4.7,
    jobsCompleted: 89,
    urgentAlertsEnabled: true,
    stripeAccountId: 'acct_test_789',
  }
];

const today = new Date();

export const MOCK_SHIFTS: Shift[] = [
  {
    id: 'gig_1',
    userId: 'user_3',
    clientId: 'user_1',
    siteId: 'site_1',
    start: setHours(today, 10),
    end: setHours(today, 13),
    description: 'Deep Clean Living Room',
    category: 'CLEANING',
    status: ShiftStatus.ACCEPTED,
    isRecurring: false,
    price: 120,
    createdAt: subDays(today, 1)
  },
  {
    id: 'gig_4',
    userId: 'user_2',
    clientId: 'user_1',
    siteId: 'site_2',
    start: subDays(today, 5),
    end: subDays(today, 5),
    description: 'Assemble IKEA Furniture',
    category: 'FURNITURE_ASSEMBLY',
    status: ShiftStatus.COMPLETED,
    isRecurring: false,
    price: 95,
    createdAt: subDays(today, 6),
    completedAt: subDays(today, 5)
  },
  {
    id: 'gig_5',
    userId: 'user_4',
    clientId: 'user_1',
    siteId: 'site_1',
    start: subDays(today, 2),
    end: subDays(today, 2),
    description: 'Power Wash Driveway',
    category: 'POWER_WASHING',
    status: ShiftStatus.VERIFIED,
    isRecurring: false,
    price: 150,
    createdAt: subDays(today, 3),
    completedAt: subDays(today, 2)
  },
  {
    id: 'gig_2',
    userId: null,
    clientId: 'user_1',
    siteId: 'site_1',
    start: addDays(today, 2),
    end: addDays(today, 2), // Same day duration usually handled by logic
    description: 'Fix Leaky Faucet',
    category: 'PLUMBING',
    status: ShiftStatus.OPEN_REQUEST,
    isRecurring: false,
    price: 85,
    createdAt: subHours(today, 3), // Created 3 hours ago -> Should trigger Low Interest Warning
    isBoosted: false
  },
  {
    id: 'gig_3',
    userId: null,
    clientId: 'user_1',
    siteId: 'site_2',
    start: addDays(today, 1),
    end: addDays(today, 1),
    description: 'Move Sofa to 2nd Floor',
    category: 'MOVING',
    status: ShiftStatus.OPEN_REQUEST,
    isRecurring: false,
    type: 'URGENT',
    price: 60,
    createdAt: subHours(today, 1) // Created 1 hour ago -> No warning yet
  }
];

export const MOCK_JOBS: JobPosting[] = [
    { 
        id: 'job_1', 
        orgId: 'org_1', 
        title: 'Full-Time Mover', 
        description: 'Looking for a strong pro to join our moving crew full time.', 
        payRange: '$25/hr', 
        isPublic: true, 
        department: 'EXTERNAL',
        status: 'OPEN', 
        createdAt: new Date() 
    },
    { 
        id: 'job_2', 
        orgId: 'org_0',  // 'iNeeda' Corporate org or similar
        title: 'Customer Success Manager', 
        description: 'Join the iNeeda corporate team and help pros and clients succeed.', 
        payRange: '$60k-$80k/yr', 
        isPublic: true, 
        department: 'INTERNAL',
        status: 'OPEN', 
        createdAt: new Date() 
    }
];

export const MOCK_APPLICATIONS: JobApplication[] = [];

export const STORAGE_KEYS = {
  PENDING_PUNCHES: 'iw_pending_punches',
  AUTH_USER: 'iw_auth_user',
};
