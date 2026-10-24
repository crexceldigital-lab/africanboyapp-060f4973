import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, X, Check, Building2, User, Mail, Phone, Globe,
  Package, CheckCircle2, ArrowRight, ShieldCheck, FileText, AlertCircle, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { INTERNATIONAL_COUNTRIES, getCountryByCode } from '@/data/internationalCountries';
import { wholesaleProgramService } from '@/services/wholesaleProgramService';
import type { WholesaleBusinessType, WholesaleEnquirySubmissionResult } from '@/types';

interface WholesalePricingEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: WholesaleEnquirySubmissionResult) => void;
  onOpenApplication?: () => void;
  onViewPricing?: (token: string) => void;
}

const BUSINESS_TYPE_OPTIONS: WholesaleBusinessType[] = [
  'Retailer',
  'Wholesaler',
  'Distributor',
  'Online Store',
  'Other',
];

const ORDER_QUANTITY_OPTIONS = [
  '300 - 499 pieces',
  '500 - 999 pieces (Tier 1 Volume)',
  '1,000 - 2,499 pieces (Distributor Opening MOQ)',
  '2,500 - 4,000 pieces (Annual Programme Tier)',
  '4,000+ pieces (National Distribution)',
];

const CATEGORY_OPTIONS = [
  { id: 'T-Shirt', label: 'Heavyweight & Graphic T-Shirts' },
  { id: 'Caps', label: 'Snapback & Trucker Caps' },
  { id: 'Footwear', label: 'Slides & Footwear (Phase 2)' },
  { id: 'Tracksuits', label: 'Tracksuits & Outerwear (Phase 2)' },
  { id: 'Accessories', label: 'Underwear, Socks & Accessories' },
];

export default function WholesalePricingEnquiryModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenApplication,
  onViewPricing,
}: WholesalePricingEnquiryModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    businessEmail: '',
    phoneCode: '+255',
    phoneNumber: '',
    countryCode: 'TZ',
    countryName: 'Tanzania',
    businessName: '',
    businessType: 'Retailer' as WholesaleBusinessType,
    estimatedOrderQuantity: '500 - 999 pieces (Tier 1 Volume)',
    websiteOrSocial: '',
    preferredCategories: ['T-Shirt', 'Caps'] as string[],
    additionalNotes: '',
    consentAcknowledged: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<WholesaleEnquirySubmissionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setFormData(prev => {
      const exists = prev.preferredCategories.includes(catId);
      return {
        ...prev,
        preferredCategories: exists
          ? prev.preferredCategories.filter(c => c !== catId)
          : [...prev.preferredCategories, catId],
      };
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full legal name is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.businessEmail.trim() || !emailRegex.test(formData.businessEmail.trim())) {
      newErrors.businessEmail = 'A valid business email is required.';
    }
    if (!formData.phoneNumber.trim() || formData.phoneNumber.trim().length < 5) {
      newErrors.phoneNumber = 'A valid phone or WhatsApp number is required.';
    }
    if (!formData.businessName.trim() || formData.businessName.trim().length < 2) {
      newErrors.businessName = 'Company or retail business name is required.';
    }
    if (!formData.estimatedOrderQuantity) {
      newErrors.estimatedOrderQuantity = 'Please select your estimated order volume.';
    }
    if (!formData.consentAcknowledged) {
      newErrors.consent = 'Consent acknowledgment is required.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const formattedPhone = formData.phoneNumber.startsWith('+')
        ? formData.phoneNumber
        : `${formData.phoneCode} ${formData.phoneNumber}`;

      const res = await wholesaleProgramService.submitPricingEnquiry({
        fullName: formData.fullName.trim(),
        businessEmail: formData.businessEmail.trim().toLowerCase(),
        phoneNumber: formattedPhone.trim(),
        country: formData.countryName,
        businessName: formData.businessName.trim(),
        businessType: formData.businessType,
        estimatedOrderQuantity: formData.estimatedOrderQuantity,
        websiteOrSocial: formData.websiteOrSocial.trim() || undefined,
        preferredCategories: formData.preferredCategories,
        additionalNotes: formData.additionalNotes.trim() || undefined,
        consentAcknowledged: formData.consentAcknowledged,
      });

      setSubmissionResult(res);
      toast.success('Your wholesale pricing enquiry has been received!');
      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit wholesale enquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (!submissionResult) return;
    navigator.clipboard.writeText(submissionResult.enquiryReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Enquiry reference copied to clipboard.');
  };

  const handleProceedToPricing = () => {
    if (!submissionResult) return;
    if (onViewPricing) {
      onViewPricing(submissionResult.accessToken);
    } else {
      window.location.href = `/wholesale-pricing?token=${encodeURIComponent(submissionResult.accessToken)}`;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-zinc-950 border border-primary/30 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  REQUEST WHOLESALE PRICING
                </h3>
                <h2 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-white">
                  {submissionResult ? 'Enquiry Confirmed' : 'Unlock African Boy Wholesale Pricing'}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-white">
            {submissionResult ? (
              /* Success Screen */
              <div className="py-8 text-center space-y-6 max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary mx-auto flex items-center justify-center text-primary shadow-[0_0_35px_rgba(234,179,8,0.3)]">
                  <CheckCircle2 size={44} />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                    ACCESS GRANTED
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
                    YOUR WHOLESALE ENQUIRY HAS BEEN RECEIVED
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Thank you for your interest in African Boy. You can now access our standard wholesale pricing schedule or continue with your agent application.
                  </p>
                </div>

                {/* Reference Card */}
                <div className="p-5 bg-black border border-primary/30 rounded-2xl text-left space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Enquiry Reference Number
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-wider text-primary">
                      {submissionResult.enquiryReference}
                    </span>
                    <button
                      onClick={handleCopyRef}
                      className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-white/50 pt-1">
                    Your secure 30-day wholesale pricing token is now active in this browser.
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-3">
                  <button
                    onClick={handleProceedToPricing}
                    className="w-full py-4 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <span>VIEW WHOLESALE PRICES</span>
                    <ArrowRight size={16} />
                  </button>

                  {onOpenApplication && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenApplication();
                      }}
                      className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-2xl border border-white/15 transition-all"
                    >
                      CONTINUE WITH AGENT APPLICATION
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="text-xs text-white/50 hover:text-white transition-colors py-2 uppercase tracking-wider font-semibold"
                  >
                    Done & Return to Store
                  </button>
                </div>
              </div>
            ) : (
              /* Request Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Intro notice */}
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-start gap-3 text-xs">
                  <ShieldCheck size={20} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                      Unlock African Boy Wholesale Pricing
                    </h4>
                    <p className="text-white/70 text-[11px] mt-0.5 leading-relaxed">
                      Submit your business details to access our wholesale pricing schedule and explore distribution opportunities.
                    </p>
                  </div>
                </div>

                {/* Section 1: Contact Identity */}
                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <User size={14} /> 1. Contact Person & Business
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                        Full Legal Name *
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={e => {
                          setFormData({ ...formData, fullName: e.target.value });
                          if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                        }}
                        placeholder="e.g. David Mwangi"
                        className={`w-full px-4 py-3 bg-black border ${errors.fullName ? 'border-red-500' : 'border-white/15'} rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors`}
                      />
                      {errors.fullName && (
                        <p className="text-[10px] text-red-400 font-bold">{errors.fullName}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                        Business Email *
                      </label>
                      <input
                        type="email"
                        value={formData.businessEmail}
                        onChange={e => {
                          setFormData({ ...formData, businessEmail: e.target.value });
                          if (errors.businessEmail) setErrors(prev => ({ ...prev, businessEmail: '' }));
                        }}
                        placeholder="e.g. partner@boutique.co.tz"
                        className={`w-full px-4 py-3 bg-black border ${errors.businessEmail ? 'border-red-500' : 'border-white/15'} rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors`}
                      />
                      {errors.businessEmail && (
                        <p className="text-[10px] text-red-400 font-bold">{errors.businessEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                        Business / Company Name *
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={e => {
                          setFormData({ ...formData, businessName: e.target.value });
                          if (errors.businessName) setErrors(prev => ({ ...prev, businessName: '' }));
                        }}
                        placeholder="e.g. Serengeti Streetwear Ltd"
                        className={`w-full px-4 py-3 bg-black border ${errors.businessName ? 'border-red-500' : 'border-white/15'} rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors`}
                      />
                      {errors.businessName && (
                        <p className="text-[10px] text-red-400 font-bold">{errors.businessName}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                        Country of Operation *
                      </label>
                      <select
                        value={formData.countryCode}
                        onChange={e => handleCountryChange(e.target.value)}
                        className="w-full px-4 py-3 bg-black border border-white/15 rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors"
                      >
                        {INTERNATIONAL_COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name} ({c.dialCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                        Phone / WhatsApp with Dial Code *
                      </label>
                      <div className="flex gap-2">
                        <span className="px-3 py-3 bg-white/5 border border-white/15 rounded-xl text-sm font-bold text-white/60 flex items-center">
                          {formData.phoneCode}
                        </span>
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={e => {
                            setFormData({ ...formData, phoneNumber: e.target.value });
                            if (errors.phoneNumber) setErrors(prev => ({ ...prev, phoneNumber: '' }));
                          }}
                          placeholder="e.g. 712 345 678"
                          className={`flex-1 px-4 py-3 bg-black border ${errors.phoneNumber ? 'border-red-500' : 'border-white/15'} rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors`}
                        />
                      </div>
                      {errors.phoneNumber && (
                        <p className="text-[10px] text-red-400 font-bold">{errors.phoneNumber}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                        Business Type *
                      </label>
                      <select
                        value={formData.businessType}
                        onChange={e => setFormData({ ...formData, businessType: e.target.value as WholesaleBusinessType })}
                        className="w-full px-4 py-3 bg-black border border-white/15 rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors"
                      >
                        {BUSINESS_TYPE_OPTIONS.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Order Scope */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <p className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Package size={14} /> 2. Estimated Volume & Scope
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                        Estimated Opening Order Quantity *
                      </label>
                      <select
                        value={formData.estimatedOrderQuantity}
                        onChange={e => setFormData({ ...formData, estimatedOrderQuantity: e.target.value })}
                        className="w-full px-4 py-3 bg-black border border-white/15 rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors"
                      >
                        {ORDER_QUANTITY_OPTIONS.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                        Website or Social Profile (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.websiteOrSocial}
                        onChange={e => setFormData({ ...formData, websiteOrSocial: e.target.value })}
                        placeholder="e.g. instagram.com/boutique"
                        className="w-full px-4 py-3 bg-black border border-white/15 rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Preferred Categories */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                      Product Categories of Interest
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map(cat => {
                        const isSelected = formData.preferredCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-primary/20 border-primary text-primary'
                                : 'bg-black border-white/10 text-white/60 hover:border-white/20'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Additional notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-white/60">
                      Additional Information About Your Business (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.additionalNotes}
                      onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
                      placeholder="Share details on your retail storefront, client demographics, or target distribution territory..."
                      className="w-full px-4 py-3 bg-black border border-white/15 rounded-xl text-sm font-medium focus:border-primary outline-none text-white transition-colors"
                    />
                  </div>
                </div>

                {/* Consent checkbox */}
                <div className={`p-4 rounded-2xl bg-black border ${errors.consent ? 'border-red-500' : 'border-white/10'} space-y-2`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.consentAcknowledged}
                      onChange={e => {
                        setFormData({ ...formData, consentAcknowledged: e.target.checked });
                        if (errors.consent) setErrors(prev => ({ ...prev, consent: '' }));
                      }}
                      className="mt-1 w-4 h-4 rounded border-white/30 accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-white/80 leading-relaxed font-medium">
                      I acknowledge and agree that the submitted information may be used by African Boy commercial management to verify wholesale qualification and respond to this enquiry.
                    </span>
                  </label>
                  {errors.consent && (
                    <p className="text-[10px] text-red-400 font-bold">{errors.consent}</p>
                  )}
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>VERIFYING & RECORDING ENQUIRY...</span>
                      </div>
                    ) : (
                      <>
                        <span>UNLOCK WHOLESALE PRICING</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
