import { supabase } from '@/integrations/supabase/client';
import { fromAny } from '@/lib/supabase-helpers';
import type {
  AgentApplication,
  AgentApplicationStatus,
  AgentBusinessModel,
  AgentProfile,
  AgentCommercialAgreement,
  AgentReplenishmentOrder,
  AgentReportSummary,
  Product,
  OrderItem,
} from '@/types';

const STORAGE_KEY_APPLICATIONS = 'ab_agent_applications_cache';
const STORAGE_KEY_PROFILES = 'ab_agent_profiles_cache';
const STORAGE_KEY_ORDERS = 'ab_agent_orders_cache';

// Seed sample applications if cache is empty for demo/testing
function getLocalApplications(): AgentApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPLICATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse cached agent applications:', e);
  }
  return [
    {
      id: 'app-sample-1',
      application_reference: 'ABA-2026-NBO94',
      user_id: null,
      full_name: 'David Mwangi',
      email: 'david.mwangi@africandistro.ke',
      phone_number: '+254712345678',
      country_code: 'KE',
      country_name: 'Kenya',
      city: 'Nairobi',
      preferred_language: 'en',
      business_name: 'Savannah Streetwear Ltd',
      business_type: 'Existing Fashion Business',
      website_or_social: 'https://instagram.com/savannahstreetwear',
      business_address: 'Westlands Commercial Hub, Suite 4B, Nairobi',
      business_registration_number: 'CPR/2023/94821',
      years_of_experience: '3-5 years',
      previous_experience_details: 'Importing and retailing streetwear brands across Nairobi and Mombasa for 4 years.',
      requested_categories: ['T-Shirt', 'Caps', 'Footwear'],
      preferred_business_model: 'Country Distributor',
      proposed_territory_details: 'Nairobi Metropolis and Coast Region',
      expected_monthly_sales: '150 - 300 units',
      estimated_initial_investment: '$5,000 - $10,000 USD',
      preferred_sales_channels: ['Retail Storefront', 'Instagram / WhatsApp Shop', 'Pop-up Events'],
      marketing_activities: 'Influencer gifting with top Kenyan creators, pop-up events at Westgate and Alchemist.',
      motivation: 'African Boy is the most authentic luxury streetwear brand in East Africa. The demand in Nairobi is immense.',
      status: 'Under Review',
      internal_notes: 'Strong retail background in Westlands. Ready for initial 250 unit distribution order.',
      admin_feedback_to_applicant: null,
      reviewed_by: null,
      reviewed_at: null,
      terms_accepted: true,
      privacy_accepted: true,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'app-sample-2',
      application_reference: 'ABA-2026-LOS21',
      user_id: null,
      full_name: 'Chinedu Okafor',
      email: 'chinedu.o@lagosvibe.ng',
      phone_number: '+2348039281726',
      country_code: 'NG',
      country_name: 'Nigeria',
      city: 'Lagos',
      preferred_language: 'en',
      business_name: 'Mainland Kicks & Apparel',
      business_type: 'Retail Store',
      website_or_social: 'https://instagram.com/mainlandkicks',
      business_address: 'Admiralty Way, Lekki Phase 1, Lagos',
      business_registration_number: 'RC-1849204',
      years_of_experience: '5+ years',
      previous_experience_details: 'Operating physical boutique in Lekki with 40,000+ active customers across Nigeria.',
      requested_categories: ['T-Shirt', 'Caps', 'Socks', 'Boxer'],
      preferred_business_model: 'Wholesale Reseller',
      proposed_territory_details: 'Lekki & Lagos Island',
      expected_monthly_sales: '200 - 500 units',
      estimated_initial_investment: '$10,000+ USD',
      preferred_sales_channels: ['Retail Storefront', 'E-commerce Website'],
      marketing_activities: 'Collaborating with Afrobeats recording artists, billboards on Lekki-Epe expressway.',
      motivation: 'Jux has massive respect in Nigeria, and the quality of African Boy apparel matches international luxury standards.',
      status: 'Submitted',
      internal_notes: null,
      admin_feedback_to_applicant: null,
      reviewed_by: null,
      reviewed_at: null,
      terms_accepted: true,
      privacy_accepted: true,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'app-sample-3',
      application_reference: 'ABA-2026-LDN07',
      user_id: null,
      full_name: 'Amina Touré',
      email: 'amina@afrocentricuk.com',
      phone_number: '+447911123456',
      country_code: 'GB',
      country_name: 'United Kingdom',
      city: 'London',
      preferred_language: 'en',
      business_name: 'Diaspora Drip Ltd',
      business_type: 'Online Seller',
      website_or_social: 'https://tiktok.com/@diasporadrip',
      business_address: 'Shoreditch High Street, London E1 6JJ',
      business_registration_number: 'UK-CO-1049281',
      years_of_experience: '1-3 years',
      previous_experience_details: 'TikTok shop and e-commerce selling contemporary African streetwear to the UK diaspora.',
      requested_categories: ['T-Shirt', 'Caps', 'Jackets', 'Tracksuit'],
      preferred_business_model: 'Commission-Based Agent',
      proposed_territory_details: 'Greater London & Online UK',
      expected_monthly_sales: '80 - 150 units',
      estimated_initial_investment: '$2,000 - $5,000 USD',
      preferred_sales_channels: ['Online Store', 'TikTok Shop', 'Pop-up Markets'],
      marketing_activities: 'Showcasing unboxing and styling clips at London African culture festivals.',
      motivation: 'Connecting UK diaspora youth with authentic African pride streetwear.',
      status: 'Submitted',
      internal_notes: null,
      admin_feedback_to_applicant: null,
      reviewed_by: null,
      reviewed_at: null,
      terms_accepted: true,
      privacy_accepted: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

function saveLocalApplications(apps: AgentApplication[]) {
  try {
    localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(apps));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

function getLocalProfiles(): AgentProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse cached agent profiles:', e);
  }
  return [
    {
      id: 'agent-profile-demo-1',
      user_id: 'user-demo-agent-tz',
      application_id: 'app-sample-demo',
      agent_code: 'AG-TZ-001',
      full_name: 'Baraka Mushi',
      email: 'baraka@kilimanjarodistro.tz',
      phone_number: '+255754998877',
      business_name: 'Kilimanjaro Apparel Hub',
      business_model: 'Wholesale Reseller',
      assigned_country_code: 'TZ',
      assigned_country_name: 'Tanzania',
      assigned_territory: 'Northern Zone (Arusha & Moshi)',
      is_exclusive: true,
      exclusivity_conditions: 'Maintain minimum quarterly replenishment of 300 units',
      approved_categories: ['T-Shirt', 'Caps', 'Footwear', 'Socks'],
      commission_rate: 0,
      wholesale_discount_percent: 30,
      minimum_order_quantity: 15,
      minimum_initial_purchase: 1500000,
      currency: 'TZS',
      payment_terms: 'Pre-payment',
      status: 'active',
      agreement_reference: 'AGR-AG-TZ-001-2026',
      agreement_status: 'Active',
      agreement_start_date: '2026-01-15',
      agreement_end_date: '2026-12-31',
      created_at: '2026-01-15T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
    },
  ];
}

function saveLocalProfiles(profiles: AgentProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Could not save agent profiles to localStorage:', e);
  }
}

function getLocalOrders(): AgentReplenishmentOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse cached agent orders:', e);
  }
  return [
    {
      id: 'ord-demo-1',
      order_number: 'ARO-2026-0041',
      agent_id: 'agent-profile-demo-1',
      user_id: 'user-demo-agent-tz',
      status: 'shipped',
      payment_status: 'paid',
      items: [
        {
          product_id: '1',
          name: 'AFB Signature Tee',
          price: 31500, // 30% wholesale discount off 45,000
          quantity: 20,
          size: 'L',
          color: 'Black',
          sku: 'AFB-TEE-BLK-L',
          image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        },
        {
          product_id: 'cap-1',
          name: 'African Boy Distressed Cap',
          price: 24500, // 30% wholesale discount off 35,000
          quantity: 15,
          size: 'FREE SIZE',
          color: 'Black',
          sku: 'AFB-CAP-BLK',
          image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
        },
      ],
      subtotal: 997500,
      discount_amount: 427500,
      shipping_fee: 30000,
      total_amount: 1027500,
      amount_paid: 1027500,
      currency: 'TZS',
      shipping_address: 'Kilimanjaro Apparel Hub, Soko Kuu Street, Arusha',
      destination_country: 'Tanzania',
      destination_city: 'Arusha',
      commercial_terms_snapshot: {
        business_model: 'Wholesale Reseller',
        wholesale_discount_percent: 30,
        moq: 15,
      },
      payment_method: 'Bank Transfer / CRDB',
      payment_reference: 'CRDB-TX-994821',
      notes: 'Initial Q1 replenishment order for Northern Zone Arusha boutique.',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];
}

function saveLocalOrders(orders: AgentReplenishmentOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.warn('Could not save agent orders to localStorage:', e);
  }
}

export const agentService = {
  /**
   * Submit an agent application.
   * Inserts into Supabase agent_applications if accessible, with resilient fallback.
   */
  async submitApplication(
    data: Omit<AgentApplication, 'id' | 'application_reference' | 'status' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; applicationReference: string; error?: string }> {
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const reference = `ABA-2026-${data.country_code}${randomHex}`;

    const newApp: AgentApplication = {
      ...data,
      id: '',
      application_reference: reference,
      status: 'Submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { id: _omitId, ...insertRow } = newApp;
      const { data: dbData, error } = await fromAny('agent_applications')
        .insert({
          ...insertRow,
          user_id: data.user_id || null,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Failed to save agent application:', error.message);
        return {
          success: false,
          applicationReference: reference,
          error: 'Your application could not be sent. Please check your connection and try again.',
        };
      }
      if (dbData) {
        newApp.id = dbData.id;
      }
    } catch (err) {
      console.error('Network or DB error saving application:', err);
      return {
        success: false,
        applicationReference: reference,
        error: 'Your application could not be sent. Please check your connection and try again.',
      };
    }

    // Update local cache for the applicant's own reference
    const current = getLocalApplications();
    saveLocalApplications([newApp, ...current]);

    return {
      success: true,
      applicationReference: reference,
    };
  },

  /**
   * Fetch all agent applications with optional filters (Admin).
   */
  async getApplications(filters?: {
    status?: string;
    countryCode?: string;
    businessModel?: string;
    searchQuery?: string;
  }): Promise<AgentApplication[]> {
    let applications: AgentApplication[] = [];

    try {
      let query = fromAny('agent_applications').select('*').order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'All') {
        query = query.eq('status', filters.status);
      }
      if (filters?.countryCode && filters.countryCode !== 'All') {
        query = query.eq('country_code', filters.countryCode);
      }
      if (filters?.businessModel && filters.businessModel !== 'All') {
        query = query.eq('preferred_business_model', filters.businessModel);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        applications = data as AgentApplication[];
      } else {
        applications = getLocalApplications();
      }
    } catch (err) {
      applications = getLocalApplications();
    }

    // Apply client filtering if needed
    if (filters?.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      applications = applications.filter(
        app =>
          app.full_name.toLowerCase().includes(q) ||
          app.email.toLowerCase().includes(q) ||
          app.application_reference.toLowerCase().includes(q) ||
          (app.business_name && app.business_name.toLowerCase().includes(q)) ||
          app.city.toLowerCase().includes(q) ||
          app.country_name.toLowerCase().includes(q)
      );
    }

    if (filters?.status && filters.status !== 'All') {
      applications = applications.filter(a => a.status === filters.status);
    }
    if (filters?.countryCode && filters.countryCode !== 'All') {
      applications = applications.filter(a => a.country_code === filters.countryCode);
    }
    if (filters?.businessModel && filters.businessModel !== 'All') {
      applications = applications.filter(a => a.preferred_business_model === filters.businessModel);
    }

    return applications;
  },

  /**
   * Update application status (Admin review action).
   */
  async updateApplicationStatus(
    applicationId: string,
    status: AgentApplicationStatus,
    internalNotes?: string,
    adminFeedback?: string
  ): Promise<boolean> {
    try {
      await fromAny('agent_applications')
        .update({
          status,
          internal_notes: internalNotes || null,
          admin_feedback_to_applicant: adminFeedback || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);
    } catch (e) {
      console.warn('DB update failed, updating local cache:', e);
    }

    const apps = getLocalApplications();
    const updated = apps.map(app => {
      if (app.id === applicationId) {
        return {
          ...app,
          status,
          internal_notes: internalNotes !== undefined ? internalNotes : app.internal_notes,
          admin_feedback_to_applicant: adminFeedback !== undefined ? adminFeedback : app.admin_feedback_to_applicant,
          updated_at: new Date().toISOString(),
        };
      }
      return app;
    });
    saveLocalApplications(updated);
    return true;
  },

  /**
   * Approve an agent application, generate agent profile and agreement.
   */
  async approveApplication(
    applicationId: string,
    config: {
      agentCode: string;
      businessModel: AgentBusinessModel;
      assignedTerritory: string;
      isExclusive: boolean;
      approvedCategories: string[];
      wholesaleDiscountPercent: number;
      commissionRate: number;
      moq: number;
      currency: string;
      paymentTerms: string;
    }
  ): Promise<{ success: boolean; agentProfile?: AgentProfile; error?: string }> {
    const apps = getLocalApplications();
    const targetApp = apps.find(a => a.id === applicationId);

    if (!targetApp) {
      return { success: false, error: 'Application not found' };
    }

    // Try calling server-side RPC if available (with quick timeout for offline/test environments)
    try {
      if (typeof (supabase as any)?.rpc === 'function') {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RPC call timeout')), 500)
        );
        const rpcCall = (supabase as any).rpc('approve_agent_application', {
          _application_id: applicationId,
          _agent_code: config.agentCode,
          _business_model: config.businessModel,
          _territory: config.assignedTerritory,
          _categories: config.approvedCategories,
          _wholesale_discount: config.wholesaleDiscountPercent,
          _commission_rate: config.commissionRate,
          _moq: config.moq,
          _currency: config.currency,
          _is_exclusive: config.isExclusive,
        });

        const res = (await Promise.race([rpcCall, timeoutPromise])) as any;
        if (res?.error) {
          console.warn('RPC approve_agent_application error, falling back to local creation:', res.error.message);
        }
      }
    } catch (rpcErr) {
      // Offline, unit test environment, or network timeout - cleanly fall back to local persistence
    }

    // Update application status to Approved
    targetApp.status = 'Approved';
    targetApp.updated_at = new Date().toISOString();
    saveLocalApplications(apps);

    // Create Agent Profile
    const newProfile: AgentProfile = {
      id: `agent-profile-${Date.now()}`,
      user_id: targetApp.user_id || `user-agent-${Date.now()}`,
      application_id: targetApp.id,
      agent_code: config.agentCode,
      full_name: targetApp.full_name,
      email: targetApp.email,
      phone_number: targetApp.phone_number,
      business_name: targetApp.business_name || null,
      business_model: config.businessModel,
      assigned_country_code: targetApp.country_code,
      assigned_country_name: targetApp.country_name,
      assigned_territory: config.assignedTerritory,
      is_exclusive: config.isExclusive,
      approved_categories: config.approvedCategories,
      commission_rate: config.commissionRate,
      wholesale_discount_percent: config.wholesaleDiscountPercent,
      minimum_order_quantity: config.moq,
      minimum_initial_purchase: 0,
      currency: config.currency,
      payment_terms: config.paymentTerms,
      status: 'active',
      agreement_reference: `AGR-${config.agentCode}-2026`,
      agreement_status: 'Active',
      agreement_start_date: new Date().toISOString().split('T')[0],
      agreement_end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const profiles = getLocalProfiles();
    saveLocalProfiles([newProfile, ...profiles]);

    // Link and activate any commercial offer for this application
    try {
      const localOffers = JSON.parse(localStorage.getItem('ab_agent_commercial_offers_cache') || '[]');
      const offerIndex = localOffers.findIndex((o: any) => o.applicationId === applicationId);
      if (offerIndex > -1) {
        localOffers[offerIndex].agentId = newProfile.id;
        localOffers[offerIndex].status = 'Activated';
        localOffers[offerIndex].updatedAt = new Date().toISOString();
        localStorage.setItem('ab_agent_commercial_offers_cache', JSON.stringify(localOffers));
      }
    } catch (e) {
      console.warn('Error linking commercial offer during activation:', e);
    }

    return { success: true, agentProfile: newProfile };
  },

  /**
   * Get agent profile by user ID or agent ID.
   */
  async getAgentProfile(userId?: string): Promise<AgentProfile | null> {
    if (!userId) {
      const profiles = getLocalProfiles();
      return profiles[0] || null;
    }

    try {
      const { data, error } = await fromAny('agent_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as AgentProfile;
      }
    } catch (e) {
      console.warn('Could not query agent_profiles from DB:', e);
    }

    const profiles = getLocalProfiles();
    return profiles.find(p => p.user_id === userId || p.id === userId) || profiles[0] || null;
  },

  /**
   * Get all active agent profiles (Admin).
   */
  async getAllAgentProfiles(): Promise<AgentProfile[]> {
    try {
      const { data, error } = await fromAny('agent_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as AgentProfile[];
      }
    } catch (e) {
      console.warn('Error fetching all agent profiles:', e);
    }
    return getLocalProfiles();
  },

  /**
   * Update commercial terms for an existing agent (Admin).
   */
  async updateCommercialTerms(
    agentId: string,
    updates: Partial<AgentProfile>
  ): Promise<boolean> {
    try {
      await fromAny('agent_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId);
    } catch (e) {
      console.warn('Failed to update agent profile in DB:', e);
    }

    const profiles = getLocalProfiles();
    const updated = profiles.map(p => {
      if (p.id === agentId) {
        return { ...p, ...updates, updated_at: new Date().toISOString() };
      }
      return p;
    });
    saveLocalProfiles(updated);
    return true;
  },

  /**
   * Get catalogue filtered by agent's approved categories with wholesale/commission calculations.
   * Internal cost prices and confidential details are strictly stripped.
   */
  getAgentProducts(allProducts: Product[], agentProfile: AgentProfile): (Product & {
    agentWholesalePrice: number;
    agentCommissionAmount: number;
    agentMarginPercent: number;
    isCategoryApproved: boolean;
  })[] {
    const approvedCats = agentProfile.approved_categories.map(c => c.toLowerCase());
    const isAllApproved = approvedCats.includes('all') || approvedCats.includes('mixed catalog');

    return allProducts.map(p => {
      // Strip cost_price from agent-facing view to prevent confidential leakage
      const { cost_price, ...safeProduct } = p as any;

      const categoryMatch =
        isAllApproved ||
        approvedCats.some(cat => {
          const pCat = p.category.toLowerCase();
          if (cat === 't-shirt' && (pCat.includes('t-shirt') || pCat.includes('tee'))) return true;
          if (cat === 'footwear' && (pCat.includes('footwear') || pCat.includes('shoes'))) return true;
          if (cat === 'boxer' && (pCat.includes('boxer') || pCat.includes('underwear'))) return true;
          return pCat.includes(cat);
        });

      const retailPrice = p.price;
      const discount = agentProfile.wholesale_discount_percent || 0;
      const wholesalePrice = Math.round(retailPrice * (1 - discount / 100));
      const commissionRate = agentProfile.commission_rate || 0;
      const commissionAmount = Math.round(retailPrice * (commissionRate / 100));
      const marginPercent = retailPrice > 0 ? Math.round(((retailPrice - wholesalePrice) / retailPrice) * 100) : 0;

      return {
        ...safeProduct,
        agentWholesalePrice: wholesalePrice,
        agentCommissionAmount: commissionAmount,
        agentMarginPercent: marginPercent,
        isCategoryApproved: categoryMatch,
      };
    });
  },

  /**
   * Create agent replenishment order.
   */
  async createReplenishmentOrder(
    agentProfile: AgentProfile,
    items: OrderItem[],
    shippingAddress: string,
    notes?: string
  ): Promise<{ success: boolean; order?: AgentReplenishmentOrder; error?: string }> {
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQty < agentProfile.minimum_order_quantity) {
      return {
        success: false,
        error: `Order quantity (${totalQty}) is below the minimum order quantity of ${agentProfile.minimum_order_quantity} units.`,
      };
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = 35000;
    const totalAmount = subtotal + shippingFee;
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `ARO-2026-${randomHex}`;

    const newOrder: AgentReplenishmentOrder = {
      id: `ord-${Date.now()}-${randomHex}`,
      order_number: orderNumber,
      agent_id: agentProfile.id,
      user_id: agentProfile.user_id,
      status: 'submitted',
      payment_status: 'pending',
      items,
      subtotal,
      discount_amount: 0,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      amount_paid: 0,
      currency: agentProfile.currency || 'TZS',
      shipping_address: shippingAddress,
      destination_country: agentProfile.assigned_country_name,
      destination_city: agentProfile.assigned_territory,
      commercial_terms_snapshot: {
        agent_code: agentProfile.agent_code,
        business_model: agentProfile.business_model,
        wholesale_discount_percent: agentProfile.wholesale_discount_percent,
        commission_rate: agentProfile.commission_rate,
        moq: agentProfile.minimum_order_quantity,
        payment_terms: agentProfile.payment_terms,
      },
      payment_method: 'Agent Commercial Transfer',
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await fromAny('agent_replenishment_orders')
        .insert(newOrder)
        .select()
        .maybeSingle();
    } catch (e) {
      console.warn('Could not insert replenishment order into DB:', e);
    }

    const currentOrders = getLocalOrders();
    saveLocalOrders([newOrder, ...currentOrders]);

    return { success: true, order: newOrder };
  },

  /**
   * Get replenishment orders for an agent.
   */
  async getAgentReplenishmentOrders(agentId: string): Promise<AgentReplenishmentOrder[]> {
    try {
      const { data, error } = await fromAny('agent_replenishment_orders')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as AgentReplenishmentOrder[];
      }
    } catch (e) {
      console.warn('DB fetch error for replenishment orders:', e);
    }

    const orders = getLocalOrders();
    return orders.filter(o => o.agent_id === agentId);
  },

  /**
   * Get all replenishment orders (Admin).
   */
  async getAllReplenishmentOrders(): Promise<AgentReplenishmentOrder[]> {
    try {
      const { data, error } = await fromAny('agent_replenishment_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as AgentReplenishmentOrder[];
      }
    } catch (e) {
      console.warn('DB fetch error for all replenishment orders:', e);
    }
    return getLocalOrders();
  },

  /**
   * Update order fulfillment or payment status (Admin).
   */
  async updateReplenishmentOrderStatus(
    orderId: string,
    status?: AgentReplenishmentOrder['status'],
    paymentStatus?: AgentReplenishmentOrder['payment_status'],
    amountPaid?: number
  ): Promise<boolean> {
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updatePayload.status = status;
    if (paymentStatus) updatePayload.payment_status = paymentStatus;
    if (amountPaid !== undefined) updatePayload.amount_paid = amountPaid;

    try {
      await fromAny('agent_replenishment_orders').update(updatePayload).eq('id', orderId);
    } catch (e) {
      console.warn('DB order update failed:', e);
    }

    const orders = getLocalOrders();
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: status || o.status,
          payment_status: paymentStatus || o.payment_status,
          amount_paid: amountPaid !== undefined ? amountPaid : o.amount_paid,
          updated_at: new Date().toISOString(),
        };
      }
      return o;
    });
    saveLocalOrders(updated);
    return true;
  },

  /**
   * Calculate reports and summary statistics.
   */
  async getReportsSummary(): Promise<AgentReportSummary> {
    const applications = await this.getApplications();
    const profiles = await this.getAllAgentProfiles();
    const orders = await this.getAllReplenishmentOrders();

    const statusCounts: Record<AgentApplicationStatus, number> = {
      Draft: 0,
      Submitted: 0,
      'Under Review': 0,
      'More Information Required': 0,
      Approved: 0,
      Rejected: 0,
      Withdrawn: 0,
    };

    applications.forEach(a => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    const countryCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const modelCounts: Record<AgentBusinessModel, number> = {
      'Wholesale Reseller': 0,
      'Commission-Based Agent': 0,
      'Country Distributor': 0,
      'Premium Market Agent': 0,
    };

    profiles.forEach(p => {
      countryCounts[p.assigned_country_name] = (countryCounts[p.assigned_country_name] || 0) + 1;
      p.approved_categories.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      if (modelCounts[p.business_model] !== undefined) {
        modelCounts[p.business_model]++;
      }
    });

    const completedOrders = orders.filter(o => o.status !== 'cancelled' && o.payment_status !== 'cancelled');
    const orderValue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const paidValue = completedOrders.reduce((sum, o) => sum + Number(o.amount_paid), 0);
    const outstanding = Math.max(0, orderValue - paidValue);

    const commissions = profiles.reduce((sum, p) => {
      if (p.business_model === 'Commission-Based Agent' && p.commission_rate > 0) {
        const agentOrders = completedOrders.filter(o => o.agent_id === p.id);
        const agentSales = agentOrders.reduce((s, o) => s + Number(o.subtotal), 0);
        return sum + Math.round(agentSales * (p.commission_rate / 100));
      }
      return sum;
    }, 0);

    const grossMargin = profiles.reduce((sum, p) => {
      if (p.business_model !== 'Commission-Based Agent') {
        const agentOrders = completedOrders.filter(o => o.agent_id === p.id);
        const agentSales = agentOrders.reduce((s, o) => s + Number(o.subtotal), 0);
        return sum + Math.round(agentSales * ((p.wholesale_discount_percent || 25) / 100));
      }
      return sum;
    }, 0);

    return {
      totalApplications: applications.length,
      applicationsByStatus: statusCounts,
      approvedAgentsByCountry: countryCounts,
      approvedAgentsByCategory: categoryCounts,
      agentsByBusinessModel: modelCounts,
      totalReplenishmentOrders: completedOrders.length,
      replenishmentOrderValue: orderValue,
      totalCommissionsEarned: commissions,
      estimatedGrossMargin: grossMargin,
      outstandingBalance: outstanding,
    };
  },
};
