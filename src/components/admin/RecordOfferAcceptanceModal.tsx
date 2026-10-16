import React, { useState } from 'react';
import { X, CheckCircle2, FileSignature, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { wholesaleProgramService } from '@/services/wholesaleProgramService';
import type { AgentCommercialOffer } from '@/types';

interface RecordOfferAcceptanceModalProps {
  offer: AgentCommercialOffer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOffer: AgentCommercialOffer) => void;
}

export default function RecordOfferAcceptanceModal({
  offer,
  isOpen,
  onClose,
  onSuccess,
}: RecordOfferAcceptanceModalProps) {
  const [signerName, setSignerName] = useState(offer.applicantName || '');
  const [signerTitle, setSignerTitle] = useState('Authorized Commercial Representative');
  const [acceptanceMethod, setAcceptanceMethod] = useState('Signed Proposal Document');
  const [acceptanceNotes, setAcceptanceNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      toast.error('Please enter the name of the authorizing signatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullSignature = `${signerName.trim()} (${signerTitle.trim()} · via ${acceptanceMethod})`;
      const res = await wholesaleProgramService.recordOfferAcceptance(
        offer.id,
        fullSignature,
        acceptanceNotes.trim() || undefined
      );

      if (res.success && res.offer) {
        toast.success(`Commercial offer ${offer.offerReference} marked as ACCEPTED!`);
        onSuccess(res.offer);
        onClose();
      } else {
        toast.error(res.error || 'Failed to record acceptance.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error recording acceptance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-card border border-foreground/20 rounded-3xl p-6 sm:p-7 space-y-5 text-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-foreground/10 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">COMMERCIAL LIFECYCLE</span>
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
              Record Formal Offer Acceptance
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ref: <strong className="font-mono text-primary">{offer.offerReference}</strong> · {offer.applicantName}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-foreground/10">
            <X size={18} />
          </button>
        </div>

        {/* Offer Snapshot */}
        <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/10 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Partnership Level:</span>
            <strong className="text-foreground">{offer.partnershipLevel}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Opening Volume:</span>
            <strong>{offer.totalUnits} units</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Merchandise Subtotal:</span>
            <strong className="text-primary">{Number(offer.merchandiseSubtotal).toLocaleString()} {offer.currency}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Territory:</span>
            <span>{offer.territory} ({offer.isExclusive ? 'Exclusive' : 'Non-Exclusive'})</span>
          </div>
        </div>

        {/* Acceptance Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Signatory Full Name *</label>
            <input
              type="text"
              required
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              placeholder="e.g. David Mwangi"
              className="w-full px-3.5 py-2.5 bg-background border border-foreground/15 rounded-xl font-bold text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Signatory Title</label>
              <input
                type="text"
                value={signerTitle}
                onChange={e => setSignerTitle(e.target.value)}
                placeholder="e.g. Managing Director"
                className="w-full px-3.5 py-2.5 bg-background border border-foreground/15 rounded-xl text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Acceptance Channel</label>
              <select
                value={acceptanceMethod}
                onChange={e => setAcceptanceMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-foreground/15 rounded-xl text-foreground font-bold outline-none focus:border-primary"
              >
                <option value="Signed Proposal Document">Signed Proposal Document</option>
                <option value="Official Email Confirmation">Official Email Confirmation</option>
                <option value="WhatsApp Business Authorization">WhatsApp Business Authorization</option>
                <option value="Bank Pre-payment Deposit Slip">Bank Pre-payment Deposit Slip</option>
                <option value="In-Person Commercial Agreement">In-Person Commercial Agreement</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Acceptance Notes & Payment Reference</label>
            <textarea
              rows={2}
              value={acceptanceNotes}
              onChange={e => setAcceptanceNotes(e.target.value)}
              placeholder="e.g. Signed copy received via email; initial wire transfer initiated..."
              className="w-full px-3.5 py-2 bg-background border border-foreground/15 rounded-xl text-foreground outline-none focus:border-primary text-xs"
            />
          </div>

          <div className="flex gap-2.5 justify-end pt-3 border-t border-foreground/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-foreground/15 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <FileSignature size={15} />
              {isSubmitting ? 'Recording...' : 'Confirm Acceptance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
