import { MapPin } from 'lucide-react';
import { SHIPPING_AVAILABILITY } from '@/lib/deliveryZones';

interface DeliveryAvailabilityNoticeProps {
  /** compact = single-line hint (e.g. under a form field); full = the standard checkout notice */
  variant?: 'full' | 'compact';
}

/**
 * Checkout delivery-availability notice.
 * Content is driven entirely by SHIPPING_AVAILABILITY in src/lib/deliveryZones.ts —
 * when international shipping launches, update that constant only.
 */
export default function DeliveryAvailabilityNotice({ variant = 'full' }: DeliveryAvailabilityNoticeProps) {
  if (SHIPPING_AVAILABILITY.internationalShippingActive) return null;

  if (variant === 'compact') {
    return (
      <p className="flex items-start gap-1.5 text-[10px] font-bold text-muted-foreground leading-snug">
        <span aria-hidden="true">🇹🇿</span>
        <span>{SHIPPING_AVAILABILITY.internationalHint}</span>
      </p>
    );
  }

  return (
    <div
      role="note"
      aria-label="Delivery availability notice"
      className="flex items-start gap-3 p-3.5 bg-primary/5 border border-primary/20 rounded-2xl"
    >
      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
        <MapPin size={15} className="text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black text-foreground leading-snug">
          {SHIPPING_AVAILABILITY.notice.emoji} {SHIPPING_AVAILABILITY.notice.title}
        </p>
        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed mt-1">
          {SHIPPING_AVAILABILITY.notice.body}
        </p>
      </div>
    </div>
  );
}
