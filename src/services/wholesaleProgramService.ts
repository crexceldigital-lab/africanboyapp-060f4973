import { fromAny } from '@/lib/supabase-helpers';
import { supabase } from '@/integrations/supabase/client';
import { getProposalAmounts } from '@/lib/commercialProposalData';
import type {
  WholesaleProgramSettings,
  WholesalePartnershipLevelConfig,
  WholesalePricingTier,
  CommercialProposalItem,
  AgentCommercialOffer,
  CommercialOfferStatus,
  Product,
} from '@/types';

const STORAGE_KEY_WHOLESALE_SETTINGS = 'ab_wholesale_program_settings_cache';
const STORAGE_KEY_COMMERCIAL_OFFERS = 'ab_agent_commercial_offers_cache';

// ==============================================================================
// DEFAULT CONFIGURATION (Editable from Admin Dashboard)
// ==============================================================================

export const DEFAULT_PARTNERSHIP_LEVELS: WholesalePartnershipLevelConfig[] = [
  {
    id: 'country_distributor',
    name: 'Country Distributor',
    tagline: 'Become an authorised African Boy Country Distributor and develop the brand in your market through a structured wholesale and distribution partnership.',
    defaultMoq: 1000,
    minimumOpeningOrder: 1000,
    collectionsPerYear: 4,
    minimumOrderPerCollection: 1000,
    plannedAnnualMinimum: 4000,
    contractTermMonths: 12,
    annualCollectionCommitmentStatement:
      'Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.',
    defaultWholesaleDiscountPercent: 38,
    supportedCurrencies: ['TZS', 'USD', 'KES', 'NGN', 'GBP', 'EUR', 'ZAR'],
    defaultCurrency: 'TZS',
    eligibilityRules: [
      'Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year',
      'The 1,000-piece requirement applies to EACH new collection, not merely to the distributor\'s initial opening order or total annual purchases',
      'Demonstrated business capability and working capital to support all four annual collections for a full 12-month agreement',
      'Practical market-entry strategy, sales forecast, operating budget, and retail/reseller distribution channels',
      'Signed 12-month distribution agreement defining territory, commercial terms, and performance targets',
    ],
    benefits: [
      'Official Country Distributor wholesale pricing schedule (TZS 35,000 / 30,000 Tees, TZS 18,000 Caps)',
      '12-Month distribution mandate with agreed territory and performance milestones',
      'Four annual collection launch windows with dedicated factory priority allocation',
      'High-resolution Master Brand Asset Cloud, lookbooks, and official partner marketing kit',
      'Dedicated African Boy commercial account liaison and factory supply coordination',
      'Separate logistics coordination with verified freight comparisons from Tanzania or China',
    ],
    exclusivityAllowed: true,
    defaultExclusivityTerms: 'Territory exclusivity is not automatic and must be expressly agreed in writing in the signed distribution agreement.',
    isLegacy: false,
  },
  {
    id: 'wholesale_reseller',
    name: 'Wholesale Reseller',
    tagline: 'Historical tier (Legacy) — Independent fashion boutique and concept store partner.',
    defaultMoq: 30,
    minimumOpeningOrder: 30,
    contractTermMonths: 6,
    defaultWholesaleDiscountPercent: 25,
    supportedCurrencies: ['TZS', 'USD', 'KES', 'NGN', 'GBP', 'EUR', 'ZAR'],
    defaultCurrency: 'TZS',
    eligibilityRules: [
      'Operating physical boutique or registered online fashion store',
      'Minimum opening order volume of 30 units across approved categories',
    ],
    benefits: [
      'Official wholesale tier pricing',
      'Brand guideline kit & product authenticity verification assets',
    ],
    exclusivityAllowed: false,
    isLegacy: true,
  },
  {
    id: 'premium_market_agent',
    name: 'Premium Market Agent',
    tagline: 'Historical tier (Legacy) — Multi-door retailer and regional brand operator.',
    defaultMoq: 50,
    minimumOpeningOrder: 50,
    contractTermMonths: 12,
    defaultWholesaleDiscountPercent: 32,
    supportedCurrencies: ['TZS', 'USD', 'KES', 'NGN', 'GBP', 'EUR', 'ZAR'],
    defaultCurrency: 'TZS',
    eligibilityRules: [
      'Minimum 2 years verified retail/wholesale distribution experience',
      'Minimum opening order of 50 units',
    ],
    benefits: [
      'Volume discount tier pricing',
      'Priority allocation on capsule releases',
    ],
    exclusivityAllowed: true,
    isLegacy: true,
  },
];

export const DEFAULT_PRICING_TIERS: Record<string, WholesalePricingTier[]> = {
  'T-Shirt': [
    {
      id: 'tshirt-tier-distro-1',
      category: 'T-Shirt',
      label: '500–999 Units Tier',
      minQuantity: 500,
      maxQuantity: 999,
      unitPriceTZS: 35000,
    },
    {
      id: 'tshirt-tier-distro-2',
      category: 'T-Shirt',
      label: '1,000+ Units Tier',
      minQuantity: 1000,
      maxQuantity: null,
      unitPriceTZS: 30000,
    },
  ],
  Caps: [
    {
      id: 'cap-tier-distro-1',
      category: 'Caps',
      label: '300+ Units Tier',
      minQuantity: 300,
      maxQuantity: null,
      unitPriceTZS: 18000,
    },
  ],
};

export const DEFAULT_MARKETING_BENEFITS: Record<string, string[]> = {
  'Digital Marketing Assets': [
    'Access to African Boy Master Asset Cloud (high-res lookbooks, studio photography, vector logos)',
    'Seasonal lookbook pack for spring/summer and autumn/winter drops',
    'Official African Boy Authorized Agent digital badge for e-commerce and Instagram bio',
    'Pre-formatted social media templates (Instagram Reels covers, feed carousels, TikTok assets)',
  ],
  'Campaign Coordination': [
    'Synchronized launch scheduling for continent-wide new product drops',
    'Early notification 14 days prior to public capsule announcements',
    'Brand-approved copy and campaign storytelling guidelines in English and Swahili',
  ],
  'Brand-Page Features': [
    'Official listing on africanboy.africa/stockists authorized global partners directory',
    'Social media partner spotlight on African Boy official Instagram / TikTok channels',
    'Customer referral routing for verified inquiries in your assigned city/country',
  ],
  'Local Activations': [
    'In-store point-of-sale display layout blueprint & acrylic display specifications',
    'Official African Boy store window decal vinyl branding package',
    'Support materials for authorized launch pop-up events and listening parties',
  ],
  'Artist-Led Promotional Opportunities': [
    'Opportunity to request official video shoutout or social media story repost from brand accounts',
    'VIP backstage passes for agent executives during African Boy international tour stops',
    'Special notice: Live artist appearances, store walkthroughs, and personal appearances are never guaranteed based solely on order volume and strictly require an independent written talent agreement and scheduling clearance.',
  ],
};

export const DEFAULT_CURRENCY_RATES: Record<string, number> = {
  TZS: 1,
  USD: 0.00038, // ~2,630 TZS per USD
  KES: 0.05,    // ~20 TZS per KES
  NGN: 0.6,     // ~1.67 TZS per NGN
  GBP: 0.00031,
  EUR: 0.00036,
  ZAR: 0.007,
};

export const LEGAL_ARTIST_DISCLAIMER =
  'Artist appearances, live performances, store visits, and promotional appearances by Jux or African Boy brand ambassadors are strictly not guaranteed, are outside the scope of this wholesale merchandise offer, and require a separate written agreement and formal talent management approval.';

export const SHIPPING_TAXES_DISCLAIMER =
  'Unless explicitly agreed in writing as confirmed freight, this wholesale quotation is strictly EX-WORKS (Dar es Salaam, Tanzania). The Purchaser/Agent assumes full responsibility for all international freight shipping charges, transit insurance, import tariffs, customs clearance, port handling fees, VAT, and destination duties.';

// ==============================================================================
// COLLECTION-BASED ANNUAL COMMITMENT DEFAULTS
// ==============================================================================

export const DEFAULT_COLLECTION_SCHEDULE: DistributorCollectionScheduleItem[] = [
  {
    id: 'col-1-opening',
    collectionNumber: 1,
    name: 'Collection 1 / Opening Drop - Spring/Summer',
    launchDate: '2026-03-01',
    orderDeadline: '2026-04-15',
    minimumOrderPieces: 1000,
    isOpeningOrder: true,
    notes: 'Initial qualifying opening allocation across core luxury streetwear lines.',
  },
  {
    id: 'col-2-summer',
    collectionNumber: 2,
    name: 'Collection 2 - High Summer Capsule',
    launchDate: '2026-06-01',
    orderDeadline: '2026-07-15',
    minimumOrderPieces: 1000,
    isOpeningOrder: false,
    notes: 'Subsequent collection requirement: minimum 1,000 pieces.',
  },
  {
    id: 'col-3-autumn',
    collectionNumber: 3,
    name: 'Collection 3 - Autumn/Winter Drop',
    launchDate: '2026-09-01',
    orderDeadline: '2026-10-15',
    minimumOrderPieces: 1000,
    isOpeningOrder: false,
    notes: 'Subsequent collection requirement: minimum 1,000 pieces.',
  },
  {
    id: 'col-4-festive',
    collectionNumber: 4,
    name: 'Collection 4 - Festive / Tour Capsule',
    launchDate: '2026-11-15',
    orderDeadline: '2026-12-31',
    minimumOrderPieces: 1000,
    isOpeningOrder: false,
    notes: 'Subsequent collection requirement: minimum 1,000 pieces.',
  },
];

// Seeded foundational proposals — preserving David Mwangi's Kenya proposal ABA-OFF-2026-KEX97J
export const INITIAL_SYSTEM_COMMERCIAL_OFFERS: AgentCommercialOffer[] = [
  {
    id: 'offer-david-mwangi-kenya-01',
    offerReference: 'ABA-OFF-2026-KEX97J',
    applicationId: 'app-sample-1', // David Mwangi (Savannah Streetwear Ltd, ABA-2026-NBO94)
    agentId: null,
    applicantName: 'David Mwangi',
    businessName: 'Savannah Streetwear Ltd',
    partnershipLevel: 'Country Distributor',
    destinationCountry: 'Kenya',
    destinationCity: 'Nairobi',
    territory: 'Kenya (National)',
    isExclusive: true,
    exclusivityTerms: 'National exclusivity is subject to minimum replenishment of 100 units per quarter.',
    currency: 'TZS',
    proposedItems: [
      {
        productId: 'prod-sample-tshirt-01',
        name: 'African Boy Signature Heavyweight Tee',
        sku: 'AFB-TEE-BLK-L',
        category: 'T-Shirt',
        quantity: 700,
        unitPrice: 30000,
        retailPrice: 55000,
        lineTotal: 21000000,
        appliedTierLabel: '1,000+ Units Tier',
        size: 'L',
        color: 'Jet Black / Gold Foil',
      },
      {
        productId: 'prod-sample-cap-01',
        name: 'African Boy Structured Logo Cap',
        sku: 'AFB-CAP-GLD',
        category: 'Caps',
        quantity: 300,
        unitPrice: 18000,
        retailPrice: 35000,
        lineTotal: 5400000,
        appliedTierLabel: '300+ Units Tier',
        size: 'Adjustable',
        color: 'Black / Gold Metal Crest',
      },
    ],
    totalUnits: 1000,
    merchandiseSubtotal: 26400000,
    confirmedShippingRate: null,
    shippingTerms: 'Ex Works Dar es Salaam — International freight to Nairobi quoted and billed separately prior to dispatch',
    shippingDisclaimer: SHIPPING_TAXES_DISCLAIMER,
    paymentTerms: '100% Pre-payment via Bank Wire Transfer prior to order dispatch',
    marketingBenefits: [
      'Official Master Brand Asset Cloud Access (4K lookbooks, campaign assets, video loops)',
      'Brand guideline kit & product authenticity verification assets',
      'Official listing on africanboy.africa/stockists authorized global partners directory',
      'Priority allocation on capsule releases',
    ],
    artistDisclaimer: LEGAL_ARTIST_DISCLAIMER,
    internalNotes:
      'Historical proposal for David Mwangi (Savannah Streetwear Ltd). Contains prior replenishment condition (100 units per quarter). Flagged for review so an administrator can issue a revised offer/addendum reflecting the new policy: 1,000 pieces per collection across 4 annual collections (4,000 pcs/year). Original proposal preserved as historical evidence.',
    expiryDate: '2026-12-31',
    status: 'Sent',
    flaggedForReview: true,
    reviewRequiredReason:
      'Historical proposal states national exclusivity is subject to minimum replenishment of 100 units per quarter. Requires authorised administrator review to issue revised offer (or addendum) reflecting new policy: 1,000 pieces per collection across 4 annual collections (4,000 units/year). Do not overwrite original proposal.',
    isHistoricalBaseline: true,
    version: 1,
    createdAt: '2026-10-14T14:30:00Z',
    updatedAt: '2026-10-14T14:30:00Z',
    commercialTerms: {
      minimumReplenishmentOrder: '100 units per quarter',
      processingDispatchTime: '10 - 14 business days from payment receipt',
      potentialShippingOrigins: ['Tanzania (Dar es Salaam Hub)', 'China (Guangzhou Port)'],
    },
  },
];

const STORAGE_KEY_COLLECTION_ORDERS = 'ab_distributor_collection_orders_cache';

export const INITIAL_COLLECTION_ORDERS: DistributorCollectionOrderRecord[] = [
  {
    id: 'col-rec-mwangi-1',
    agentId: null,
    applicationId: 'app-sample-1',
    distributorName: 'David Mwangi',
    countryName: 'Kenya',
    collectionId: 'col-1-opening',
    collectionNumber: 1,
    collectionName: 'Collection 1 / Opening Drop - Spring/Summer',
    isOpeningOrder: true,
    minimumCommitment: 1000,
    quantityOrdered: 1000,
    quantityPaid: 0,
    quantityFulfilled: 0,
    outstandingCommitment: 0,
    status: 'Order Placed',
    orderReference: 'ABA-OFF-2026-KEX97J',
    orderDate: '2026-10-14T14:30:00Z',
    notes: 'Opening order of 1,000 units across core T-shirts (700) and Caps (300).',
    updatedAt: '2026-10-14T14:30:00Z',
  },
  {
    id: 'col-rec-mwangi-2',
    agentId: null,
    applicationId: 'app-sample-1',
    distributorName: 'David Mwangi',
    countryName: 'Kenya',
    collectionId: 'col-2-summer',
    collectionNumber: 2,
    collectionName: 'Collection 2 - High Summer Capsule',
    isOpeningOrder: false,
    minimumCommitment: 1000,
    quantityOrdered: 0,
    quantityPaid: 0,
    quantityFulfilled: 0,
    outstandingCommitment: 1000,
    status: 'Pending Order',
    notes: 'Subsequent collection commitment: minimum 1,000 pieces.',
    updatedAt: '2026-10-14T14:30:00Z',
  },
  {
    id: 'col-rec-mwangi-3',
    agentId: null,
    applicationId: 'app-sample-1',
    distributorName: 'David Mwangi',
    countryName: 'Kenya',
    collectionId: 'col-3-autumn',
    collectionNumber: 3,
    collectionName: 'Collection 3 - Autumn/Winter Drop',
    isOpeningOrder: false,
    minimumCommitment: 1000,
    quantityOrdered: 0,
    quantityPaid: 0,
    quantityFulfilled: 0,
    outstandingCommitment: 1000,
    status: 'Pending Order',
    notes: 'Subsequent collection commitment: minimum 1,000 pieces.',
    updatedAt: '2026-10-14T14:30:00Z',
  },
  {
    id: 'col-rec-mwangi-4',
    agentId: null,
    applicationId: 'app-sample-1',
    distributorName: 'David Mwangi',
    countryName: 'Kenya',
    collectionId: 'col-4-festive',
    collectionNumber: 4,
    collectionName: 'Collection 4 - Festive / Tour Capsule',
    isOpeningOrder: false,
    minimumCommitment: 1000,
    quantityOrdered: 0,
    quantityPaid: 0,
    quantityFulfilled: 0,
    outstandingCommitment: 1000,
    status: 'Pending Order',
    notes: 'Subsequent collection commitment: minimum 1,000 pieces.',
    updatedAt: '2026-10-14T14:30:00Z',
  },
];

// ==============================================================================
// LOCAL CACHING HELPERS
// ==============================================================================

function getLocalSettings(): WholesaleProgramSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WHOLESALE_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse wholesale program settings from cache:', e);
  }
  return {
    id: 'default',
    partnershipLevels: DEFAULT_PARTNERSHIP_LEVELS,
    enabledCategories: ['T-Shirt', 'Caps'],
    pricingTiers: DEFAULT_PRICING_TIERS,
    combineMixedQuantitiesForTiers: false,
    marketingBenefitTiers: DEFAULT_MARKETING_BENEFITS,
    currencyRates: DEFAULT_CURRENCY_RATES,
    annualCollectionsCount: 4,
    collectionMinimumPieces: 1000,
    plannedAnnualMinimumPieces: 4000,
    contractTermMonths: 12,
    collectionSchedule: DEFAULT_COLLECTION_SCHEDULE,
    updatedAt: new Date().toISOString(),
  };
}

function saveLocalSettings(settings: WholesaleProgramSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_WHOLESALE_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not write wholesale settings to localStorage:', e);
  }
}

function getLocalOffers(): AgentCommercialOffer[] {
  let stored: AgentCommercialOffer[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMMERCIAL_OFFERS);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse commercial offers cache:', e);
  }

  // Ensure foundational initial proposals exist
  const merged = [...stored];
  for (const initOffer of INITIAL_SYSTEM_COMMERCIAL_OFFERS) {
    const exists = merged.some(
      o => o.offerReference === initOffer.offerReference || o.id === initOffer.id
    );
    if (!exists) {
      merged.push(initOffer);
    }
  }
  return merged;
}

function saveLocalOffers(offers: AgentCommercialOffer[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COMMERCIAL_OFFERS, JSON.stringify(offers));
  } catch (e) {
    console.warn('Could not write commercial offers to localStorage:', e);
  }
}

function getLocalCollectionOrders(): DistributorCollectionOrderRecord[] {
  let stored: DistributorCollectionOrderRecord[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLLECTION_ORDERS);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse collection orders cache:', e);
  }

  const merged = [...stored];
  for (const initRec of INITIAL_COLLECTION_ORDERS) {
    const exists = merged.some(r => r.id === initRec.id);
    if (!exists) {
      merged.push(initRec);
    }
  }
  return merged;
}

function saveLocalCollectionOrders(records: DistributorCollectionOrderRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COLLECTION_ORDERS, JSON.stringify(records));
  } catch (e) {
    console.warn('Could not write collection orders to localStorage:', e);
  }
}

// ==============================================================================
// SERVICE IMPLEMENTATION
// ==============================================================================

export const wholesaleProgramService = {
  /**
   * Get all active wholesale program settings (Admin editable).
   */
  async getSettings(): Promise<WholesaleProgramSettings> {
    try {
      const { data, error } = await fromAny('wholesale_program_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          partnershipLevels: data.partnership_levels || DEFAULT_PARTNERSHIP_LEVELS,
          enabledCategories: data.enabled_categories || ['T-Shirt', 'Caps'],
          pricingTiers: data.pricing_tiers || DEFAULT_PRICING_TIERS,
          combineMixedQuantitiesForTiers: Boolean(data.combine_mixed_quantities_for_tiers),
          marketingBenefitTiers: data.marketing_benefit_tiers || DEFAULT_MARKETING_BENEFITS,
          currencyRates: data.currency_rates || DEFAULT_CURRENCY_RATES,
          updatedAt: data.updated_at || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('Supabase wholesale settings query failed, using cache:', e);
    }
    return getLocalSettings();
  },

  /**
   * Save wholesale program settings (Admin action).
   */
  async saveSettings(settings: WholesaleProgramSettings): Promise<boolean> {
    const payload = {
      id: 'default',
      partnership_levels: settings.partnershipLevels,
      enabled_categories: settings.enabledCategories,
      pricing_tiers: settings.pricingTiers,
      combine_mixed_quantities_for_tiers: settings.combineMixedQuantitiesForTiers,
      marketing_benefit_tiers: settings.marketingBenefitTiers,
      currency_rates: settings.currencyRates,
      updated_at: new Date().toISOString(),
    };

    try {
      await fromAny('wholesale_program_settings').upsert(payload);
    } catch (e) {
      console.warn('Could not upsert wholesale settings in Supabase:', e);
    }

    saveLocalSettings({ ...settings, updatedAt: new Date().toISOString() });
    return true;
  },

  /**
   * Reset settings to African Boy default program terms.
   */
  async resetSettingsToDefaults(): Promise<WholesaleProgramSettings> {
    const defaults: WholesaleProgramSettings = {
      id: 'default',
      partnershipLevels: DEFAULT_PARTNERSHIP_LEVELS,
      enabledCategories: ['T-Shirt', 'Caps'],
      pricingTiers: DEFAULT_PRICING_TIERS,
      combineMixedQuantitiesForTiers: false,
      marketingBenefitTiers: DEFAULT_MARKETING_BENEFITS,
      currencyRates: DEFAULT_CURRENCY_RATES,
      updatedAt: new Date().toISOString(),
    };
    await this.saveSettings(defaults);
    return defaults;
  },

  /**
   * Normalize product category name to match tier key.
   */
  normalizeCategory(categoryName?: string): string {
    if (!categoryName) return 'Other';
    const clean = categoryName.toLowerCase().trim();
    if (clean === 't-shirt' || clean.includes('t-shirt') || clean.includes('tee')) return 'T-Shirt';
    if (clean.includes('cap') || clean.includes('hat')) return 'Caps';
    if (clean.includes('socks')) return 'Socks';
    if (clean.includes('boxer') || clean.includes('underwear')) return 'Boxer';
    if (clean.includes('footwear') || clean.includes('shoe') || clean.includes('sneaker')) return 'Footwear';
    if (clean.includes('jacket') || clean.includes('coat')) return 'Jackets';
    return categoryName;
  },

  /**
   * Calculate wholesale unit price for a given category and quantity based on configured tiers.
   */
  getTierForCategory(
    category: string,
    quantity: number,
    settings: WholesaleProgramSettings
  ): { unitPriceTZS: number; tierLabel: string; tierFound: boolean } {
    const normCategory = this.normalizeCategory(category);
    const tiers = settings.pricingTiers[normCategory] || DEFAULT_PRICING_TIERS[normCategory];

    if (!tiers || tiers.length === 0) {
      // Fallback default prices if no specific tier configured
      const defaultPrice = normCategory === 'T-Shirt' ? 35000 : normCategory === 'Caps' ? 22000 : 30000;
      return { unitPriceTZS: defaultPrice, tierLabel: 'Standard Wholesale', tierFound: false };
    }

    // Sort tiers ascending by minQuantity
    const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

    // Find the highest matching tier where quantity >= minQuantity
    let matchedTier: WholesalePricingTier | null = null;
    for (const tier of sorted) {
      if (quantity >= tier.minQuantity) {
        if (tier.maxQuantity === null || quantity <= tier.maxQuantity) {
          matchedTier = tier;
        } else if (quantity > tier.maxQuantity) {
          matchedTier = tier; // candidate for higher tier
        }
      }
    }

    if (matchedTier) {
      return {
        unitPriceTZS: matchedTier.unitPriceTZS,
        tierLabel: matchedTier.label,
        tierFound: true,
        requiresReview: false,
      };
    }

    // If quantity is below the minimum tier MOQ (e.g., Caps < 300, T-shirts < 500),
    // do not invent an unlisted tier; flag for authorised review.
    const lowestTier = sorted[0];
    return {
      unitPriceTZS: lowestTier.unitPriceTZS,
      tierLabel: `Requires Authorised Review (<${lowestTier.minQuantity} units)`,
      tierFound: false,
      requiresReview: true,
    };
  },

  /**
   * Convert price from TZS to target currency using configured rates.
   */
  convertCurrency(amountTZS: number, targetCurrency: string, rates?: Record<string, number>): number {
    if (!targetCurrency || targetCurrency === 'TZS') return Math.round(amountTZS);
    const activeRates = rates || DEFAULT_CURRENCY_RATES;
    const rate = activeRates[targetCurrency];
    if (!rate) return Math.round(amountTZS);

    const converted = amountTZS * rate;
    // For USD, EUR, GBP round to 2 decimals; for KES, NGN, TZS round to integer
    if (['USD', 'EUR', 'GBP'].includes(targetCurrency)) {
      return Math.round(converted * 100) / 100;
    }
    return Math.round(converted);
  },

  /**
   * Core Wholesale Pricing Engine Calculation:
   * Accurately calculates line totals, tier matched, merchandise subtotal,
   * currency conversion, and enforces that international shipping is NEVER
   * calculated unless explicitly confirmed.
   */
  calculateQuotation(
    items: Array<{
      productId: string;
      name: string;
      sku?: string;
      category: string;
      quantity: number;
      retailPrice?: number;
      customUnitPrice?: number;
      size?: string;
      color?: string;
      imageUrl?: string;
    }>,
    options?: {
      targetCurrency?: string;
      confirmedShippingRate?: number | null;
      settings?: WholesaleProgramSettings;
      combineMixedQuantities?: boolean;
    }
  ): {
    proposalItems: CommercialProposalItem[];
    totalUnits: number;
    merchandiseSubtotalTZS: number;
    merchandiseSubtotalConverted: number;
    confirmedShippingRate: number | null;
    grandTotalConverted: number;
    currency: string;
    isShippingExcluded: boolean;
    shippingDisclaimer: string;
    tierQualificationMode: 'combined' | 'per_category';
    meetsMinimumOpeningOrder: boolean;
    requiresAuthorisedReview: boolean;
    validationMessage?: string;
  } {
    const settings = options?.settings || getLocalSettings();
    const currency = options?.targetCurrency || 'TZS';
    const combineMixed =
      options?.combineMixedQuantities !== undefined
        ? options.combineMixedQuantities
        : settings.combineMixedQuantitiesForTiers;

    const totalUnits = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    let hasItemRequiringReview = false;

    const proposalItems: CommercialProposalItem[] = items.map(item => {
      const normCat = this.normalizeCategory(item.category);
      // If combineMixedQuantities is enabled, the total units of the entire order qualifies the tier;
      // otherwise, strictly this item/category's quantity determines the tier.
      const qualificationQty = combineMixed ? totalUnits : item.quantity;
      const tierResult = this.getTierForCategory(normCat, qualificationQty, settings);

      if (tierResult.requiresReview) {
        hasItemRequiringReview = true;
      }

      const unitPriceTZS = item.customUnitPrice !== undefined ? item.customUnitPrice : tierResult.unitPriceTZS;
      const lineTotalTZS = unitPriceTZS * (Number(item.quantity) || 0);

      const convertedUnitPrice = this.convertCurrency(unitPriceTZS, currency, settings.currencyRates);
      const convertedLineTotal = this.convertCurrency(lineTotalTZS, currency, settings.currencyRates);

      return {
        productId: item.productId,
        name: item.name,
        sku: item.sku || `AFB-${normCat.substring(0, 3).toUpperCase()}-001`,
        category: normCat,
        quantity: item.quantity,
        unitPrice: convertedUnitPrice,
        retailPrice: this.convertCurrency(item.retailPrice || (normCat === 'T-Shirt' ? 45000 : 35000), currency, settings.currencyRates),
        lineTotal: convertedLineTotal,
        appliedTierLabel: tierResult.tierLabel,
        size: item.size || 'Standard',
        color: item.color || 'Signature Black',
        imageUrl: item.imageUrl,
      };
    });

    const merchandiseSubtotalConverted = proposalItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const merchandiseSubtotalTZS = items.reduce((sum, item) => {
      const normCat = this.normalizeCategory(item.category);
      const qualificationQty = combineMixed ? totalUnits : item.quantity;
      const tierResult = this.getTierForCategory(normCat, qualificationQty, settings);
      const unitPriceTZS = item.customUnitPrice !== undefined ? item.customUnitPrice : tierResult.unitPriceTZS;
      return sum + unitPriceTZS * item.quantity;
    }, 0);

    const hasConfirmedShipping =
      options?.confirmedShippingRate !== null &&
      options?.confirmedShippingRate !== undefined &&
      options.confirmedShippingRate > 0;

    const confirmedShippingRate = hasConfirmedShipping ? options!.confirmedShippingRate! : null;
    const grandTotalConverted = merchandiseSubtotalConverted + (confirmedShippingRate || 0);

    const meetsMinimumOpeningOrder = totalUnits >= 1000;
    const requiresAuthorisedReview = hasItemRequiringReview || !meetsMinimumOpeningOrder;
    let validationMessage: string | undefined;
    if (!meetsMinimumOpeningOrder) {
      validationMessage = `Country Distributor minimum opening order is 1,000 pieces. Current total is ${totalUnits} pieces.`;
    } else if (hasItemRequiringReview) {
      validationMessage = 'One or more items are below standard category tier volume and require authorised commercial review.';
    }

    return {
      proposalItems,
      totalUnits,
      merchandiseSubtotalTZS,
      merchandiseSubtotalConverted,
      confirmedShippingRate,
      grandTotalConverted,
      currency,
      isShippingExcluded: !hasConfirmedShipping,
      shippingDisclaimer: SHIPPING_TAXES_DISCLAIMER,
      tierQualificationMode: combineMixed ? 'combined' : 'per_category',
      meetsMinimumOpeningOrder,
      requiresAuthorisedReview,
      validationMessage,
    };
  },

  /**
   * Filter only enabled products from the catalogue for wholesale availability.
   * Default enabled: T-shirts and Caps.
   */
  getEnabledWholesaleProducts(allProducts: Product[], settings?: WholesaleProgramSettings): Product[] {
    const activeSettings = settings || getLocalSettings();
    const enabledCategories = activeSettings.enabledCategories.map(c => c.toLowerCase());

    return allProducts.filter(p => {
      const normCat = this.normalizeCategory(p.category).toLowerCase();
      const pCat = p.category.toLowerCase();
      return (
        enabledCategories.includes(normCat) ||
        enabledCategories.some(ec => pCat.includes(ec) || ec.includes(pCat))
      );
    });
  },

  // ==============================================================================
  // COMMERCIAL OFFERS CRUD & LIFECYCLE
  // ==============================================================================

  /**
   * Create or update a commercial offer for an application.
   */
  async saveOffer(offer: Partial<AgentCommercialOffer> & { applicationId: string }): Promise<AgentCommercialOffer> {
    const existingOffers = getLocalOffers();
    const existingIndex = existingOffers.findIndex(o => o.applicationId === offer.applicationId || (offer.id && o.id === offer.id));

    const offerReference =
      offer.offerReference ||
      `ABO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newOffer: AgentCommercialOffer = {
      id: offer.id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(offer.id) ? offer.id : crypto.randomUUID(),
      offerReference,
      applicationId: offer.applicationId,
      agentId: offer.agentId || null,
      applicantName: offer.applicantName || 'Valued Applicant',
      businessName: offer.businessName || null,
      partnershipLevel: offer.partnershipLevel || 'Wholesale Reseller',
      destinationCountry: offer.destinationCountry || 'Tanzania',
      destinationCity: offer.destinationCity || 'Dar es Salaam',
      territory: offer.territory || `${offer.destinationCity || 'National'}, ${offer.destinationCountry || 'Tanzania'}`,
      isExclusive: Boolean(offer.isExclusive),
      exclusivityTerms: offer.exclusivityTerms || null,
      currency: offer.currency || 'TZS',
      proposedItems: offer.proposedItems || [],
      totalUnits: offer.totalUnits || 0,
      merchandiseSubtotal: offer.merchandiseSubtotal || 0,
      confirmedShippingRate: offer.confirmedShippingRate !== undefined ? offer.confirmedShippingRate : null,
      shippingTerms: offer.shippingTerms || '',
      shippingDisclaimer: offer.shippingDisclaimer || SHIPPING_TAXES_DISCLAIMER,
      paymentTerms: offer.paymentTerms || '100% Pre-payment via Bank Wire Transfer prior to order dispatch',
      marketingBenefits: offer.marketingBenefits || [],
      artistDisclaimer: offer.artistDisclaimer || LEGAL_ARTIST_DISCLAIMER,
      internalNotes: offer.internalNotes || null,
      expiryDate: offer.expiryDate || new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      status: offer.status || 'Draft',
      acceptedAt: offer.acceptedAt || null,
      acceptedBySignature: offer.acceptedBySignature || null,
      acceptanceNotes: offer.acceptanceNotes || null,
      createdAt: offer.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commercialTerms: {
        ...(offer.commercialTerms || {}),
        contractTermMonths: 12,
        annualCollections: 4,
        minimumOrderPerCollection: 1000,
        plannedAnnualMinimum: 4000,
        collectionScheduleAgreement:
          'Each collection order must be placed and fulfilled under the agreed collection schedule and commercial terms.',
      },
      annualCollectionCommitment:
        offer.annualCollectionCommitment ||
        (offer.partnershipLevel === 'Country Distributor'
          ? {
              contractTermMonths: 12,
              collectionsPerYear: 4,
              minimumOrderPerCollection: 1000,
              plannedAnnualMinimum: 4000,
              statement:
                'Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.',
              distinctionRule:
                'The 1,000-piece requirement applies to EACH new collection, not merely to the distributor\'s initial opening order or total annual purchases.',
            }
          : undefined),
      flaggedForReview: offer.flaggedForReview ?? false,
      reviewRequiredReason: offer.reviewRequiredReason || undefined,
      isHistoricalBaseline: offer.isHistoricalBaseline ?? false,
      parentOfferReference: offer.parentOfferReference || null,
      version: offer.version || 1,
      supersededByOfferId: offer.supersededByOfferId || null,
      supersededByOfferRef: offer.supersededByOfferRef || null,
    };
    const amounts = getProposalAmounts(newOffer);
    newOffer.proposedItems = amounts.items;
    newOffer.totalUnits = amounts.totalUnits;
    newOffer.merchandiseSubtotal = amounts.goodsValue;

    // Persist before returning a downloadable offer
    try {
      const { data, error } = await fromAny('agent_commercial_offers').upsert({
        id: newOffer.id,
        offer_reference: newOffer.offerReference,
        application_id: newOffer.applicationId,
        agent_id: newOffer.agentId,
        applicant_name: newOffer.applicantName,
        business_name: newOffer.businessName,
        partnership_level: newOffer.partnershipLevel,
        destination_country: newOffer.destinationCountry,
        destination_city: newOffer.destinationCity,
        territory: newOffer.territory,
        is_exclusive: newOffer.isExclusive,
        exclusivity_terms: newOffer.exclusivityTerms,
        currency: newOffer.currency,
        proposed_items: newOffer.proposedItems,
        total_units: newOffer.totalUnits,
        merchandise_subtotal: newOffer.merchandiseSubtotal,
        confirmed_shipping_rate: newOffer.confirmedShippingRate,
        shipping_terms: newOffer.shippingTerms,
        shipping_disclaimer: newOffer.shippingDisclaimer,
        payment_terms: newOffer.paymentTerms,
        marketing_benefits: newOffer.marketingBenefits,
        artist_disclaimer: newOffer.artistDisclaimer,
        internal_notes: newOffer.internalNotes,
        expiry_date: newOffer.expiryDate,
        status: newOffer.status,
        accepted_at: newOffer.acceptedAt,
        accepted_by_signature: newOffer.acceptedBySignature,
        acceptance_notes: newOffer.acceptanceNotes,
        created_at: newOffer.createdAt,
        commercial_terms: newOffer.commercialTerms,
        annual_collection_commitment: newOffer.annualCollectionCommitment,
        flagged_for_review: newOffer.flaggedForReview,
        review_required_reason: newOffer.reviewRequiredReason,
        is_historical_baseline: newOffer.isHistoricalBaseline,
        parent_offer_reference: newOffer.parentOfferReference,
        version: newOffer.version,
        updated_at: new Date().toISOString(),
      }).select('*').single();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('The proposal was not saved. Please try again.');
      Object.assign(newOffer, this.mapDbOfferToType(data));
    } catch (e) {
      throw e instanceof Error ? e : new Error('Could not save the proposal. Please try again.');
    }

    if (existingIndex > -1) {
      existingOffers[existingIndex] = newOffer;
    } else {
      existingOffers.unshift(newOffer);
    }
    saveLocalOffers(existingOffers);

    return newOffer;
  },

  /**
   * Get all commercial offers across the system.
   */
  async getAllOffers(): Promise<AgentCommercialOffer[]> {
    try {
      const { data, error } = await fromAny('agent_commercial_offers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const dbOffers = data.map(d => this.mapDbOfferToType(d));
        const localOffers = getLocalOffers();
        const mergedMap = new Map<string, AgentCommercialOffer>();
        for (const o of localOffers) mergedMap.set(o.offerReference, o);
        for (const o of dbOffers) mergedMap.set(o.offerReference, o);
        return Array.from(mergedMap.values());
      }
    } catch (e) {
      console.warn('Supabase getAllOffers query failed, using local offers:', e);
    }
    return getLocalOffers();
  },

  /**
   * Get commercial offer by offer reference.
   */
  async getOfferByReference(ref: string): Promise<AgentCommercialOffer | null> {
    try {
      const { data, error } = await fromAny('agent_commercial_offers')
        .select('*')
        .eq('offer_reference', ref)
        .maybeSingle();
      if (!error && data) {
        return this.mapDbOfferToType(data);
      }
    } catch (e) {
      console.warn('Supabase getOfferByReference query failed:', e);
    }
    const localOffers = getLocalOffers();
    return localOffers.find(o => o.offerReference === ref) || null;
  },

  /**
   * Get commercial offer by application ID.
   */
  async getOfferByApplicationId(applicationId: string): Promise<AgentCommercialOffer | null> {
    try {
      const { data, error } = await fromAny('agent_commercial_offers')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return this.mapDbOfferToType(data);
      }
    } catch (e) {
      console.warn('Supabase offer query failed, looking up cache:', e);
    }

    const localOffers = getLocalOffers();
    return localOffers.find(o => o.applicationId === applicationId) || null;
  },

  /**
   * Get commercial offer for an active agent.
   */
  async getOfferByAgentId(agentId: string): Promise<AgentCommercialOffer | null> {
    try {
      const { data, error } = await fromAny('agent_commercial_offers')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return this.mapDbOfferToType(data);
      }
    } catch (e) {
      console.warn('Supabase agent offer query failed:', e);
    }

    const localOffers = getLocalOffers();
    return localOffers.find(o => o.agentId === agentId) || null;
  },

  /**
   * Issue a revised proposal or addendum reflecting the 4 annual collections commitment (1,000 pcs per collection, 4,000 pcs/year).
   * Does NOT overwrite or destroy the existing historical proposal.
   */
  async issueRevisedProposal(
    parentOfferIdOrRef: string,
    options?: { newNotes?: string }
  ): Promise<AgentCommercialOffer> {
    const allOffers = getLocalOffers();
    const parentOffer =
      allOffers.find(o => o.id === parentOfferIdOrRef || o.offerReference === parentOfferIdOrRef);

    if (!parentOffer) {
      throw new Error(`Parent proposal ${parentOfferIdOrRef} not found.`);
    }

    const currentVersion = parentOffer.version || 1;
    const newVersion = currentVersion + 1;
    const baseRef = parentOffer.offerReference.replace(/-REV\d+$/, '');
    const revisedRef = `${baseRef}-REV${newVersion - 1}`;

    const revisedOffer: AgentCommercialOffer = {
      id: crypto.randomUUID(),
      offerReference: revisedRef,
      applicationId: parentOffer.applicationId,
      agentId: parentOffer.agentId || null,
      applicantName: parentOffer.applicantName,
      businessName: parentOffer.businessName,
      partnershipLevel: parentOffer.partnershipLevel,
      destinationCountry: parentOffer.destinationCountry,
      destinationCity: parentOffer.destinationCity,
      territory: parentOffer.territory,
      isExclusive: parentOffer.isExclusive,
      exclusivityTerms:
        'National territory exclusivity is governed by the signed distribution agreement and is strictly conditional upon purchasing and fulfilling a minimum of 1,000 pieces per collection across African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.',
      currency: parentOffer.currency,
      proposedItems: [...parentOffer.proposedItems],
      totalUnits: parentOffer.totalUnits,
      merchandiseSubtotal: parentOffer.merchandiseSubtotal,
      confirmedShippingRate: parentOffer.confirmedShippingRate,
      shippingTerms: parentOffer.shippingTerms,
      shippingDisclaimer: parentOffer.shippingDisclaimer,
      paymentTerms: parentOffer.paymentTerms,
      marketingBenefits: [...parentOffer.marketingBenefits],
      artistDisclaimer: parentOffer.artistDisclaimer,
      internalNotes:
        options?.newNotes ||
        `Revised proposal issued following review of historical offer ${parentOffer.offerReference}. Reflects updated Country Distributor policy: 1,000 pieces per collection across 4 annual collections (planned 4,000 pieces per year). Sent to partner for review and acceptance.`,
      expiryDate: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
      status: 'Sent', // Sent to partner for review and acceptance; not assumed accepted
      acceptedAt: null,
      acceptedBySignature: null,
      acceptanceNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: newVersion,
      parentOfferReference: parentOffer.offerReference,
      flaggedForReview: false,
      isHistoricalBaseline: false,
      annualCollectionCommitment: {
        contractTermMonths: 12,
        collectionsPerYear: 4,
        minimumOrderPerCollection: 1000,
        plannedAnnualMinimum: 4000,
        statement:
          'Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.',
        distinctionRule:
          'The 1,000-piece requirement applies to EACH new collection, not merely to the distributor\'s initial opening order or total annual purchases.',
        complianceNotes:
          'Distributor opening order covers Collection 1. Subsequent collections (2, 3, 4) must be placed and fulfilled per the agreed collection calendar.',
      },
      commercialTerms: {
        ...parentOffer.commercialTerms,
        minimumReplenishmentOrder: '1,000 pieces per collection across 4 annual collections (4,000 pcs/year)',
        contractTermMonths: 12,
        annualCollections: 4,
        minimumOrderPerCollection: 1000,
        plannedAnnualMinimum: 4000,
        collectionScheduleAgreement:
          'Each collection order must be placed and fulfilled under the agreed collection schedule and commercial terms.',
      },
    };

    // Save revised offer
    await this.saveOffer(revisedOffer);

    // Update parent offer link while preserving all original historical values
    parentOffer.supersededByOfferRef = revisedOffer.offerReference;
    parentOffer.supersededByOfferId = revisedOffer.id;
    parentOffer.updatedAt = new Date().toISOString();

    const currentOffers = getLocalOffers();
    const parentIdx = currentOffers.findIndex(
      o => o.id === parentOffer.id || o.offerReference === parentOffer.offerReference
    );
    if (parentIdx > -1) {
      currentOffers[parentIdx] = parentOffer;
      saveLocalOffers(currentOffers);
    }

    return revisedOffer;
  },

  /**
   * Get collection tracking records for a Country Distributor.
   * Tracks opening order vs subsequent collections individually.
   */
  async getCollectionTrackingForDistributor(agentIdOrAppId: string): Promise<DistributorCollectionOrderRecord[]> {
    try {
      const { data, error } = await fromAny('distributor_collection_orders')
        .select('*')
        .or(`application_id.eq.${agentIdOrAppId},agent_id.eq.${agentIdOrAppId}`)
        .order('collection_number', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          agentId: d.agent_id,
          applicationId: d.application_id,
          collectionId: d.collection_id,
          collectionNumber: d.collection_number,
          collectionName: d.collection_name,
          isOpeningOrder: Boolean(d.is_opening_order),
          minimumCommitment: Number(d.minimum_commitment) || 1000,
          quantityOrdered: Number(d.quantity_ordered) || 0,
          quantityPaid: Number(d.quantity_paid) || 0,
          quantityFulfilled: Number(d.quantity_fulfilled) || 0,
          outstandingCommitment: Math.max(0, (Number(d.minimum_commitment) || 1000) - (Number(d.quantity_ordered) || 0)),
          status: d.status || 'Pending Order',
          orderReference: d.order_reference,
          orderDate: d.order_date,
          notes: d.notes,
          updatedAt: d.updated_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('Supabase collection orders query failed, using cache:', e);
    }

    const localRecords = getLocalCollectionOrders();
    const matching = localRecords.filter(
      r => r.applicationId === agentIdOrAppId || r.agentId === agentIdOrAppId
    );

    if (matching.length > 0) {
      return matching.sort((a, b) => a.collectionNumber - b.collectionNumber);
    }

    // Default 4 collection tracking schedule
    const schedule = DEFAULT_COLLECTION_SCHEDULE;
    const generated: DistributorCollectionOrderRecord[] = schedule.map(item => ({
      id: `col-rec-${agentIdOrAppId}-${item.collectionNumber}`,
      applicationId: agentIdOrAppId,
      agentId: null,
      collectionId: item.id,
      collectionNumber: item.collectionNumber,
      collectionName: item.name,
      isOpeningOrder: Boolean(item.isOpeningOrder),
      minimumCommitment: item.minimumOrderPieces || 1000,
      quantityOrdered: item.isOpeningOrder ? 1000 : 0,
      quantityPaid: 0,
      quantityFulfilled: 0,
      outstandingCommitment: item.isOpeningOrder ? 0 : (item.minimumOrderPieces || 1000),
      status: item.isOpeningOrder ? 'Order Placed' : 'Pending Order',
      notes: item.notes,
      updatedAt: new Date().toISOString(),
    }));

    saveLocalCollectionOrders([...localRecords, ...generated]);
    return generated;
  },

  /**
   * Save or update a distributor collection tracking record.
   */
  async saveCollectionTrackingRecord(record: DistributorCollectionOrderRecord): Promise<void> {
    const localRecords = getLocalCollectionOrders();
    const idx = localRecords.findIndex(
      r => r.id === record.id || (r.applicationId === record.applicationId && r.collectionNumber === record.collectionNumber)
    );
    if (idx > -1) {
      localRecords[idx] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      localRecords.push({ ...record, updatedAt: new Date().toISOString() });
    }
    saveLocalCollectionOrders(localRecords);

    try {
      await fromAny('distributor_collection_orders').upsert({
        id: record.id,
        agent_id: record.agentId || null,
        application_id: record.applicationId || null,
        collection_id: record.collectionId,
        collection_number: record.collectionNumber,
        collection_name: record.collectionName,
        is_opening_order: record.isOpeningOrder,
        minimum_commitment: record.minimumCommitment,
        quantity_ordered: record.quantityOrdered,
        quantity_paid: record.quantityPaid,
        quantity_fulfilled: record.quantityFulfilled,
        status: record.status,
        order_reference: record.orderReference || null,
        order_date: record.orderDate || null,
        notes: record.notes || null,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not upsert collection order to database:', e);
    }
  },

  /**
   * Record Acceptance action: logs applicant acceptance of the proposal.
   */
  async recordOfferAcceptance(
    offerId: string,
    signatureName: string,
    acceptanceNotes?: string
  ): Promise<{ success: boolean; offer?: AgentCommercialOffer; error?: string }> {
    try {
      await fromAny('agent_commercial_offers')
        .update({
          status: 'Accepted',
          accepted_at: new Date().toISOString(),
          accepted_by_signature: signatureName,
          acceptance_notes: acceptanceNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);
    } catch (e) {
      console.warn('DB update for offer acceptance failed, updating cache:', e);
    }

    const localOffers = getLocalOffers();
    const offer = localOffers.find(o => o.id === offerId);
    if (!offer) {
      return { success: false, error: 'Offer not found' };
    }

    offer.status = 'Accepted';
    offer.acceptedAt = new Date().toISOString();
    offer.acceptedBySignature = signatureName;
    offer.acceptanceNotes = acceptanceNotes || null;
    offer.updatedAt = new Date().toISOString();

    saveLocalOffers(localOffers);
    return { success: true, offer };
  },

  /**
   * Map database row to AgentCommercialOffer.
   */
  mapDbOfferToType(data: any): AgentCommercialOffer {
    return {
      id: data.id,
      offerReference: data.offer_reference,
      applicationId: data.application_id,
      agentId: data.agent_id,
      applicantName: data.applicant_name,
      businessName: data.business_name,
      partnershipLevel: data.partnership_level,
      destinationCountry: data.destination_country,
      destinationCity: data.destination_city,
      territory: data.territory,
      isExclusive: Boolean(data.is_exclusive),
      exclusivityTerms: data.exclusivity_terms,
      currency: data.currency,
      proposedItems: Array.isArray(data.proposed_items) ? data.proposed_items : [],
      totalUnits: Number(data.total_units) || 0,
      merchandiseSubtotal: Number(data.merchandise_subtotal) || 0,
      confirmedShippingRate: data.confirmed_shipping_rate != null ? Number(data.confirmed_shipping_rate) : null,
      shippingTerms: data.shipping_terms || '',
      shippingDisclaimer: data.shipping_disclaimer || SHIPPING_TAXES_DISCLAIMER,
      paymentTerms: data.payment_terms,
      marketingBenefits: Array.isArray(data.marketing_benefits) ? data.marketing_benefits : [],
      artistDisclaimer: data.artist_disclaimer || LEGAL_ARTIST_DISCLAIMER,
      internalNotes: data.internal_notes,
      expiryDate: data.expiry_date,
      status: data.status,
      acceptedAt: data.accepted_at,
      acceptedBySignature: data.accepted_by_signature,
      acceptanceNotes: data.acceptance_notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      commercialTerms: data.commercial_terms || {},
      annualCollectionCommitment: data.annual_collection_commitment || undefined,
      flaggedForReview: Boolean(data.flagged_for_review),
      reviewRequiredReason: data.review_required_reason || undefined,
      isHistoricalBaseline: Boolean(data.is_historical_baseline),
      parentOfferReference: data.parent_offer_reference || null,
      version: data.version || 1,
      supersededByOfferId: data.superseded_by_offer_id || null,
      supersededByOfferRef: data.superseded_by_offer_ref || null,
    };
  },

  /**
   * Download official agreement/proposal PDF for an approved agent.
   */
  async downloadAgentAgreementPdf(agentProfile: any): Promise<void> {
    const { downloadCommercialProposalPdf } = await import('@/utils/generateCommercialProposalPdf');

    // Check if an existing stored offer exists
    let offer = await this.getOfferByAgentId(agentProfile.id);
    if (!offer && agentProfile.application_id) {
      offer = await this.getOfferByApplicationId(agentProfile.application_id);
    }

    if (!offer) throw new Error('No saved wholesale proposal exists for this partner. Ask the commercial team to prepare an offer.');

    // Re-read the exact saved row; never export a stale local agreement.
    const { data, error } = await fromAny('agent_commercial_offers').select('*').eq('id', offer.id).single();
    if (error || !data) throw new Error('The saved proposal could not be loaded. Please try again.');
    const { data: application } = await fromAny('agent_applications').select('*').eq('id', data.application_id).maybeSingle();
    const { data: business } = await fromAny('invoice_settings').select('business_name,business_address,city,country,email,phone,website,contact_person').eq('store_id', 1).maybeSingle();
    downloadCommercialProposalPdf(this.mapDbOfferToType(data), application, business || {});
  },
};
