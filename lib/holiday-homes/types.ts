export type HolidayHomeAmenities = {
  wifiAvailable: boolean;
  swimmingPool: boolean;
  airConditioning: boolean;
  kitchen: boolean;
  braaiArea: boolean;
  parking: boolean;
  petFriendly: boolean;
  wheelchairAccessible: boolean;
};

export type HolidayHomeDetails = HolidayHomeAmenities & {
  nightlyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  minimumStay: number;
  maximumGuests: number;
  checkInTime: string;
  checkOutTime: string;
  cleaningFee?: number;
  securityDeposit?: number;
  houseRules?: string;
  nearbyAttractions?: string;
  destination?: string;
};

export type HolidayBookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED";

export type HolidayBookingEnquiry = {
  id: string;
  listingId: string;
  listingTitle: string;
  ownerId: string;
  agentId?: string;
  guestUserId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message?: string;
  estimatedNights: number;
  estimatedTotal: number;
  status: HolidayBookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type HolidayHomeReview = {
  id: string;
  listingId: string;
  reviewerUserId: string;
  reviewerName: string;
  cleanliness: number;
  location: number;
  communication: number;
  valueForMoney: number;
  overallExperience: number;
  comment?: string;
  createdAt: string;
};

export type HolidayHomeSettings = {
  minNightlyRate: number;
  maxNightlyRate: number;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  requireAdminApproval: boolean;
  allowInstantEnquiry: boolean;
};

export type HolidayHomeAnalytics = {
  views: number;
  bookingEnquiries: number;
  conversionRate: number;
  averageNightlyPrice: number;
  popularDestinations: Array<{ destination: string; count: number }>;
  topListings: Array<{ id: string; title: string; views: number; enquiries: number }>;
};

export type HolidayHomePlatformState = {
  bookingEnquiries: HolidayBookingEnquiry[];
  reviews: HolidayHomeReview[];
  settings: HolidayHomeSettings;
};
