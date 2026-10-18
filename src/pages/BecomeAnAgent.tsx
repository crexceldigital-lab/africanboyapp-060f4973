import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, ShieldCheck, TrendingUp, Award, CheckCircle2, ChevronDown,
  ArrowRight, Sparkles, Package, Users, Store, HelpCircle, Layers, Check,
  FileText, DollarSign, Truck, AlertCircle, Building2
} from 'lucide-react';
import AgentApplicationModal from '../components/agent/AgentApplicationModal';
import spotlight1 from '@/assets/spotlight-1.png';
import spotlight2 from '@/assets/spotlight-2.png';
import spotlight7 from '@/assets/spotlight-7.png';
import spotlight8 from '@/assets/spotlight-8.png';
import heroBg from '@/assets/hero-group.jpg.asset.json';

interface BecomeAnAgentProps {
  onNavigateHome?: () => void;
}

export default function BecomeAnAgent({ onNavigateHome }: BecomeAnAgentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const FAQS = [
    {
      q: 'What is the African Boy Country Distributor Programme?',
      a: 'The Country Distributor Programme is African Boy’s structured international commercial partnership. It is designed for established fashion retailers, commercial wholesalers, and enterprise distributors who have the business capability, retail infrastructure, and working capital to distribute African Boy collections across a defined national or regional territory.',
    },
    {
      q: 'What is the contract term and exclusivity policy?',
      a: 'Country Distributors operate under a formal 12-month commercial distribution agreement with agreed performance expectations and renewal criteria. Exclusivity is not automatic; it is granted strictly in writing based on confirmed territory reach, sales commitments, and mutual performance reviews.',
    },
    {
      q: 'What is the minimum opening order requirement?',
      a: 'The minimum initial opening order is 1,000 pieces across available catalogue lines. This ensures distributors maintain adequate stock depth, provide instant fulfillment in their domestic market, and represent the brand with full category presence.',
    },
    {
      q: 'What are the authoritative wholesale pricing tiers?',
      a: 'Wholesale prices are structured in Tanzanian Shillings (TZS): African Boy T-Shirts are priced at TZS 35,000 (500–999 units) and TZS 30,000 (1,000+ units). African Boy Caps are priced at TZS 18,000 (300+ units). Quantities below category tiers require authorised review.',
    },
    {
      q: 'Why are product sales and shipping costs handled separately?',
      a: 'To guarantee transparent commercial pricing and avoid inflated estimates, merchandise invoices cover product sales only. Shipping arrangements are quoted separately based on your destination and preferred dispatch origin: Option A (Dar es Salaam, Tanzania) or Option B (Factory Direct, China). Verified freight quotes are approved prior to shipment.',
    },
    {
      q: 'What business capability and financial documentation are required?',
      a: 'Applicants must provide evidence of business capability and financial capacity, including a 1-year market-entry plan, sales forecast, operating budget allocation, proof of working capital to fund opening stock and operations, and details on existing sales staff and retail or warehousing infrastructure.',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black pt-16 pb-20">
      {/* 1. Hero Section */}
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg.url}
            alt="African Boy Worldwide"
            className="w-full h-full object-cover object-center opacity-40 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8 pt-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 backdrop-blur-md"
          >
            <Globe className="text-primary w-4 h-4 animate-spin-slow" />
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">
              OFFICIAL COMMERCIAL EXPANSION · 2026
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.95] text-white">
              AFRICAN BOY <br className="hidden sm:inline" />
              <span className="text-primary underline decoration-primary/30 decoration-wavy">
                COUNTRY DISTRIBUTOR PROGRAMME
              </span>
            </h1>
            <p className="max-w-3xl mx-auto text-sm sm:text-base md:text-lg text-white/80 font-medium leading-relaxed pt-2">
              Become an authorised African Boy Country Distributor and develop the brand in your market through a structured wholesale and distribution partnership.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-9 py-4 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_35px_rgba(234,179,8,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 group"
            >
              <span>APPLY AS COUNTRY DISTRIBUTOR</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => scrollToSection('programme-pillars')}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-2xl border border-white/15 backdrop-blur-md hover:border-white/30 transition-all flex items-center justify-center gap-2"
            >
              PROGRAMME REQUIREMENTS
            </button>
          </motion.div>

          {/* Key Value Badges */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-white/10">
            {[
              { label: '12-Month Contract', sub: '1-Year Commercial Agreement' },
              { label: '1,000 Pcs Opening Order', sub: 'Minimum Opening Allocation' },
              { label: 'Authoritative Pricing', sub: 'Factory Wholesale TZS Tiers' },
              { label: 'Separate Shipping', sub: 'Tanzania or China Fulfillment' },
            ].map((item, i) => (
              <div key={i} className="text-center p-2">
                <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">{item.label}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Programme Overview */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10">
              <Sparkles size={14} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                STRATEGIC BRAND EXPANSION
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white leading-tight">
              Scale With Africa’s Premier <br />
              <span className="text-primary">Streetwear Powerhouse</span>
            </h2>

            <p className="text-sm sm:text-base text-white/70 leading-relaxed">
              Founded on authenticity and high-end street culture by artist and visionary Jux,
              African Boy has become an internationally recognized symbol of modern African luxury.
              Demand now spans across Africa, Europe, North America, and the Middle East.
            </p>

            <p className="text-sm sm:text-base text-white/70 leading-relaxed">
              To deliver on this global demand, African Boy appoints official <strong>Country Distributors</strong>.
              Authorized distributors hold inventory locally, service domestic retail accounts, fulfill online orders,
              and build regional market leadership under direct brand supervision and support.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-white">
                <ShieldCheck size={16} className="text-primary" /> 100% Authentic Guaranteed
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-white">
                <TrendingUp size={16} className="text-primary" /> Rapid Regional Brand Equity
              </div>
            </div>
          </div>

          {/* Visual Showcase Collage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-56 sm:h-72">
                <img src={spotlight1} alt="African Boy T-Shirts" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-44 sm:h-52">
                <img src={spotlight7} alt="African Boy Headwear" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="space-y-4 pt-6">
              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-44 sm:h-52">
                <img src={spotlight8} alt="African Boy Tracksuit" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-56 sm:h-72">
                <img src={spotlight2} alt="African Boy Collection" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Four Core Programme Pillars */}
      <section id="programme-pillars" className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            AUTHORITATIVE SPECIFICATIONS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Programme Requirements & Commercial Structure
          </h2>
          <p className="text-sm text-white/60">
            Every appointed Country Distributor operates under rigorous commercial standards established in the official Country Distributor Programme Guide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1: Contract & Exclusivity */}
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 hover:border-primary/40 transition-all space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText size={24} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">PILLAR 1</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                12-Month Agreement & Exclusivity Terms
              </h3>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Appointees enter into a formal 1-year commercial distribution agreement defining territory boundaries, volume milestones, and renewal conditions.
              </p>
            </div>
            <ul className="space-y-2 pt-2 border-t border-white/10">
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>12-Month Term:</strong> Fixed 1-year partnership term with structured annual renewal reviews.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Non-Automatic Exclusivity:</strong> Exclusivity is never implied; it is granted strictly in writing upon meeting volume commitments.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Direct Brand Alignment:</strong> Access to official trademark licenses and regional brand asset packages.</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2: Capability & Financial Capacity */}
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 hover:border-primary/40 transition-all space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 size={24} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">PILLAR 2</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                Business Capability & Working Capital
              </h3>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Distributors must demonstrate the operational muscle and financial liquidity required to support sustained market penetration.
              </p>
            </div>
            <ul className="space-y-2 pt-2 border-t border-white/10">
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>1-Year Business Plan:</strong> Structured market-entry strategy, sales forecast, and operating budget plan.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Financial Capacity:</strong> Evidence of working capital to fund opening stock inventory and ongoing retail operations.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Infrastructure & Team:</strong> Established retail boutiques, warehousing space, sales representatives, and logistics.</span>
              </li>
            </ul>
          </div>

          {/* Pillar 3: Opening Order & MOQ */}
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 hover:border-primary/40 transition-all space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Package size={24} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">PILLAR 3</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                1,000 Pieces Minimum Opening Order
              </h3>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Every newly appointed Country Distributor launches with a substantial opening allocation to ensure immediate retail presence.
              </p>
            </div>
            <ul className="space-y-2 pt-2 border-t border-white/10">
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>1,000 Units MOQ:</strong> Minimum initial opening order across available catalogue lines.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Full Size Curve Allocation:</strong> Balanced size distribution from S to 3XL to serve all customer profiles.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Priority Production Slot:</strong> Guaranteed factory allocation and expedited fulfillment turnaround.</span>
              </li>
            </ul>
          </div>

          {/* Pillar 4: Separate Shipping Policy */}
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 hover:border-primary/40 transition-all space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Truck size={24} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">PILLAR 4</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                Separate Product Sales & Shipping Quotes
              </h3>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Product sales and freight logistics are cleanly separated to prevent arbitrary markups and deliver maximum transparency.
              </p>
            </div>
            <ul className="space-y-2 pt-2 border-t border-white/10">
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Merchandise-Only Invoices:</strong> Goods invoices cover products only; no unverified shipping estimates.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Flexible Shipping Origins:</strong> Option A (Dar es Salaam stock) or Option B (Factory-direct China freight).</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong>Freight Acceptance Before Dispatch:</strong> Verified freight quotes are reviewed and confirmed prior to release.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Official Catalogue & Authoritative Wholesale Pricing */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            AUTHORITATIVE PRICING
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Wholesale Price Schedule
          </h2>
          <p className="text-sm text-white/60">
            Authoritative wholesale pricing schedule for initial catalogue lines in Tanzanian Shillings (TZS).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* T-Shirts Pricing Card */}
          <div className="p-8 rounded-3xl bg-zinc-950 border-2 border-primary/40 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                  FLAGSHIP APPAREL
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-2">
                  African Boy T-Shirts
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

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 flex items-center gap-2">
              <AlertCircle size={14} className="text-primary flex-shrink-0" />
              <span>Orders below 500 units require authorised administrative review.</span>
            </div>
          </div>

          {/* Caps Pricing Card */}
          <div className="p-8 rounded-3xl bg-zinc-950 border-2 border-primary/40 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                  SIGNATURE HEADWEAR
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-2">
                  African Boy Caps
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

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 flex items-center gap-2">
              <AlertCircle size={14} className="text-primary flex-shrink-0" />
              <span>Caps count toward the 1,000-piece total distributor opening order.</span>
            </div>
          </div>
        </div>

        {/* Future Expansion Note */}
        <div className="mt-8 max-w-5xl mx-auto p-4 rounded-2xl bg-zinc-950/80 border border-white/10 text-center">
          <p className="text-xs text-white/60">
            <strong className="text-white">Additional Collections Phasing In:</strong> Tracksuits, Cuban collar shirts, outerwear, socks, and footwear will be enabled for distributor allocations in subsequent drops without altering contractual terms.
          </p>
        </div>
      </section>

      {/* 5. Separate Shipping Logistics Overview */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            GLOBAL LOGISTICS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Dual Fulfillment Channels
          </h2>
          <p className="text-sm text-white/60">
            African Boy coordinates fulfillment through two strategic global origins to maximize cost efficiency and transit speed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                OPTION A
              </span>
              <span className="text-xs text-white/50 font-bold">Fast Regional Dispatch</span>
            </div>
            <h3 className="text-xl font-black uppercase text-white">Ship from Tanzania</h3>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              Dispatched from central warehouses in Dar es Salaam. Optimal for East, Central, and Southern African territories requiring rapid customs clearance and overland/air transit.
            </p>
            <ul className="space-y-2 text-xs text-white/80 pt-2 border-t border-white/10">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-primary" /> Ready inventory in Dar es Salaam
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-primary" /> Ideal for EAC & SADC regional markets
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-primary" /> Fast dispatch within 3–5 business days
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                OPTION B
              </span>
              <span className="text-xs text-white/50 font-bold">Volume Freight Direct</span>
            </div>
            <h3 className="text-xl font-black uppercase text-white">Ship from China</h3>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              Direct factory freight forwarder dispatch from manufacturing centers in China. Optimal for high-volume distributor allocations, containerized ocean cargo, or direct international air freight to Europe, the Americas, and West Africa.
            </p>
            <ul className="space-y-2 text-xs text-white/80 pt-2 border-t border-white/10">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-primary" /> Direct from manufacturing facilities
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-primary" /> Cost-effective ocean & air cargo rates
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-primary" /> Global destination delivery support
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Onboarding Journey */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            APPLICATION JOURNEY
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Distributor Appointment Process
          </h2>
          <p className="text-sm text-white/60">
            A structured, 4-stage vetting and onboarding protocol to formalize your international distributor partnership.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Online Application',
              desc: 'Submit your organization profile, 1-year business strategy, sales forecast, operating budget, and capability credentials.',
            },
            {
              step: '02',
              title: 'Capability & Financial Review',
              desc: 'Our administrative committee conducts due diligence on your retail footprint, working capital capacity, and territory plan.',
            },
            {
              step: '03',
              title: '12-Month Agreement & Offer',
              desc: 'We issue an official commercial offer, formalize the 1-year distribution agreement, and assign your unique Distributor Code.',
            },
            {
              step: '04',
              title: '1,000 Pcs Opening Order',
              desc: 'Confirm your opening allocation in the Agent Portal, approve separate freight logistics, and launch nationwide distribution.',
            },
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 relative">
              <span className="text-3xl font-black italic text-primary/40">
                {item.step}
              </span>
              <h3 className="text-base font-black uppercase tracking-tight text-white">
                {item.title}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. FAQs */}
      <section className="py-20 px-6 max-w-4xl mx-auto border-b border-white/10">
        <div className="text-center space-y-4 mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            QUESTIONS & ANSWERS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, i) => {
            const isOpen = openFaqIndex === i;
            return (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden transition-colors hover:border-white/20"
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white"
                >
                  <span>{faq.q}</span>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={18} className="text-primary flex-shrink-0" />
                  </motion.div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-white/70 leading-relaxed border-t border-white/5">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Final Call to Action */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center space-y-8">
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            AUTHORIZED DISTRIBUTION
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-white">
            Ready to Become a <span className="text-primary">Country Distributor</span>?
          </h2>
          <p className="max-w-2xl mx-auto text-sm text-white/60 leading-relaxed">
            Partner with Africa’s most iconic urban luxury fashion brand.
            Submit your Country Distributor application today for executive review.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-10 py-4.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.35)] hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3"
        >
          <span>APPLY AS COUNTRY DISTRIBUTOR</span>
          <ArrowRight size={18} />
        </button>
      </section>

      {/* Modal Application Form */}
      <AgentApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
