export interface DeliveryZoneOption {
  id: 'inside_dar' | 'outside_dar' | 'pickup';
  name: string;
  description: string;
  priceTZS: number;
  priceNGN: number;
  estimatedTime: string;
  isPickup?: boolean;
}

export const DELIVERY_ZONE_OPTIONS: DeliveryZoneOption[] = [
  {
    id: 'inside_dar',
    name: 'Inside Dar es Salaam',
    description: 'Same day or next day delivery across Kinondoni, Ilala, Temeke, Ubungo & Kigamboni',
    priceTZS: 3000,
    priceNGN: 2000,
    estimatedTime: '24 Hours',
  },
  {
    id: 'outside_dar',
    name: 'Other Regions (Tanzania & International)',
    description: 'Courier delivery to Arusha, Mwanza, Dodoma, Zanzibar, Mbeya and regional hubs',
    priceTZS: 10000,
    priceNGN: 6000,
    estimatedTime: '2-4 Business Days',
  },
  {
    id: 'pickup',
    name: 'Store Pickup (Free)',
    description: 'Collect directly from African Boy Flagship Store at Sinza Africana, Dar es Salaam',
    priceTZS: 0,
    priceNGN: 0,
    estimatedTime: 'Ready in 2 Hours',
    isPickup: true,
  },
];

export function getDeliveryZoneDetails(zoneId: string): DeliveryZoneOption {
  return (
    DELIVERY_ZONE_OPTIONS.find(z => z.id === zoneId) || DELIVERY_ZONE_OPTIONS[0]
  );
}
