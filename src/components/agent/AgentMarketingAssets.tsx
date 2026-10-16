import React, { useState } from 'react';
import {
  Download, Image, Film, Share2, Store, Sparkles, AlertTriangle,
  FileCheck, ExternalLink, CheckCircle2, ShieldAlert, Award, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import type { AgentProfile, WholesaleProgramSettings } from '@/types';
import { LEGAL_ARTIST_DISCLAIMER } from '@/services/wholesaleProgramService';

interface AgentMarketingAssetsProps {
  agentProfile: AgentProfile;
  settings?: WholesaleProgramSettings | null;
}

export default function AgentMarketingAssets({ agentProfile, settings }: AgentMarketingAssetsProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isRequestingAppearance, setIsRequestingAppearance] = useState(false);
  const [appearanceNotes, setAppearanceNotes] = useState('');

  const marketingAssetPacks = [
    {
      id: 'brand-identity',
      title: 'African Boy Brand Identity & Vector Crest',
      category: 'Digital Marketing Assets',
      description: 'Master brand marks, golden cheetah crest, official typography specs, and vector logo pack (SVG, PNG, AI).',
      fileFormat: 'ZIP Archive (48 MB)',
      badge: 'Core Identity',
      recommendedFor: 'Wholesale Reseller, Premium Market Agent, Country Distributor',
      includedItems: [
        'High-Resolution Gold & Monochrome Vector Logos',
        'Official African Boy Brand Guidelines PDF',
        'Authorized Retailer Window Decal Cut Files',
        'E-Commerce Stockist Verification Badge'
      ]
    },
    {
      id: 'seasonal-lookbook',
      title: 'Capsule Drops & Editorial Lookbook 2026',
      category: 'Digital Marketing Assets',
      description: 'High-fashion editorial photography, high-resolution lifestyle imagery featuring Jux, and studio packshots.',
      fileFormat: 'ZIP Archive (142 MB)',
      badge: 'Editorial Pack',
      recommendedFor: 'All Active Agents',
      includedItems: [
        'Editorial lookbook shoots on Dar es Salaam & Zanzibar coast',
        'Clean white-background e-commerce packshots (T-shirts & Caps)',
        'Model lifestyle lookbook for print and digital cataloguing',
        'Commercial usage rights for authorized wholesale territory'
      ]
    },
    {
      id: 'social-media-kit',
      title: 'Social Media Launch & Advertising Kit',
      category: 'Campaign Coordination',
      description: 'Pre-formatted Instagram Stories, Reels covers, TikTok templates, and bilingual ad copy in English & Swahili.',
      fileFormat: 'Figma & PSD Pack (84 MB)',
      badge: 'Digital Launch',
      recommendedFor: 'Premium Market Agent & Country Distributor',
      includedItems: [
        '9:16 Instagram Reels & TikTok video overlays',
        '1:1 Feed carousel templates for new stock announcements',
        'Pre-approved promotional captions & product descriptions',
        'Official hashtag guidelines (#AfricanBoy #AfricanBoyStockist)'
      ]
    },
    {
      id: 'in-store-merchandising',
      title: 'Retail Store Visual Merchandising Blueprint',
      category: 'Local Activations',
      description: 'Architectural display guidelines, acrylic cap stand specs, wooden hanger branding, and POS display units.',
      fileFormat: 'PDF & CAD Pack (36 MB)',
      badge: 'Physical Retail',
      recommendedFor: 'Agents with Physical Storefronts',
      includedItems: [
        'Standard display shelf arrangements for caps and folded tees',
        'Hanger tag placement and security sensor guidance',
        'Window vinyl decal installation instructions',
        'Point-of-Sale counter display plaque dimensions'
      ]
    },
    {
      id: 'stockist-certificate',
      title: 'Official Authorized Stockist Certificate',
      category: 'Brand-Page Features',
      description: 'High-res certificate signed by African Boy executive management verifying authorized partnership status.',
      fileFormat: 'Print PDF (300 DPI)',
      badge: 'Official Credential',
      recommendedFor: 'All Approved Agents',
      includedItems: [
        'Branded frameable certificate with unique partner code',
        'Territory authorization seal',
        'QR code linking to africanboy.africa verified stockist directory',
        'Valid through agreement expiration term'
      ]
    },
    {
      id: 'artist-appearance-protocol',
      title: 'Artist Appearance & Activation Request Protocol',
      category: 'Artist-Led Promotional Opportunities',
      description: 'Standard operating procedure for requesting artist-led promotional engagements and tour activations.',
      fileFormat: 'Policy Document (PDF)',
      badge: 'Restricted Protocol',
      recommendedFor: 'Country Distributors & High-Volume Agents',
      includedItems: [
        'Artist visit request application guidelines',
        'Security, hospitality, and venue technical riders',
        'Required advance notice windows (minimum 60 days)',
        'Separate talent contract terms & rider expectations'
      ]
    }
  ];

  const handleDownloadAsset = (assetTitle: string, fileFormat: string) => {
    toast.success(`Preparing ${assetTitle} (${fileFormat})...`);
    // Create a mock simulated download of a text manifest
    setTimeout(() => {
      const element = document.createElement('a');
      const file = new Blob([
        `AFRICAN BOY GLOBAL BRAND ASSET MANIFEST\n\nAsset: ${assetTitle}\nAuthorized Partner: ${agentProfile.business_name || agentProfile.full_name}\nAgent Code: ${agentProfile.agent_code}\nTerritory: ${agentProfile.assigned_territory}\n\nNotice: All brand assets remain the intellectual property of African Boy. Reproduction without authorization is strictly prohibited.\nGenerated: ${new Date().toISOString()}`
      ], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${assetTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_manifest.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success(`Asset package manifest downloaded for ${assetTitle}`);
    }, 600);
  };

  const handleArtistAppearanceRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appearanceNotes.trim()) {
      toast.error('Please enter details of your proposed event or promotional campaign.');
      return;
    }
    toast.success('Promotional engagement request submitted to African Boy Talent Management desk. Review takes 5-10 business days.');
    setIsRequestingAppearance(false);
    setAppearanceNotes('');
  };

  const categories = [
    'all',
    'Digital Marketing Assets',
    'Campaign Coordination',
    'Brand-Page Features',
    'Local Activations',
    'Artist-Led Promotional Opportunities'
  ];

  const filteredAssets = activeCategory === 'all'
    ? marketingAssetPacks
    : marketingAssetPacks.filter(a => a.category === activeCategory);

  return (
    <div className="space-y-8 text-foreground">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary px-3 py-1 rounded-full bg-primary/15 border border-primary/30">
              OFFICIAL MARKETING COLLATERAL
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              LEVEL: {agentProfile.business_model.toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
            Approved Brand Assets & Marketing Support
          </h2>
          <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
            Access high-resolution lookbooks, vector brand marks, in-store merchandising guidelines, and official marketing assets curated for authorized wholesale agents and territory distributors.
          </p>
        </div>

        <button
          onClick={() => setIsRequestingAppearance(true)}
          className="relative z-10 px-6 py-3.5 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <Sparkles size={16} /> Request Artist Activation
        </button>
      </div>

      {/* STRICT ARTIST APPEARANCE LEGAL NOTICE CARD */}
      <div className="p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-200 space-y-3 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert size={26} />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                CRITICAL LEGAL CLAUSE · TALENT & ARTIST APPEARANCES
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[10px] font-bold uppercase">
                MANDATORY NOTICE
              </span>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed font-medium">
              {LEGAL_ARTIST_DISCLAIMER}
            </p>
            <p className="text-[11px] text-amber-200/70 pt-1">
              Never promise, advertise, or announce an appearance by Jux or African Boy ambassadors to customers, retail partners, or media without a countersigned African Boy Talent Engagement Contract and confirmed security/hospitality rider.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-white/10">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-primary text-black font-black shadow-md'
                : 'bg-zinc-950 text-white/60 hover:text-white border border-white/5'
            }`}
          >
            {cat === 'all' ? 'All Asset Packs' : cat}
          </button>
        ))}
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => (
          <div
            key={asset.id}
            className="p-6 rounded-3xl bg-zinc-950 border border-white/10 hover:border-primary/40 flex flex-col justify-between transition-all group space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                  {asset.badge}
                </span>
                <span className="text-[10px] text-white/50 font-mono">
                  {asset.fileFormat}
                </span>
              </div>

              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                  {asset.title}
                </h3>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                  {asset.description}
                </p>
              </div>

              {/* Included items */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-[10px] uppercase font-bold text-white/40 block">Package Contents:</span>
                <ul className="space-y-1.5 text-[11px] text-white/70">
                  {asset.includedItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="text-[10px] text-white/40">
                Recommended For: <span className="text-white/70 font-medium">{asset.recommendedFor}</span>
              </div>
              <button
                onClick={() => handleDownloadAsset(asset.title, asset.fileFormat)}
                className="w-full py-3 bg-zinc-900 group-hover:bg-primary group-hover:text-black text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 group-hover:border-primary"
              >
                <Download size={15} /> Download Asset Pack
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Directory Listing & Social Feature Status */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-white">
                Authorized Stockist Listing & Promotion Status
              </h3>
              <p className="text-xs text-white/50">
                Live visibility across official African Boy digital ecosystem.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-black uppercase">
            Active Partner
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-white/50">Global Stockists Directory</span>
            <p className="text-sm font-bold text-white">Listed as Verified Stockist</p>
            <p className="text-[11px] text-primary">africanboy.africa/stockists</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-white/50">Territory Distribution Rights</span>
            <p className="text-sm font-bold text-white">{agentProfile.assigned_territory}</p>
            <p className="text-[11px] text-white/50">{agentProfile.is_exclusive ? 'Exclusive Territory Assigned' : 'Non-Exclusive Partner'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-white/50">Social Media Spotlight</span>
            <p className="text-sm font-bold text-white">Eligible for Partner Feature</p>
            <p className="text-[11px] text-white/50">Tagged on @africanboybrand</p>
          </div>
        </div>
      </div>

      {/* Artist Promotional Activation Modal */}
      {isRequestingAppearance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 space-y-5 text-white max-h-[90vh] overflow-y-auto">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">TALENT ENGAGEMENT DESK</span>
              <h3 className="text-xl font-black uppercase tracking-tight">Request Artist Promotional Activation</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Submit a formal proposal for artist-led brand activations, store opening walkthroughs, or tour promotional coordination.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
              <strong className="block text-amber-300">Mandatory Notice:</strong>
              <p className="text-[11px] leading-relaxed">
                Artist appearances require minimum 60 days advance submission and are subject to talent availability, technical and hospitality rider fulfillment, and a separate bilateral contract. Appearances are never guaranteed by order volume alone.
              </p>
            </div>

            <form onSubmit={handleArtistAppearanceRequest} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-white/50">Proposed Event / Campaign Description *</label>
                <textarea
                  rows={4}
                  value={appearanceNotes}
                  onChange={e => setAppearanceNotes(e.target.value)}
                  placeholder="Detail the event format, location/storefront, estimated audience, dates, and media coverage..."
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestingAppearance(false)}
                  className="flex-1 py-3 rounded-xl border border-white/15 text-xs font-bold uppercase hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
