import React, { useState, useEffect } from 'react';
import {
  DollarSign, Package, Plus, Trash2, FileText, Download,
  CheckCircle2, AlertCircle, Shield, Sparkles, Send, FileSignature, Check, ChevronDown
} from 'lucide-react';
import { wholesaleProgramService } from '@/services/wholesaleProgramService';
import { downloadCommercialProposalPdf } from '@/utils/generateCommercialProposalPdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  AgentApplication,
  AgentCommercialOffer,
  CommercialProposalItem,
  AgentBusinessModel,
  Product,
  WholesaleProgramSettings
} from '@/types';
import RecordOfferAcceptanceModal from './RecordOfferAcceptanceModal';
import { PROPOSAL_ARTIST_NOTICE, PROPOSAL_SHIPPING_NOTICE, type ProposalBusinessDetails } from '@/lib/commercialProposalData';

interface WholesaleQuotationBuilderProps {
  application: AgentApplication;
  onOfferSaved?: (offer: AgentCommercialOffer) => void;
  onActivateAgent?: (config: {
    agentCode: string;
    businessModel: AgentBusinessModel;
    assignedTerritory: string;
    isExclusive: boolean;
    approvedCategories: string[];
    wholesaleDiscountPercent: number;
    commissionRate: number;
    moq: number;
    currency: string;
    paymentTerms: string;
  }) => void;
}

export default function WholesaleQuotationBuilder({
  application,
  onOfferSaved,
  onActivateAgent,
}: WholesaleQuotationBuilderProps) {
  const [settings, setSettings] = useState<WholesaleProgramSettings | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Commercial Offer State
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [businessDetails, setBusinessDetails] = useState<ProposalBusinessDetails>({});
  const [savedCreatedAt, setSavedCreatedAt] = useState<string | null>(null);
  const [savedCommercialTerms, setSavedCommercialTerms] = useState<AgentCommercialOffer['commercialTerms']>({});
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerRef, setOfferRef] = useState<string>('');
  const [offerStatus, setOfferStatus] = useState<AgentCommercialOffer['status']>('Draft');
  const [acceptedSignature, setAcceptedSignature] = useState<string | null>(null);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);

  // Offer fields
  const [partnershipLevel, setPartnershipLevel] = useState<AgentBusinessModel>(
    (application.preferred_business_model as any) || 'Country Distributor'
  );
  const [currency, setCurrency] = useState<string>('TZS');
  const [destinationCity, setDestinationCity] = useState(application.city || '');
  const [destinationCountry, setDestinationCountry] = useState(application.country_name || '');
  const [territory, setTerritory] = useState(
    application.proposed_territory_details || `${application.city}, ${application.country_name}`
  );
  const [isExclusive, setIsExclusive] = useState<boolean>(true);
  const [exclusivityTerms, setExclusivityTerms] = useState(
    application.preferred_business_model === 'Country Distributor'
      ? 'National territory exclusivity subject to maintaining minimum 100 units/quarter replenishment.'
      : ''
  );
  const [deliveryTerms, setDeliveryTerms] = useState('Shipping quoted separately; partner responsible for agreed shipping and import costs');
  const [confirmedShippingRate, setConfirmedShippingRate] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState('100% Pre-payment via Bank Wire Transfer prior to order dispatch');
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
  );
  const [internalNotes, setInternalNotes] = useState(application.internal_notes || '');
  const [flaggedForReview, setFlaggedForReview] = useState(false);
  const [reviewRequiredReason, setReviewRequiredReason] = useState<string | undefined>(undefined);
  const [isHistoricalBaseline, setIsHistoricalBaseline] = useState(false);
  const [parentOfferReference, setParentOfferReference] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [isIssuingRevision, setIsIssuingRevision] = useState(false);

  // Line items state
  const [proposalItems, setProposalItems] = useState<CommercialProposalItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductQty, setSelectedProductQty] = useState<number>(100);
  const [selectedProductSize, setSelectedProductSize] = useState<string>('Standard');

  // Marketing benefits
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([
    'High-resolution digital lookbook & official African Boy logo suite',
    'Product marketing guidelines & brand asset pack',
    'Social media launch creative assets & story templates',
  ]);

  // Modal states
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);

  // Load settings & products
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      setLoading(true);
      try {
        const [loadedSettings, { data: dbProducts }] = await Promise.all([
          wholesaleProgramService.getSettings(),
          supabase.from('products').select('*').order('created_at', { ascending: false }),
        ]);

        if (!isMounted) return;
        setSettings(loadedSettings);

        let parsedProducts: Product[] = [];
        if (dbProducts && dbProducts.length > 0) {
          parsedProducts = dbProducts.map((p: any) => ({
            ...p,
            price: Number(p.price),
            colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
            sizes: Array.isArray(p.sizes) ? p.sizes : JSON.parse(p.sizes || '[]'),
          }));
        }

        if (!isMounted) return;
        setAllProducts(parsedProducts);
        const { data: savedBusiness } = await supabase.from('invoice_settings').select('business_name,business_address,city,country,email,phone,website,contact_person').eq('store_id', 1).maybeSingle();
        if (!isMounted) return;
        if (savedBusiness) setBusinessDetails(savedBusiness as ProposalBusinessDetails);

        // Check if an offer already exists for this application
        const existingOffer = await wholesaleProgramService.getOfferByApplicationId(application.id);
        if (!isMounted) return;
        if (existingOffer) {
          setOfferId(existingOffer.id);
          setSavedCreatedAt(existingOffer.createdAt);
          setSavedCommercialTerms(existingOffer.commercialTerms || {});
          setOfferRef(existingOffer.offerReference);
          setOfferStatus(existingOffer.status);
          setPartnershipLevel(existingOffer.partnershipLevel);
          setCurrency(existingOffer.currency);
          setDestinationCity(existingOffer.destinationCity);
          setDestinationCountry(existingOffer.destinationCountry);
          setTerritory(existingOffer.territory);
          setIsExclusive(existingOffer.isExclusive);
          setExclusivityTerms(existingOffer.exclusivityTerms || '');
          setDeliveryTerms(existingOffer.shippingTerms);
          setConfirmedShippingRate(existingOffer.confirmedShippingRate ? String(existingOffer.confirmedShippingRate) : '');
          setPaymentTerms(existingOffer.paymentTerms);
          setExpiryDate(existingOffer.expiryDate);
          setInternalNotes(existingOffer.internalNotes || '');
          setProposalItems(existingOffer.proposedItems);
          setSelectedBenefits(existingOffer.marketingBenefits);
          setAcceptedSignature(existingOffer.acceptedBySignature || null);
          setAcceptedAt(existingOffer.acceptedAt || null);
          setFlaggedForReview(Boolean(existingOffer.flaggedForReview));
          setReviewRequiredReason(existingOffer.reviewRequiredReason);
          setIsHistoricalBaseline(Boolean(existingOffer.isHistoricalBaseline));
          setParentOfferReference(existingOffer.parentOfferReference || null);
          setVersion(existingOffer.version || 1);
        } else {
          // Initialize default opening order with T-shirts and Caps from enabled catalogue
          const initialRef = `ABA-OFF-2026-${application.country_code}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          setOfferRef(initialRef);

          const enabledProducts = wholesaleProgramService.getEnabledWholesaleProducts(parsedProducts, loadedSettings);
          const initialTshirt = enabledProducts.find(p => p.category.toLowerCase().includes('t-shirt') || p.category.toLowerCase().includes('tee'));
          const initialCap = enabledProducts.find(p => p.category.toLowerCase().includes('cap'));

          const initialLines: Array<{
            productId: string;
            name: string;
            sku?: string;
            category: string;
            quantity: number;
            retailPrice?: number;
          }> = [];

          if (initialTshirt) {
            initialLines.push({
              productId: initialTshirt.id,
              name: initialTshirt.name,
              sku: initialTshirt.sku || 'AFB-TEE-BLK',
              category: 'T-Shirt',
              quantity: 700,
              retailPrice: initialTshirt.price,
            });
          }
          if (initialCap) {
            initialLines.push({
              productId: initialCap.id,
              name: initialCap.name,
              sku: initialCap.sku || 'AFB-CAP-BLK',
              category: 'Caps',
              quantity: 300,
              retailPrice: initialCap.price,
            });
          }

          if (initialLines.length > 0) {
            const quotation = wholesaleProgramService.calculateQuotation(initialLines, {
              targetCurrency: 'TZS',
              settings: loadedSettings,
            });
            if (isMounted) setProposalItems(quotation.proposalItems);
          }
        }
      } catch (e) {
        if (isMounted) console.error('Error initializing quotation builder:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initData();
    return () => {
      isMounted = false;
    };
  }, [application]);

  // Recalculate quotation prices when quantity, currency, or tiers change
  const recalculateItems = (
    items: CommercialProposalItem[],
    targetCurrency: string = currency,
    confirmedRateStr: string = confirmedShippingRate
  ) => {
    if (!settings) return;
    const confirmedRateNum = confirmedRateStr ? Number(confirmedRateStr) : null;
    const calc = wholesaleProgramService.calculateQuotation(
      items.map(i => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        category: i.category,
        quantity: i.quantity,
        retailPrice: i.retailPrice,
        size: i.size,
        color: i.color,
        imageUrl: i.imageUrl,
      })),
      {
        targetCurrency,
        confirmedShippingRate: confirmedRateNum,
        settings,
      }
    );
    setProposalItems(calc.proposalItems);
  };

  // Add Product to Quotation
  const handleAddProduct = () => {
    if (!selectedProductId) return toast.error('Please select a product.');
    if (selectedProductQty <= 0) return toast.error('Quantity must be greater than zero.');

    const product = allProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    const normCat = wholesaleProgramService.normalizeCategory(product.category);

    const existingIndex = proposalItems.findIndex(i => i.productId === product.id && i.size === selectedProductSize);
    let updatedItems: CommercialProposalItem[];

    if (existingIndex > -1) {
      updatedItems = [...proposalItems];
      updatedItems[existingIndex].quantity += selectedProductQty;
    } else {
      const tempItem: CommercialProposalItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku || `AFB-${normCat.substring(0, 3).toUpperCase()}-001`,
        category: normCat,
        quantity: selectedProductQty,
        unitPrice: 0,
        retailPrice: product.price,
        lineTotal: 0,
        appliedTierLabel: '',
        size: selectedProductSize,
        color: 'Signature Black',
        imageUrl: product.image_url,
      };
      updatedItems = [...proposalItems, tempItem];
    }

    recalculateItems(updatedItems);
    toast.success(`Added ${product.name} (${selectedProductQty} units) to quotation.`);
    setSelectedProductId('');
  };

  // Remove line from quotation
  const handleRemoveLine = (idx: number) => {
    const updated = proposalItems.filter((_, i) => i !== idx);
    recalculateItems(updated);
  };

  // Update quantity on line item
  const handleUpdateLineQty = (idx: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...proposalItems];
    updated[idx].quantity = newQty;
    recalculateItems(updated);
  };

  // Override unit price manually if admin negotiates custom quote
  const handleOverrideUnitPrice = (idx: number, customPrice: number) => {
    const updated = [...proposalItems];
    updated[idx].unitPrice = customPrice;
    updated[idx].lineTotal = Math.round(customPrice * updated[idx].quantity);
    updated[idx].appliedTierLabel = 'Custom Negotiated Rate';
    setProposalItems(updated);
  };

  // Calculate totals
  const totalUnits = proposalItems.reduce((s, i) => s + i.quantity, 0);
  const merchandiseSubtotal = proposalItems.reduce((s, i) => s + i.lineTotal, 0);
  const confirmedShippingNum = confirmedShippingRate ? Number(confirmedShippingRate) : null;
  const grandTotal = merchandiseSubtotal;

  // Issue Revised Proposal action for historical flagged offers (e.g. ABA-OFF-2026-KEX97J)
  const handleIssueRevision = async () => {
    if (!offerId && !offerRef) return;
    setIsIssuingRevision(true);
    try {
      const revised = await wholesaleProgramService.issueRevisedProposal(offerId || offerRef);
      setOfferId(revised.id);
      setOfferRef(revised.offerReference);
      setOfferStatus(revised.status);
      setExclusivityTerms(revised.exclusivityTerms || '');
      setInternalNotes(revised.internalNotes || '');
      setSavedCommercialTerms(revised.commercialTerms || {});
      setFlaggedForReview(false);
      setReviewRequiredReason(undefined);
      setParentOfferReference(revised.parentOfferReference || null);
      setVersion(revised.version || 2);
      setIsHistoricalBaseline(false);
      setSavedCreatedAt(revised.createdAt);
      toast.success(`Revised proposal ${revised.offerReference} created successfully.`);
      onOfferSaved?.(revised);
    } catch (e: any) {
      toast.error(e.message || 'Failed to issue revised offer.');
    } finally {
      setIsIssuingRevision(false);
    }
  };

  // Construct current offer object
  const getCurrentOfferObject = (): AgentCommercialOffer => ({
    id: offerId || `offer-${Date.now()}`,
    offerReference: offerRef || `ABA-OFF-2026-${application.country_code}01`,
    applicationId: application.id,
    applicantName: application.full_name,
    businessName: application.business_name || null,
    partnershipLevel,
    destinationCountry,
    destinationCity,
    territory,
    isExclusive,
    exclusivityTerms: isExclusive ? exclusivityTerms : null,
    currency,
    proposedItems: proposalItems,
    totalUnits,
    merchandiseSubtotal,
    confirmedShippingRate: confirmedShippingNum,
    shippingTerms: deliveryTerms,
    shippingDisclaimer: PROPOSAL_SHIPPING_NOTICE,
    paymentTerms,
    marketingBenefits: selectedBenefits,
    artistDisclaimer: PROPOSAL_ARTIST_NOTICE,
    internalNotes,
    expiryDate,
    status: offerStatus,
    acceptedAt,
    acceptedBySignature: acceptedSignature,
    commercialTerms: {
      ...savedCommercialTerms,
      contractTermMonths: 12,
      annualCollections: 4,
      minimumOrderPerCollection: 1000,
      plannedAnnualMinimum: 4000,
      collectionScheduleAgreement:
        'Each collection order must be placed and fulfilled under the agreed collection schedule and commercial terms.',
    },
    annualCollectionCommitment:
      partnershipLevel === 'Country Distributor'
        ? {
            contractTermMonths: 12,
            collectionsPerYear: 4,
            minimumOrderPerCollection: 1000,
            plannedAnnualMinimum: 4000,
            statement:
              'Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.',
            distinctionRule:
              'The 1,000-piece requirement applies to EACH new collection, not merely to the distributor\'s initial opening order or total annual purchases.',
          }
        : undefined,
    flaggedForReview,
    reviewRequiredReason,
    isHistoricalBaseline,
    parentOfferReference,
    version,
    createdAt: savedCreatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Action 1: Save & Generate Offer PDF
  const handleGeneratePdf = async () => {
    if (proposalItems.length === 0) {
      toast.error('Quotation must contain at least one product line before generating PDF.');
      return;
    }

    setGeneratingPdf(true);
    try {
      const saved = await wholesaleProgramService.saveOffer(getCurrentOfferObject());
      setOfferId(saved.id);
      setSavedCreatedAt(saved.createdAt);
      setOfferStatus(saved.status);
      downloadCommercialProposalPdf(saved, application, businessDetails);
      toast.success(`Proposal PDF downloaded for ${application.full_name}.`);
      onOfferSaved?.(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save or download the proposal.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Action 2: Trigger Record Acceptance Modal
  const handleOpenAcceptanceModal = () => {
    if (proposalItems.length === 0) {
      toast.error('Please configure the quotation items first.');
      return;
    }
    setShowAcceptanceModal(true);
  };

  // Action 3: Approve & Activate Agent
  const handleApproveAndActivate = () => {
    if (offerStatus !== 'Accepted' && !acceptedSignature) {
      if (!window.confirm('Applicant has not formally recorded acceptance yet. Proceed with activation anyway?')) {
        return;
      }
    }

    const prefix = `AG-${application.country_code}`;
    const codeNum = Math.floor(100 + Math.random() * 900);
    const agentCode = `${prefix}-${codeNum}`;

    if (onActivateAgent) {
      onActivateAgent({
        agentCode,
        businessModel: partnershipLevel,
        assignedTerritory: territory,
        isExclusive,
        approvedCategories: Array.from(new Set(proposalItems.map(i => i.category))),
        wholesaleDiscountPercent:
          partnershipLevel === 'Country Distributor' ? 38 : partnershipLevel === 'Premium Market Agent' ? 32 : 25,
        commissionRate: 15,
        moq: totalUnits > 0 ? totalUnits : 30,
        currency,
        paymentTerms,
      });
      setOfferStatus('Activated');
    }
  };

  // Filter available products to enabled categories
  const enabledProducts = wholesaleProgramService.getEnabledWholesaleProducts(allProducts, settings || undefined);

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground text-xs font-bold">
        Loading Wholesale Offer Engine...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      {/* Status & Lifecycle Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">COMMERCIAL OFFER REF</span>
            <span className="font-mono font-bold text-xs text-primary">{offerRef}</span>
          </div>
          <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-white mt-1">
            Individual Wholesale Offer & Proposal Builder
          </h4>
        </div>

        {/* Distinct Step Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Stage:</span>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            offerStatus === 'Activated' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
            offerStatus === 'Accepted' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
            offerStatus === 'Sent' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
            'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }`}>
            ● {offerStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {flaggedForReview && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-amber-400 shrink-0" size={16} />
                <span className="font-black text-amber-400 uppercase tracking-wider text-[11px]">
                  Historical Proposal Flagged for Review (Reference: {offerRef})
                </span>
              </div>
              <p className="text-white/80 leading-relaxed text-[11px]">
                {reviewRequiredReason ||
                  'This proposal contains historical replenishment terms (100 units/quarter). Under current Country Distributor policy, partners commit to 1,000 pieces per collection across 4 annual collections (4,000 units/year). Original proposal is preserved as historical evidence.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleIssueRevision}
              disabled={isIssuingRevision}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
            >
              {isIssuingRevision ? 'Issuing Revision...' : 'Issue Revised Offer (4 Collections / 4,000 Pcs)'}
            </button>
          </div>
        </div>
      )}

      {parentOfferReference && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center justify-between">
          <span>
            Revised Offer (Version {version}) — Linked to historical baseline proposal{' '}
            <strong>{parentOfferReference}</strong> (preserved intact in audit archive).
          </span>
          <span className="text-[10px] uppercase font-bold text-blue-400/80">Active Revised Terms</span>
        </div>
      )}

      {acceptedSignature && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>Formally Accepted by: <strong>{acceptedSignature}</strong></span>
          </div>
          {acceptedAt && <span className="text-[10px] text-white/60">{new Date(acceptedAt).toLocaleDateString()}</span>}
        </div>
      )}

      {/* 1. Partnership Tier & Target Market Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-xs">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-white/50">Partnership Level *</label>
          <select
            value={partnershipLevel}
            onChange={e => {
              const newLevel = e.target.value as AgentBusinessModel;
              setPartnershipLevel(newLevel);
              if (newLevel === 'Country Distributor') {
                setIsExclusive(true);
              }
            }}
            className="w-full px-3 py-2 bg-zinc-950 border border-white/15 rounded-xl text-white font-bold outline-none focus:border-primary"
          >
            <option value="Country Distributor">Country Distributor (Active Programme · 1,000 Pcs Opening Order · 12 Mo)</option>
            <option value="Wholesale Reseller">Wholesale Reseller [Legacy] (MOQ: 30)</option>
            <option value="Premium Market Agent">Premium Market Agent [Legacy] (MOQ: 50)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-white/50">Quotation Currency *</label>
          <select
            value={currency}
            onChange={e => {
              setCurrency(e.target.value);
              recalculateItems(proposalItems, e.target.value);
            }}
            className="w-full px-3 py-2 bg-zinc-950 border border-white/15 rounded-xl text-white font-bold outline-none focus:border-primary"
          >
            <option value="TZS">TZS (Tanzanian Shilling)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="KES">KES (Kenyan Shilling)</option>
            <option value="NGN">NGN (Nigerian Naira)</option>
            <option value="GBP">GBP (British Pound)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="ZAR">ZAR (South African Rand)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-white/50">Destination City & Country</label>
          <input
            type="text"
            value={`${destinationCity}, ${destinationCountry}`}
            onChange={e => {
              const parts = e.target.value.split(',');
              setDestinationCity(parts[0]?.trim() || '');
              if (parts[1]) setDestinationCountry(parts[1]?.trim() || '');
            }}
            className="w-full px-3 py-2 bg-zinc-950 border border-white/15 rounded-xl text-white font-bold outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-white/50">Offer Expiry Date *</label>
          <input
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-white/15 rounded-xl text-white font-bold outline-none focus:border-primary"
          >
          </input>
        </div>
      </div>

      {/* Exclusivity and Territory Details */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-white block">Territorial Exclusivity & Scope</span>
            <span className="text-[11px] text-white/50">
              Grant exclusive regional or national distribution rights for this territory.
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isExclusive}
              onChange={e => setIsExclusive(e.target.checked)}
              className="accent-primary w-4 h-4 rounded"
            />
            <span className="font-bold text-primary text-xs">Grant Exclusivity</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50">Assigned Territory Details</label>
            <input
              type="text"
              value={territory}
              onChange={e => setTerritory(e.target.value)}
              placeholder="e.g. Nairobi Metropolis, Coast Region, Nationwide..."
              className="w-full px-3 py-2 bg-zinc-950 border border-white/15 rounded-xl text-white font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50">Exclusivity Conditions / Benchmarks</label>
            <input
              type="text"
              disabled={!isExclusive}
              value={exclusivityTerms}
              onChange={e => setExclusivityTerms(e.target.value)}
              placeholder="e.g. Maintain minimum 100 units/quarter replenishment"
              className="w-full px-3 py-2 bg-zinc-950 border border-white/15 rounded-xl text-white outline-none disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* 2. Opening Order Schedule & Product Picker */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">WHOLESALE CATALOGUE SELECTION</span>
            <h4 className="text-sm font-black uppercase text-white">Proposed Opening Order Products</h4>
          </div>
          <span className="text-xs text-white/60">
            Total Selected: <strong className="text-primary font-mono">{totalUnits} units</strong>
          </span>
        </div>

        {/* Product Add Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end bg-zinc-950 p-3 rounded-xl border border-white/10">
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50">Select Merchandise Line</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-lg text-xs font-bold text-white outline-none focus:border-primary"
            >
              <option value="">-- Choose Enabled Wholesale Product --</option>
              {enabledProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category}) · Stock: {p.stock_quantity}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50">Size</label>
            <select
              value={selectedProductSize}
              onChange={e => setSelectedProductSize(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-lg text-xs font-bold text-white outline-none"
            >
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="FREE SIZE">FREE SIZE</option>
              <option value="Mixed Sizes">Mixed Sizes</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50">Quantity</label>
            <input
              type="number"
              min="1"
              value={selectedProductQty}
              onChange={e => setSelectedProductQty(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-lg text-xs font-bold text-white text-center outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={handleAddProduct}
              className="w-full py-2 bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add Product
            </button>
          </div>
        </div>

        {/* Line Items Table */}
        {proposalItems.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-xs">
            No products added to quotation yet. Select an African Boy T-shirt or Cap line above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/60 font-bold uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th className="px-3.5 py-2.5">Product & SKU</th>
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5">Size</th>
                  <th className="px-3.5 py-2.5 text-center">Units</th>
                  <th className="px-3.5 py-2.5 text-right">Wholesale Price</th>
                  <th className="px-3.5 py-2.5 text-right">Line Total</th>
                  <th className="px-3.5 py-2.5 text-center">Tier Applied</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-zinc-950">
                {proposalItems.map((item, idx) => (
                  <tr key={`${item.productId}-${idx}`} className="hover:bg-white/5">
                    <td className="px-3.5 py-3 font-bold text-white">
                      {item.name}
                      <span className="block text-[10px] text-white/40 font-mono">{item.sku}</span>
                    </td>
                    <td className="px-3.5 py-3 text-white/70">{item.category}</td>
                    <td className="px-3.5 py-3 text-white/70">{item.size || 'STD'}</td>
                    <td className="px-3.5 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleUpdateLineQty(idx, Math.max(1, Number(e.target.value)))}
                        className="w-16 px-2 py-1 bg-zinc-900 border border-white/15 rounded text-center font-bold text-white text-xs"
                      />
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => handleOverrideUnitPrice(idx, Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-zinc-900 border border-white/15 rounded text-right font-black font-mono text-primary text-xs"
                      />
                      <span className="text-[10px] text-white/40 block">{currency}</span>
                    </td>
                    <td className="px-3.5 py-3 text-right font-black text-white font-mono">
                      {Number(item.lineTotal).toLocaleString()} {currency}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[9px] uppercase tracking-wider">
                        {item.appliedTierLabel}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-white/40 hover:text-red-400 p-1"
                        title="Remove line"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Quotation Summary & Confirmed Shipping Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Shipping disclaimer and terms */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
              <AlertCircle size={14} />
              <span>International Shipping & Import Terms</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-200/80">
              This proposal covers goods only. Shipping and import costs are quoted separately and are not included in the goods value.
            </p>
            <div className="pt-1">
              <label className="text-[10px] uppercase font-bold text-white/70 block mb-1">
                Separate Freight Quote ({currency}) — <em>Not included in goods value</em>
              </label>
              <input
                type="number"
                value={confirmedShippingRate}
                onChange={e => {
                  setConfirmedShippingRate(e.target.value);
                  recalculateItems(proposalItems, currency, e.target.value);
                }}
                placeholder="Leave blank until separately quoted"
                className="w-full px-3 py-2 bg-zinc-950 border border-white/20 rounded-lg text-white font-mono text-xs outline-none"
              />
            </div>
          </div>

          {/* Totals Summary */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-2 text-xs">
            <div className="flex justify-between text-white/60">
              <span>Total Units:</span>
              <strong className="text-white">{totalUnits} Units</strong>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Merchandise Subtotal:</span>
              <strong className="text-white">{merchandiseSubtotal.toLocaleString()} {currency}</strong>
            </div>
            <div className="flex justify-between text-white/60">
              <span>International Freight / Shipping:</span>
              <strong className={confirmedShippingNum ? 'text-green-400' : 'text-amber-400'}>
                EXCLUDED — QUOTED SEPARATELY
              </strong>
            </div>
            <div className="flex justify-between text-sm font-black text-primary pt-2 border-t border-white/10">
              <span>Total Goods Value:</span>
              <span>{grandTotal.toLocaleString()} {currency}</span>
            </div>
          </div>

          {/* Country Distributor Collection Commitment Status */}
          <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
            totalUnits >= 1000 ? 'bg-primary/5 border-primary/25 text-white' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>Collection Commitment Progress:</span>
              <span className="font-mono">{totalUnits} / 1,000 units</span>
            </div>
            {totalUnits < 1000 ? (
              <p className="text-[11px] text-amber-400">
                ⚠️ Opening order total is below the 1,000-piece collection requirement. Requires authorised administrative review.
              </p>
            ) : (
              <p className="text-[11px] text-white/60">
                ✓ Meets the 1,000-piece opening collection requirement.
              </p>
            )}
          </div>

          {/* Annual Collection Commitment Notice Card */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-1.5 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
              ANNUAL COLLECTION COMMITMENT
            </span>
            <p className="text-white/90 font-bold text-[11px] leading-relaxed">
              “Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.”
            </p>
            <p className="text-[10px] text-white/50 leading-relaxed">
              Term: 12 Months · 4 Annual Collections · 1,000 Pcs/Collection · 4,000 Pcs Annual Commitment.
              The 1,000-piece requirement applies to EACH new collection, not merely to the initial opening order or total annual purchases.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Commercial & Delivery Terms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-white/10 text-xs">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-white/50">Shipping Responsibility & Delivery Terms *</label>
          <select
            value={deliveryTerms}
            onChange={e => setDeliveryTerms(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-xl text-white font-bold outline-none"
          >
            <option value="Shipping quoted separately; partner responsible for agreed shipping and import costs">Shipping quoted separately</option>
            <option value="Ex Works Dar es Salaam">Ex Works Dar es Salaam (Agent arranges freight)</option>
            <option value="FOB Dar es Salaam Port">FOB Dar es Salaam Port (Loaded on carrier)</option>
            <option value="CIF Airport Destination">CIF Airport Destination (Freight & insurance included)</option>
            <option value="Confirmed Air Cargo Courier">Confirmed Air Cargo Express Freight</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-white/50">Proposed Payment Terms *</label>
          <select
            value={paymentTerms}
            onChange={e => setPaymentTerms(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-xl text-white font-bold outline-none"
          >
            <option value="100% Pre-payment via Bank Wire Transfer prior to order dispatch">
              100% Pre-payment prior to dispatch (Standard)
            </option>
            <option value="50% Advance Deposit / 50% Balance Prior to Air Cargo Dispatch">
              50% Advance Deposit / 50% Balance Prior to Dispatch
            </option>
            <option value="Confirmed Irrevocable Commercial Letter of Credit (L/C)">
              Confirmed Irrevocable Commercial Letter of Credit (L/C)
            </option>
          </select>
        </div>
      </div>

      {/* 5. Marketing Support Package */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <label className="space-y-1 text-muted-foreground">
          <span>Minimum replenishment order</span>
          <input value={savedCommercialTerms?.minimumReplenishmentOrder || ''}
            onChange={e => setSavedCommercialTerms(t => ({ ...t, minimumReplenishmentOrder: e.target.value }))}
            placeholder="Approved offer terms only"
            className="w-full border border-border bg-background text-foreground rounded-md p-2" />
        </label>
        <label className="space-y-1 text-muted-foreground">
          <span>Processing and dispatch estimate</span>
          <input value={savedCommercialTerms?.processingDispatchTime || ''}
            onChange={e => setSavedCommercialTerms(t => ({ ...t, processingDispatchTime: e.target.value }))}
            placeholder="To be confirmed"
            className="w-full border border-border bg-background text-foreground rounded-md p-2" />
        </label>
        <label className="space-y-1 text-muted-foreground sm:col-span-2">
          <span>Potential shipping origins</span>
          <input value={savedCommercialTerms?.potentialShippingOrigins?.join(', ') || ''}
            onChange={e => setSavedCommercialTerms(t => ({ ...t, potentialShippingOrigins: e.target.value.split(',').map(v => v.trim()).filter(Boolean) }))}
            placeholder="Approved origins, separated by commas"
            className="w-full border border-border bg-background text-foreground rounded-md p-2" />
        </label>
      </div>
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">MARKETING VALUE PROPOSITION</span>
          <span className="text-[10px] text-white/50 italic">Artist appearances require independent talent agreement</span>
        </div>
        <h4 className="text-sm font-black uppercase text-white">Proposed Marketing Support Benefits</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {[
            'High-resolution digital lookbook & official African Boy logo suite',
            'Product marketing guidelines & brand asset pack',
            'Social media launch creative assets & story templates',
            'Official African Boy website and social channels stockist listing',
            'Co-branded digital launch campaign coordination',
            'In-store visual display guides and window decal artwork package',
            'Brand activation sponsorship support for regional pop-up events',
            'Exclusive territorial distribution rights for assigned territory',
          ].map(benefit => {
            const isSelected = selectedBenefits.includes(benefit);
            return (
              <label
                key={benefit}
                className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/10 border-primary/30 text-white' : 'bg-zinc-950 border-white/5 text-white/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedBenefits([...selectedBenefits, benefit]);
                    } else {
                      setSelectedBenefits(selectedBenefits.filter(b => b !== benefit));
                    }
                  }}
                  className="accent-primary w-4 h-4 rounded mt-0.5 shrink-0"
                />
                <span className="text-[11px] leading-tight">{benefit}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 6. Commercial Actions: Generate PDF, Record Acceptance, Approve & Activate */}
      <div className="p-5 rounded-2xl bg-zinc-950 border border-primary/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl">
        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">OFFICIAL COMMERCIAL ACTIONS</span>
          <p className="text-xs text-white/70">
            Execute each distinct phase of the international partner onboarding process.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action 1: Generate PDF */}
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
          >
            <Download size={15} className="text-primary" />
            <span>Generate Offer PDF</span>
          </button>

          {/* Action 2: Record Acceptance */}
          <button
            type="button"
            onClick={handleOpenAcceptanceModal}
            className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
          >
            <FileSignature size={15} />
            <span>Record Acceptance</span>
          </button>

          {/* Action 3: Approve & Activate Agent */}
          <button
            type="button"
            onClick={handleApproveAndActivate}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Check size={15} />
            <span>Approve & Activate Agent</span>
          </button>
        </div>
      </div>

      {/* Record Acceptance Modal */}
      {showAcceptanceModal && (
        <RecordOfferAcceptanceModal
          offer={getCurrentOfferObject()}
          isOpen={showAcceptanceModal}
          onClose={() => setShowAcceptanceModal(false)}
          onSuccess={updated => {
            setOfferStatus('Accepted');
            setAcceptedSignature(updated.acceptedBySignature || null);
            setAcceptedAt(updated.acceptedAt || null);
          }}
        />
      )}
    </div>
  );
}
