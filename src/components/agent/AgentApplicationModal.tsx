import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, ChevronRight, ChevronLeft, Building, User, FileText,
  Briefcase, Globe, ShieldCheck, Sparkles, Send, AlertCircle, Copy, Check
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
  { id: 'T-Shirt', label: 'T-Shirts (Heavyweight & Graphic Tees)', description: 'Iconic heritage and oversized silhouettes' },
  { id: 'Caps', label: 'Caps & Headwear', description: 'Distressed dad caps, trucker hats & beanies' },
  { id: 'Socks', label: 'Socks', description: 'Ribbed streetwear & crew socks' },
  { id: 'Boxer', label: 'Boxers & Underwear', description: 'Signature waistband premium underwear' },
  { id: 'Footwear', label: 'Shoes & Footwear', description: 'Slides, streetwear sneakers & footwear' },
  { id: 'Shirts', label: 'Cuban Shirts & Tops', description: 'Tailored luxury button-downs & resort shirts' },
  { id: 'Jackets', label: 'Jackets & Leather Outerwear', description: 'Leather jackets, coats & windbreakers' },
  { id: 'Tracksuit', label: 'Tracksuits & Pants', description: 'Cargo sets, utility shorts & tracksuits' },
  { id: 'Accessories', label: 'Accessories', description: 'Bags, chains & lifestyle accessories' },
  { id: 'Mixed Catalog', label: 'Mixed Catalog (Full Collection)', description: 'Access to request multiple or all apparel lines' },
];

const BUSINESS_TYPE_OPTIONS = [
  'Individual Entrepreneur',
  'Online Seller / E-commerce',
  'Retail Store / Boutique',
  'Existing Fashion Business',
  'Country Distributor / Wholesaler',
  'Other',
];

const BUSINESS_MODEL_OPTIONS: { id: AgentBusinessModel; title: string; description: string }[] = [
  {
    id: 'Wholesale Reseller',
    title: 'Wholesale Reseller',
    description: 'Purchase stock at wholesale prices, manage local stock inventory, and set retail prices within regional brand guidelines.',
  },
  {
    id: 'Commission-Based Agent',
    title: 'Commission-Based Agent',
    description: 'Generate verified sales in your market without holding heavy local inventory, earning approved commission per order.',
  },
  {
    id: 'Country Distributor',
    title: 'Country Distributor',
    description: 'Lead national distribution across an entire country or large territory, supplying retailers and managing regional supply.',
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

    // Step 2: Business info
    businessName: '',
    businessType: 'Individual Entrepreneur',
    websiteOrSocial: '',
    businessAddress: '',
    businessRegNumber: '',
    yearsOfExperience: '1-3 years',
    experienceDetails: '',

    // Step 3: Agent preferences
    requestedCategories: ['T-Shirt', 'Caps'],
    businessModel: 'Wholesale Reseller' as AgentBusinessModel,
    territoryDetails: '',
    expectedMonthlySales: '50 - 150 units',
    estimatedInvestment: '$2,000 - $5,000 USD',
    salesChannels: ['Retail Storefront', 'Instagram / WhatsApp Shop'],
    marketingActivities: '',
    motivation: '',

    // Step 4: Terms
    termsAccepted: false,
    privacyAccepted: false,
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
        setFormData(prev => ({ ...prev, requestedCategories: ['T-Shirt'] }));
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
      toast.error('Please enter your city.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.businessType) {
      toast.error('Please select your business structure.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (formData.requestedCategories.length === 0) {
      toast.error('Please select at least one product category.');
      return false;
    }
    if (!formData.businessModel) {
      toast.error('Please select your preferred business model.');
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
    if (!formData.termsAccepted || !formData.privacyAccepted) {
      toast.error('Please review and accept both the Agent Program Terms and Privacy Notice.');
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
        requested_categories: formData.requestedCategories,
        preferred_business_model: formData.businessModel,
        proposed_territory_details: formData.territoryDetails.trim() || `${formData.city}, ${formData.countryName}`,
        expected_monthly_sales: formData.expectedMonthlySales,
        estimated_initial_investment: formData.estimatedInvestment,
        preferred_sales_channels: formData.salesChannels,
        marketing_activities: formData.marketingActivities.trim() || null,
        motivation: formData.motivation.trim() || null,
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
                Official Program
              </span>
              <h2 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-foreground">
                Apply to Become an Authorized Agent
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
              { num: 1, label: 'Applicant Info' },
              { num: 2, label: 'Business Profile' },
              { num: 3, label: 'Preferences & Territory' },
              { num: 4, label: 'Review & Submit' },
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
                  Welcome to the African Boy Movement
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your application has been logged securely into the African Boy Global Partner Registry.
                  Our administrative committee reviews international credentials and responds within 48–72 hours.
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
                  Save this reference number to quote during verification or when contacting our agent liaison desk.
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
                      <User size={18} className="text-primary" /> Step 1: Applicant Contact & Identity
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Provide verified legal and contact details. This will be used for official agreement onboarding.
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
                        Country of Residence *
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
                        City / Municipality *
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

              {/* STEP 2: Business Information */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="border-b border-foreground/10 pb-3">
                    <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                      <Building size={18} className="text-primary" /> Step 2: Commercial & Business Experience
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tell us about your business structure, retail presence, or experience in apparel distribution.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Business / Trading Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="e.g. Savannah Luxury Boutique"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Website or Social Media Link
                      </label>
                      <input
                        type="text"
                        value={formData.websiteOrSocial}
                        onChange={e => setFormData({ ...formData, websiteOrSocial: e.target.value })}
                        placeholder="e.g. instagram.com/yourbrand or website"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Years of Business Experience
                      </label>
                      <select
                        value={formData.yearsOfExperience}
                        onChange={e => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      >
                        <option value="New Entrepreneur (< 1 year)">New Entrepreneur (&lt; 1 year)</option>
                        <option value="1-3 years">1–3 years</option>
                        <option value="3-5 years">3–5 years</option>
                        <option value="5+ years">5+ years established</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Physical Storefront or Business Address
                    </label>
                    <input
                      type="text"
                      value={formData.businessAddress}
                      onChange={e => setFormData({ ...formData, businessAddress: e.target.value })}
                      placeholder="e.g. Shop 12, Westlands Commercial Centre, Nairobi"
                      className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Previous Fashion, Sales or Distribution Experience
                    </label>
                    <textarea
                      rows={2}
                      value={formData.experienceDetails}
                      onChange={e => setFormData({ ...formData, experienceDetails: e.target.value })}
                      placeholder="Briefly describe what products or brands you currently sell or your distribution track record..."
                      className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Preferences & Territory */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="border-b border-foreground/10 pb-3">
                    <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                      <Briefcase size={18} className="text-primary" /> Step 3: Product Lines & Operating Model
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Select which real African Boy catalogue categories you want to represent and your preferred commercial structure.
                    </p>
                  </div>

                  {/* Business Model Select */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Select Preferred Business Model *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {BUSINESS_MODEL_OPTIONS.map(m => {
                        const isSelected = formData.businessModel === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setFormData({ ...formData, businessModel: m.id })}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-primary/10 border-primary shadow-md'
                                : 'bg-background border-foreground/10 hover:border-foreground/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-black uppercase tracking-tight text-foreground">
                                {m.title}
                              </span>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {m.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Categories Select */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Requested Product Categories * (Multi-Select)
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
                        Proposed Territory / Region *
                      </label>
                      <input
                        type="text"
                        value={formData.territoryDetails}
                        onChange={e => setFormData({ ...formData, territoryDetails: e.target.value })}
                        placeholder="e.g. Nairobi Metropolis, Coast Region, or Nationwide"
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        Expected Monthly Unit Sales
                      </label>
                      <select
                        value={formData.expectedMonthlySales}
                        onChange={e => setFormData({ ...formData, expectedMonthlySales: e.target.value })}
                        className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                      >
                        <option value="20 - 50 units">20 – 50 units / month</option>
                        <option value="50 - 150 units">50 – 150 units / month</option>
                        <option value="150 - 300 units">150 – 300 units / month</option>
                        <option value="300+ units">300+ units / month (High Volume)</option>
                      </select>
                    </div>
                  </div>

                  {/* Motivation */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Why do you want to represent African Boy in your market?
                    </label>
                    <textarea
                      rows={2}
                      value={formData.motivation}
                      onChange={e => setFormData({ ...formData, motivation: e.target.value })}
                      placeholder="Share your passion for African Boy and how you plan to represent the brand..."
                      className="w-full px-4 py-3 bg-background border border-foreground/15 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Review and Submit */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="border-b border-foreground/10 pb-3">
                    <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                      <FileText size={18} className="text-primary" /> Step 4: Confirmation & Commercial Terms
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Review all submitted details. Once submitted, our team will review your application before commercial authorization.
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
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Country / City</span>
                        <span className="font-bold text-foreground">{formData.city}, {formData.countryName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Model</span>
                        <span className="font-bold text-primary">{formData.businessModel}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Phone</span>
                        <span className="font-bold text-foreground">{formData.phoneCode} {formData.phoneNumber}</span>
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

                    <div className="border-t border-foreground/10 pt-2 text-xs">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Assigned Territory Focus:
                      </span>
                      <p className="font-medium text-foreground text-xs mt-0.5">
                        {formData.territoryDetails || `${formData.city}, ${formData.countryName}`}
                      </p>
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
                        I agree to the <strong>African Boy Global Agent Program Terms</strong>. I understand that submitting this application does not automatically grant agent privileges or territory exclusivity, and all agreements are subject to official administrative review and signing.
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
                        I consent to African Boy processing my provided business information for partner verification, background checks, and official correspondence. No sensitive payment card details are collected through this form.
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
                disabled={isSubmitting || !formData.termsAccepted || !formData.privacyAccepted}
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
