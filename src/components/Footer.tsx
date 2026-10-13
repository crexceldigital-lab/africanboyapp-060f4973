import React from 'react';
import { NavTab } from '../types';
import { Globe, ArrowRight, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface FooterProps {
  onNavigate?: (tab: NavTab) => void;
  showAgentBanner?: boolean;
}

export default function Footer({ onNavigate, showAgentBanner = false }: FooterProps) {
  const navigateTo = (tab: NavTab) => {
    if (tab === 'become-an-agent') {
      window.history.pushState({}, '', '/become-an-agent');
    }
    onNavigate?.(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-black text-white border-t border-white/10 pt-16 pb-28 sm:pb-24">
      <div className="max-w-7xl mx-auto px-6 space-y-14">
        {/* Optional Promotional Banner inside Footer (disabled by default to prevent duplication on homepage) */}
        {showAgentBanner && (
          <div className="rounded-3xl bg-zinc-950 border border-primary/30 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2 text-center md:text-left relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                GLOBAL AGENT PROGRAM
              </span>
              <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
                Represent African Boy In Your Market
              </h3>
              <p className="text-xs sm:text-sm text-white/60 max-w-xl">
                Join our international distribution network. Wholesalers, regional resellers, and country partners wanted worldwide.
              </p>
            </div>

            <button
              onClick={() => navigateTo('become-an-agent')}
              className="relative z-10 px-8 py-3.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <span>BECOME AN AGENT</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 text-xs">
          {/* Brand Info */}
          <div className="space-y-4 col-span-2 md:col-span-1">
            <span className="text-primary font-black text-2xl tracking-tighter italic">
              AFRICAN BOY
            </span>
            <p className="text-white/60 leading-relaxed text-xs">
              Africa’s premier contemporary luxury streetwear brand by Jux. Crafted with pride, worn globally.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-white/50 pt-2">
              <ShieldCheck size={14} className="text-primary" /> Verified Authentic Streetwear
            </div>
          </div>

          {/* Explore Links */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Explore</h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <button onClick={() => navigateTo('shop')} className="hover:text-primary transition-colors">
                  Shop All Collections
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('video')} className="hover:text-primary transition-colors">
                  Lookbook & Gallery
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('vip')} className="hover:text-primary transition-colors">
                  VIP Club
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('fitme')} className="hover:text-primary transition-colors">
                  FitMe Size Assistant
                </button>
              </li>
            </ul>
          </div>

          {/* International & Partnership */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Global Network</h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <button onClick={() => navigateTo('become-an-agent')} className="text-primary font-bold hover:underline">
                  ★ Become an Agent
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('agent-dashboard')} className="hover:text-primary transition-colors">
                  Agent Portal Login
                </button>
              </li>
              <li>
                <button
                  onClick={() => { window.location.href = '/track-order'; }}
                  className="hover:text-primary transition-colors"
                >
                  Track Order
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('admin')} className="hover:text-primary transition-colors">
                  Staff & POS Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Headquarters</h4>
            <ul className="space-y-2.5 text-white/70">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
                <span>Dar es Salaam, Tanzania (Global HQ)</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-primary flex-shrink-0" />
                <a href="tel:+255627997928" className="hover:text-primary transition-colors">
                  +255 627 997 928
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-primary flex-shrink-0" />
                <a href="mailto:partners@africanboy.africa" className="hover:text-primary transition-colors">
                  partners@africanboy.africa
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Copyright */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-white/50 text-[11px]">
          <p>© {new Date().getFullYear()} African Boy International Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigateTo('become-an-agent')} className="hover:text-primary transition-colors">
              Agent Recruitment
            </button>
            <span>·</span>
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Commercial Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
