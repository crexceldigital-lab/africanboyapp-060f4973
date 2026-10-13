import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, ShieldCheck, TrendingUp, Award, CheckCircle2, ChevronDown,
  ArrowRight, Sparkles, Package, Users, Store, HelpCircle, Layers, Check
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
      q: 'Who can apply to become an authorized African Boy Agent or Distributor?',
      a: 'We welcome established boutique owners, experienced fashion retailers, streetwear entrepreneurs, and regional wholesale distributors who have a verified physical or digital presence and a passion for African luxury streetwear.',
    },
    {
      q: 'What business models are supported?',
      a: 'We offer three structured models tailored to different scales: Wholesale Reseller (purchasing stock inventory for local retail), Commission-Based Agent (generating verified sales and earning margins), and Country Distributor (managing nationwide retail distribution and bulk allocations).',
    },
    {
      q: 'Are wholesale discounts and commission rates fixed or customized?',
      a: 'Commercial terms, minimum order quantities (MOQs), and discount tiers are configured and approved during the administrative agreement phase based on your operating market, distribution capacity, and territory scope.',
    },
    {
      q: 'Can I apply for territory exclusivity in my city or country?',
      a: 'Yes. Country Distributors and high-volume regional partners may request exclusive territory rights. Exclusivity is evaluated based on market commitment, sales performance, and regional reach.',
    },
    {
      q: 'How does replenishment and stock ordering work after approval?',
      a: 'Approved agents receive access to a dedicated Agent Portal (/agent/dashboard). Through this secure portal, agents can browse authorized catalogue collections, view applicable wholesale pricing, and place replenishment orders directly.',
    },
    {
      q: 'How long does the application review process take?',
      a: 'Our international partner onboarding committee reviews applications within 48 to 72 business hours. If more information is needed, you will be notified directly.',
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
              GLOBAL EXPANSION INITIATIVE · 2026
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.95] text-white">
              REPRESENT AFRICAN BOY <br className="hidden sm:inline" />
              <span className="text-primary underline decoration-primary/30 decoration-wavy">
                IN YOUR COUNTRY.
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-white/70 font-medium leading-relaxed pt-2">
              Join the African Boy global network. Represent the brand, sell our collections,
              and grow your business in your market with verified brand authorization.
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
              <span>BECOME AN AGENT</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => scrollToSection('opportunity-details')}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-2xl border border-white/15 backdrop-blur-md hover:border-white/30 transition-all flex items-center justify-center gap-2"
            >
              EXPLORE THE OPPORTUNITY
            </button>
          </motion.div>

          {/* Key Value Badges */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-white/10">
            {[
              { label: 'Authorized Distribution', sub: 'Verified Partner Rights' },
              { label: 'Direct Wholesale', sub: 'Factory Supply Pricing' },
              { label: 'Brand Assets', sub: 'Lookbooks & Media Kit' },
              { label: 'Dedicated Portal', sub: 'Real-Time Stock & Orders' },
            ].map((item, i) => (
              <div key={i} className="text-center p-2">
                <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">{item.label}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. About the African Boy Agent Program */}
      <section id="opportunity-details" className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10">
              <Sparkles size={14} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                THE GLOBAL MISSION
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white leading-tight">
              Scale With Africa’s Premier <br />
              <span className="text-primary">Streetwear Brand</span>
            </h2>

            <p className="text-sm sm:text-base text-white/70 leading-relaxed">
              Founded on authenticity, culture, and high-end street culture by artist and visionary Jux,
              African Boy has evolved into a global fashion symbol. Today, demand spans East Africa,
              West Africa, Southern Africa, Europe, the UK, the Middle East, and North America.
            </p>

            <p className="text-sm sm:text-base text-white/70 leading-relaxed">
              The <strong>African Boy Global Agent Program</strong> bridges international borders by empowering
              local entrepreneurs and commercial partners. Instead of relying on individual international shipping,
              authorized agents hold local stock, provide instant customer delivery, and unlock serious commercial growth.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-white">
                <ShieldCheck size={16} className="text-primary" /> 100% Authentic Guaranteed
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-white">
                <TrendingUp size={16} className="text-primary" /> High-Demand Urban Appeal
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

      {/* 3. Program Benefits */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            PARTNER ADVANTAGES
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Why Represent African Boy?
          </h2>
          <p className="text-sm text-white/60">
            We support our authorized agents with the tools, inventory supply, and promotional backing needed to thrive.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Store,
              title: 'Official Authorization',
              desc: 'Receive verified African Boy Agent credentials, official certificate, and listing in our authorized global network.',
            },
            {
              icon: TrendingUp,
              title: 'Wholesale & Margins',
              desc: 'Access direct wholesale price lists and attractive volume margins, enabling competitive retail pricing in your market.',
            },
            {
              icon: Package,
              title: 'Priority Replenishment',
              desc: 'Get first-look access to newly dropped collections, limited edition merchandise, and restocked bestsellers.',
            },
            {
              icon: Award,
              title: 'Marketing & Asset Support',
              desc: 'High-resolution campaign imagery, lookbooks, social media promotional collateral, and official branding assets.',
            },
            {
              icon: Layers,
              title: 'Dedicated Portal Access',
              desc: 'Manage your approved catalogue, create replenishment orders, and review sales statements at /agent/dashboard.',
            },
            {
              icon: Globe,
              title: 'Territory Opportunities',
              desc: 'Option to request regional or national exclusivity based on distribution capability and performance targets.',
            },
          ].map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <div
                key={i}
                className="p-8 rounded-3xl bg-zinc-950 border border-white/10 hover:border-primary/40 transition-all space-y-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  {benefit.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Available Agent Models */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            COMMERCIAL CATEGORIES
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Choose Your Operating Model
          </h2>
          <p className="text-sm text-white/60">
            Select the partnership model that best fits your business infrastructure and growth objectives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wholesale Reseller */}
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                RETAIL & BOUTIQUES
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Wholesale Reseller
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Ideal for fashion boutiques, streetwear concept stores, and online sellers who wish to purchase stock inventory in bulk and retail directly to customers.
              </p>
              <ul className="space-y-2.5 pt-2">
                {[
                  'Direct wholesale pricing tiers',
                  'Flexible category-specific ordering',
                  'Local stock inventory holding',
                  'Retain retail profit margins',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3.5 rounded-xl border border-white/20 hover:border-primary text-xs font-black uppercase tracking-widest text-white hover:text-primary transition-all"
            >
              Apply as Reseller
            </button>
          </div>

          {/* Commission-Based Agent */}
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                AGENTS & CREATORS
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Commission-Based Agent
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Designed for influencers, sales representatives, and promoters who drive customer demand and orders without taking on heavy local warehousing risks.
              </p>
              <ul className="space-y-2.5 pt-2">
                {[
                  'Approved commission on verified sales',
                  'Low capital investment requirement',
                  'Promotional collateral & tracking codes',
                  'Direct reporting via Agent Dashboard',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3.5 rounded-xl border border-white/20 hover:border-primary text-xs font-black uppercase tracking-widest text-white hover:text-primary transition-all"
            >
              Apply as Agent
            </button>
          </div>

          {/* Country Distributor */}
          <div className="p-8 rounded-3xl bg-zinc-900 border-2 border-primary/40 flex flex-col justify-between space-y-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full bg-primary text-black font-black text-[9px] uppercase tracking-widest">
                STRATEGIC
              </span>
            </div>
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                NATIONWIDE REACH
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Country Distributor
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                For established commercial distributors with multi-store distribution capability, regional warehouses, and sub-reseller logistics.
              </p>
              <ul className="space-y-2.5 pt-2">
                {[
                  'National or multi-city distribution mandate',
                  'Territory exclusivity consideration',
                  'Maximum volume discount tiers',
                  'Executive partner coordination with African Boy HQ',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Apply as Distributor
            </button>
          </div>
        </div>
      </section>

      {/* 5. How It Works (Timeline) */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-b border-white/10">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            THE PROCESS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            How The Program Works
          </h2>
          <p className="text-sm text-white/60">
            A transparent 4-step onboarding journey to launching authorized distribution in your market.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Apply Online',
              desc: 'Complete the 4-step recruitment form with your applicant info, business profile, and category preferences.',
            },
            {
              step: '02',
              title: 'Review & Vetting',
              desc: 'Our administrative team verifies your credentials, business model feasibility, and market territory demand.',
            },
            {
              step: '03',
              title: 'Agreement & Terms',
              desc: 'We finalize your commercial agreement, approved categories, wholesale terms, and assign your unique Agent Code.',
            },
            {
              step: '04',
              title: 'Launch & Distribute',
              desc: 'Access /agent/dashboard to place replenishment orders, receive promotional assets, and begin retailing.',
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

      {/* 6. FAQs */}
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

      {/* 7. Final Call to Action */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center space-y-8">
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            JOIN THE GLOBAL EXPANSION
          </span>
          <h2 className="text-4xl sm:text-6xl font-black italic uppercase tracking-tighter text-white">
            Ready to Represent <span className="text-primary">African Boy</span>?
          </h2>
          <p className="max-w-xl mx-auto text-sm text-white/60 leading-relaxed">
            Expand your business with Africa’s most iconic urban luxury fashion line.
            Submit your agent application today and our team will get in touch.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-10 py-4.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.35)] hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3"
        >
          <span>SUBMIT AGENT APPLICATION</span>
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
