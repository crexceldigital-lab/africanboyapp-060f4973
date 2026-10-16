import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Briefcase, CheckCircle2, XCircle, Clock, AlertCircle,
  Search, Filter, ChevronRight, Eye, Check, X, Shield, Plus,
  Download, Edit2, FileText, Send, UserCheck, RefreshCw, Layers,
  ExternalLink, Save
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
  AgentReportSummary
} from '@/types';
import WholesaleProgramSettingsTab from './WholesaleProgramSettingsTab';
import WholesaleQuotationBuilder from './WholesaleQuotationBuilder';

export default function AgentManager() {
  const [activeSubTab, setActiveSubTab] = useState<'applications' | 'agents' | 'orders' | 'wholesale' | 'reports'>('applications');
  const [loading, setLoading] = useState(true);

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

  // Reports State
  const [reports, setReports] = useState<AgentReportSummary | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, agts, ords, rep] = await Promise.all([
        agentService.getApplications(),
        agentService.getAllAgentProfiles(),
        agentService.getAllReplenishmentOrders(),
        agentService.getReportsSummary(),
      ]);
      setApplications(apps);
      setAgents(agts);
      setOrders(ords);
      setReports(rep);
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
      businessModel: app.preferred_business_model,
      assignedTerritory: app.proposed_territory_details || `${app.city}, ${app.country_name}`,
      isExclusive: app.preferred_business_model === 'Country Distributor',
      approvedCategories: app.requested_categories.length > 0 ? app.requested_categories : ['T-Shirt'],
      wholesaleDiscountPercent: app.preferred_business_model === 'Country Distributor' ? 35 : 30,
      commissionRate: 15,
      moq: app.preferred_business_model === 'Country Distributor' ? 50 : 15,
      currency: app.country_code === 'TZ' ? 'TZS' : 'USD',
      paymentTerms: 'Pre-payment',
    });
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
    toast.success('Agent management report exported to CSV.');
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
                          <span className="font-bold text-foreground">{app.preferred_business_model}</span>
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
                  <th className="px-5 py-3.5">Total Amount</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5">Fulfillment</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {orders.map(order => (
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
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        order.payment_status === 'paid' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                      }`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-foreground/10 text-[10px] font-black uppercase">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.payment_status !== 'paid' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, order.status, 'paid')}
                            className="px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold rounded-lg text-[10px]"
                          >
                            Mark Paid
                          </button>
                        )}
                        {order.status !== 'shipped' && order.status !== 'delivered' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'shipped', order.payment_status)}
                            className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold rounded-lg text-[10px]"
                          >
                            Ship Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
