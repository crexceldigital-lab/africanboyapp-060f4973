import React from 'react';
import { DollarSign, Package, AlertCircle, Layers, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import type { AgentProfile, WholesaleProgramSettings } from '@/types';
import { DEFAULT_PRICING_TIERS, SHIPPING_TAXES_DISCLAIMER } from '@/services/wholesaleProgramService';

interface AgentWholesalePriceListProps {
  agentProfile: AgentProfile;
  settings?: WholesaleProgramSettings | null;
}

export default function AgentWholesalePriceList({ agentProfile, settings }: AgentWholesalePriceListProps) {
  const currency = agentProfile.currency || 'TZS';
  const pricingTiers = settings?.pricingTiers || DEFAULT_PRICING_TIERS;
  const combineMixed = settings?.combineMixedQuantitiesForTiers || false;

  // Standard retail prices for comparison
  const retailPrices: Record<string, number> = {
    'T-Shirt': 45000,
    Caps: 35000,
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">COMMERCIAL SCHEDULE</span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1">
            Current Wholesale Price List & Volume Tiers
          </h2>
          <p className="text-xs text-white/60 mt-0.5">
            Verified tier pricing approved for partner <strong>{agentProfile.agent_code}</strong> ({agentProfile.business_model}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Operating Currency:</span>
          <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono font-black text-xs">
            {currency}
          </span>
        </div>
      </div>

      {/* Country Distributor Annual Collection Commitment Banner */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-primary/30 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-black font-black text-[9px] uppercase tracking-wider">
              ANNUAL COMMITMENT
            </span>
            <h3 className="text-sm font-black uppercase text-white tracking-wide">
              4 Annual Collections · 1,000 Pieces Each Drop
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-primary">
            4,000 Pieces Planned Annual Total
          </span>
        </div>
        <p className="text-xs text-white/90 font-medium leading-relaxed">
          “Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.”
        </p>
        <p className="text-[11px] text-white/60 leading-relaxed">
          The 1,000-piece requirement applies to <strong>EACH new collection individually</strong>, not merely to your initial opening order or total annual purchases.
          Each collection order must be placed and fulfilled under the agreed collection schedule and commercial terms.
        </p>
      </div>

      {/* Pricing Cards for T-shirts and Caps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['T-Shirt', 'Caps'].map(cat => {
          const tiers = pricingTiers[cat] || [];
          const retail = retailPrices[cat] || 40000;

          return (
            <div key={cat} className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-white">
                      African Boy {cat} Collections
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Standard Retail Price: <strong>{retail.toLocaleString()} TZS</strong>
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-white/70">
                  Core Line
                </span>
              </div>

              {/* Tiers Table */}
              <div className="space-y-3">
                {tiers.map((tier, idx) => {
                  const unitPrice = tier.unitPriceTZS;
                  const unitMargin = retail - unitPrice;
                  const marginPercent = Math.round((unitMargin / retail) * 100);

                  return (
                    <div
                      key={tier.id}
                      className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-primary/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-white">
                            {tier.minQuantity}{tier.maxQuantity ? `–${tier.maxQuantity}` : '+'} units
                          </span>
                        </div>
                        <span className="text-[11px] text-white/50 block ml-7 mt-0.5">
                          {tier.label}
                        </span>
                      </div>

                      <div className="text-right sm:text-right w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-0 border-white/5 pt-2 sm:pt-0">
                        <span className="text-base font-black font-mono text-primary">
                          {unitPrice.toLocaleString()} {currency}
                          <span className="text-[10px] text-white/50 font-normal"> / unit</span>
                        </span>
                        <span className="text-[10px] font-bold text-green-400">
                          +{unitMargin.toLocaleString()} TZS ({marginPercent}% Margin)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Minimum Order Quantity Note */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/60">
                <span>Minimum Order Quantity (MOQ):</span>
                <strong className="text-white">{agentProfile.minimum_order_quantity} units</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mixed Order Rules & Shipping Conditions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mixed-Product Tier Qualification Policy */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-primary">
            <Layers size={15} />
            <span>Mixed-Product Order Policy</span>
          </div>
          <p className="text-white/70 leading-relaxed text-[11px]">
            You may combine African Boy T-shirts, Caps, and other authorized merchandise lines in a single replenishment order.
          </p>
          <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 text-[11px]">
            {combineMixed ? (
              <p className="text-green-400 font-medium">
                ✓ <strong>Combined Volume Tiering:</strong> Total units of all products qualify your order for higher volume price tiers.
              </p>
            ) : (
              <p className="text-amber-300/90 font-medium">
                ℹ <strong>Category-Specific Tiering:</strong> Quantity tiers apply per product category independently (e.g. 50+ T-shirts qualify for T-shirt Tier 2).
              </p>
            )}
          </div>
        </div>

        {/* Shipping, Customs & Import Disclaimer */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400">
            <AlertCircle size={15} />
            <span>Shipping & Import Tariff Terms</span>
          </div>
          <p className="text-white/70 leading-relaxed text-[11px]">
            {SHIPPING_TAXES_DISCLAIMER}
          </p>
          <p className="text-[10px] text-white/50 italic pt-1">
            Confirmed air freight rates are entered on individual commercial orders upon dispatch arrangement.
          </p>
        </div>
      </div>
    </div>
  );
}
