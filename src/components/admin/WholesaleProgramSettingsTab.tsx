import React, { useState, useEffect } from 'react';
import {
  Settings, Save, RefreshCw, Plus, Trash2, CheckCircle2,
  DollarSign, Package, Shield, Sparkles, Layers, AlertCircle, HelpCircle, Calendar
} from 'lucide-react';
import { wholesaleProgramService, DEFAULT_PARTNERSHIP_LEVELS, DEFAULT_PRICING_TIERS, DEFAULT_MARKETING_BENEFITS, DEFAULT_COLLECTION_SCHEDULE } from '@/services/wholesaleProgramService';
import { PRODUCT_CATEGORIES } from '@/constants';
import { toast } from 'sonner';
import type { WholesaleProgramSettings, WholesalePricingTier, WholesalePartnershipLevelConfig, DistributorCollectionScheduleItem } from '@/types';

interface WholesaleProgramSettingsTabProps {
  onSettingsUpdated?: (settings: WholesaleProgramSettings) => void;
}

export default function WholesaleProgramSettingsTab({ onSettingsUpdated }: WholesaleProgramSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WholesaleProgramSettings | null>(null);
  const [activeSubSection, setActiveSubSection] = useState<'tiers' | 'levels' | 'collections' | 'categories' | 'mixed' | 'benefits'>('collections');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await wholesaleProgramService.getSettings();
      setSettings(data);
    } catch (e) {
      console.error('Error loading wholesale settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await wholesaleProgramService.saveSettings(settings);
      toast.success('Wholesale programme settings saved successfully.');
      if (onSettingsUpdated) onSettingsUpdated(settings);
    } catch (e: any) {
      toast.error('Failed to save settings: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('Reset all wholesale pricing tiers, partnership levels, and rules to African Boy recommended defaults?')) {
      const defaults = await wholesaleProgramService.resetSettingsToDefaults();
      setSettings(defaults);
      toast.success('Wholesale programme reset to recommended defaults.');
      if (onSettingsUpdated) onSettingsUpdated(defaults);
    }
  };

  // Toggle Category enablement
  const handleToggleCategory = (cat: string) => {
    if (!settings) return;
    const exists = settings.enabledCategories.includes(cat);
    let updatedCats: string[];
    if (exists) {
      if (settings.enabledCategories.length <= 1) {
        toast.error('At least one product category must remain enabled.');
        return;
      }
      updatedCats = settings.enabledCategories.filter(c => c !== cat);
    } else {
      updatedCats = [...settings.enabledCategories, cat];
    }
    setSettings({ ...settings, enabledCategories: updatedCats });
  };

  // Collection Schedule Handlers
  const handleUpdateCollectionSchedule = (index: number, field: keyof DistributorCollectionScheduleItem, value: any) => {
    if (!settings) return;
    const currentSchedule = settings.collectionSchedule && settings.collectionSchedule.length > 0
      ? settings.collectionSchedule
      : DEFAULT_COLLECTION_SCHEDULE;
    const updated = [...currentSchedule];
    updated[index] = { ...updated[index], [field]: value };
    const totalPieces = updated.reduce((sum, item) => sum + (Number(item.minimumOrderPieces) || 0), 0);
    setSettings({
      ...settings,
      collectionSchedule: updated,
      plannedAnnualMinimumPieces: totalPieces,
    });
  };

  // Tier pricing handlers
  const handleUpdateTierPrice = (category: string, tierId: string, newPrice: number) => {
    if (!settings) return;
    const catTiers = settings.pricingTiers[category] || [];
    const updated = catTiers.map(t => (t.id === tierId ? { ...t, unitPriceTZS: newPrice } : t));
    setSettings({
      ...settings,
      pricingTiers: {
        ...settings.pricingTiers,
        [category]: updated,
      },
    });
  };

  const handleAddTier = (category: string) => {
    if (!settings) return;
    const catTiers = settings.pricingTiers[category] || [];
    const lastTier = catTiers[catTiers.length - 1];
    const newMin = lastTier ? (lastTier.maxQuantity ? lastTier.maxQuantity + 1 : lastTier.minQuantity + 50) : 30;
    const newTier: WholesalePricingTier = {
      id: `${category.toLowerCase()}-tier-${Date.now()}`,
      category,
      label: `${newMin}+ Units Tier`,
      minQuantity: newMin,
      maxQuantity: null,
      unitPriceTZS: lastTier ? Math.round(lastTier.unitPriceTZS * 0.95) : 30000,
    };
    setSettings({
      ...settings,
      pricingTiers: {
        ...settings.pricingTiers,
        [category]: [...catTiers, newTier],
      },
    });
    toast.success(`Added new pricing tier for ${category}.`);
  };

  const handleRemoveTier = (category: string, tierId: string) => {
    if (!settings) return;
    const catTiers = settings.pricingTiers[category] || [];
    if (catTiers.length <= 1) {
      toast.error('At least one pricing tier must remain for this product category.');
      return;
    }
    setSettings({
      ...settings,
      pricingTiers: {
        ...settings.pricingTiers,
        [category]: catTiers.filter(t => t.id !== tierId),
      },
    });
  };

  // Partnership Level Handlers
  const handleUpdateLevelMoq = (levelId: string, newMoq: number) => {
    if (!settings) return;
    const updated = settings.partnershipLevels.map(l =>
      l.id === levelId ? { ...l, defaultMoq: Math.max(1, newMoq) } : l
    );
    setSettings({ ...settings, partnershipLevels: updated });
  };

  const handleUpdateLevelDiscount = (levelId: string, newDiscount: number) => {
    if (!settings) return;
    const updated = settings.partnershipLevels.map(l =>
      l.id === levelId ? { ...l, defaultWholesaleDiscountPercent: newDiscount } : l
    );
    setSettings({ ...settings, partnershipLevels: updated });
  };

  if (loading || !settings) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading Wholesale Program Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-foreground/10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">ADMIN ENGINE CONFIGURATION</span>
          <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
            International Wholesale Programme Rules
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure quantity pricing tiers, enabled catalogue lines, mixed-order rules, and partnership requirements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleResetToDefaults}
            type="button"
            className="px-4 py-2.5 rounded-xl border border-foreground/15 hover:bg-foreground/5 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'collections', label: 'Collections Schedule (4 Drops)', icon: Calendar },
          { id: 'tiers', label: 'Quantity Pricing Tiers', icon: DollarSign },
          { id: 'levels', label: 'Partnership Levels (3)', icon: Shield },
          { id: 'categories', label: `Enabled Categories (${settings.enabledCategories.length})`, icon: Package },
          { id: 'mixed', label: 'Mixed-Order Rules', icon: Layers },
          { id: 'benefits', label: 'Marketing Benefits', icon: Sparkles },
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubSection === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubSection(sub.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground font-black shadow-md'
                  : 'bg-card text-muted-foreground border border-foreground/10 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Icon size={14} />
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>

      {/* 0. ANNUAL COLLECTIONS COMMITMENT SCHEDULE */}
      {activeSubSection === 'collections' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-foreground/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  AUTHORITATIVE POLICY SPECIFICATION
                </span>
                <h4 className="text-base font-black uppercase text-foreground">
                  Country Distributor Collection Commitment Rules
                </h4>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase">
                4 Collections · 1,000 Pcs Each · 4,000 Pcs Annual
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-foreground/10 space-y-2 text-xs">
              <p className="text-foreground font-bold text-sm leading-relaxed">
                “Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.”
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                The annual figure is a calculation of the collection commitments (4 collections × 1,000 pcs = 4,000 pcs). Do not treat it as permission to purchase all 4,000 pieces in one collection or skip the required order for another collection.
                The system must distinguish the opening order from orders for subsequent collections. Do not automatically mark a distributor as compliant with a collection commitment merely because they placed an opening order.
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-background border border-foreground/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Contract Term</span>
                <p className="text-base font-black text-foreground">12 Months</p>
              </div>
              <div className="p-3.5 rounded-xl bg-background border border-foreground/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Annual Collections</span>
                <p className="text-base font-black text-foreground">4 Drops / Year</p>
              </div>
              <div className="p-3.5 rounded-xl bg-background border border-foreground/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Minimum Order / Drop</span>
                <p className="text-base font-black text-primary font-mono">1,000 Pieces</p>
              </div>
              <div className="p-3.5 rounded-xl bg-background border border-foreground/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Planned Annual Commitment</span>
                <p className="text-base font-black text-primary font-mono">{settings.plannedAnnualMinimumPieces || 4000} Pieces</p>
              </div>
            </div>
          </div>

          {/* Collection Schedule Configuration Table */}
          <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">ANNUAL PRODUCTION CALENDAR</span>
                <h4 className="text-base font-black uppercase text-foreground">
                  Configurable 4-Collection Release Schedule
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set release names, launch targets, and order deadlines for each quarterly drop.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {(settings.collectionSchedule && settings.collectionSchedule.length > 0
                ? settings.collectionSchedule
                : DEFAULT_COLLECTION_SCHEDULE
              ).map((drop, idx) => (
                <div
                  key={drop.id || idx}
                  className="p-4 rounded-2xl bg-background/80 border border-foreground/10 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-foreground/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-black text-xs">
                        Drop {drop.collectionNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        drop.isOpeningOrder
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                      }`}>
                        {drop.isOpeningOrder ? 'Opening Order Drop' : 'Subsequent Collection'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      MOQ: {drop.minimumOrderPieces.toLocaleString()} pieces
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Collection Name</label>
                      <input
                        type="text"
                        value={drop.name}
                        onChange={e => handleUpdateCollectionSchedule(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-foreground/15 rounded-xl font-bold text-xs focus:border-primary outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Target Launch Date</label>
                      <input
                        type="date"
                        value={drop.launchDate}
                        onChange={e => handleUpdateCollectionSchedule(idx, 'launchDate', e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-foreground/15 rounded-xl font-bold text-xs focus:border-primary outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Distributor Order Deadline</label>
                      <input
                        type="date"
                        value={drop.orderDeadline}
                        onChange={e => handleUpdateCollectionSchedule(idx, 'orderDeadline', e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-foreground/15 rounded-xl font-bold text-xs focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. QUANTITY PRICING TIERS */}
      {activeSubSection === 'tiers' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-start gap-2.5">
            <HelpCircle size={16} className="shrink-0 mt-0.5" />
            <p>
              Quantity tiers automatically calculate unit prices for opening offers and agent replenishment orders.
              Initial suggested baseline: <strong>T-shirts (30–49: 35k, 50–99: 32k, 100+: 30k)</strong> and <strong>Caps (30–49: 22k, 50–99: 20k, 100+: 18k)</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {['T-Shirt', 'Caps'].map(cat => {
              const tiers = settings.pricingTiers[cat] || [];
              return (
                <div key={cat} className="p-6 rounded-2xl bg-card border border-foreground/10 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">WHOLESALE LINE</span>
                      <h4 className="text-base font-black uppercase text-foreground">{cat} Volume Tiers</h4>
                    </div>
                    <button
                      onClick={() => handleAddTier(cat)}
                      className="px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={13} /> Add Tier
                    </button>
                  </div>

                  <div className="space-y-3">
                    {tiers.map((tier, idx) => (
                      <div
                        key={tier.id}
                        className="p-3.5 rounded-xl bg-background/80 border border-foreground/10 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-foreground block">
                            Tier {idx + 1}: {tier.minQuantity}
                            {tier.maxQuantity ? `–${tier.maxQuantity}` : '+'} units
                          </span>
                          <span className="text-[10px] text-muted-foreground">{tier.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-card px-2.5 py-1.5 rounded-lg border border-foreground/15">
                            <input
                              type="number"
                              step="500"
                              value={tier.unitPriceTZS}
                              onChange={e => handleUpdateTierPrice(cat, tier.id, Number(e.target.value))}
                              className="w-20 bg-transparent text-right font-black font-mono text-primary outline-none text-xs"
                            />
                            <span className="text-[10px] font-bold text-muted-foreground">TZS</span>
                          </div>

                          {tiers.length > 1 && (
                            <button
                              onClick={() => handleRemoveTier(cat, tier.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                              title="Delete tier"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. PARTNERSHIP LEVELS */}
      {activeSubSection === 'levels' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {settings.partnershipLevels.map(level => (
              <div
                key={level.id}
                className="p-6 rounded-3xl bg-card border border-foreground/10 flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-foreground/10 pb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">TIER LEVEL</span>
                    {level.exclusivityAllowed && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase">
                        Exclusivity Eligible
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-black uppercase tracking-tight text-foreground">{level.name}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{level.tagline}</p>

                  <div className="space-y-2 pt-2 border-t border-foreground/10 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Minimum Order Qty (MOQ):</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={level.defaultMoq}
                          onChange={e => handleUpdateLevelMoq(level.id, Number(e.target.value))}
                          className="w-16 px-2 py-1 bg-background border border-foreground/15 rounded-lg text-right font-bold font-mono text-xs"
                        />
                        <span className="text-[10px] text-muted-foreground">units</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Default Margin Tier:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={level.defaultWholesaleDiscountPercent}
                          onChange={e => handleUpdateLevelDiscount(level.id, Number(e.target.value))}
                          className="w-16 px-2 py-1 bg-background border border-foreground/15 rounded-lg text-right font-bold font-mono text-xs text-primary"
                        />
                        <span className="text-[10px] text-muted-foreground">% off</span>
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Rules */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Key Eligibility Criteria:
                    </span>
                    <ul className="space-y-1 text-[11px] text-muted-foreground">
                      {level.eligibilityRules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-foreground/10 text-[10px] text-muted-foreground">
                  <strong>Currencies:</strong> {level.supportedCurrencies.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ENABLED CATEGORIES */}
      {activeSubSection === 'categories' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-foreground/10 text-xs text-muted-foreground flex items-center justify-between">
            <p>
              Initially, only <strong>African Boy T-shirts</strong> and <strong>African Boy Caps</strong> are active in the wholesale catalogue.
              Toggle additional categories on or off without restructuring the portal.
            </p>
            <span className="font-bold text-primary">{settings.enabledCategories.length} categories active</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {PRODUCT_CATEGORIES.map(cat => {
              const isEnabled = settings.enabledCategories.includes(cat);
              const isDefaultCore = cat === 'T-Shirt' || cat === 'Caps';
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleToggleCategory(cat)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isEnabled
                      ? 'bg-primary/10 border-primary text-foreground shadow-md'
                      : 'bg-card border-foreground/10 text-muted-foreground hover:bg-foreground/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Package size={16} className={isEnabled ? 'text-primary' : 'text-muted-foreground'} />
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      isEnabled ? 'bg-primary border-primary' : 'border-foreground/30'
                    }`}>
                      {isEnabled && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </span>
                  </div>
                  <div>
                    <p className="font-black text-xs uppercase tracking-tight">{cat}</p>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {isDefaultCore ? 'Core Line' : isEnabled ? 'Enabled for Wholesale' : 'Disabled'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MIXED-ORDER RULES */}
      {activeSubSection === 'mixed' && (
        <div className="space-y-6 max-w-3xl">
          <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-base font-black uppercase text-foreground">
                  Mixed-Product Volume Tier Qualification
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Controls whether quantities from different product categories (e.g. 30 T-shirts + 20 Caps = 50 total units)
                  can be combined together to unlock higher pricing tiers.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.combineMixedQuantitiesForTiers}
                  onChange={e => setSettings({ ...settings, combineMixedQuantitiesForTiers: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-foreground/10 text-xs space-y-2">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Current Rule Enforcement:</span>
              {settings.combineMixedQuantitiesForTiers ? (
                <div className="text-green-400 font-medium">
                  ✓ <strong>Combined Volume Mode Enabled:</strong> The sum of all items in an order determines the volume pricing tier applied to each item.
                </div>
              ) : (
                <div className="text-yellow-400 font-medium">
                  ⚠ <strong>Category-Specific Volume Mode (Default):</strong> Each product category must independently meet the tier threshold (e.g., 50 T-shirts needed for T-shirt 50+ tier, regardless of caps ordered).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MARKETING BENEFITS */}
      {activeSubSection === 'benefits' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(settings.marketingBenefitTiers).map(([pillar, items]) => (
              <div key={pillar} className="p-5 rounded-2xl bg-card border border-foreground/10 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{pillar}</span>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Sparkles size={13} className="text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-card border border-foreground/10 text-xs text-muted-foreground">
            <strong>Legal Note:</strong> Artist promotional visits or appearances are never guaranteed automatically based on order volume, and always require a separate signed talent agreement.
          </div>
        </div>
      )}
    </div>
  );
}
