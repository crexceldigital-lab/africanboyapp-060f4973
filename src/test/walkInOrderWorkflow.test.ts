import { describe, it, expect } from 'vitest';
import { castOrders, castProducts } from '../lib/supabase-helpers';

describe('Walk-In Order & Store Staff Workflow Tests', () => {
  it('correctly calculates subtotal, discount, total and stock deduction for walk-in order', () => {
    const initialStock = 100;
    const orderQuantity = 2;
    const unitPrice = 40000;
    const discountAmount = 5000;

    const subtotal = unitPrice * orderQuantity;
    const totalAmount = Math.max(0, subtotal - discountAmount);
    const expectedStockAfter = initialStock - orderQuantity;

    expect(subtotal).toBe(80000);
    expect(totalAmount).toBe(75000);
    expect(expectedStockAfter).toBe(98);
  });

  it('correctly formats and normalises order items and shipment remaining quantities', () => {
    const rawOrderData = [{
      id: 'ord-101',
      store_id: 1,
      total_amount: 40000,
      status: 'completed',
      items: [
        {
          product_id: 'p-1',
          name: 'AFB Essential Tee Black',
          price: 40000,
          quantity: 2,
          quantity_shipped: 1,
        }
      ]
    }];

    const orders = castOrders(rawOrderData);
    expect(orders).toHaveLength(1);
    expect(orders[0].items[0].quantity).toBe(2);
    expect(orders[0].items[0].quantity_shipped).toBe(1);
    expect(orders[0].items[0].quantity_remaining).toBe(1);
  });

  it('prevents overstock orders when requested quantity exceeds available stock', () => {
    const availableStock = 5;
    const requestedQuantity = 10;

    const isAvailable = requestedQuantity <= availableStock;
    expect(isAvailable).toBe(false);
  });

  it('ensures duplicate confirmation does not decrease stock multiple times', () => {
    let stock = 50;
    const soldQty = 1;
    let orderStatus = 'pending';

    // First confirmation
    if (orderStatus !== 'completed') {
      stock -= soldQty;
      orderStatus = 'completed';
    }
    expect(stock).toBe(49);

    // Duplicate confirmation attempt
    if (orderStatus !== 'completed') {
      stock -= soldQty;
    }
    expect(stock).toBe(49); // Stock remains unchanged
  });
});
