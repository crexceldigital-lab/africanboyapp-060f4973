import { useState, useRef } from 'react';
import { Order, Store, StoreStaff } from '@/types';
import { Printer, Download, Share2, PlusCircle, CheckCircle2, X } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';
import { toast } from 'sonner';

interface ReceiptModalProps {
  order: Order | null;
  store?: Store;
  staffUserEmail?: string;
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
}

export default function ReceiptModal({
  order,
  store,
  staffUserEmail,
  isOpen,
  onClose,
  onNewSale,
}: ReceiptModalProps) {
  const { formatPrice } = useCountry();
  const printRef = useRef<HTMLDivElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInput, setShareInput] = useState(order?.customer_phone || order?.customer_email || '');

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Receipt #${order.receipt_number || order.id.slice(0, 8)} sent to ${shareInput}`);
    setShowShareModal(false);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-foreground/10 rounded-[36px] w-full max-w-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Actions Header Bar */}
        <div className="flex items-center justify-between border-b border-foreground/5 pb-4 print:hidden">
          <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
            <CheckCircle2 size={18} /> Sale Completed Successfully
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* PRINTABLE RECEIPT CONTENT AREA */}
        <div
          ref={printRef}
          className="p-6 bg-white text-black rounded-3xl space-y-4 shadow-md font-sans print:shadow-none print:p-0 print:m-0"
          id="printable-receipt"
        >
          {/* Receipt Header */}
          <div className="text-center space-y-1 pb-4 border-b border-gray-200">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase text-black">
              AFRICAN <span className="text-red-600">BOY</span>
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">
              {store?.name || 'African Boy Store'}
            </p>
            {store?.address && <p className="text-[10px] text-gray-500">{store.address}</p>}
            {store?.phone && <p className="text-[10px] text-gray-500">Tel: {store.phone}</p>}
          </div>

          {/* Transaction Metadata */}
          <div className="text-[11px] font-mono space-y-1 border-b border-gray-200 pb-3 text-gray-700">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-bold">{order.receipt_number || `#${order.id.slice(0, 8)}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{staffUserEmail || 'Staff'}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-bold">{order.customer_name || 'Walk-in Customer'}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-left text-[11px] font-mono border-b border-gray-200 pb-3">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-center">Qty</th>
                <th className="pb-1 text-right">Price</th>
                <th className="pb-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 pr-2">
                    <span className="font-bold block text-[11px]">{item.name}</span>
                    {(item.size || item.color) && (
                      <span className="text-[9px] text-gray-500 block">
                        {[item.color, item.size].filter(Boolean).join(' / ')}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                  <td className="py-1.5 text-right">{Number(item.price).toLocaleString()}</td>
                  <td className="py-1.5 text-right font-bold">
                    {(Number(item.price) * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals & Payments */}
          <div className="text-[12px] font-mono space-y-1 pt-1">
            {order.subtotal && order.subtotal > order.total_amount && (
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{Number(order.subtotal).toLocaleString()} {order.currency || 'TZS'}</span>
              </div>
            )}
            {order.discount_amount && order.discount_amount > 0 ? (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-{Number(order.discount_amount).toLocaleString()} {order.currency || 'TZS'}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-black text-sm text-black border-t border-gray-300 pt-1">
              <span>TOTAL PAID:</span>
              <span>{Number(order.total_amount).toLocaleString()} {order.currency || 'TZS'}</span>
            </div>

            <div className="flex justify-between text-[11px] text-gray-600 pt-2 border-t border-gray-100">
              <span>Payment Method:</span>
              <span className="font-bold uppercase">{order.payment_method?.replace('_', ' ') || 'CASH'}</span>
            </div>
            {order.payment_reference && (
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Payment Ref:</span>
                <span>{order.payment_reference}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-gray-500 pt-4 border-t border-gray-200 space-y-1">
            <p className="font-bold italic">Thank you for shopping with African Boy!</p>
            <p>Please keep this receipt for returns or exchanges.</p>
          </div>
        </div>

        {/* ACTION BUTTONS (Print, Share, New Sale) */}
        <div className="space-y-3 pt-2 print:hidden">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="py-3.5 bg-foreground/10 text-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-foreground/20 transition-all flex items-center justify-center gap-2"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="py-3.5 bg-foreground/10 text-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-foreground/20 transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={16} /> Send Digital
            </button>
          </div>

          <button
            onClick={() => {
              onNewSale();
              onClose();
            }}
            className="w-full py-4 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2"
          >
            <PlusCircle size={18} /> START NEW SALE
          </button>
        </div>

        {/* Share Modal Dialog */}
        {showShareModal && (
          <div className="p-4 bg-foreground/5 rounded-2xl border border-foreground/10 space-y-3">
            <h4 className="text-xs font-black uppercase">Send Digital Receipt</h4>
            <form onSubmit={handleSendReceipt} className="flex gap-2">
              <input
                type="text"
                value={shareInput}
                onChange={(e) => setShareInput(e.target.value)}
                placeholder="Enter WhatsApp # or Email"
                required
                className="flex-1 px-4 py-2.5 bg-card border border-foreground/10 rounded-xl text-xs font-bold outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Embedded CSS for Thermal 80mm Printer */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            margin: 0;
            color: black !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
