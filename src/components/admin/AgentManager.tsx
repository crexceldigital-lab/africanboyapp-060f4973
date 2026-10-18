import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Briefcase, CheckCircle2, XCircle, Clock, AlertCircle,
  Search, Filter, ChevronRight, Eye, Check, X, Shield, Plus,
  Download, Edit2, FileText, Send, UserCheck, RefreshCw, Layers,
  ExternalLink, Save, Truck, History, MapPin, DollarSign
} from 'lucide-react';
import { agentService } from '@/services/agentService';
import { INTERNATIONAL_COUNTRIES } from '@/data/internationalCountries';
import { PRODUCT_CATEGORIES } from '@/constants';
import { toast } from 'sonner';
import type {
  AgentApplication,
  AgentApplicationStatus,
  AgentBusinessModel,
  AgentProfile,
  AgentReplenishmentOrder,
  AgentReportSummary,
  AgentShippingQuote,
  ShippingOrigin,
  ShippingQuoteStatus,
  ShippingPaymentStatus,
  DistributorCollectionOrderRecord,
  AgentCommercialOffer
} from '@/types';
import { wholesaleProgramService } from '@/services/wholesaleProgramService';
import WholesaleProgramSettingsTab from './WholesaleProgramSettingsTab';
import WholesaleQuotationBuilder from './WholesaleQuotationBuilder';

export default function AgentManager() {
  const [activeSubTab, setActiveSubTab] = useState<'applications' | 'agents' | 'orders' | 'shipping' | 'collections' | 'wholesale' | 'reports'>('applications');
  const [loading, setLoading] = useState(true);
  const [collectionRecords, setCollectionRecords] = useState<DistributorCollectionOrderRecord[]>([]);
  const [flaggedOffers, setFlaggedOffers] = useState<AgentCommercialOffer[]>([]);
  const [editingCollectionRecord, setEditingCollectionRecord] = useState<DistributorCollectionOrderRecord | null>(null);
  const [isSavingCollection, setIsSavingCollection] = useState(false);

  // Applications State
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [modelFilter, setModelFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<AgentApplication | null>(null);

  // Review & Approval state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false);
  const [internalNotesText, setInternalNotesText] = useState('');
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [moreInfoText, setMoreInfoText] = useState('');

  // Approval Form State
  const [approvalConfig, setApprovalConfig] = useState({
    agentCode: '',
    businessModel: 'Wholesale Reseller' as AgentBusinessModel,
    assignedTerritory: '',
    isExclusive: false,
    approvedCategories: ['T-Shirt', 'Caps'] as string[],
    wholesaleDiscountPercent: 30,
    commissionRate: 15,
    moq: 15,
    currency: 'TZS',
    paymentTerms: 'Pre-payment',
  });

  // Agents State
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [editingAgent, setEditingAgent] = useState<AgentProfile | null>(null);
  const [editTermsModal, setEditTermsModal] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<AgentReplenishmentOrder[]>([]);

  // Shipping Quotations State
  const [shippingQuotes, setShippingQuotes] = useState<AgentShippingQuote[]>([]);
  const [shippingStatusFilter, setShippingStatusFilter] = useState<string>('All');
  const [shippingOriginFilter, setShippingOriginFilter] = useState<string>('All');
  const [shippingSearchQuery, setShippingSearchQuery] = useState<string>('');

  // Modal: Review & Issue Verified Quote
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<AgentShippingQuote | null>(null);
  const [quoteCourierName, setQuoteCourierName] = useState('');
  const [quoteShippingAmount, setQuoteShippingAmount] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('USD');
  const [quoteCustomsFee, setQuoteCustomsFee] = useState('');
  const [quoteEstimatedDeliveryTime, setQuoteEstimatedDeliveryTime] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteExpiryDate, setQuoteExpiryDate] = useState('');
  const [quoteInternalNotes, setQuoteInternalNotes] = useState('');
  const [quoteStatusSelect, setQuoteStatusSelect] = useState<ShippingQuoteStatus>('sent');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Modal: Record Shipping Payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedQuoteForPayment, setSelectedQuoteForPayment] = useState<AgentShippingQuote | null>(null);
  const [adminPaymentRef, setAdminPaymentRef] = useState('');
  const [adminPaymentAmount, setAdminPaymentAmount] = useState('');

  // Modal: Dispatch Shipment
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedQuoteForDispatch, setSelectedQuoteForDispatch] = useState<AgentShippingQuote | null>(null);
  const [dispatchCourierName, setDispatchCourierName] = useState('');
  const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState('');
  const [dispatchTrackingUrl, setDispatchTrackingUrl] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [dispatchEstimatedDelivery, setDispatchEstimatedDelivery] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  // Modal: Audit Trail
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedQuoteForAudit, setSelectedQuoteForAudit] = useState<AgentShippingQuote | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Reports State
  const [reports, setReports] = useState<AgentReportSummary | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, agts, ords, rep, quotes, allOffers, distroCols] = await Promise.all([
        agentService.getApplications(),
        agentService.getAllAgentProfiles(),
        agentService.getAllReplenishmentOrders(),
        agentService.getReportsSummary(),
        agentService.getAllShippingQuotes(),
        wholesaleProgramService.getAllOffers(),
        wholesaleProgramService.getCollectionTrackingForDistributor('app-sample-1'),
      ]);
      setApplications(apps);
      setAgents(agts);
      setOrders(ords);
      setReports(rep);
      setShippingQuotes(quotes);
      setFlaggedOffers(allOffers.filter(o => o.flaggedForReview));
      setCollectionRecords(distroCols);
    } catch (err) {
      console.error('Error loading Agent Manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedApp && !showApprovalModal && !showMoreInfoModal && !showRejectModal) {
        setSelectedApp(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedApp, showApprovalModal, showMoreInfoModal, showRejectModal]);

  // Filtered Applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.application_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.business_name && app.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      app.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesCountry = countryFilter === 'All' || app.country_code === countryFilter;
    const matchesModel = modelFilter === 'All' || app.preferred_business_model === modelFilter;

    return matchesSearch && matchesStatus && matchesCountry && matchesModel;
  });

  // Open Application Details
  const handleOpenDetails = (app: AgentApplication) => {
    setSelectedApp(app);
    setInternalNotesText(app.internal_notes || '');
    // Pre-populate approval config
    const prefix = `AG-${app.country_code}`;
    const codeNum = String(agents.length + 1).padStart(3, '0');
    setApprovalConfig({
      agentCode: `${prefix}-${codeNum}`,
      businessModel: 'Country Distributor',
      assignedTerritory: app.proposed_territory_details || `${app.city}, ${app.country_name}`,
      isExclusive: app.preferred_business_model === 'Country Distributor' || true,
      approvedCategories: app.requested_categories.length > 0 ? app.requested_categories : ['T-Shirt', 'Caps'],
      wholesaleDiscountPercent: 35,
      commissionRate: 15,
      moq: 1000,
      currency: app.country_code === 'TZ' ? 'TZS' : 'USD',
      paymentTerms: 'Pre-payment',
    });
  };

  // Handle Legacy Application Transition Action
  const handleTransitionLegacy = async (action: 'assessed_for_distributor' | 'more_info_requested' | 'legacy_retained') => {
    if (!selectedApp) return;
    const res = await agentService.transitionLegacyApplication(selectedApp.id, action);
    if (res.success && res.application) {
      setSelectedApp(res.application);
      toast.success(
        action === 'assessed_for_distributor'
          ? 'Application successfully assessed and updated to Country Distributor Programme.'
          : action === 'more_info_requested'
          ? 'Requested updated distributor capability information.'
          : 'Preserved application under historical legacy terms.'
      );
      loadData();
    } else {
      toast.error(res.error || 'Failed to transition application.');
    }
  };

  // Save Internal Notes
  const handleSaveNotes = async () => {
    if (!selectedApp) return;
    await agentService.updateApplicationStatus(selectedApp.id, selectedApp.status, internalNotesText);
    toast.success('Internal review notes updated.');
    loadData();
  };

  // Update Status to Under Review
  const handleSetUnderReview = async () => {
    if (!selectedApp) return;
    await agentService.updateApplicationStatus(selectedApp.id, 'Under Review', internalNotesText);
    toast.success(`Application ${selectedApp.application_reference} marked Under Review.`);
    setSelectedApp(prev => prev ? { ...prev, status: 'Under Review' } : null);
    loadData();
  };

  // Submit More Info Request
  const handleSubmitMoreInfo = async () => {
    if (!selectedApp || !moreInfoText.trim()) return toast.error('Please enter the information needed.');
    await agentService.updateApplicationStatus(
      selectedApp.id,
      'More Information Required',
      internalNotesText,
      moreInfoText.trim()
    );
    toast.success('Status updated to More Information Required.');
    setShowMoreInfoModal(false);
    setSelectedApp(prev => prev ? { ...prev, status: 'More Information Required' } : null);
    loadData();
  };

  // Submit Rejection
  const handleSubmitReject = async () => {
    if (!selectedApp) return;
    await agentService.updateApplicationStatus(
      selectedApp.id,
      'Rejected',
      internalNotesText,
      rejectReasonText.trim() || 'Application does not meet current regional criteria.'
    );
    toast.success(`Application ${selectedApp.application_reference} rejected.`);
    setShowRejectModal(false);
    setSelectedApp(prev => prev ? { ...prev, status: 'Rejected' } : null);
    loadData();
  };

  // Submit Approval
  const handleSubmitApproval = async () => {
    if (!selectedApp) return;
    if (!approvalConfig.agentCode.trim()) return toast.error('Agent Code is required.');

    const res = await agentService.approveApplication(selectedApp.id, approvalConfig);
    if (res.success) {
      toast.success(`Application approved! Agent ${approvalConfig.agentCode} successfully onboarded.`);
      setShowApprovalModal(false);
      setSelectedApp(prev => prev ? { ...prev, status: 'Approved' } : null);
      loadData();
    } else {
      toast.error(res.error || 'Failed to approve application.');
    }
  };

  // Update Commercial Terms for existing agent
  const handleSaveEditedTerms = async () => {
    if (!editingAgent) return;
    await agentService.updateCommercialTerms(editingAgent.id, editingAgent);
    toast.success(`Commercial terms updated for agent ${editingAgent.agent_code}.`);
    setEditTermsModal(false);
    loadData();
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (
    orderId: string,
    status: AgentReplenishmentOrder['status'],
    paymentStatus: AgentReplenishmentOrder['payment_status']
  ) => {
    await agentService.updateReplenishmentOrderStatus(orderId, status, paymentStatus);
    toast.success('Order status updated.');
    loadData();
  };

  // Open Quote Modal
  const openQuoteModal = (quote: AgentShippingQuote) => {
    setSelectedQuote(quote);
    setQuoteCourierName(quote.courier_name || '');
    setQuoteShippingAmount(quote.shipping_amount != null ? String(quote.shipping_amount) : '');
    setQuoteCurrency(quote.currency || 'USD');
    setQuoteCustomsFee(quote.customs_and_handling_fee ? String(quote.customs_and_handling_fee) : '');
    setQuoteEstimatedDeliveryTime(quote.estimated_delivery_time || '');
    setQuoteDate(quote.quote_date || new Date().toISOString().split('T')[0]);
    setQuoteExpiryDate(quote.expiry_date || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]);
    setQuoteInternalNotes(quote.internal_notes || '');
    setQuoteStatusSelect(quote.status === 'pending' ? 'sent' : quote.status);
    setShowQuoteModal(true);
  };

  // Submit Verified Shipping Quote (Admin)
  // Do not invent shipping prices or display a quotation as confirmed before it has been verified.
  const handleSaveVerifiedQuote = async () => {
    if (!selectedQuote) return;
    if (!quoteCourierName.trim()) {
      toast.error('Please enter the verified courier or freight forwarder name.');
      return;
    }
    const amountNum = Number(quoteShippingAmount);
    if (!quoteShippingAmount.trim() || isNaN(amountNum) || amountNum < 0) {
      toast.error('Please enter a valid, verified positive shipping amount.');
      return;
    }

    setIsSubmittingQuote(true);
    try {
      const res = await agentService.submitVerifiedShippingQuote({
        quoteId: selectedQuote.id,
        courierName: quoteCourierName.trim(),
        shippingAmount: amountNum,
        currency: quoteCurrency.trim().toUpperCase(),
        customsAndHandlingFee: Number(quoteCustomsFee || 0),
        estimatedDeliveryTime: quoteEstimatedDeliveryTime.trim() || '3-7 business days',
        quoteDate,
        expiryDate: quoteExpiryDate,
        internalNotes: quoteInternalNotes.trim() || undefined,
      });

      if (res.success && res.quote) {
        toast.success(`Verified quotation issued for Order #${res.quote.order_number}!`);
        setShowQuoteModal(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to update shipping quotation.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error saving shipping quotation.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (quote: AgentShippingQuote) => {
    setSelectedQuoteForPayment(quote);
    setAdminPaymentRef(quote.shipping_payment_reference || '');
    setAdminPaymentAmount(quote.shipping_amount ? String(quote.shipping_amount + (quote.customs_and_handling_fee || 0)) : '');
    setShowPaymentModal(true);
  };

  // Record Shipping Payment
  const handleRecordPayment = async () => {
    if (!selectedQuoteForPayment) return;
    if (!adminPaymentRef.trim()) {
      toast.error('Payment reference or transaction ID is required.');
      return;
    }

    const res = await agentService.recordShippingPayment(
      selectedQuoteForPayment.id,
      adminPaymentRef.trim(),
      adminPaymentAmount ? Number(adminPaymentAmount) : undefined
    );
    if (res.success) {
      toast.success('Shipping payment recorded successfully.');
      setShowPaymentModal(false);
      loadData();
    } else {
      toast.error(res.error || 'Failed to record shipping payment.');
    }
  };

  // Open Dispatch Modal
  const openDispatchModal = (quote: AgentShippingQuote) => {
    if (quote.status !== 'accepted') {
      toast.error('Approval of the shipping cost is required before dispatch.');
      return;
    }
    setSelectedQuoteForDispatch(quote);
    setDispatchCourierName(quote.courier_name || '');
    setDispatchTrackingNumber(quote.tracking_number || '');
    setDispatchTrackingUrl(quote.tracking_url || '');
    setDispatchDate(new Date().toISOString().split('T')[0]);
    setDispatchEstimatedDelivery(quote.estimated_delivery_date || '');
    setShowDispatchModal(true);
  };

  // Dispatch Shipment
  const handleDispatchShipment = async () => {
    if (!selectedQuoteForDispatch) return;
    if (!dispatchTrackingNumber.trim()) {
      toast.error('Tracking number is required to confirm dispatch.');
      return;
    }

    setIsDispatching(true);
    try {
      const res = await agentService.dispatchShipment({
        quoteId: selectedQuoteForDispatch.id,
        courierName: dispatchCourierName.trim(),
        trackingNumber: dispatchTrackingNumber.trim(),
        trackingUrl: dispatchTrackingUrl.trim() || undefined,
        dispatchDate,
        estimatedDeliveryDate: dispatchEstimatedDelivery.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Shipment dispatched! Tracking #${dispatchTrackingNumber.trim()} registered.`);
        setShowDispatchModal(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to dispatch shipment.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error dispatching shipment.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Open Audit Trail Modal
  const openAuditModal = async (quote: AgentShippingQuote) => {
    setSelectedQuoteForAudit(quote);
    const logs = await agentService.getShippingAuditLogs(quote.id);
    setAuditLogs(logs);
    setShowAuditModal(true);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reports) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Applications', reports.totalApplications],
      ['Submitted', reports.applicationsByStatus.Submitted],
      ['Under Review', reports.applicationsByStatus['Under Review']],
      ['Approved', reports.applicationsByStatus.Approved],
      ['Rejected', reports.applicationsByStatus.Rejected],
      ['Total Replenishment Orders', reports.totalReplenishmentOrders],
      ['Total Replenishment Value', reports.replenishmentOrderValue],
      ['Commissions Earned', reports.totalCommissionsEarned],
      ['Gross Margins', reports.estimatedGrossMargin],
      ['Outstanding Balance', reports.outstandingBalance],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `african_boy_agent_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  // Save Collection Order Tracking Record
  const handleSaveCollectionRecord = async () => {
    if (!editingCollectionRecord) return;
    try {
      const updated = {
        ...editingCollectionRecord,
        outstandingCommitment: Math.max(0, editingCollectionRecord.minimumCommitment - (Number(editingCollectionRecord.quantityOrdered) || 0)),
      };
      await wholesaleProgramService.saveCollectionTrackingRecord(updated);
      toast.success(`Updated Drop ${updated.collectionNumber} (${updated.collectionName}) tracking record.`);
      setEditingCollectionRecord(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update collection tracking record.');
    }
  };

  return (
    <div className="space-y-8 text-foreground">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-foreground/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Globe className="text-primary w-6 h-6" />
            <h2 className="text-2xl font-black italic uppercase tracking-tight">
              Global Agent & Distributor Management
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Recruit, vet, authorize, and manage international African Boy wholesale agents and regional distributors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-foreground/10 hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-foreground/5 hover:bg-foreground/10 border border-foreground/15 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'applications', label: `Applications (${applications.length})` },
          { id: 'agents', label: `Active Agents (${agents.length})` },
          { id: 'orders', label: `Replenishment Orders (${orders.length})` },
          { id: 'shipping', label: `Shipping Quotes (${shippingQuotes.length})` },
          { id: 'collections', label: 'Collection Commitments' },
          { id: 'wholesale', label: 'Wholesale Program & Tiers' },
          { id: 'reports', label: 'Reports & Analytics' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                : 'bg-card text-muted-foreground border-foreground/5 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: APPLICATIONS */}
      {activeSubTab === 'applications' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Total', count: applications.length, color: 'text-foreground' },
              { label: 'Submitted', count: applications.filter(a => a.status === 'Submitted').length, color: 'text-blue-400' },
              { label: 'Under Review', count: applications.filter(a => a.status === 'Under Review').length, color: 'text-yellow-400' },
              { label: 'More Info', count: applications.filter(a => a.status === 'More Information Required').length, color: 'text-orange-400' },
              { label: 'Approved', count: applications.filter(a => a.status === 'Approved').length, color: 'text-green-400' },
              { label: 'Rejected', count: applications.filter(a => a.status === 'Rejected').length, color: 'text-red-400' },
            ].map((st, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border border-foreground/10 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">{st.label}</span>
                <p className={`text-xl font-black ${st.color}`}>{st.count}</p>
              </div>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, reference, business or city..."
                className="w-full pl-11 pr-4 py-2.5 bg-card border border-foreground/10 rounded-xl text-xs font-bold focus:border-primary outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-card border border-foreground/10 rounded-xl text-xs font-bold outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="More Information Required">More Info Required</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="px-3 py-2.5 bg-card border border-foreground/10 rounded-xl text-xs font-bold outline-none"
              >
                <option value="All">All Countries</option>
                {INTERNATIONAL_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flagEmoji} {c.name}</option>
                ))}
              </select>

              <select
                value={modelFilter}
                onChange={e => setModelFilter(e.target.value)}
                className="px-3 py-2.5 bg-card border border-foreground/10 rounded-xl text-xs font-bold outline-none"
              >
                <option value="All">All Models</option>
                <option value="Wholesale Reseller">Wholesale Reseller</option>
                <option value="Commission-Based Agent">Commission-Based Agent</option>
                <option value="Country Distributor">Country Distributor</option>
              </select>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-card border border-foreground/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-foreground/5 text-muted-foreground font-black uppercase tracking-wider text-[10px] border-b border-foreground/10">
                  <tr>
                    <th className="px-5 py-3.5">Reference</th>
                    <th className="px-5 py-3.5">Applicant & Business</th>
                    <th className="px-5 py-3.5">Country / City</th>
                    <th className="px-5 py-3.5">Model</th>
                    <th className="px-5 py-3.5">Categories</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No agent applications found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map(app => (
                      <tr key={app.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-primary">
                          {app.application_reference}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-foreground">{app.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">{app.business_name || app.email}</p>
                        </td>
                        <td className="px-5 py-4 font-medium">
                          {app.city}, {app.country_name}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-bold text-foreground">{app.preferred_business_model}</span>
                            {(app.is_legacy_application || app.preferred_business_model !== 'Country Distributor') && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider">
                                Legacy Model
                              </span>
                            )}
                            {app.programme_transition_action && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase">
                                {app.programme_transition_action === 'assessed_for_distributor' ? 'Assessed for Distributor' :
                                 app.programme_transition_action === 'more_info_requested' ? 'More Info Requested' : 'Legacy Terms Retained'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {app.requested_categories.slice(0, 2).map(c => (
                              <span key={c} className="px-2 py-0.5 rounded-full bg-foreground/10 text-[9px] font-bold">
                                {c}
                              </span>
                            ))}
                            {app.requested_categories.length > 2 && (
                              <span className="text-[9px] text-muted-foreground">+{app.requested_categories.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            app.status === 'Approved' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                            app.status === 'Under Review' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' :
                            app.status === 'More Information Required' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' :
                            app.status === 'Rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                            'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenDetails(app)}
                            className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary font-black text-xs uppercase tracking-wider transition-all inline-flex items-center gap-1.5"
                          >
                            <Eye size={14} /> Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ACTIVE AGENTS */}
      {activeSubTab === 'agents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                  <div>
                    <span className="text-lg font-black font-mono text-primary">{agent.agent_code}</span>
                    <span className="text-[10px] font-bold text-muted-foreground block">{agent.assigned_country_name}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    agent.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {agent.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="font-black text-sm text-foreground">{agent.business_name || agent.full_name}</p>
                  <p className="text-muted-foreground">{agent.email} · {agent.phone_number}</p>
                  <p className="text-foreground"><strong>Territory:</strong> {agent.assigned_territory}</p>
                  <p className="text-foreground"><strong>Model:</strong> {agent.business_model}</p>
                  <div className="flex justify-between pt-2 border-t border-foreground/10 text-xs">
                    <span>Wholesale Discount:</span>
                    <strong className="text-primary">{agent.wholesale_discount_percent}%</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Minimum Order Qty:</span>
                    <strong>{agent.minimum_order_quantity} units</strong>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingAgent({ ...agent });
                    setEditTermsModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl border border-foreground/15 hover:border-primary text-xs font-black uppercase tracking-wider text-foreground hover:text-primary transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit2 size={14} /> Edit Commercial Terms
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: REPLENISHMENT ORDERS */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-card border border-foreground/10 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-foreground/5 text-muted-foreground font-black uppercase tracking-wider text-[10px] border-b border-foreground/10">
                <tr>
                  <th className="px-5 py-3.5">Order #</th>
                  <th className="px-5 py-3.5">Agent Destination</th>
                  <th className="px-5 py-3.5">Items / Volume</th>
                  <th className="px-5 py-3.5">Merchandise Subtotal</th>
                  <th className="px-5 py-3.5">Goods Payment</th>
                  <th className="px-5 py-3.5">Separate Shipping Quote</th>
                  <th className="px-5 py-3.5">Fulfillment</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {orders.map(order => {
                  const quote = shippingQuotes.find(q => q.order_id === order.id);

                  return (
                    <tr key={order.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-primary">
                        {order.order_number}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-foreground">{order.destination_city}</p>
                        <p className="text-[11px] text-muted-foreground">{order.destination_country}</p>
                      </td>
                      <td className="px-5 py-4 font-medium">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} units ({order.items.length} lines)
                      </td>
                      <td className="px-5 py-4 font-bold text-foreground">
                        {Number(order.total_amount).toLocaleString()} {order.currency}
                        <span className="block text-[10px] text-muted-foreground font-normal">Excl. Shipping</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          order.payment_status === 'paid' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {quote ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                quote.shipping_origin === 'China' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {quote.shipping_origin === 'China' ? '🇨🇳 China' : '🇹🇿 TZ'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                quote.status === 'accepted' ? 'bg-green-500/15 text-green-400' :
                                quote.status === 'sent' ? 'bg-blue-500/15 text-blue-400' :
                                quote.status === 'dispatched' ? 'bg-emerald-500/15 text-emerald-400' :
                                'bg-yellow-500/15 text-yellow-400'
                              }`}>
                                {quote.status}
                              </span>
                            </div>
                            {quote.shipping_amount != null && (
                              <span className="text-[11px] font-mono text-foreground block">
                                {quote.shipping_amount.toLocaleString()} {quote.currency}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">No Quote Requested</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full bg-foreground/10 text-[10px] font-black uppercase">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {order.payment_status !== 'paid' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, order.status, 'paid')}
                              className="px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold rounded-lg text-[10px]"
                            >
                              Mark Goods Paid
                            </button>
                          )}
                          {quote && (
                            <button
                              onClick={() => openQuoteModal(quote)}
                              className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-[10px]"
                            >
                              Manage Quote
                            </button>
                          )}
                          {quote && quote.status === 'accepted' && order.status !== 'shipped' && order.status !== 'delivered' && (
                            <button
                              onClick={() => openDispatchModal(quote)}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-lg text-[10px]"
                            >
                              Dispatch
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: SHIPPING QUOTATIONS & FREIGHT MANAGEMENT */}
      {activeSubTab === 'shipping' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Requests', count: shippingQuotes.length, color: 'text-foreground' },
              { label: 'Pending Verification', count: shippingQuotes.filter(q => q.status === 'pending').length, color: 'text-yellow-400' },
              { label: 'Awaiting Agent Approval', count: shippingQuotes.filter(q => q.status === 'sent').length, color: 'text-blue-400' },
              { label: 'Approved & Ready', count: shippingQuotes.filter(q => q.status === 'accepted').length, color: 'text-green-400' },
              { label: 'Dispatched', count: shippingQuotes.filter(q => q.status === 'dispatched' || q.status === 'delivered').length, color: 'text-emerald-400' },
            ].map((st, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border border-foreground/10 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{st.label}</span>
                <p className={`text-2xl font-black ${st.color}`}>{st.count}</p>
              </div>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={shippingStatusFilter}
                onChange={e => setShippingStatusFilter(e.target.value)}
                className="px-3 py-2 bg-card border border-foreground/15 rounded-xl text-xs font-bold text-foreground"
              >
                <option value="All">All Statuses</option>
                <option value="pending">Pending Verification</option>
                <option value="sent">Sent to Agent</option>
                <option value="accepted">Accepted by Agent</option>
                <option value="rejected">Revision Requested</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
              </select>

              <select
                value={shippingOriginFilter}
                onChange={e => setShippingOriginFilter(e.target.value)}
                className="px-3 py-2 bg-card border border-foreground/15 rounded-xl text-xs font-bold text-foreground"
              >
                <option value="All">All Origins</option>
                <option value="Tanzania">Ship from Tanzania (Local Stock)</option>
                <option value="China">Ship from China (Direct Factory)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search order #, city, courier..."
                value={shippingSearchQuery}
                onChange={e => setShippingSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-card border border-foreground/15 rounded-xl text-xs text-foreground outline-none focus:border-primary w-full sm:w-64"
              />
            </div>
          </div>

          {/* Quotations Table */}
          <div className="bg-card border border-foreground/10 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-foreground/5 text-muted-foreground font-black uppercase tracking-wider text-[10px] border-b border-foreground/10">
                <tr>
                  <th className="px-5 py-3.5">Order & Origin</th>
                  <th className="px-5 py-3.5">Destination & Special Req</th>
                  <th className="px-5 py-3.5">Courier & Transit</th>
                  <th className="px-5 py-3.5">Freight & Customs</th>
                  <th className="px-5 py-3.5">Status & Validity</th>
                  <th className="px-5 py-3.5">Shipping Payment</th>
                  <th className="px-5 py-3.5">Tracking</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {shippingQuotes
                  .filter(quote => {
                    if (shippingStatusFilter !== 'All' && quote.status !== shippingStatusFilter) return false;
                    if (shippingOriginFilter !== 'All' && quote.shipping_origin !== shippingOriginFilter) return false;
                    if (shippingSearchQuery.trim()) {
                      const q = shippingSearchQuery.toLowerCase();
                      return (
                        quote.order_number.toLowerCase().includes(q) ||
                        quote.destination_city.toLowerCase().includes(q) ||
                        quote.destination_country.toLowerCase().includes(q) ||
                        (quote.courier_name && quote.courier_name.toLowerCase().includes(q))
                      );
                    }
                    return true;
                  })
                  .map(quote => (
                    <tr key={quote.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-primary">
                        <div>
                          <span>{quote.order_number}</span>
                          <span className={`block font-sans text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded w-max ${
                            quote.shipping_origin === 'China'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {quote.shipping_origin === 'China' ? '🇨🇳 China' : '🇹🇿 Tanzania'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-foreground">
                          {quote.destination_city}, {quote.destination_country}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={quote.delivery_address}>
                          {quote.delivery_address}
                        </p>
                        {quote.special_requirements && (
                          <p className="text-[10px] text-amber-400/90 truncate max-w-[200px]" title={quote.special_requirements}>
                            ⚠️ {quote.special_requirements}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-foreground">{quote.courier_name || 'Pending forwarder'}</p>
                        <p className="text-[11px] text-muted-foreground">{quote.estimated_delivery_time || 'Pending transit estimate'}</p>
                      </td>

                      <td className="px-5 py-4">
                        {quote.is_verified && quote.shipping_amount != null ? (
                          <div>
                            <p className="font-bold text-foreground">
                              {quote.shipping_amount.toLocaleString()} {quote.currency}
                            </p>
                            {quote.customs_and_handling_fee > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                +{quote.customs_and_handling_fee.toLocaleString()} {quote.currency} customs/handling
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-yellow-400 font-medium">Unverified / Pending</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          quote.status === 'accepted' ? 'bg-green-500/15 text-green-400' :
                          quote.status === 'sent' ? 'bg-blue-500/15 text-blue-400' :
                          quote.status === 'dispatched' ? 'bg-emerald-500/15 text-emerald-400' :
                          quote.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                          'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {quote.status}
                        </span>
                        {quote.revision_number > 1 && (
                          <span className="text-[10px] text-amber-400 block font-bold mt-0.5">Rev #{quote.revision_number}</span>
                        )}
                        {quote.expiry_date && (
                          <span className="text-[10px] text-muted-foreground block">Exp: {quote.expiry_date}</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          quote.shipping_payment_status === 'paid' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {quote.shipping_payment_status}
                        </span>
                        {quote.shipping_payment_reference && (
                          <span className="font-mono text-[10px] text-muted-foreground block mt-0.5 truncate max-w-[120px]">
                            {quote.shipping_payment_reference}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {quote.tracking_number ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-foreground text-[11px]">
                              {quote.tracking_number}
                            </span>
                            {quote.tracking_url && (
                              <a
                                href={quote.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline text-[10px] block"
                              >
                                Track URL
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Not Dispatched</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => openQuoteModal(quote)}
                            className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-[10px]"
                          >
                            {quote.is_verified ? 'Revise Quote' : 'Verify & Quote'}
                          </button>

                          {quote.shipping_payment_status !== 'paid' && (
                            <button
                              onClick={() => openPaymentModal(quote)}
                              className="px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold rounded-lg text-[10px]"
                            >
                              Pay Shipping
                            </button>
                          )}

                          {quote.status === 'accepted' ? (
                            <button
                              onClick={() => openDispatchModal(quote)}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-lg text-[10px]"
                            >
                              Dispatch
                            </button>
                          ) : quote.status !== 'dispatched' && quote.status !== 'delivered' ? (
                            <span
                              className="text-[10px] text-muted-foreground italic px-2 py-1 bg-foreground/5 rounded-lg cursor-not-allowed opacity-60"
                              title="Agent must approve quote before goods dispatch"
                            >
                              Approval Required
                            </span>
                          ) : null}

                          <button
                            onClick={() => openAuditModal(quote)}
                            className="p-1 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground"
                            title="Audit Log"
                          >
                            <History size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB: COLLECTION COMMITMENTS & TRACKING */}
      {activeSubTab === 'collections' && (
        <div className="space-y-6">
          {/* Top Specification Header */}
          <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-foreground/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  AUTHORITATIVE POLICY
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-foreground mt-0.5">
                  Country Distributor Collection Commitments
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase">
                4 Collections · 1,000 Pcs Each · 4,000 Pcs Annual
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-foreground/10 space-y-2 text-xs">
              <p className="text-foreground font-bold text-sm leading-relaxed">
                “Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.”
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                The 1,000-piece requirement applies to <strong>EACH new collection</strong>, not merely to the distributor’s initial opening order or total annual purchases.
                The system distinguishes the opening order from subsequent collection orders. Do not automatically mark a distributor as compliant with a collection commitment merely because they placed an opening order.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-background border border-foreground/5 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Contract Term</span>
                <p className="text-base font-black text-foreground">12 Months</p>
              </div>
              <div className="p-3.5 rounded-xl bg-background border border-foreground/5 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Annual Collections</span>
                <p className="text-base font-black text-foreground">4 Drops</p>
              </div>
              <div className="p-3.5 rounded-xl bg-background border border-foreground/5 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Commitment / Drop</span>
                <p className="text-base font-black text-primary font-mono">1,000 Pieces</p>
              </div>
              <div className="p-3.5 rounded-xl bg-background border border-foreground/5 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Planned Annual Total</span>
                <p className="text-base font-black text-primary font-mono">4,000 Pieces</p>
              </div>
            </div>
          </div>

          {/* Flagged Proposals Review Notice */}
          {flaggedOffers.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                <AlertCircle size={18} />
                <span>Historical Commercial Proposal Flagged for Review</span>
              </div>
              {flaggedOffers.map(fo => (
                <div key={fo.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-black/40 rounded-xl border border-amber-500/20">
                  <div className="space-y-0.5 text-xs">
                    <span className="font-bold text-white block">
                      Offer Ref: {fo.offerReference} — {fo.applicantName} ({fo.businessName || fo.destinationCountry})
                    </span>
                    <p className="text-white/70 text-[11px] leading-relaxed">
                      {fo.reviewRequiredReason || 'Contains historical quarterly replenishment term (100 units/quarter). Must be reviewed to issue revised offer/addendum reflecting 4 annual collections commitment (1,000 pcs/collection, 4,000 pcs/year).'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const app = applications.find(a => a.id === fo.applicationId);
                      if (app) handleOpenDetails(app);
                    }}
                    className="px-4 py-2 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
                  >
                    <span>Open Proposal Builder</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Distributor Collections Tracking Table */}
          <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-foreground/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">DISTRIBUTOR FULFILMENT TRACKING</span>
                <h4 className="text-base font-black uppercase text-foreground">
                  David Mwangi · Savannah Streetwear Ltd (Kenya)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Appointed Country Distributor · Territory: Kenya (National) · Term: 12 Months
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Annual Commitment Progress:</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-black text-xs">
                  1 / 4 Collections Ordered (1,000 / 4,000 Units)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-foreground/10 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3">Collection #</th>
                    <th className="py-3 px-3">Collection Name</th>
                    <th className="py-3 px-3">Order Type</th>
                    <th className="py-3 px-3 text-right">Commitment</th>
                    <th className="py-3 px-3 text-right">Ordered</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Fulfilled</th>
                    <th className="py-3 px-3 text-right">Outstanding</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {collectionRecords.map((col) => (
                    <tr key={col.id} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-foreground">
                        Drop {col.collectionNumber}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-foreground block">{col.collectionName}</span>
                        {col.notes && <span className="text-[10px] text-muted-foreground">{col.notes}</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          col.isOpeningOrder
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                        }`}>
                          {col.isOpeningOrder ? 'Opening Order' : 'Subsequent Drop'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-foreground">
                        {col.minimumCommitment.toLocaleString()} pcs
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-primary">
                        {col.quantityOrdered.toLocaleString()} pcs
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-muted-foreground">
                        {col.quantityPaid.toLocaleString()} pcs
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-muted-foreground">
                        {col.quantityFulfilled.toLocaleString()} pcs
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-400">
                        {col.outstandingCommitment.toLocaleString()} pcs
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                          col.status === 'Completed' || col.status === 'Fulfilled'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : col.status === 'Order Placed'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : col.status === 'In Production' || col.status === 'Paid'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {col.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setEditingCollectionRecord(col)}
                          className="px-3 py-1 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-lg font-bold text-xs transition-colors"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: WHOLESALE PROGRAMME & TIERS */}
      {activeSubTab === 'wholesale' && (
        <WholesaleProgramSettingsTab onSettingsUpdated={() => loadData()} />
      )}

      {/* SUBTAB 5: REPORTS & ANALYTICS */}
      {activeSubTab === 'reports' && reports && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Applications</span>
              <p className="text-3xl font-black text-foreground">{reports.totalApplications}</p>
              <span className="text-xs text-primary font-bold">International Pipeline</span>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Active Replenishment Sales</span>
              <p className="text-3xl font-black text-foreground">{reports.replenishmentOrderValue.toLocaleString()} TZS</p>
              <span className="text-xs text-green-400 font-bold">{reports.totalReplenishmentOrders} Completed Orders</span>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Agent Commissions Paid</span>
              <p className="text-3xl font-black text-foreground">{reports.totalCommissionsEarned.toLocaleString()} TZS</p>
              <span className="text-xs text-muted-foreground">Recorded Calculations</span>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Outstanding Balances</span>
              <p className={`text-3xl font-black ${reports.outstandingBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {reports.outstandingBalance.toLocaleString()} TZS
              </p>
              <span className="text-xs text-muted-foreground">Pending Settlements</span>
            </div>
          </div>

          {/* Breakdown by Country and Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Approved Agents by Country
              </h3>
              <div className="space-y-2">
                {Object.entries(reports.approvedAgentsByCountry).map(([country, count]) => (
                  <div key={country} className="flex justify-between items-center text-xs py-1 border-b border-foreground/5">
                    <span className="font-bold text-foreground">{country}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-foreground/10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Agents by Business Model
              </h3>
              <div className="space-y-2">
                {Object.entries(reports.agentsByBusinessModel).map(([model, count]) => (
                  <div key={model} className="flex justify-between items-center text-xs py-1 border-b border-foreground/5">
                    <span className="font-bold text-foreground">{model}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPLICATION DETAILS MODAL */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="w-[calc(100%-32px)] max-w-[900px] max-h-[calc(100dvh-40px)] flex flex-col bg-[#141416] border border-white/10 rounded-[20px] shadow-2xl overflow-hidden text-foreground">
            {/* Header */}
            <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-white/10 flex items-start justify-between gap-4 flex-shrink-0 bg-zinc-950/60">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary block mb-1">
                  APPLICATION REVIEW · {selectedApp.application_reference}
                </span>
                <h2 id="review-modal-title" className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white break-words leading-tight">
                  {selectedApp.full_name} {selectedApp.business_name ? <span className="text-white/60 font-semibold text-base sm:text-lg">({selectedApp.business_name})</span> : null}
                </h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                aria-label="Close application review modal"
                className="p-2 sm:p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 -mr-2 -mt-1 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* Applicant contact information grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-white/5 [grid-template-columns:repeat(1,minmax(0,1fr))] sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(4,minmax(0,1fr))]">
                <div className="min-w-0 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Email</span>
                  <span className="font-bold text-xs sm:text-sm text-white break-all block" title={selectedApp.email}>
                    {selectedApp.email}
                  </span>
                </div>

                <div className="min-w-0 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Phone</span>
                  <span className="font-bold text-xs sm:text-sm text-white break-words block">
                    {selectedApp.phone_number}
                  </span>
                </div>

                <div className="min-w-0 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Country & City</span>
                  <span className="font-bold text-xs sm:text-sm text-white break-words block">
                    {selectedApp.city}, {selectedApp.country_name}
                  </span>
                </div>

                <div className="min-w-0 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Business Model</span>
                  <span className="font-black text-xs sm:text-sm text-primary break-words block">
                    {selectedApp.preferred_business_model}
                  </span>
                </div>
              </div>

              {/* Business information and requested categories grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left card: Business Structure */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex flex-col justify-between space-y-3 min-w-0">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                        Business Structure
                      </span>
                      {selectedApp.business_registration_number && (
                        <span className="text-[10px] text-white/40 font-mono">
                          Reg: {selectedApp.business_registration_number}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-sm font-bold text-white block">
                        {selectedApp.business_type}
                      </span>
                      <span className="text-xs text-white/70 block mt-0.5">
                        Experience: <strong className="text-white">{selectedApp.years_of_experience}</strong>
                      </span>
                      {selectedApp.previous_experience_details && (
                        <p className="text-xs text-white/60 mt-1 line-clamp-2 leading-relaxed">
                          {selectedApp.previous_experience_details}
                        </p>
                      )}
                      {selectedApp.business_address && (
                        <span className="text-[11px] text-white/50 block mt-1">
                          📍 {selectedApp.business_address}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedApp.website_or_social ? (
                    <div className="pt-2.5 border-t border-white/5">
                      <span className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                        Website / Social Media
                      </span>
                      <a
                        href={
                          selectedApp.website_or_social.startsWith('http://') || selectedApp.website_or_social.startsWith('https://')
                            ? selectedApp.website_or_social
                            : `https://${selectedApp.website_or_social}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary font-bold hover:underline break-all inline-flex items-center gap-1 group"
                      >
                        <span>{selectedApp.website_or_social}</span>
                        <ExternalLink size={12} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    </div>
                  ) : null}
                </div>

                {/* Right card: Requested Categories */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex flex-col justify-between space-y-3 min-w-0">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                        Requested Categories
                      </span>
                      <span className="text-[10px] font-bold text-primary">
                        {selectedApp.requested_categories?.length || 0} SELECTED
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {selectedApp.requested_categories && selectedApp.requested_categories.length > 0 ? (
                        selectedApp.requested_categories.map(c => (
                          <span
                            key={c}
                            className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-bold text-[11px] tracking-wide inline-flex items-center"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-white/40 italic">No specific categories selected</span>
                      )}
                    </div>
                  </div>

                  {selectedApp.proposed_territory_details ? (
                    <div className="pt-2.5 border-t border-white/5">
                      <span className="text-[10px] uppercase font-bold text-white/50 block mb-0.5">
                        Proposed Territory
                      </span>
                      <span className="text-xs text-white/80 font-medium block">
                        {selectedApp.proposed_territory_details}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Applicant Motivation Card */}
              {selectedApp.motivation && (
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block">
                    Applicant Motivation
                  </span>
                  <p className="text-xs sm:text-sm text-white/85 leading-relaxed whitespace-pre-line break-words">
                    {selectedApp.motivation}
                  </p>
                </div>
              )}

              {/* Country Distributor Capability & Financial Assessment Card */}
              {(selectedApp.market_entry_plan ||
                selectedApp.financial_capacity_statement ||
                selectedApp.team_and_infrastructure ||
                selectedApp.supporting_documents_url ||
                selectedApp.first_year_sales_forecast) && (
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border-2 border-primary/30 space-y-4 min-w-0">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary text-black font-black text-[9px] uppercase tracking-wider">
                        ASSESSMENT DATA
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-wide text-white">
                        Distributor Capability & Financial Capacity
                      </h4>
                    </div>
                    <span className="text-[10px] text-primary font-bold">12-Mo Contract & 1,000 Pcs Opening Order</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {selectedApp.market_entry_plan && (
                      <div className="space-y-1 p-3 rounded-xl bg-zinc-950/70 border border-white/5">
                        <span className="text-[10px] font-bold uppercase text-white/50 block">
                          1-Year Market-Entry & Business Plan
                        </span>
                        <p className="text-white/80 leading-relaxed whitespace-pre-line">
                          {selectedApp.market_entry_plan}
                        </p>
                      </div>
                    )}

                    {selectedApp.financial_capacity_statement && (
                      <div className="space-y-1 p-3 rounded-xl bg-zinc-950/70 border border-white/5">
                        <span className="text-[10px] font-bold uppercase text-white/50 block">
                          Financial Capacity & Working Capital
                        </span>
                        <p className="text-white/80 leading-relaxed whitespace-pre-line">
                          {selectedApp.financial_capacity_statement}
                        </p>
                      </div>
                    )}

                    {selectedApp.team_and_infrastructure && (
                      <div className="space-y-1 p-3 rounded-xl bg-zinc-950/70 border border-white/5">
                        <span className="text-[10px] font-bold uppercase text-white/50 block">
                          Team & Infrastructure Readiness
                        </span>
                        <p className="text-white/80 leading-relaxed whitespace-pre-line">
                          {selectedApp.team_and_infrastructure}
                        </p>
                      </div>
                    )}

                    {(selectedApp.first_year_sales_forecast || selectedApp.operating_budget_plan) && (
                      <div className="space-y-1 p-3 rounded-xl bg-zinc-950/70 border border-white/5">
                        <span className="text-[10px] font-bold uppercase text-white/50 block">
                          Sales Forecast & Operating Budget
                        </span>
                        <p className="text-white/80 leading-relaxed whitespace-pre-line">
                          {[
                            selectedApp.first_year_sales_forecast ? `Forecast: ${selectedApp.first_year_sales_forecast}` : '',
                            selectedApp.operating_budget_plan ? `Budget: ${selectedApp.operating_budget_plan}` : '',
                          ].filter(Boolean).join('\n')}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedApp.supporting_documents_url && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-white/50">
                        Supporting Documents / Pitch Deck
                      </span>
                      <a
                        href={selectedApp.supporting_documents_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Supporting Credentials</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Historical Programme Transition Review Card */}
              {(selectedApp.is_legacy_application || selectedApp.preferred_business_model !== 'Country Distributor') && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider">
                        LEGACY APPLICATION
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-wide text-amber-300">
                        Historical Programme Review Action
                      </h4>
                    </div>
                    {selectedApp.programme_transition_action && (
                      <span className="text-[10px] font-bold text-amber-200">
                        Action Taken: {selectedApp.programme_transition_action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed">
                    This applicant submitted under the historical <strong>{selectedApp.preferred_business_model}</strong> tier.
                    As the platform has transitioned exclusively to the <strong>Country Distributor Programme</strong> (12-month agreement, 1,000 pcs opening order MOQ), select an administrative review action:
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleTransitionLegacy('assessed_for_distributor')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedApp.programme_transition_action === 'assessed_for_distributor'
                          ? 'bg-primary text-black font-black shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      Assess for Country Distributor
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTransitionLegacy('more_info_requested')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedApp.programme_transition_action === 'more_info_requested'
                          ? 'bg-orange-500 text-black font-black shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      Request Updated Information
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTransitionLegacy('legacy_retained')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedApp.programme_transition_action === 'legacy_retained'
                          ? 'bg-zinc-700 text-white font-black shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-white/80'
                      }`}
                    >
                      Retain Legacy Terms
                    </button>
                  </div>
                </div>
              )}

              {/* Internal Administrative Review Notes */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <label htmlFor="internal-review-notes" className="text-[10px] font-black uppercase tracking-widest text-white/50 block">
                    INTERNAL ADMINISTRATIVE REVIEW NOTES
                  </label>
                  <span className="text-[10px] text-white/40 italic">Confidential (Admin Only)</span>
                </div>

                <textarea
                  id="internal-review-notes"
                  rows={3}
                  value={internalNotesText}
                  onChange={e => setInternalNotesText(e.target.value)}
                  placeholder="Add confidential vetting notes, background checks, or commercial agreements..."
                  className="w-full min-h-[88px] p-3.5 bg-zinc-950 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder:text-white/30 font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y leading-relaxed break-words"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-xs font-bold text-white border border-white/10 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Save size={14} className="text-primary" />
                    <span>SAVE NOTES</span>
                  </button>
                </div>
              </div>

              {/* Wholesale Commercial Offer & Quotation Builder */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 min-w-0">
                <WholesaleQuotationBuilder
                  application={selectedApp}
                  onOfferSaved={() => {
                    loadData();
                  }}
                  onActivateAgent={(config) => {
                    setApprovalConfig(config);
                    setShowApprovalModal(true);
                  }}
                />
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-white/10 bg-zinc-950/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2.5 justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Status:</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                    selectedApp.status === 'Approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : selectedApp.status === 'Rejected'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : selectedApp.status === 'Under Review'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-primary/10 text-primary border-primary/20'
                  }`}>
                    {selectedApp.status}
                  </span>
                </div>

                {selectedApp.status === 'Submitted' && (
                  <button
                    onClick={handleSetUnderReview}
                    className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold text-[11px] uppercase rounded-lg transition-colors whitespace-nowrap"
                  >
                    Mark Under Review
                  </button>
                )}
              </div>

              {/* Action Buttons in exact requested order: 1. REQUEST MORE INFO, 2. REJECT APPLICATION, 3. APPROVE & CONFIGURE AGENT */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <button
                  onClick={() => setShowMoreInfoModal(true)}
                  className="h-11 sm:h-12 px-5 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-300 border border-amber-500/30 font-black text-xs uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <span>REQUEST MORE INFO</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  className="h-11 sm:h-12 px-5 bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 border border-red-500/30 font-black text-xs uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <span>REJECT APPLICATION</span>
                </button>

                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="h-11 sm:h-12 px-6 sm:px-7 bg-primary hover:bg-primary/90 active:scale-95 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_25px_hsl(43,96%,49%,0.3)] transition-all whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <span>APPROVE & CONFIGURE AGENT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL & COMMERCIAL CONFIGURATION MODAL */}
      {showApprovalModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-card border border-foreground/20 rounded-3xl p-6 sm:p-8 space-y-6 my-auto text-foreground shadow-2xl">
            <div className="border-b border-foreground/10 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">ADMIN AUTHORIZATION</span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  Configure Commercial Agreement for {selectedApp.full_name}
                </h3>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="p-1 rounded-full hover:bg-foreground/10">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Agent Code *</label>
                  <input
                    type="text"
                    value={approvalConfig.agentCode}
                    onChange={e => setApprovalConfig({ ...approvalConfig, agentCode: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Approved Model</label>
                  <select
                    value={approvalConfig.businessModel}
                    onChange={e => setApprovalConfig({ ...approvalConfig, businessModel: e.target.value as any })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  >
                    <option value="Wholesale Reseller">Wholesale Reseller</option>
                    <option value="Premium Market Agent">Premium Market Agent</option>
                    <option value="Country Distributor">Country Distributor</option>
                    <option value="Commission-Based Agent">Commission-Based Agent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Territory *</label>
                <input
                  type="text"
                  value={approvalConfig.assignedTerritory}
                  onChange={e => setApprovalConfig({ ...approvalConfig, assignedTerritory: e.target.value })}
                  placeholder="e.g. Nairobi Metropolis & Coast Region"
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Wholesale Discount %</label>
                  <input
                    type="number"
                    value={approvalConfig.wholesaleDiscountPercent}
                    onChange={e => setApprovalConfig({ ...approvalConfig, wholesaleDiscountPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Commission Rate %</label>
                  <input
                    type="number"
                    value={approvalConfig.commissionRate}
                    onChange={e => setApprovalConfig({ ...approvalConfig, commissionRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">MOQ (Units)</label>
                  <input
                    type="number"
                    value={approvalConfig.moq}
                    onChange={e => setApprovalConfig({ ...approvalConfig, moq: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-foreground/5 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={approvalConfig.isExclusive}
                    onChange={e => setApprovalConfig({ ...approvalConfig, isExclusive: e.target.checked })}
                    className="accent-primary"
                  />
                  <span className="font-bold text-foreground">Grant Territory Exclusivity for this assigned region</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-foreground/10 pt-4">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 rounded-xl border border-foreground/15 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitApproval}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-105 transition-transform"
              >
                Confirm Approval & Issue Agent Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MORE INFO MODAL */}
      {showMoreInfoModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-foreground/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-black uppercase tracking-tight">Request Additional Information</h3>
            <p className="text-xs text-muted-foreground">
              Specify what details or registration documents are needed from {selectedApp.full_name}:
            </p>
            <textarea
              rows={3}
              value={moreInfoText}
              onChange={e => setMoreInfoText(e.target.value)}
              placeholder="e.g. Please provide photos of your physical boutique and business registration certificate..."
              className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl text-xs outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowMoreInfoModal(false)} className="flex-1 py-2 rounded-xl border border-foreground/15 text-xs font-bold">
                Cancel
              </button>
              <button onClick={handleSubmitMoreInfo} className="flex-1 py-2 bg-orange-500 text-white font-bold text-xs uppercase rounded-xl">
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-foreground/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-black uppercase tracking-tight text-red-400">Reject Application</h3>
            <p className="text-xs text-muted-foreground">
              Provide feedback reason for declining application {selectedApp.application_reference}:
            </p>
            <textarea
              rows={3}
              value={rejectReasonText}
              onChange={e => setRejectReasonText(e.target.value)}
              placeholder="e.g. Territory currently fully allocated or business structure does not meet wholesale criteria..."
              className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl text-xs outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2 rounded-xl border border-foreground/15 text-xs font-bold">
                Cancel
              </button>
              <button onClick={handleSubmitReject} className="flex-1 py-2 bg-red-600 text-white font-bold text-xs uppercase rounded-xl">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COMMERCIAL TERMS MODAL FOR AGENT */}
      {editTermsModal && editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-foreground/20 rounded-3xl p-6 space-y-4 text-foreground">
            <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight">
                Edit Terms: {editingAgent.agent_code}
              </h3>
              <button onClick={() => setEditTermsModal(false)} className="p-1 rounded-full hover:bg-foreground/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Territory</label>
                <input
                  type="text"
                  value={editingAgent.assigned_territory}
                  onChange={e => setEditingAgent({ ...editingAgent, assigned_territory: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Discount %</label>
                  <input
                    type="number"
                    value={editingAgent.wholesale_discount_percent}
                    onChange={e => setEditingAgent({ ...editingAgent, wholesale_discount_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Commission %</label>
                  <input
                    type="number"
                    value={editingAgent.commission_rate}
                    onChange={e => setEditingAgent({ ...editingAgent, commission_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">MOQ (Units)</label>
                  <input
                    type="number"
                    value={editingAgent.minimum_order_quantity}
                    onChange={e => setEditingAgent({ ...editingAgent, minimum_order_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Status</label>
                  <select
                    value={editingAgent.status}
                    onChange={e => setEditingAgent({ ...editingAgent, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={editingAgent.is_exclusive}
                  onChange={e => setEditingAgent({ ...editingAgent, is_exclusive: e.target.checked })}
                  className="accent-primary"
                />
                <span className="font-bold">Territory Exclusivity</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-foreground/10">
              <button
                onClick={() => setEditTermsModal(false)}
                className="px-4 py-2 rounded-xl border border-foreground/15 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedTerms}
                className="px-5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl hover:scale-105 transition-transform"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE / REVISE VERIFIED SHIPPING QUOTATION */}
      {showQuoteModal && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-card border border-foreground/20 rounded-3xl p-6 space-y-4 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <Truck size={18} className="text-primary" /> Verified Shipping Quotation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Order #{selectedQuote.order_number} · Ref: {selectedQuote.id}
                </p>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="p-1 rounded-full hover:bg-foreground/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Origin & Destination summary */}
            <div className="p-3 bg-foreground/5 rounded-xl border border-foreground/10 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fulfillment Origin:</span>
                <span className="font-bold text-primary">
                  {selectedQuote.shipping_origin === 'China' ? '🇨🇳 Ship from China (Factory)' : '🇹🇿 Ship from Tanzania (Local Stock)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination:</span>
                <span className="font-bold text-foreground">
                  {selectedQuote.destination_city}, {selectedQuote.destination_country}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate pt-0.5">
                Address: {selectedQuote.delivery_address}
              </p>
              {selectedQuote.special_requirements && (
                <p className="text-[10px] text-amber-400 font-medium">
                  Special Req: {selectedQuote.special_requirements}
                </p>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Courier / Freight Forwarder *
                </label>
                <input
                  type="text"
                  value={quoteCourierName}
                  onChange={e => setQuoteCourierName(e.target.value)}
                  placeholder="e.g. DHL Express Worldwide, Air Cargo Global, Sea Freight..."
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Verified Shipping Price *
                  </label>
                  <input
                    type="number"
                    value={quoteShippingAmount}
                    onChange={e => setQuoteShippingAmount(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Currency</label>
                  <select
                    value={quoteCurrency}
                    onChange={e => setQuoteCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold font-mono"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="TZS">TZS (TSh)</option>
                    <option value="KES">KES (KSh)</option>
                    <option value="ZAR">ZAR (R)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Customs, Tax & Handling (Separate)
                  </label>
                  <input
                    type="number"
                    value={quoteCustomsFee}
                    onChange={e => setQuoteCustomsFee(e.target.value)}
                    placeholder="e.g. 35 (Optional)"
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Estimated Transit Time *
                  </label>
                  <input
                    type="text"
                    value={quoteEstimatedDeliveryTime}
                    onChange={e => setQuoteEstimatedDeliveryTime(e.target.value)}
                    placeholder="e.g. 3-5 business days"
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Quote Issue Date</label>
                  <input
                    type="date"
                    value={quoteDate}
                    onChange={e => setQuoteDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Quote Expiry Date</label>
                  <input
                    type="date"
                    value={quoteExpiryDate}
                    onChange={e => setQuoteExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Internal Logistics Notes</label>
                <textarea
                  rows={2}
                  value={quoteInternalNotes}
                  onChange={e => setQuoteInternalNotes(e.target.value)}
                  placeholder="Forwarder quote reference number, air waybill reservation notes..."
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-normal"
                />
              </div>
            </div>

            {/* Verification reminder alert */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle size={13} /> Strict Logistics Rule
              </p>
              <p className="text-muted-foreground">
                Do not invent shipping prices or display a quotation as confirmed before it has been verified. If modifying an already accepted quote, revision number will advance to #{selectedQuote.revision_number + 1} and return to sent status for agent re-approval.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-foreground/10">
              <button
                onClick={() => setShowQuoteModal(false)}
                className="px-4 py-2 rounded-xl border border-foreground/15 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVerifiedQuote}
                disabled={isSubmittingQuote}
                className="px-5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isSubmittingQuote ? 'Saving...' : 'Issue Verified Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD SHIPPING PAYMENT */}
      {showPaymentModal && selectedQuoteForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-foreground/20 rounded-3xl p-6 space-y-4 text-foreground">
            <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-400" /> Record Shipping Payment
            </h3>
            <p className="text-xs text-muted-foreground">
              Order #{selectedQuoteForPayment.order_number} · Shipping Total:{' '}
              <strong className="text-foreground">
                {((selectedQuoteForPayment.shipping_amount || 0) + (selectedQuoteForPayment.customs_and_handling_fee || 0)).toLocaleString()} {selectedQuoteForPayment.currency}
              </strong>
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Payment Reference / Code *</label>
                <input
                  type="text"
                  value={adminPaymentRef}
                  onChange={e => setAdminPaymentRef(e.target.value)}
                  placeholder="e.g. CRDB-TXN-884920 or Swift Wire Ref..."
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Amount Paid</label>
                <input
                  type="number"
                  value={adminPaymentAmount}
                  onChange={e => setAdminPaymentAmount(e.target.value)}
                  placeholder="e.g. 185"
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-foreground/10">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-xl border border-foreground/15 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-xl transition-all"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH SHIPMENT & REGISTER TRACKING */}
      {showDispatchModal && selectedQuoteForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-foreground/20 rounded-3xl p-6 space-y-4 text-foreground">
            <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <Truck size={18} className="text-emerald-400" /> Dispatch Order Shipment
                </h3>
                <p className="text-xs text-muted-foreground">
                  Order #{selectedQuoteForDispatch.order_number} · Agent Approval Verified
                </p>
              </div>
              <button onClick={() => setShowDispatchModal(false)} className="p-1 rounded-full hover:bg-foreground/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Courier / Forwarder Name *</label>
                <input
                  type="text"
                  value={dispatchCourierName}
                  onChange={e => setDispatchCourierName(e.target.value)}
                  placeholder="e.g. DHL Express, FedEx, Air Cargo Global..."
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Tracking Number *</label>
                <input
                  type="text"
                  value={dispatchTrackingNumber}
                  onChange={e => setDispatchTrackingNumber(e.target.value)}
                  placeholder="e.g. 9482710492"
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Tracking URL (Optional)</label>
                <input
                  type="url"
                  value={dispatchTrackingUrl}
                  onChange={e => setDispatchTrackingUrl(e.target.value)}
                  placeholder="https://www.dhl.com/en/express/tracking.html?AWB=..."
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Dispatch Date</label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={e => setDispatchDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={dispatchEstimatedDelivery}
                    onChange={e => setDispatchEstimatedDelivery(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-foreground/10">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 rounded-xl border border-foreground/15 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchShipment}
                disabled={isDispatching}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-xl transition-all disabled:opacity-50"
              >
                {isDispatching ? 'Registering...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT TRAIL LOGS */}
      {showAuditModal && selectedQuoteForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-card border border-foreground/20 rounded-3xl p-6 space-y-4 text-foreground max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <History size={18} className="text-primary" /> Shipping Quotation Audit Trail
                </h3>
                <p className="text-xs text-muted-foreground">
                  Order #{selectedQuoteForAudit.order_number} · Quote ID: {selectedQuoteForAudit.id}
                </p>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="p-1 rounded-full hover:bg-foreground/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">No audit records found.</p>
              ) : (
                auditLogs.map((log, i) => (
                  <div key={i} className="p-3 bg-foreground/5 rounded-xl border border-foreground/10 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary font-mono">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                    {log.details && (
                      <pre className="text-[10px] bg-background/50 p-2 rounded-lg text-muted-foreground overflow-x-auto font-mono">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-foreground/10">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-xl bg-foreground/10 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT COLLECTION COMMITMENT TRACKING RECORD */}
      {editingCollectionRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-card border border-foreground/20 rounded-3xl p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start border-b border-foreground/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  FULFILMENT UPDATE · DROP {editingCollectionRecord.collectionNumber}
                </span>
                <h3 className="text-base font-black uppercase tracking-tight text-foreground mt-0.5">
                  {editingCollectionRecord.collectionName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingCollectionRecord.isOpeningOrder ? 'Initial Opening Order' : 'Subsequent Annual Drop'} · Minimum Commitment: {editingCollectionRecord.minimumCommitment.toLocaleString()} pieces
                </p>
              </div>
              <button
                onClick={() => setEditingCollectionRecord(null)}
                className="p-1.5 rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground block text-[11px] uppercase">
                    Quantity Ordered (Pieces)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingCollectionRecord.quantityOrdered}
                    onChange={e => setEditingCollectionRecord({
                      ...editingCollectionRecord,
                      quantityOrdered: Math.max(0, parseInt(e.target.value, 10) || 0)
                    })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold font-mono text-sm focus:border-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground block text-[11px] uppercase">
                    Quantity Paid (Pieces)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingCollectionRecord.quantityPaid}
                    onChange={e => setEditingCollectionRecord({
                      ...editingCollectionRecord,
                      quantityPaid: Math.max(0, parseInt(e.target.value, 10) || 0)
                    })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold font-mono text-sm focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground block text-[11px] uppercase">
                    Quantity Fulfilled (Pieces)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingCollectionRecord.quantityFulfilled}
                    onChange={e => setEditingCollectionRecord({
                      ...editingCollectionRecord,
                      quantityFulfilled: Math.max(0, parseInt(e.target.value, 10) || 0)
                    })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold font-mono text-sm focus:border-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground block text-[11px] uppercase">
                    Fulfilment Status
                  </label>
                  <select
                    value={editingCollectionRecord.status}
                    onChange={e => setEditingCollectionRecord({
                      ...editingCollectionRecord,
                      status: e.target.value as any
                    })}
                    className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-bold text-xs focus:border-primary outline-none"
                  >
                    <option value="Pending Commitment">Pending Commitment</option>
                    <option value="Order Placed">Order Placed</option>
                    <option value="Paid">Paid</option>
                    <option value="In Production">In Production</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Fulfilled">Fulfilled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block text-[11px] uppercase">
                  Order Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABA-ORD-2026-001"
                  value={editingCollectionRecord.orderReference || ''}
                  onChange={e => setEditingCollectionRecord({
                    ...editingCollectionRecord,
                    orderReference: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl font-mono text-xs focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block text-[11px] uppercase">
                  Fulfillment Notes & Deadlines
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes on production schedules, dispatch batches, or partner communication..."
                  value={editingCollectionRecord.notes || ''}
                  onChange={e => setEditingCollectionRecord({
                    ...editingCollectionRecord,
                    notes: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-background border border-foreground/15 rounded-xl text-xs focus:border-primary outline-none"
                />
              </div>

              <div className="p-3 bg-foreground/5 rounded-xl border border-foreground/10 flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Calculated Outstanding:</span>
                <span className="font-bold text-amber-400">
                  {Math.max(0, editingCollectionRecord.minimumCommitment - (Number(editingCollectionRecord.quantityOrdered) || 0)).toLocaleString()} pieces
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-foreground/10">
              <button
                onClick={() => setEditingCollectionRecord(null)}
                className="px-4 py-2 rounded-xl border border-foreground/15 text-xs font-bold hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCollectionRecord}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
