import { fromAny } from '@/lib/supabase-helpers';
import { supabase } from '@/integrations/supabase/client';
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
    id: 'wholesale_reseller',
    name: 'Wholesale Reseller',
    tagline: 'Ideal for independent fashion boutiques, concept stores, and vetted streetwear retailers.',
    defaultMoq: 30,
    defaultWholesaleDiscountPercent: 25,
    supportedCurrencies: ['TZS', 'USD', 'KES', 'NGN', 'GBP', 'EUR', 'ZAR'],
    defaultCurrency: 'TZS',
    eligibilityRules: [
      'Operating physical boutique or registered online fashion store',
      'Minimum opening order volume of 30 units across approved categories',
      'Commitment to African Boy minimum retail price (MAP) integrity',
      'Quarterly stock replenishment cadence',
    ],
    benefits: [
      'Official wholesale tier pricing (Tier 1)',
      'High-resolution digital lookbook & official logo assets',
      'Brand guideline kit & product authenticity verification assets',
      'Access to standard factory replenishment cycles',
    ],
    exclusivityAllowed: false,
  },
  {
    id: 'premium_market_agent',
    name: 'Premium Market Agent',
    tagline: 'For established multi-door retailers, regional brand operators, and high-volume commercial partners.',
    defaultMoq: 50,
    defaultWholesaleDiscountPercent: 32,
    supportedCurrencies: ['TZS', 'USD', 'KES', 'NGN', 'GBP', 'EUR', 'ZAR'],
    defaultCurrency: 'TZS',
    eligibilityRules: [
      'Minimum 2 years verified retail/wholesale distribution experience',
      'Minimum opening order of 50 units',
      'Dedicated African Boy visual merchandising space or prominent display',
      'Active local social media presence with engaged fashion following',
    ],
    benefits: [
      'Advantageous tier pricing (Tier 2 volume discount)',
      'Priority allocation on high-demand capsule releases & drops',
      'Official African Boy website and social channels stockist listing',
      'Co-branded digital launch campaign assets and story templates',
      'In-store visual display guides and window decal artwork package',
    ],
    exclusivityAllowed: true,
    defaultExclusivityTerms: 'City-wide or metropolitan zone exclusivity subject to maintaining minimum 75 units/quarter replenishment.',
  },
  {
    id: 'country_distributor',
    name: 'Country Distributor',
    tagline: 'Nationwide exclusivity and master wholesale supply for leading national distributors.',
    defaultMoq: 100,
    defaultWholesaleDiscountPercent: 38,
    supportedCurrencies: ['TZS', 'USD', 'KES', 'NGN', 'GBP', 'EUR', 'ZAR'],
    defaultCurrency: 'TZS',
    eligibilityRules: [
      'Registered corporate distribution or import/export entity in target country',
      'Bonded warehouse / verified logistics & regional sub-retailer network',
      'Minimum opening order commitment of 100+ units',
      'Capability to manage nationwide logistics and retail accounts',
    ],
    benefits: [
      'Maximum wholesale tier pricing (Tier 3)',
      'Territory exclusivity across the entire designated country or province',
      'Dedicated African Boy commercial account executive & direct HQ liaison',
      'National official launch announcement & press support',
      'Brand activation sponsorship support for regional pop-up events',
      'Eligibility to submit requests for artist-led digital promotional engagements',
    ],
    exclusivityAllowed: true,
    defaultExclusivityTerms: 'National exclusivity granted with semi-annual review based on meeting mutually agreed replenishment volume milestones.',
  },
];

export const DEFAULT_PRICING_TIERS: Record<string, WholesalePricingTier[]> = {
  'T-Shirt': [
    {
      id: 'tshirt-tier-1',
      category: 'T-Shirt',
      label: '30–49 Units Tier',
      minQuantity: 30,
      maxQuantity: 49,
      unitPriceTZS: 35000,
    },
    {
      id: 'tshirt-tier-2',
      category: 'T-Shirt',
      label: '50–99 Units Tier',
      minQuantity: 50,
      maxQuantity: 99,
      unitPriceTZS: 32000,
    },
    {
      id: 'tshirt-tier-3',
      category: 'T-Shirt',
      label: '100+ Units Tier',
      minQuantity: 100,
      maxQuantity: null,
      unitPriceTZS: 30000,
    },
  ],
  Caps: [
    {
      id: 'cap-tier-1',
      category: 'Caps',
      label: '30–49 Units Tier',
      minQuantity: 30,
      maxQuantity: 49,
      unitPriceTZS: 22000,
    },
    {
      id: 'cap-tier-2',
      category: 'Caps',
      label: '50–99 Units Tier',
      minQuantity: 50,
      maxQuantity: 99,
      unitPriceTZS: 20000,
    },
    {
      id: 'cap-tier-3',
      category: 'Caps',
      label: '100+ Units Tier',
      minQuantity: 100,
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMMERCIAL_OFFERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse commercial offers cache:', e);
  }
  return [];
}

function saveLocalOffers(offers: AgentCommercialOffer[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COMMERCIAL_OFFERS, JSON.stringify(offers));
  } catch (e) {
    console.warn('Could not write commercial offers to localStorage:', e);
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
      };
    }

    // If quantity is below the minimum tier MOQ, return first tier price with a warning note
    const lowestTier = sorted[0];
    return {
      unitPriceTZS: lowestTier.unitPriceTZS,
      tierLabel: `Below MOQ (<${lowestTier.minQuantity} units)`,
      tierFound: false,
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
  } {
    const settings = options?.settings || getLocalSettings();
    const currency = options?.targetCurrency || 'TZS';
    const combineMixed =
      options?.combineMixedQuantities !== undefined
        ? options.combineMixedQuantities
        : settings.combineMixedQuantitiesForTiers;

    const totalUnits = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const proposalItems: CommercialProposalItem[] = items.map(item => {
      const normCat = this.normalizeCategory(item.category);
      // If combineMixedQuantities is enabled, the total units of the entire order qualifies the tier;
      // otherwise, strictly this item/category's quantity determines the tier.
      const qualificationQty = combineMixed ? totalUnits : item.quantity;
      const tierResult = this.getTierForCategory(normCat, qualificationQty, settings);

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
    const merchandiseSubtotalTZS = items.reduce((sum, item, idx) => {
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
      id: offer.id || `offer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
      shippingTerms: offer.shippingTerms || 'Ex Works Dar es Salaam',
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
    };

    // Try Supabase insert/update
    try {
      await fromAny('agent_commercial_offers').upsert({
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
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to upsert offer in Supabase, cached locally:', e);
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
   * Get commercial offer by application ID.
   */
  async getOfferByApplicationId(applicationId: string): Promise<AgentCommercialOffer | null> {
    try {
      const { data, error } = await fromAny('agent_commercial_offers')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
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
      shippingTerms: data.shipping_terms || 'Ex Works Dar es Salaam',
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

    if (!offer) {
      // Build dynamic agreement offer representation based on profile terms
      const discount = agentProfile.wholesale_discount_percent || 30;
      const tshirtPrice = Math.round(45000 * (1 - discount / 100));
      const capPrice = Math.round(35000 * (1 - discount / 100));
      const moq = agentProfile.minimum_order_quantity || 30;

      const mockItems: CommercialProposalItem[] = [
        {
          productId: 'p-tshirt-core',
          name: 'African Boy Signature Tee (Authorized Wholesale)',
          sku: 'AFB-TEE-CORE',
          category: 'T-Shirt',
          quantity: moq,
          unitPrice: tshirtPrice,
          retailPrice: 45000,
          lineTotal: moq * tshirtPrice,
          appliedTierLabel: 'Approved Commercial Rate',
          size: 'Mixed Sizes (M-XXL)',
          color: 'Signature Black',
        },
        {
          productId: 'p-cap-core',
          name: 'African Boy Vintage Cap (Authorized Wholesale)',
          sku: 'AFB-CAP-CORE',
          category: 'Caps',
          quantity: 20,
          unitPrice: capPrice,
          retailPrice: 35000,
          lineTotal: 20 * capPrice,
          appliedTierLabel: 'Approved Commercial Rate',
          size: 'FREE SIZE',
          color: 'Vintage Black',
        },
      ];

      const subtotal = mockItems.reduce((s, i) => s + i.lineTotal, 0);
      offer = {
        id: `offer-${agentProfile.id}`,
        offerReference: agentProfile.agreement_reference || `AGR-${agentProfile.agent_code}-2026`,
        applicationId: agentProfile.application_id || 'app-authorized',
        agentId: agentProfile.id,
        applicantName: agentProfile.full_name,
        businessName: agentProfile.business_name || null,
        partnershipLevel: agentProfile.business_model,
        destinationCountry: agentProfile.assigned_country_name,
        destinationCity: agentProfile.assigned_territory.split(',')[0] || agentProfile.assigned_country_name,
        territory: agentProfile.assigned_territory,
        isExclusive: agentProfile.is_exclusive,
        exclusivityTerms: agentProfile.exclusivity_conditions || null,
        currency: agentProfile.currency || 'TZS',
        proposedItems: mockItems,
        totalUnits: mockItems.reduce((s, i) => s + i.quantity, 0),
        merchandiseSubtotal: subtotal,
        confirmedShippingRate: null,
        shippingTerms: 'Ex Works Dar es Salaam',
        shippingDisclaimer: SHIPPING_TAXES_DISCLAIMER,
        paymentTerms: agentProfile.payment_terms || '100% Pre-payment via Bank Wire Transfer prior to order dispatch',
        marketingBenefits: [
          'High-resolution digital lookbook & official African Boy logo suite',
          'Product marketing guidelines & brand asset pack',
          'Social media launch creative assets & story templates',
          'Official African Boy website and social channels stockist listing',
        ],
        artistDisclaimer: LEGAL_ARTIST_DISCLAIMER,
        internalNotes: null,
        expiryDate: agentProfile.agreement_end_date || '2026-12-31',
        status: 'Accepted',
        acceptedAt: agentProfile.created_at,
        acceptedBySignature: `${agentProfile.full_name} (Commercial Partner Signatory)`,
        createdAt: agentProfile.created_at,
        updatedAt: agentProfile.updated_at,
      };
    }

    downloadCommercialProposalPdf(offer, null);
  },
};
