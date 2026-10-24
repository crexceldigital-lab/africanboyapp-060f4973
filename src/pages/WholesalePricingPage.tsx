import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock, ShieldCheck, CheckCircle2, Package, Award, AlertCircle,
  ArrowRight, Phone, FileText, ChevronRight, RefreshCw, Globe, Check, MessageSquare
} from 'lucide-react';
import { wholesaleProgramService } from '@/services/wholesaleProgramService';
import type { WholesalePricingScheduleResponse } from '@/types';
import WholesalePricingEnquiryModal from '@/components/agent/WholesalePricingEnquiryModal';
import AgentApplicationModal from '@/components/agent/AgentApplicationModal';

interface WholesalePricingPageProps {
  initialToken?: string | null;
  onNavigateHome?: () => void;
  onNavigateToProgramme?: () => void;
}

export default function WholesalePricingPage({
  initialToken,
  onNavigateHome,
  onNavigateToProgramme,
}: WholesalePricingPageProps) {
  const [token, setToken] = useState<string | null>(() => {
    if (initialToken) return initialToken;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token') || wholesaleProgramService.getActivePricingToken();
  });

  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<WholesalePricingScheduleResponse | null>(null);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);

  const loadSchedule = async (tokenToVerify?: string | null) => {
    setLoading(true);
    try {
      const res = await wholesaleProgramService.verifyPricingAccessToken(tokenToVerify ?? token);
      setScheduleData(res);
    } catch {
      setScheduleData({
        valid: false,
        error: 'Unable to verify wholesale pricing access. Please submit a request.',
        currency: 'TZS',
        pricingTiers: {},
        rules: wholesaleProgramService.getAuthoritativePricingRules(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule(token);
  }, [token]);

  const handleEnquirySuccess = (result: { accessToken: string }) => {
    setToken(result.accessToken);
    loadSchedule(result.accessToken);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black pt-16 pb-24">
      {/* Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-white/50 pt-4">
          <button
            onClick={onNavigateHome}
            className="hover:text-primary transition-colors"
          >
            Home
          </button>
          <ChevronRight size={14} />
          <button
            onClick={onNavigateToProgramme}
            className="hover:text-primary transition-colors"
          >
            Wholesale & Distribution
          </button>
          <ChevronRight size={14} />
          <span className="text-white font-medium">Wholesale Pricing Schedule</span>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Verifying Commercial Access Permissions...
            </p>
          </div>
        ) : scheduleData?.valid ? (
          /* =========================================================================
             AUTHORIZED WHOLESALE PRICING VIEW
             ========================================================================= */
          <div className="space-y-10">
            {/* Header / Verified Badge */}
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-primary/30 relative overflow-hidden shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <ShieldCheck size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {scheduleData.isAgent ? 'VERIFIED DISTRIBUTOR' : 'COMMERCIAL ACCESS GRANTED'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
                    Standard Wholesale Price Schedule
                  </h1>

                  <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
                    {scheduleData.businessName ? (
                      <>
                        Access confirmed for <strong>{scheduleData.businessName}</strong>
                        {scheduleData.applicantName && ` (${scheduleData.applicantName})`}.
                        Your wholesale pricing access is ready. View our current standard wholesale pricing and contact our team if you are interested in a distributor partnership.
                      </>
                    ) : (
                      <>
                        Your wholesale pricing access is ready. View our current standard wholesale pricing and contact our team if you are interested in a distributor partnership.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {scheduleData.enquiryReference && (
                    <div className="px-4 py-2.5 rounded-2xl bg-black border border-white/10 text-left">
                      <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Reference Ref</p>
                      <p className="text-xs font-mono font-bold text-primary">{scheduleData.enquiryReference}</p>
                    </div>
                  )}

                  <div className="px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/30 text-left">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/60">Currency</p>
                    <p className="text-xs font-mono font-black text-primary">{scheduleData.currency}</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            </div>

            {/* Authoritative Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 1. T-Shirts */}
              <div className="p-8 rounded-3xl bg-zinc-950 border-2 border-primary/40 space-y-6 shadow-2xl relative">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                      CORE APPAREL
                    </span>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-2">
                      African Boy Heavyweight T-Shirts
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Package size={22} />
                  </div>
                </div>

                <p className="text-xs text-white/60 leading-relaxed">
                  Heavyweight 240+ GSM premium cotton tees featuring iconic African Boy embossed, silkscreen, and rubberized heritage graphics.
                </p>

                <div className="space-y-3 pt-2">
                  {/* Tier 1: 500-999 */}
                  <div className="p-4 rounded-2xl bg-black border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-white">Tier 1: 500 – 999 Pieces</p>
                      <p className="text-[11px] text-white/50">Mid-tier volume replenishment</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">TZS 35,000</p>
                      <p className="text-[10px] text-white/40 uppercase">per unit</p>
                    </div>
                  </div>

                  {/* Tier 2: 1,000+ */}
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black uppercase text-white">Tier 2: 1,000+ Pieces</p>
                        <span className="px-2 py-0.5 rounded-full bg-primary text-black font-black text-[9px] uppercase">
                          Distributor MOQ
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70">Full distributor opening order</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary">TZS 30,000</p>
                      <p className="text-[10px] text-white/60 uppercase">per unit</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 flex items-start gap-2">
                  <AlertCircle size={15} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>Orders below 500 units require authorised administrative review according to policy.</span>
                </div>
              </div>

              {/* 2. Caps */}
              <div className="p-8 rounded-3xl bg-zinc-950 border-2 border-primary/40 space-y-6 shadow-2xl relative">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                      SIGNATURE HEADWEAR
                    </span>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-2">
                      African Boy Signature Caps
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Award size={22} />
                  </div>
                </div>

                <p className="text-xs text-white/60 leading-relaxed">
                  Distressed dad caps, structured 6-panel snapbacks, and trucker caps with 3D embroidery and custom African Boy interior taping.
                </p>

                <div className="space-y-3 pt-2">
                  {/* Wholesale tier: 300+ */}
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black uppercase text-white">Wholesale Tier: 300+ Pieces</p>
                        <span className="px-2 py-0.5 rounded-full bg-primary text-black font-black text-[9px] uppercase">
                          Category Tier
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70">Signature headwear allocation</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary">TZS 18,000</p>
                      <p className="text-[10px] text-white/60 uppercase">per unit</p>
                    </div>
                  </div>

                  {/* Under 300 */}
                  <div className="p-4 rounded-2xl bg-black border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-white">Under 300 Pieces</p>
                      <p className="text-[11px] text-white/50">Non-standard volume</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-amber-400">Authorised Review</p>
                      <p className="text-[10px] text-white/40 uppercase">Subject to HQ approval</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>Caps count toward the 1,000-piece distributor opening-order requirement.</span>
                </div>
              </div>
            </div>

            {/* Crucial Distributor Commercial Policies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mixed Opening Order Policy */}
              <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Package size={16} /> Mixed Opening Order Logic
                </div>
                <h4 className="text-sm font-black text-white uppercase">Product Combination Permitted</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  The 1,000-piece distributor opening order does <strong>not</strong> require 1,000 T-shirts exclusively. Eligible product categories (e.g. 700 T-Shirts and 300 Caps) can be combined toward the 1,000-piece opening order.
                </p>
              </div>

              {/* 4 Annual Collections Policy */}
              <div className="p-6 rounded-3xl bg-zinc-950 border border-primary/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Globe size={16} /> 4-Collection Commitment
                </div>
                <h4 className="text-sm font-black text-white uppercase">4 Drops · 1,000 Pcs Each</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  “Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.”
                </p>
              </div>

              {/* Separate Shipping Policy */}
              <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <FileText size={16} /> Separate Shipping Costs
                </div>
                <h4 className="text-sm font-black text-white uppercase">Transparent Freight Quotations</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Merchandise sales invoices cover product goods only. Freight shipping is quoted and approved separately for each shipment based on destination from Dar es Salaam or China factory-direct.
                </p>
              </div>
            </div>

            {/* Next Steps CTA Banner */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-zinc-950 via-black to-zinc-950 border border-primary/40 space-y-6 text-center shadow-2xl">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                OFFICIAL APPOINTMENT
              </span>

              <h3 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white max-w-2xl mx-auto">
                Ready to Bring African Boy to Your Territory?
              </h3>

              <p className="text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
                Wholesale pricing access is informational. To secure exclusive territorial distribution rights and obtain a binding 12-month commercial agreement, submit your distributor application.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => setIsAppModalOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>APPLY FOR DISTRIBUTOR APPOINTMENT</span>
                  <ArrowRight size={16} />
                </button>

                <a
                  href="https://wa.me/255767788888?text=Hello%20African%20Boy%20Commercial%20Team%2C%20I%20have%20reviewed%20the%20Wholesale%20Price%20Schedule%20and%20would%20like%20to%20discuss%20a%20distribution%20partnership."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-7 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-2xl border border-white/15 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} className="text-primary" />
                  <span>CONTACT COMMERCIAL TEAM</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             RESTRICTED GATE (UNAUTHENTICATED / NO VALID TOKEN)
             ========================================================================= */
          <div className="py-12 sm:py-20 max-w-2xl mx-auto text-center space-y-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/40 mx-auto flex items-center justify-center text-primary shadow-[0_0_30px_rgba(234,179,8,0.25)]">
              <Lock size={36} />
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                RESTRICTED COMMERCIAL SCHEDULE
              </span>
              <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
                Unlock African Boy Wholesale Pricing
              </h1>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary">
                Wholesale Pricing Access Required
              </h2>
              <p className="text-sm text-white/70 leading-relaxed max-w-lg mx-auto">
                Commercial wholesale unit prices and volume discount schedules are reserved for qualified retailers. Access to the African Boy Wholesale Price Schedule is restricted to verified commercial partners and registered prospective distributors. Submit your business details to access our wholesale pricing schedule and explore distribution opportunities.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 text-left space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-primary">
                What Qualified Prospects Unlock:
              </h3>
              <ul className="space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-primary flex-shrink-0" />
                  <span>Official volume-tier pricing for Heavyweight Tees and Caps in TZS</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-primary flex-shrink-0" />
                  <span>Distributor opening-order benefits and mixed product allocation rules</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-primary flex-shrink-0" />
                  <span>Direct contact with African Boy commercial executive liaison</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setIsEnquiryModalOpen(true)}
                aria-label="Request Pricing Access"
                className="w-full sm:w-auto px-8 py-4 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>REQUEST PRICING ACCESS</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={onNavigateToProgramme}
                className="w-full sm:w-auto px-7 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-2xl border border-white/15 transition-all"
              >
                RETURN TO PROGRAMME OVERVIEW
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enquiry Modal */}
      <WholesalePricingEnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        onSuccess={handleEnquirySuccess}
        onOpenApplication={() => setIsAppModalOpen(true)}
        onViewPricing={(t) => {
          setToken(t);
          loadSchedule(t);
        }}
      />

      {/* Full Distributor Application Modal */}
      <AgentApplicationModal
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
      />
    </div>
  );
}
