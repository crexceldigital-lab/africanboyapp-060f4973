import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, ChevronRight, ChevronLeft, Building, User, FileText,
  Briefcase, Globe, ShieldCheck, Sparkles, Send, AlertCircle, Copy, Check,
  Truck, DollarSign, Layers, Building2
} from 'lucide-react';
import { INTERNATIONAL_COUNTRIES, getCountryByCode } from '@/data/internationalCountries';
import { agentService } from '@/services/agentService';
import { toast } from 'sonner';
import type { AgentBusinessModel } from '@/types';
import { useCountry } from '@/context/CountryContext';

interface AgentApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (reference: string) => void;
}

const PRODUCT_CATEGORY_OPTIONS = [
  { id: 'T-Shirt', label: 'T-Shirts (Heavyweight & Graphic Tees)', description: '500–999 pcs @ TZS 35k; 1,000+ pcs @ TZS 30k' },
  { id: 'Caps', label: 'Caps & Headwear', description: '300+ pcs @ TZS 18,000' },
  { id: 'Tracksuit', label: 'Tracksuits & Outerwear (Phase 2)', description: 'Cargo sets, utility shorts & tracksuits' },
  { id: 'Shirts', label: 'Cuban Shirts & Tops (Phase 2)', description: 'Tailored luxury button-downs & resort shirts' },
  { id: 'Footwear', label: 'Shoes & Footwear (Phase 2)', description: 'Slides, streetwear sneakers & footwear' },
  { id: 'Socks', label: 'Socks & Accessories (Phase 2)', description: 'Ribbed streetwear socks & accessories' },
  { id: 'Boxer', label: 'Boxers & Underwear (Phase 2)', description: 'Signature waistband premium underwear' },
  { id: 'Mixed Catalog', label: 'Mixed Catalog (Full Allocation)', description: 'Request multi-line distribution allocation' },
];

const BUSINESS_TYPE_OPTIONS = [
  'Retail Store / Boutique Group',
  'Commercial Wholesaler / Distributor',
  'Existing Multi-Brand Fashion Retailer',
  'Streetwear & Luxury Concept Store',
  'E-commerce & Distribution Enterprise',
  'Individual Commercial Entrepreneur',
];

const BUSINESS_MODEL_OPTIONS: { id: AgentBusinessModel; title: string; description: string; moq: string; term: string }[] = [
  {
    id: 'Country Distributor',
    title: 'Country Distributor',
    description: 'Manage exclusive or primary national distribution across your market. Hold local stock, supply verified retailers, and grow regional brand equity under official brand authorization.',
    moq: '1,000 Pcs Opening Order',
    term: '12-Month Commercial Agreement',
  },
];

export default function AgentApplicationModal({ isOpen, onClose, onSuccess }: AgentApplicationModalProps) {
  const { user } = useCountry();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Applicant info
    fullName: user?.full_name || '',
    email: user?.email || '',
    phoneCode: '+255',
    phoneNumber: user?.phone_number || '',
    countryCode: 'TZ',
    countryName: 'Tanzania',
    city: '',
    preferredLanguage: 'en',

    // Step 2: Business & Capability info
    businessName: '',
    businessType: 'Retail Store / Boutique Group',
    websiteOrSocial: '',
    businessAddress: '',
    businessRegNumber: '',
    yearsOfExperience: '3-5 years',
    experienceDetails: '',
    marketEntryPlan: '',
    firstYearSalesForecast: '1,000 - 3,000 units / year',
    operatingBudgetPlan: '',
    financialCapacityStatement: '',
    teamAndInfrastructure: '',
    supportingDocumentsUrl: '',

    // Step 3: Distributor preferences & territory
    requestedCategories: ['T-Shirt', 'Caps'],
    businessModel: 'Country Distributor' as AgentBusinessModel,
    territoryDetails: '',
    expectedMonthlySales: '150 - 300 units',
    estimatedInvestment: '$25,000 - $50,000 USD',
    salesChannels: ['Retail Storefront', 'Wholesale to Sub-Resellers', 'E-commerce & Digital'],
    marketingActivities: '',
    motivation: '',
    acknowledgesMoq1000: false,
    acknowledgesContract12Months: false,

    // Step 4: Terms
    termsAccepted: false,
    privacyAccepted: false,
    shippingPolicyAccepted: false,
  });

  if (!isOpen) return null;

  const handleCountryChange = (code: string) => {
    const c = getCountryByCode(code);
    if (c) {
      setFormData(prev => ({
        ...prev,
        countryCode: c.code,
        countryName: c.name,
        phoneCode: c.dialCode,
      }));
    }
  };

  const toggleCategory = (catId: string) => {
    if (catId === 'Mixed Catalog') {
      if (formData.requestedCategories.includes('Mixed Catalog')) {
        setFormData(prev => ({ ...prev, requestedCategories: ['T-Shirt', 'Caps'] }));
      } else {
        setFormData(prev => ({
          ...prev,
          requestedCategories: PRODUCT_CATEGORY_OPTIONS.map(c => c.id),
        }));
      }
      return;
    }

    setFormData(prev => {
      const exists = prev.requestedCategories.includes(catId);
      let updated = exists
        ? prev.requestedCategories.filter(c => c !== catId)
        : [...prev.requestedCategories, catId];
      if (updated.length === 0) updated = [catId];
      return { ...prev, requestedCategories: updated };
    });
  };

  const toggleChannel = (channel: string) => {
    setFormData(prev => {
      const exists = prev.salesChannels.includes(channel);
      const updated = exists
        ? prev.salesChannels.filter(c => c !== channel)
        : [...prev.salesChannels, channel];
      return { ...prev, salesChannels: updated };
    });
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      toast.error('Please enter your full legal name.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error('Please provide a phone number with country code.');
      return false;
    }
    if (!formData.city.trim()) {
      toast.error('Please enter your operating city.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.businessType) {
      toast.error('Please select your business structure.');
      return false;
    }
    if (!formData.marketEntryPlan.trim()) {
      toast.error('Please provide a summary of your 1-year market-entry and business plan.');
      return false;
    }
    if (!formData.financialCapacityStatement.trim()) {
      toast.error('Please provide a statement on your working capital and financial capacity.');
      return false;
    }
    if (!formData.teamAndInfrastructure.trim()) {
      toast.error('Please describe your team, retail storefront, or warehousing infrastructure.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (formData.requestedCategories.length === 0) {
      toast.error('Please select at least one product category.');
      return false;
    }
    if (!formData.territoryDetails.trim()) {
      toast.error('Please specify your proposed distribution territory.');
      return false;
    }
    if (!formData.acknowledgesMoq1000) {
      toast.error('Please acknowledge the 1,000-piece minimum opening order requirement.');
      return false;
    }
    if (!formData.acknowledgesContract12Months) {
      toast.error('Please acknowledge the 12-month commercial distribution agreement commitment.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((prev) => (prev + 1) as any);
  };

  const handleSubmit = async () => {
    if (!formData.termsAccepted || !formData.privacyAccepted || !formData.shippingPolicyAccepted) {
      toast.error('Please review and accept all required terms, including the separate shipping policy.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedPhone = formData.phoneNumber.startsWith('+')
        ? formData.phoneNumber
        : `${formData.phoneCode} ${formData.phoneNumber}`;

      const res = await agentService.submitApplication({
        user_id: user?.id || null,
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone_number: formattedPhone.trim(),
        country_code: formData.countryCode,
        country_name: formData.countryName,
        city: formData.city.trim(),
        preferred_language: formData.preferredLanguage,
        business_name: formData.businessName.trim() || null,
        business_type: formData.businessType,
        website_or_social: formData.websiteOrSocial.trim() || null,
        business_address: formData.businessAddress.trim() || null,
        business_registration_number: formData.businessRegNumber.trim() || null,
        years_of_experience: formData.yearsOfExperience,
        previous_experience_details: formData.experienceDetails.trim() || null,
        market_entry_plan: formData.marketEntryPlan.trim() || null,
        first_year_sales_forecast: formData.firstYearSalesForecast.trim() || null,
        operating_budget_plan: formData.operatingBudgetPlan.trim() || null,
        financial_capacity_statement: formData.financialCapacityStatement.trim() || null,
        team_and_infrastructure: formData.teamAndInfrastructure.trim() || null,
        supporting_documents_url: formData.supportingDocumentsUrl.trim() || null,
        requested_categories: formData.requestedCategories,
        preferred_business_model: 'Country Distributor',
        proposed_territory_details: formData.territoryDetails.trim() || `${formData.city}, ${formData.countryName}`,
        expected_monthly_sales: formData.expectedMonthlySales,
        estimated_initial_investment: formData.estimatedInvestment,
        preferred_sales_channels: formData.salesChannels,
        marketing_activities: formData.marketingActivities.trim() || null,
        motivation: formData.motivation.trim() || null,
        contract_term_months: 12,
        opening_order_pieces: 1000,
        terms_accepted: formData.termsAccepted,
        privacy_accepted: formData.privacyAccepted,
      });

      if (res.success) {
        setSubmittedRef(res.applicationReference);
        toast.success(`Application submitted! Reference: ${res.applicationReference}`);
        onSuccess?.(res.applicationReference);
      } else {
        toast.error(res.error || 'Failed to submit application. Please try again.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error submitting application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (submittedRef) {
      navigator.clipboard.writeText(submittedRef);
      setCopied(true);
      toast.success('Reference number copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-3xl bg-card border border-foreground/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-foreground/10 bg-background/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Globe size={20} className="text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Official Programme · 2026
              </span>
              <h2 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-foreground">
                Apply for Country Distributor Appointment
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar (if not submitted) */}
        {!submittedRef && (
          <div className="bg-background/40 px-6 py-3 border-b border-foreground/5 flex items-center justify-between gap-2">
            {[
              { num: 1, label: 'Applicant Details' },
              { num: 2, label: 'Capability & Plan' },
              { num: 3, label: 'Territory & Order' },
              { num: 4, label: 'Review & Terms' },
            ].map(s => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div key={s.num} className="flex-1 flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                      isDone
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary/20 text-primary border border-primary'
                        : 'bg-foreground/10 text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check size={12} strokeWidth={3} /> : s.num}
                  </div>
                  <span
                    className={`hidden md:inline text-[11px] font-bold uppercase tracking-wider ${
                      isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-foreground">
          {submittedRef ? (
            /* Success Screen */
            <div className="py-10 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary mx-auto flex items-center justify-center text-primary shadow-[0_0_30px_rgba(234,179,8,0.25)]">
                <CheckCircle2 size={44} />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  APPLICATION RECEIVED
                </span>
                <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight">
                  Country Distributor Application Submitted
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your distributor application and 1-year business capability credentials have been submitted for executive review.
                  Our administrative committee conducts due diligence on your capacity to support all four annual collections (1,000 pieces per collection, planned 4,000 pieces annual total) and responds within 48–72 hours.
                </p>
              </div>

              {/* Reference Card */}
              <div className="p-5 bg-background border border-primary/30 rounded-2xl text-left space-y-2 relative group">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Application Reference Number
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xl sm:text-2xl font-black font-mono tracking-wider text-primary">
                    {submittedRef}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="p-2 rounded-xl bg-foreground/5 hover:bg-primary/10 text-primary transition-colors flex items-center gap-1.5 text-xs font-bold"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Save this reference number to quote during verification or when accessing the Agent Portal.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Done & Return to Store
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Applicant Information */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="border-b border-foreground/10 pb-3">
                    <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                      <User size={18} className="text-primary" /> Step 1: Principal Applicant Information
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Enter the primary contact person authorized to represent the business and sign the 12-month commercial agreement.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Full Legal Name *
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="e.g. David Mwangi"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. partner@example.com"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Target Country / Territory *
                      </label>
                      <select
                        value={formData.countryCode}
                        onChange={e => handleCountryChange(e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      >
                        {INTERNATIONAL_COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flagEmoji} {c.name} ({c.dialCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Primary Operating City *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Nairobi, Lagos, London"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Phone Number with WhatsApp *
                      </label>
                      <div className="flex gap-2">
                        <span className="px-3 py-3 bg-foreground/5 border border-foreground/15 rounded-xl text-sm font-bold text-muted-foreground flex items-center">
                          {formData.phoneCode}
                        </span>
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                          placeholder="e.g. 712 345 678"
                          className="flex-1 px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Preferred Language
                      </label>
                      <select
                        value={formData.preferredLanguage}
                        onChange={e => setFormData({ ...formData, preferredLanguage: e.target.value })}
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      >
                        <option value="en">English</option>
                        <option value="sw">Swahili (Kiswahili)</option>
                        <option value="fr">French (Français)</option>
                        <option value="pt">Portuguese (Português)</option>
                        <option value="ar">Arabic</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Business Capability & Financial Capacity */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="border-b border-foreground/10 pb-3">
                    <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                      <Building2 size={18} className="text-primary" /> Step 2: Business Capability & Financial Capacity
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Country Distributors must demonstrate working capital, infrastructure, and the capacity to support all four annual collections (1,000 pieces per collection, planned 4,000 pieces annual total).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Business / Trading Name *
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="e.g. Savannah Streetwear Ltd"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Business Structure *
                      </label>
                      <select
                        value={formData.businessType}
                        onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      >
                        {BUSINESS_TYPE_OPTIONS.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Team & Infrastructure */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Team & Retail/Warehouse Infrastructure *
                    </label>
                    <textarea
                      rows={2}
                      value={formData.teamAndInfrastructure}
                      onChange={e => setFormData({ ...formData, teamAndInfrastructure: e.target.value })}
                      placeholder="Detail your sales staff, physical retail storefronts, warehousing capacity, and local logistics network..."
                      className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                    />
                  </div>

                  {/* 1-Year Market-Entry & Business Plan */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      1-Year Market-Entry Strategy & Business Plan *
                    </label>
                    <textarea
                      rows={2}
                      value={formData.marketEntryPlan}
                      onChange={e => setFormData({ ...formData, marketEntryPlan: e.target.value })}
                      placeholder="Explain how you will fund and sell at least 1,000 pieces per collection across all four annual collections, your launch strategy, wholesale pricing markup, and how you plan to sustain the business across the full 12-month contract..."
                      className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                    />
                  </div>

                  {/* Financial Capacity & Working Capital */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Working Capital & 4-Collection Funding Plan *
                      </label>
                      <textarea
                        rows={2}
                        value={formData.financialCapacityStatement}
                        onChange={e => setFormData({ ...formData, financialCapacityStatement: e.target.value })}
                        placeholder="Explain how you will fund at least 1,000 pieces for Drop 1 (opening order) and each subsequent collection, stating your available liquid capital, credit lines, and cash flow plan..."
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        1-Year Sales Forecast & 4-Collection Operating Budget
                      </label>
                      <textarea
                        rows={2}
                        value={formData.operatingBudgetPlan}
                        onChange={e => setFormData({ ...formData, operatingBudgetPlan: e.target.value })}
                        placeholder="Projected sales volume across 4 drops (planned 4,000 pieces total) and operating expenditure allocation across the 12-month contract..."
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Website, Social Media, or Portfolio Link
                      </label>
                      <input
                        type="text"
                        value={formData.websiteOrSocial}
                        onChange={e => setFormData({ ...formData, websiteOrSocial: e.target.value })}
                        placeholder="e.g. instagram.com/yourbusiness or website"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Supporting Documents URL (Pitch Deck, Financials, etc.)
                      </label>
                      <input
                        type="text"
                        value={formData.supportingDocumentsUrl}
                        onChange={e => setFormData({ ...formData, supportingDocumentsUrl: e.target.value })}
                        placeholder="Drive / Dropbox link to company credentials"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Programme Terms & Order Commitment */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="border-b border-foreground/10 pb-3">
                    <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                      <Briefcase size={18} className="text-primary" /> Step 3: Programme Terms & 4-Collection Commitment
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Country Distributors must commit to purchasing a minimum of 1,000 pieces from each of African Boy’s four annual collections.
                    </p>
                  </div>

                  {/* Authoritative Policy Box */}
                  <div className="p-4 rounded-2xl bg-primary/10 border-2 border-primary/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-primary text-black font-black text-[9px] uppercase tracking-wider">
                          AUTHORITATIVE POLICY
                        </span>
                        <h4 className="text-sm font-black uppercase text-foreground">
                          4 Annual Collections · 1,000 Pieces Each
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-primary">12-Month Agreement</span>
                    </div>
                    <p className="text-foreground font-bold text-xs leading-relaxed">
                      “Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.”
                    </p>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      The 1,000-piece requirement applies to <strong>EACH new collection</strong>, not merely to the distributor’s initial opening order or total annual purchases.
                      The annual figure is a calculation of the collection commitments (4 drops × 1,000 pcs = 4,000 pcs) and cannot be purchased in a single drop or skipped.
                    </p>
                  </div>

                  {/* Mandatory Commitments Checkboxes */}
                  <div className="p-4 bg-background border border-foreground/15 rounded-2xl space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.acknowledgesMoq1000}
                        onChange={e => setFormData({ ...formData, acknowledgesMoq1000: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-foreground/30 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-foreground/90 leading-relaxed font-medium">
                        <strong>Collection Commitment:</strong> I acknowledge and agree to purchase a minimum of <strong>1,000 pieces from each of African Boy’s four annual collections</strong>, representing a planned minimum commitment of <strong>4,000 pieces per year</strong>.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.acknowledgesContract12Months}
                        onChange={e => setFormData({ ...formData, acknowledgesContract12Months: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-foreground/30 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-foreground/90 leading-relaxed font-medium">
                        <strong>12-Month Distribution Agreement:</strong> I commit to a formal <strong>1-year commercial distribution agreement</strong> defining territory obligations, collection schedules, performance reviews, and non-automatic exclusivity (governed strictly by the signed contract and its performance conditions).
                      </span>
                    </label>
                  </div>

                  {/* Categories Select */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Requested Product Catalogue Lines * (Multi-Select)
                      </label>
                      <span className="text-[10px] text-primary font-bold">
                        {formData.requestedCategories.length} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRODUCT_CATEGORY_OPTIONS.map(cat => {
                        const isSelected = formData.requestedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                              isSelected
                                ? 'bg-primary/15 border-primary text-foreground'
                                : 'bg-background border-foreground/10 text-muted-foreground hover:border-foreground/20'
                            }`}
                          >
                            <div>
                              <p className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                {cat.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{cat.description}</p>
                            </div>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                                isSelected ? 'bg-primary border-primary text-black' : 'border-muted-foreground'
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Proposed Territory Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Proposed Distribution Territory / Country *
                      </label>
                      <input
                        type="text"
                        value={formData.territoryDetails}
                        onChange={e => setFormData({ ...formData, territoryDetails: e.target.value })}
                        placeholder="e.g. Kenya Nationwide or Nairobi & Central Region"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Initial Capital Allocated (USD)
                      </label>
                      <select
                        value={formData.estimatedInvestment}
                        onChange={e => setFormData({ ...formData, estimatedInvestment: e.target.value })}
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      >
                        <option value="$15,000 - $25,000 USD">$15,000 – $25,000 USD</option>
                        <option value="$25,000 - $50,000 USD">$25,000 – $50,000 USD</option>
                        <option value="$50,000 - $100,000 USD">$50,000 – $100,000 USD</option>
                        <option value="$100,000+ USD">$100,000+ USD (Multi-City Distribution)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Review and Submit */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="border-b border-foreground/10 pb-3">
                    <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                      <FileText size={18} className="text-primary" /> Step 4: Final Confirmation & Commercial Terms
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Review all submitted application details. Official appointment requires executive vetting and signing of the 12-month agreement.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 bg-background border border-foreground/15 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Applicant</span>
                        <span className="font-bold text-foreground">{formData.fullName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Territory</span>
                        <span className="font-bold text-foreground">{formData.territoryDetails || `${formData.city}, ${formData.countryName}`}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Programme</span>
                        <span className="font-bold text-primary">Country Distributor</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Term & Commitment</span>
                        <span className="font-bold text-foreground">12 Months · 4 Drops / 4,000 Pcs</span>
                      </div>
                    </div>

                    <div className="border-t border-foreground/10 pt-2 text-xs">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Requested Categories ({formData.requestedCategories.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {formData.requestedCategories.map(cat => (
                          <span
                            key={cat}
                            className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Required Acceptances */}
                  <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-2xl space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={e => setFormData({ ...formData, termsAccepted: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-foreground/30 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-foreground/90 leading-relaxed">
                        I agree to the <strong>African Boy Country Distributor Programme Terms</strong>. I understand that submitting this application does not automatically grant distributor rights or territory exclusivity, and all agreements require executive review, commitment to purchase at least 1,000 pieces from each of the 4 annual collections (4,000 pieces planned annual total), and formal 12-month contract signing.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.shippingPolicyAccepted}
                        onChange={e => setFormData({ ...formData, shippingPolicyAccepted: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-foreground/30 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-foreground/90 leading-relaxed">
                        <strong>Separate Product Sales & Shipping Policy:</strong> I understand that merchandise invoices cover product sales only. Shipping arrangements are quoted and approved separately from Tanzania or China prior to dispatch.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.privacyAccepted}
                        onChange={e => setFormData({ ...formData, privacyAccepted: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-foreground/30 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-foreground/90 leading-relaxed">
                        I consent to African Boy processing my provided business credentials for partner verification, working capital assessment, and official commercial correspondence.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!submittedRef && (
          <div className="px-6 py-4 border-t border-foreground/10 bg-background/60 backdrop-blur-md flex items-center justify-between sticky bottom-0 z-20">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-5 py-2.5 rounded-xl border border-foreground/15 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.termsAccepted || !formData.privacyAccepted || !formData.shippingPolicyAccepted}
                className="px-8 py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
