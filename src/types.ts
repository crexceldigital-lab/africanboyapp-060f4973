import { LucideIcon } from 'lucide-react';

export type NavTab = 'home' | 'shop' | 'video' | 'vip' | 'fitme' | 'profile' | 'admin' | 'become-an-agent' | 'agent-dashboard' | 'wholesale-pricing';

export type AdminTab = 'dashboard' | 'pos' | 'products' | 'orders' | 'international' | 'customers' | 'invoices' | 'attributes' | 'gallery' | 'reports' | 'staff' | 'fitme' | 'agents';

export interface FitMeCreditTransaction {
  id: string;
  user_id: string;
  transaction_type: 'FREE_CREDIT' | 'PURCHASE' | 'GENERATION' | 'REFUND' | 'ADMIN_ADJUSTMENT' | 'BONUS' | string;
  credits: number;
  package_id?: string | null;
  amount_paid?: number;
  currency?: string;
  payment_reference?: string | null;
  description?: string | null;
  created_at: string;
}

export interface FitMeGenerationRecord {
  id: string;
  user_id: string;
  product_id?: string | null;
  generation_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | string;
  provider?: string | null;
  result_url?: string | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  image_url?: string;
  available?: boolean;
  status?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  sale_price?: number | null;

  on_sale?: boolean;
  discount_percent?: number;
  sku?: string | null;
  category: string;
  subcategory?: string | null;
  image_url: string;
  images?: string[];
  description: string;
  stock_quantity: number;
  stock?: Record<string, number> | null;
  sizes: string[];
  colors: ProductColor[];
  status?: 'active' | 'inactive' | 'stock_out' | string;
  tags?: string[];
  available_origins?: ('Tanzania' | 'China')[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductOfTheDay {
  id: string;
  product_id: string;
  set_for_date: string;
  created_at: string;
  product?: Product;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  /** Set when the item was added as part of a combo kit (gets the combo discount). */
  comboId?: string;
  /** How many units of this line came from combo kits (discount only applies to these). */
  comboQty?: number;
}

export interface OrderItem {
  id?: string;
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  quantity_shipped?: number;
  quantity_remaining?: number;
  size?: string;
  color?: string;
  sku?: string;
  image_url?: string;
}

export interface SalePayment {
  id?: string;
  order_id?: string;
  payment_method: string;
  amount: number;
  reference?: string | null;
  created_at?: string;
}

export interface OrderShipmentItem {
  id?: string;
  shipment_id?: string;
  product_id?: string | null;
  product_name: string;
  quantity_shipped: number;
}

export interface OrderShipment {
  id: string;
  order_id: string;
  carrier: string;
  tracking_number?: string | null;
  status: string;
  shipped_at: string;
  created_by?: string | null;
  notes?: string | null;
  created_at?: string;
  items?: OrderShipmentItem[];
}

export interface OrderActivity {
  id: string;
  order_id: string;
  actor_id?: string | null;
  actor_name: string;
  action: string;
  details?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number?: string | null;
  user_id?: string | null;
  store_id?: number | null;
  staff_user_id?: string | null;
  sale_type?: 'online' | 'in_store' | string;
  receipt_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  delivery_zone?: string | null;
  delivery_fee?: number;
  subtotal?: number;
  discount_amount?: number;
  discount_type?: string;
  discount_value?: number;
  approved_by?: string | null;
  total_amount: number;
  payment_status?: 'unpaid' | 'paid' | 'partially_paid' | string;
  amount_paid?: number;
  balance?: number;
  is_guest?: boolean;
  currency?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'refunded' | string;
  payment_method?: string | null;
  payment_reference?: string | null;
  snippe_checkout_url?: string | null;
  items: OrderItem[];
  payments?: SalePayment[];
  shipments?: OrderShipment[];
  activities?: OrderActivity[];
  notes?: string | null;
  is_voided?: boolean;
  voided_at?: string | null;
  voided_by?: string | null;
  inventory_deducted?: boolean;
  stock_deducted_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  store_id?: number | null;
  staff_user_id?: string | null;
  quantity: number;
  movement_type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'VOID' | string;
  reference_id?: string | null;
  previous_stock: number;
  new_stock: number;
  created_at: string;
  product_name?: string;
}

export interface HeldSale {
  id: string;
  hold_number: string;
  store_id: number;
  staff_user_id: string;
  customer_data?: { id?: string; name: string; phone?: string; email?: string } | null;
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
}

export interface PosAuditLog {
  id: string;
  user_id?: string;
  store_id?: number;
  action: string;
  reference?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface Store {
  id: number;
  name: string;
  country_code: string;
  currency_code: string;
  country?: string;
  location_name?: string;
  store_code?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  staff_count?: number;
}

export interface ProductStoreAvailability {
  id: string;
  product_id: string;
  store_id: number;
  is_available: boolean;
  stock_quantity: number;
}

export interface StoreStaff {
  id: string;
  user_id: string;
  store_id: number;
  staff_role: 'sales_rep' | 'store_manager' | string;
  permissions?: string[];
  status?: string;
  created_at?: string;
  updated_at?: string;
  store?: Store;
}

export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  joined_date: string;
  total_orders: number;
  total_spent: number;
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  product_count?: number;
}

export interface Subcategory {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  status: string;
  created_at?: string;
  product_count?: number;
}

export interface AttributeSize {
  id: string;
  name: string;
  sort_order: number;
  status: string;
  created_at?: string;
  product_count?: number;
}

export interface AttributeColor {
  id: string;
  name: string;
  hex: string;
  status: string;
  created_at?: string;
  product_count?: number;
}

export interface AppEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  price: number;
  image_url: string;
}

export interface ContentItem {
  id: number;
  title: string;
  type: string;
  thumbnail_url: string;
  is_vip: boolean;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  phone_number: string;
  full_name: string;
  role: string;
  vip_tier: string;
  country_id: number;
  country_name?: string;
  country_code?: string;
  currency_code?: string;
  currency_symbol?: string;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  currency_code: string;
  currency_symbol: string;
  flag_emoji: string;
  is_active: boolean;
}

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
}

export interface Purchase {
  id: number;
  user_id: number;
  product_name: string;
  amount: number;
  currency_code: string;
  date: string;
}

export interface InvoiceSettings {
  id?: string;
  store_id: number;
  business_name: string;
  trading_name?: string;
  business_address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  tin_number?: string;
  vrn_number?: string;
  registration_number?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_branch?: string;
  swift_code?: string;
  payment_instructions?: string;
  invoice_prefix?: string;
  default_currency?: string;
  payment_terms?: string;
  due_days?: number;
  invoice_notes?: string;
  footer_text?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  store_id: 1,
  business_name: 'AfricanBoy International Ltd',
  trading_name: 'AfricanBoy Apparel & Merchandise',
  business_address: 'Kariakoo Commercial District, Msimbazi Street',
  city: 'Dar es Salaam',
  country: 'Tanzania',
  phone: '+255 700 000 000',
  email: 'billing@africanboy.com',
  website: 'https://africanboy.com',
  tin_number: '123-456-789',
  vrn_number: 'VRN-40019284',
  registration_number: 'TZ-REG-2026-9482',
  bank_name: 'CRDB Bank',
  account_name: 'AfricanBoy International Co. Ltd',
  account_number: '0150294829100',
  bank_branch: 'Kariakoo Branch, Dar es Salaam',
  swift_code: 'CORUTZTZ',
  payment_instructions: 'Pay via CRDB Bank or M-Pesa Till Number: 8849201. Please include Invoice # as reference.',
  invoice_prefix: 'AFB-INV',
  default_currency: 'TZS',
  payment_terms: 'Payment due within 14 days of invoice issue date.',
  due_days: 14,
  invoice_notes: 'Thank you for shopping with AfricanBoy! Keep this invoice for official accounting records.',
  footer_text: 'AfricanBoy Official Commercial Invoice • All rights reserved.',
  contact_person: 'Finance & Billing Desk',
  contact_phone: '+255 700 000 000',
  contact_email: 'finance@africanboy.com',
};

// ==========================================
// AFRICAN BOY GLOBAL AGENT PROGRAM TYPES
// ==========================================

export type AgentApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'More Information Required'
  | 'Approved'
  | 'Rejected'
  | 'Withdrawn';

export type AgentBusinessModel =
  | 'Wholesale Reseller'
  | 'Premium Market Agent'
  | 'Country Distributor'
  | 'Commission-Based Agent';

export interface AgentApplicationMessage {
  id: string;
  application_id: string;
  sender_type: 'applicant' | 'admin';
  sender_id?: string | null;
  sender_name: string;
  message: string;
  attachments?: any[];
  is_internal_note: boolean;
  delivery_status: 'sent' | 'delivered' | 'read';
  read_at?: string | null;
  created_at: string;
}

export interface AgentApplication {
  id: string;
  application_reference: string;
  access_token?: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  phone_number: string;
  country_code: string;
  country_name: string;
  city: string;
  preferred_language: string;
  business_name?: string | null;
  business_type: string;
  website_or_social?: string | null;
  business_address?: string | null;
  business_registration_number?: string | null;
  years_of_experience: string;
  previous_experience_details?: string | null;
  requested_categories: string[];
  preferred_business_model: AgentBusinessModel;
  proposed_territory_details?: string | null;
  expected_monthly_sales?: string | null;
  estimated_initial_investment?: string | null;
  preferred_sales_channels: string[];
  marketing_activities?: string | null;
  motivation?: string | null;
  market_entry_plan?: string | null;
  first_year_sales_forecast?: string | null;
  operating_budget_plan?: string | null;
  financial_capacity_statement?: string | null;
  team_and_infrastructure?: string | null;
  supporting_documents_url?: string | null;
  programme_transition_action?: 'assessed_for_distributor' | 'more_info_requested' | 'legacy_retained' | null;
  is_legacy_application?: boolean;
  contract_term_months?: number;
  opening_order_pieces?: number;
  status: AgentApplicationStatus;
  internal_notes?: string | null;
  admin_feedback_to_applicant?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  terms_accepted: boolean;
  privacy_accepted: boolean;
  last_activity_at?: string;
  unread_applicant_count?: number;
  unread_admin_count?: number;
  created_at: string;
  updated_at: string;
}

export type AgentStatus = 'active' | 'suspended' | 'pending_agreement' | 'terminated';

export interface AgentProfile {
  id: string;
  user_id: string;
  application_id?: string | null;
  agent_code: string;
  full_name: string;
  email: string;
  phone_number: string;
  business_name?: string | null;
  business_model: AgentBusinessModel;
  assigned_country_code: string;
  assigned_country_name: string;
  assigned_territory: string;
  is_exclusive: boolean;
  exclusivity_conditions?: string | null;
  approved_categories: string[];
  commission_rate: number;
  wholesale_discount_percent: number;
  minimum_order_quantity: number;
  minimum_initial_purchase: number;
  currency: string;
  payment_terms: string;
  status: AgentStatus;
  agreement_reference?: string | null;
  agreement_status?: string | null;
  agreement_start_date?: string | null;
  agreement_end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentCommercialAgreement {
  id: string;
  agent_id: string;
  agreement_number: string;
  title: string;
  business_model: AgentBusinessModel;
  territory: string;
  is_exclusive: boolean;
  categories: string[];
  commission_rate: number;
  wholesale_discount_percent: number;
  moq: number;
  currency: string;
  payment_terms: string;
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated' | 'Under Review';
  valid_from: string;
  valid_until?: string | null;
  terms_document_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type ShippingOrigin = 'Tanzania' | 'China';
export type ShippingQuoteStatus = 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'dispatched' | 'delivered';
export type ShippingPaymentStatus = 'unpaid' | 'pending' | 'paid';

export interface AgentShippingQuote {
  id: string;
  order_id: string;
  order_number: string;
  agent_id: string;
  user_id: string;
  shipping_origin: ShippingOrigin;
  destination_country: string;
  destination_city: string;
  destination_postcode?: string | null;
  delivery_address: string;
  special_requirements?: string | null;
  courier_name?: string | null;
  shipping_amount?: number | null;
  currency: string;
  customs_and_handling_fee: number;
  estimated_delivery_time?: string | null;
  quote_date?: string | null;
  expiry_date?: string | null;
  is_verified: boolean;
  status: ShippingQuoteStatus;
  agent_rejection_reason?: string | null;
  revision_number: number;
  shipping_payment_status: ShippingPaymentStatus;
  shipping_payment_reference?: string | null;
  shipping_payment_date?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  dispatched_at?: string | null;
  estimated_delivery_date?: string | null;
  delivered_at?: string | null;
  internal_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentReplenishmentOrder {
  id: string;
  order_number: string;
  agent_id: string;
  user_id: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'partial' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  amount_paid: number;
  currency: string;
  shipping_address: string;
  destination_country: string;
  destination_city: string;
  commercial_terms_snapshot: Record<string, any>;
  payment_method?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  shipping_quote_id?: string | null;
  shipping_quote?: AgentShippingQuote | null;
  courier_name?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  estimated_delivery?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentAuditLog {
  id: string;
  agent_id?: string | null;
  application_id?: string | null;
  performed_by?: string | null;
  action: string;
  details?: Record<string, any> | null;
  created_at: string;
}

export interface AgentReportSummary {
  totalApplications: number;
  applicationsByStatus: Record<AgentApplicationStatus, number>;
  approvedAgentsByCountry: Record<string, number>;
  approvedAgentsByCategory: Record<string, number>;
  agentsByBusinessModel: Record<AgentBusinessModel, number>;
  totalReplenishmentOrders: number;
  replenishmentOrderValue: number;
  totalCommissionsEarned: number;
  estimatedGrossMargin: number;
  outstandingBalance: number;
}

// ==============================================================================
// WHOLESALE PROGRAMME TYPES
// ==============================================================================

export interface AnnualCollectionCommitment {
  contractTermMonths: number;
  collectionsPerYear: number;
  minimumOrderPerCollection: number;
  plannedAnnualMinimum: number;
  statement: string;
  distinctionRule: string;
  complianceNotes?: string;
}

export interface DistributorCollectionScheduleItem {
  id: string;
  collectionNumber: number; // 1, 2, 3, 4
  name: string;
  launchDate: string;
  orderDeadline: string;
  minimumOrderPieces: number;
  isOpeningOrder?: boolean;
  notes?: string;
}

export interface DistributorCollectionOrderRecord {
  id: string;
  agentId?: string | null;
  applicationId?: string | null;
  distributorName?: string;
  countryName?: string;
  collectionId: string;
  collectionNumber: number;
  collectionName: string;
  isOpeningOrder: boolean;
  minimumCommitment: number;
  quantityOrdered: number;
  quantityPaid: number;
  quantityFulfilled: number;
  outstandingCommitment: number;
  status: 'Pending Order' | 'Order Placed' | 'Partially Paid' | 'Paid' | 'In Production' | 'Dispatched' | 'Fulfilled' | 'Overdue';
  orderReference?: string;
  orderDate?: string;
  notes?: string;
  updatedAt: string;
}

export interface WholesalePartnershipLevelConfig {
  id: string;
  name: AgentBusinessModel;
  tagline: string;
  defaultMoq: number;
  defaultWholesaleDiscountPercent: number;
  supportedCurrencies: string[];
  defaultCurrency: string;
  eligibilityRules: string[];
  benefits: string[];
  exclusivityAllowed: boolean;
  defaultExclusivityTerms?: string;
  contractTermMonths?: number;
  minimumOpeningOrder?: number;
  collectionsPerYear?: number;
  minimumOrderPerCollection?: number;
  plannedAnnualMinimum?: number;
  annualCollectionCommitmentStatement?: string;
  isLegacy?: boolean;
}

export interface WholesalePricingTier {
  id: string;
  category: string;
  label: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPriceTZS: number;
  requiresReview?: boolean;
}

export interface WholesaleProgramSettings {
  id: string;
  partnershipLevels: WholesalePartnershipLevelConfig[];
  enabledCategories: string[];
  pricingTiers: Record<string, WholesalePricingTier[]>;
  combineMixedQuantitiesForTiers: boolean;
  marketingBenefitTiers: Record<string, string[]>;
  currencyRates: Record<string, number>;
  updatedAt: string;
  annualCollectionsCount?: number;
  collectionMinimumPieces?: number;
  plannedAnnualMinimumPieces?: number;
  contractTermMonths?: number;
  collectionSchedule?: DistributorCollectionScheduleItem[];
}

export interface CommercialProposalItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  retailPrice: number;
  lineTotal: number;
  appliedTierLabel: string;
  size?: string;
  color?: string;
  imageUrl?: string;
}

export type CommercialOfferStatus = 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Activated' | 'Expired';

export interface AgentCommercialOffer {
  id: string;
  offerReference: string;
  applicationId: string;
  agentId?: string | null;
  applicantName: string;
  businessName?: string | null;
  partnershipLevel: AgentBusinessModel;
  destinationCountry: string;
  destinationCity: string;
  territory: string;
  isExclusive: boolean;
  exclusivityTerms?: string | null;
  currency: string;
  proposedItems: CommercialProposalItem[];
  totalUnits: number;
  merchandiseSubtotal: number;
  confirmedShippingRate?: number | null;
  shippingTerms: string;
  shippingDisclaimer: string;
  paymentTerms: string;
  marketingBenefits: string[];
  artistDisclaimer: string;
  internalNotes?: string | null;
  expiryDate: string;
  status: CommercialOfferStatus;
  acceptedAt?: string | null;
  acceptedBySignature?: string | null;
  acceptanceNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  commercialTerms?: {
    minimumReplenishmentOrder?: string;
    processingDispatchTime?: string;
    potentialShippingOrigins?: string[];
    contractTermMonths?: number;
    annualCollections?: number;
    minimumOrderPerCollection?: number;
    plannedAnnualMinimum?: number;
    collectionScheduleAgreement?: string;
  };
  annualCollectionCommitment?: AnnualCollectionCommitment;
  flaggedForReview?: boolean;
  reviewRequiredReason?: string;
  isHistoricalBaseline?: boolean;
  supersededByOfferId?: string | null;
  supersededByOfferRef?: string | null;
  parentOfferReference?: string | null;
  version?: number;
}

export type WholesaleEnquiryStatus =
  | 'New Enquiry'
  | 'Pricing Access Granted'
  | 'Under Review'
  | 'Contacted'
  | 'Converted'
  | 'Rejected'
  | 'Closed';

export type WholesaleBusinessType =
  | 'Retailer'
  | 'Wholesaler'
  | 'Distributor'
  | 'Online Store'
  | 'Other';

export interface WholesalePricingEnquiry {
  id: string;
  enquiryReference: string;
  fullName: string;
  businessEmail: string;
  phoneNumber: string;
  country: string;
  businessName: string;
  businessType: WholesaleBusinessType;
  estimatedOrderQuantity: string;
  websiteOrSocial?: string | null;
  preferredCategories?: string[];
  additionalNotes?: string | null;
  consentAcknowledged: boolean;
  accessToken: string;
  accessTokenExpiresAt: string;
  pricingAccessedAt?: string | null;
  pricingAccessCount: number;
  status: WholesaleEnquiryStatus;
  userId?: string | null;
  linkedApplicationId?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitWholesaleEnquiryInput {
  fullName: string;
  businessEmail: string;
  phoneNumber: string;
  country: string;
  businessName: string;
  businessType: WholesaleBusinessType;
  estimatedOrderQuantity: string;
  websiteOrSocial?: string;
  preferredCategories?: string[];
  additionalNotes?: string;
  consentAcknowledged: boolean;
}

export interface WholesaleEnquirySubmissionResult {
  success: boolean;
  enquiryReference: string;
  enquiry_reference?: string;
  accessToken: string;
  access_token?: string;
  accessTokenExpiresAt: string;
  access_token_expires_at?: string;
  status: WholesaleEnquiryStatus;
  isDuplicate?: boolean;
}

export interface WholesalePricingScheduleResponse {
  valid: boolean;
  error?: string;
  isAdmin?: boolean;
  isAgent?: boolean;
  enquiryReference?: string;
  businessName?: string;
  applicantName?: string;
  expiresAt?: string;
  currency: string;
  pricingTiers: Record<string, WholesalePricingTier[]>;
  rules: {
    tshirt_tier_1: string;
    tshirt_tier_2: string;
    tshirt_under_min: string;
    caps_wholesale_tier: string;
    caps_under_min: string;
    caps_opening_order_credit: string;
    mixed_order_policy: string;
    distributor_policy: string;
    separate_shipping: string;
  };
}


