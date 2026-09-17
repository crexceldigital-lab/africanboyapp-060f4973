import { describe, it, expect } from 'vitest';
import { DELIVERY_ZONE_OPTIONS, getDeliveryZoneDetails } from '../lib/deliveryZones';
import { STORE_LOCATIONS } from '../components/StoreLocator';

describe('Delivery Zones & Store Locations', () => {
  it('contains expected delivery options', () => {
    expect(DELIVERY_ZONE_OPTIONS.length).toBeGreaterThanOrEqual(3);
    const insideDar = getDeliveryZoneDetails('inside_dar');
    expect(insideDar.priceTZS).toBe(3000);

    const outsideDar = getDeliveryZoneDetails('outside_dar');
    expect(outsideDar.priceTZS).toBe(10000);

    const pickup = getDeliveryZoneDetails('pickup');
    expect(pickup.priceTZS).toBe(0);
    expect(pickup.isPickup).toBe(true);
  });

  it('contains flagship store location in Dar es Salaam', () => {
    expect(STORE_LOCATIONS.length).toBeGreaterThanOrEqual(3);
    const flagship = STORE_LOCATIONS.find((s) => s.isFlagship);
    expect(flagship).toBeDefined();
    expect(flagship?.city).toBe('Dar es Salaam');
    expect(flagship?.name).toContain('Flagship Store');
  });
});
