import type { AgentCommercialOffer, InvoiceSettings } from '@/types';

export const PROPOSAL_SHIPPING_NOTICE = 'This offer covers the goods only. Shipping is not included in the total goods value and will be discussed and quoted separately. African Boy will assist in comparing available options to ship from Tanzania or, where stock availability and logistics permit, directly from China. The partner is responsible for the selected shipping charges and any applicable transit insurance, customs clearance, import duties, taxes, port handling, and destination delivery costs. Dispatch arrangements will be confirmed after the shipping quotation has been accepted.';
export const PROPOSAL_ARTIST_NOTICE = 'Artist appearances, live performances, store visits, and promotional engagements by Jux or African Boy brand ambassadors are not included or guaranteed under this wholesale offer. Any such engagement requires a separate written agreement and formal talent-management approval.';

export type ProposalBusinessDetails = Pick<Partial<InvoiceSettings>, 'business_name' | 'business_address' | 'city' | 'country' | 'email' | 'phone' | 'website' | 'contact_person'>;

export function getProposalAmounts(offer: AgentCommercialOffer) {
  const currency = offer.currency?.trim().toUpperCase();
  if (!currency || !/^[A-Z]{3}$/.test(currency)) throw new Error('The offer must have a valid currency.');
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  const scale = 10 ** digits;
  const items = offer.proposedItems.map(item => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Each offer item needs a positive whole quantity and a valid non-negative price.');
    }
    const unitMinor = Math.round((unitPrice + Number.EPSILON) * scale);
    return { ...item, quantity, unitPrice: unitMinor / scale, lineTotal: unitMinor * quantity / scale };
  });
  const subtotalMinor = items.reduce((sum, item) => sum + Math.round(item.lineTotal * scale), 0);
  return {
    currency, items,
    totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
    goodsValue: subtotalMinor / scale,
    money: (value: number) => `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`,
  };
}