import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Customer, Order, OrderItem, InvoiceSettings, DEFAULT_INVOICE_SETTINGS } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Printer, Share2, Plus, Trash2, CheckCircle2, DollarSign, Calendar, User, Mail, Phone, MapPin, Send, Building, Edit3, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import EditInvoiceSettingsModal from './EditInvoiceSettingsModal';

export interface CustomerInvoiceModalProps {
  customer: Customer | null;
  order?: Order | null;
  isOpen: boolean;
  onClose: () => void;
  initialEditMode?: boolean;
}

export interface InvoiceLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export default function CustomerInvoiceModal({
  customer,
  order,
  isOpen,
  onClose,
  initialEditMode = false,
}: CustomerInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [isEditSettingsModalOpen, setIsEditSettingsModalOpen] = useState(false);

  // Dynamic Company Invoice Settings State
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);

  // Generate unique default invoice number
  const generateInvoiceNumber = (prefix: string = 'AFB-INV') => {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${yyyymmdd}-${rand}`;
  };

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'pending' | 'paid' | 'partially_paid'>('pending');

  // Customer Info State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Financial Items State
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Fetch dynamic invoice_settings from database
  const fetchInvoiceSettings = async () => {
    const storeId = order?.store_id || 1;
    try {
      const { data, error } = await (supabase as any)
        .from('invoice_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (data) {
        const loaded: InvoiceSettings = {
          ...DEFAULT_INVOICE_SETTINGS,
          ...data,
          due_days: Number(data.due_days) || 14,
        };
        setInvoiceSettings(loaded);
        if (!notes) {
          setNotes(loaded.invoice_notes || loaded.payment_terms || DEFAULT_INVOICE_SETTINGS.invoice_notes || '');
        }
        if (loaded.default_currency && !order?.currency) {
          setCurrency(loaded.default_currency);
        }
      } else {
        setInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
        if (!notes) {
          setNotes(DEFAULT_INVOICE_SETTINGS.invoice_notes || '');
        }
      }
    } catch (err) {
      console.warn('Failed to load invoice_settings for invoice rendering:', err);
      setInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsEditMode(initialEditMode);
      fetchInvoiceSettings();

      const prefix = invoiceSettings.invoice_prefix || 'AFB-INV';
      setInvoiceNumber(generateInvoiceNumber(prefix));

      const now = new Date();
      const dueDays = invoiceSettings.due_days || 14;
      const calcDueDate = new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000);
      setIssueDate(now.toISOString().slice(0, 10));
      setDueDate(calcDueDate.toISOString().slice(0, 10));

      if (customer) {
        setCustomerName(customer.full_name || 'Valued Customer');
        setCustomerEmail(customer.email || '');
        setCustomerPhone(customer.phone_number || '');
      }

      if (order) {
        setCustomerName(order.customer_name || customer?.full_name || 'Valued Customer');
        setCustomerEmail(order.customer_email || customer?.email || '');
        setCustomerPhone(order.customer_phone || customer?.phone_number || '');
        setDeliveryAddress(order.delivery_zone || '');
        setCurrency(order.currency || invoiceSettings.default_currency || 'TZS');
        setDeliveryFee(Number(order.delivery_fee) || 0);
        setDiscountAmount(Number(order.discount_amount) || 0);
        setPaymentStatus(
          order.payment_status === 'paid' ? 'paid' : order.status === 'completed' ? 'paid' : 'pending'
        );

        if (Array.isArray(order.items) && order.items.length > 0) {
          setItems(
            order.items.map((it: OrderItem, idx: number) => ({
              id: `item-${idx}-${Date.now()}`,
              name: it.name,
              description: [it.color, it.size].filter(Boolean).join(' / '),
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.price) || 0,
            }))
          );
        } else {
          setItems([
            { id: '1', name: 'Custom Product / Service', description: 'Standard Item', quantity: 1, unitPrice: 50000 },
          ]);
        }
      } else {
        setItems([
          { id: '1', name: 'African Boy Merch / Clothing Item', description: 'Selected Item', quantity: 1, unitPrice: 45000 },
        ]);
        setDeliveryAddress('Dar es Salaam, Tanzania');
      }
    }
  }, [isOpen, customer, order, initialEditMode]);

  if (!isOpen) return null;

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.round((subtotal * taxPercent) / 100);
  const totalAmount = Math.max(0, subtotal + taxAmount + deliveryFee - discountAmount);

  const handleAddItem = () => {
    const newItem: InvoiceLineItem = {
      id: `custom-${Date.now()}`,
      name: 'New Product / Item',
      description: '',
      quantity: 1,
      unitPrice: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Invoice must contain at least one line item.');
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadInvoice = () => {
    try {
      generateInvoicePdf({
        invoice_number: invoiceNumber,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        items: items.map(({ name, description, quantity, unitPrice }) => ({ name, description, quantity, unitPrice })),
        subtotal,
        tax_percent: taxPercent,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_status: paymentStatus,
        notes,
      }, invoiceSettings, `${invoiceNumber}-${customerName.replace(/[^a-zA-Z0-9]+/g, '-')}`);
    } catch (e) {
      toast.error(`Could not generate the PDF: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  const handleSendWhatsAppInvoice = () => {
    const summary = `*INVOICE ${invoiceNumber}*\n` +
      `From: ${invoiceSettings.business_name}\n` +
      `Customer: ${customerName}\n` +
      `Issue Date: ${issueDate}\n` +
      `Due Date: ${dueDate}\n` +
      `-------------------------\n` +
      items.map((i) => `• ${i.name} (x${i.quantity}) - ${(i.quantity * i.unitPrice).toLocaleString()} ${currency}`).join('\n') +
      `\n-------------------------\n` +
      `*Total Amount: ${totalAmount.toLocaleString()} ${currency}*\n` +
      `Bank: ${invoiceSettings.bank_name || 'CRDB Bank'} | Acc: ${invoiceSettings.account_number || 'N/A'}\n` +
      `Status: ${paymentStatus.toUpperCase()}\n\n` +
      `Thank you for shopping with ${invoiceSettings.business_name}!`;

    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(summary);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
    toast.success('Invoice shared via WhatsApp');
  };

  const handleSaveInvoice = async () => {
    const { error } = await (supabase as any).from('invoices').upsert({
      invoice_number: invoiceNumber,
      order_id: order?.id || null,
      customer_id: customer?.id || order?.user_id || null,
      customer_name: customerName || 'Valued Customer',
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      delivery_address: deliveryAddress || null,
      issue_date: issueDate,
      due_date: dueDate || null,
      currency,
      items: items.map(({ name, description, quantity, unitPrice }) => ({ name, description, quantity, unitPrice })),
      subtotal, tax_percent: taxPercent, delivery_fee: deliveryFee, discount_amount: discountAmount,
      total_amount: totalAmount, payment_status: paymentStatus, notes,
    }, { onConflict: 'invoice_number' });
    if (error) {
      toast.error(`Invoice could not be saved: ${error.message}`);
      return;
    }
    toast.success(`Invoice ${invoiceNumber} issued for ${customerName} — see Admin → Invoices`);
    window.dispatchEvent(new Event('invoices:changed'));
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl bg-card border border-foreground/10 rounded-[32px] p-6 text-foreground max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl">
          <DialogHeader className="border-b border-foreground/5 pb-4 print:hidden">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <FileText size={20} />
                </div>
                <div>
                  <span className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    Customer Billing & Invoicing Segment
                    {isEditMode && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                        Editing Details Mode
                      </span>
                    )}
                  </span>
                  <DialogTitle className="text-xl font-black italic uppercase tracking-tight">
                    {isEditMode ? 'Edit Customer Invoice Details' : 'Customer Invoice View & Issue'}
                  </DialogTitle>
                </div>
              </div>

              {/* Quick Actions Header Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsEditSettingsModalOpen(true)}
                  className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  title="Edit Business, Bank, TIN & Settings"
                >
                  <Building size={14} /> Edit Store Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !isEditMode;
                    setIsEditMode(nextState);
                    toast.info(nextState ? 'Edit Invoice Details mode activated' : 'Preview mode active');
                  }}
                  className={`px-3 py-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 border ${
                    isEditMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md'
                      : 'bg-foreground/10 hover:bg-foreground/20 text-foreground border-transparent'
                  }`}
                  title="Toggle Invoice Items Edit Mode"
                >
                  <Edit3 size={14} /> {isEditMode ? 'Editing Details' : 'Edit Details'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="px-3 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                  title="Print or Save PDF"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppInvoice}
                  className="px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                  title="Share via WhatsApp"
                >
                  <Share2 size={14} /> Send WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleSaveInvoice}
                  className="px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 size={14} /> Issue Invoice
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* PRINTABLE / DISPLAYABLE INVOICE CARD */}
          <div
            ref={printRef}
            id="printable-customer-invoice"
            className="p-8 bg-white text-slate-900 rounded-3xl space-y-6 shadow-md font-sans border border-gray-100 my-2 print:shadow-none print:p-0 print:m-0 print:border-none"
          >
            {/* Brand Header & Invoice Title */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-6 flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">
                  {invoiceSettings.business_name || 'AFRICAN BOY'}
                </h1>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600 mt-1">
                  {invoiceSettings.trading_name || 'Official Commercial Invoice'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {invoiceSettings.business_address || 'Dar es Salaam, Tanzania'}
                  {invoiceSettings.city && invoiceSettings.city !== invoiceSettings.business_address ? `, ${invoiceSettings.city}` : ''}
                  {invoiceSettings.country ? `, ${invoiceSettings.country}` : ''}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {invoiceSettings.phone ? `Tel: ${invoiceSettings.phone}` : ''}
                  {invoiceSettings.email ? ` • Email: ${invoiceSettings.email}` : ''}
                  {invoiceSettings.website ? ` • Web: ${invoiceSettings.website}` : ''}
                </p>
                {(invoiceSettings.tin_number || invoiceSettings.vrn_number || invoiceSettings.registration_number) && (
                  <div className="flex items-center gap-3 pt-2 text-[10px] font-mono font-bold text-slate-600">
                    {invoiceSettings.tin_number && <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">TIN: {invoiceSettings.tin_number}</span>}
                    {invoiceSettings.vrn_number && <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">VRN: {invoiceSettings.vrn_number}</span>}
                    {invoiceSettings.registration_number && <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">REG: {invoiceSettings.registration_number}</span>}
                  </div>
                )}
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-black text-xs uppercase tracking-widest rounded-lg">
                  INVOICE
                </div>
                <div className="pt-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block print:hidden">Invoice #</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="font-mono font-bold text-sm text-slate-800 bg-slate-100 print:bg-transparent px-2 py-1 rounded text-right w-48 outline-none border border-slate-200 print:border-none"
                  />
                </div>
              </div>
            </div>

            {/* Customer Details & Dates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 print:bg-slate-50">
              {/* Bill To */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <User size={13} className="text-red-600" /> Billed To (Customer)
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block print:hidden">Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      className="font-bold text-slate-900 w-full bg-white print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block print:hidden">Email</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email"
                        className="font-mono text-slate-700 w-full bg-white print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none outline-none text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block print:hidden">Phone</label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Phone"
                        className="font-mono text-slate-700 w-full bg-white print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none outline-none text-[11px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block print:hidden">Address / Delivery Zone</label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Delivery Address"
                      className="text-slate-700 w-full bg-white print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none outline-none text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Payment Status */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Calendar size={13} className="text-red-600" /> Invoice Logistics
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="font-mono font-bold text-slate-800 bg-white print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none w-full outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="font-mono font-bold text-slate-800 bg-white print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none w-full outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="font-mono font-bold text-slate-800 bg-white print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none w-full outline-none cursor-pointer"
                    >
                      <option value="TZS">TZS (Tanzanian Shilling)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="KES">KES (Kenyan Shilling)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className={`font-mono font-black text-xs uppercase px-2 py-1 rounded border w-full outline-none cursor-pointer ${
                        paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : paymentStatus === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                  Itemized Line Items
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1 bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-all flex items-center gap-1 print:hidden"
                >
                  <Plus size={12} /> Add Item
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Item & Description</th>
                      <th className="py-3 px-3 text-center w-20">Qty</th>
                      <th className="py-3 px-4 text-right w-32">Unit Price ({currency})</th>
                      <th className="py-3 px-4 text-right w-36">Total ({currency})</th>
                      <th className="py-3 px-2 text-center w-12 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 space-y-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            placeholder="Product Name"
                            className="font-bold text-slate-900 w-full bg-slate-50 print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none outline-none text-xs"
                          />
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            placeholder="Color / Size / Specification (Optional)"
                            className="text-[11px] text-slate-500 w-full bg-slate-50 print:bg-transparent px-2 py-0.5 rounded border border-slate-200 print:border-none outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="font-mono font-bold text-center w-16 bg-slate-50 print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none outline-none text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(item.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="font-mono font-bold text-right w-28 bg-slate-50 print:bg-transparent px-2 py-1 rounded border border-slate-200 print:border-none outline-none text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 text-xs">
                          {(item.quantity * item.unitPrice).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing Summary & Calculations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Notes & Bank Details */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                  Payment Instructions & Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full text-xs text-slate-700 bg-slate-50 print:bg-transparent p-3 rounded-2xl border border-slate-200 print:border-none outline-none resize-none font-medium"
                />

                {/* Dynamic Bank & Payment Details Card */}
                <div className="text-[10px] text-slate-600 space-y-1 bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                    <p className="font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard size={12} className="text-red-600" /> Official Payment Details
                    </p>
                    {invoiceSettings.swift_code && (
                      <span className="font-mono text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                        SWIFT: {invoiceSettings.swift_code}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900">
                    Bank: <span className="font-extrabold">{invoiceSettings.bank_name || 'CRDB Bank'}</span>
                    {invoiceSettings.bank_branch ? ` (${invoiceSettings.bank_branch})` : ''}
                  </p>
                  <p>Account Name: <span className="font-bold text-slate-800">{invoiceSettings.account_name || 'AfricanBoy International Co. Ltd'}</span></p>
                  <p className="font-mono">Account #: <span className="font-extrabold text-slate-900">{invoiceSettings.account_number || '0150294829100'}</span></p>
                  {invoiceSettings.payment_instructions && (
                    <p className="text-[9.5px] italic text-slate-500 pt-1 border-t border-slate-200/60 mt-1">
                      {invoiceSettings.payment_instructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Total Calculations */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-bold">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-900">{subtotal.toLocaleString()} {currency}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 font-bold">
                  <span className="flex items-center gap-1">
                    Tax / VAT (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-12 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-[10px] font-mono print:hidden"
                    />
                  </span>
                  <span className="font-mono text-slate-900">{taxAmount.toLocaleString()} {currency}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 font-bold">
                  <span className="flex items-center gap-1">
                    Delivery / Shipping
                    <input
                      type="number"
                      min="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-20 px-1 py-0.5 bg-white border border-slate-200 rounded text-right text-[10px] font-mono print:hidden"
                    />
                  </span>
                  <span className="font-mono text-slate-900">{deliveryFee.toLocaleString()} {currency}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 font-bold">
                  <span className="flex items-center gap-1">
                    Discount Amount
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-20 px-1 py-0.5 bg-white border border-slate-200 rounded text-right text-[10px] font-mono print:hidden"
                    />
                  </span>
                  <span className="font-mono text-red-600">-{discountAmount.toLocaleString()} {currency}</span>
                </div>

                <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-center font-black">
                  <span className="text-sm uppercase tracking-widest text-slate-900">Total Due</span>
                  <span className="text-xl font-mono text-slate-900">{totalAmount.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            {/* Footer Thank You & Contact */}
            <div className="text-center pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium space-y-1">
              <p className="font-extrabold italic text-slate-700 uppercase tracking-widest">
                {invoiceSettings.footer_text || 'Thank you for being a valued African Boy customer!'}
              </p>
              {invoiceSettings.contact_person && (
                <p className="text-[10px] text-slate-400 font-mono">
                  Billing Contact: {invoiceSettings.contact_person} {invoiceSettings.contact_phone ? `(${invoiceSettings.contact_phone})` : ''} {invoiceSettings.contact_email ? `• ${invoiceSettings.contact_email}` : ''}
                </p>
              )}
            </div>
          </div>
        </DialogContent>

        {/* Embedded CSS for Clean Standard Invoice Printing */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-customer-invoice, #printable-customer-invoice * {
              visibility: visible;
            }
            #printable-customer-invoice {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20mm;
              margin: 0;
              color: black !important;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
            }
          }
        `}</style>
      </Dialog>

      {/* Embedded Store Invoice Settings Editor Modal */}
      <EditInvoiceSettingsModal
        storeId={order?.store_id || 1}
        isOpen={isEditSettingsModalOpen}
        onClose={() => setIsEditSettingsModalOpen(false)}
        onSaved={(updated) => {
          setInvoiceSettings(updated);
          toast.success('Invoice rendered details refreshed.');
        }}
      />
    </>
  );
}
