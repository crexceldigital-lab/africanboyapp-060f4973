import { describe, it, expect } from 'vitest';
import { castOrders, castProducts } from '../lib/supabase-helpers';

/**
 * Business Rule Verification Test Suite:
 * ORDER CREATED ≠ SALE
 * PAYMENT SUCCESSFUL = SALE
 */
describe('African Boy E-Commerce Order & Inventory Rules', () => {

  interface MockProduct {
    id: string;
    name: string;
    stock_quantity: number;
    stock: Record<string, number>;
  }

  interface MockOrder {
    id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
    payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'cancelled';
    inventory_deducted: boolean;
    items: Array<{
      product_id: string;
      name: string;
      size?: string;
      color?: string;
      quantity: number;
    }>;
  }

  // Simulated backend function matching deduct_order_inventory RPC logic
  function processInventoryDeduction(order: MockOrder, product: MockProduct): { order: MockOrder; product: MockProduct; deducted: boolean } {
    if (order.inventory_deducted) {
      return { order, product, deducted: false };
    }

    if (order.payment_status === 'paid' || order.status === 'completed') {
      const updatedStockMap = { ...product.stock };
      let newTotalStock = product.stock_quantity;

      for (const item of order.items) {
        newTotalStock = Math.max(0, newTotalStock - item.quantity);
        const variantKey = item.color && item.size ? `${item.color} / ${item.size}` : item.size || '';
        
        if (variantKey && updatedStockMap[variantKey] !== undefined) {
          updatedStockMap[variantKey] = Math.max(0, updatedStockMap[variantKey] - item.quantity);
        } else if (item.size && updatedStockMap[item.size] !== undefined) {
          updatedStockMap[item.size] = Math.max(0, updatedStockMap[item.size] - item.quantity);
        }
      }

      const updatedOrder: MockOrder = {
        ...order,
        inventory_deducted: true,
      };

      const updatedProduct: MockProduct = {
        ...product,
        stock_quantity: newTotalStock,
        stock: updatedStockMap,
      };

      return { order: updatedOrder, product: updatedProduct, deducted: true };
    }

    return { order, product, deducted: false };
  }

  it('TEST 1 — Test Order: Customer places an order but does not pay -> Inventory unchanged', () => {
    const product: MockProduct = {
      id: 'p-1',
      name: 'African Boy Hoodie',
      stock_quantity: 20,
      stock: { M: 10, L: 10 },
    };

    const order: MockOrder = {
      id: 'ord-001',
      status: 'pending',
      payment_status: 'unpaid',
      inventory_deducted: false,
      items: [{ product_id: 'p-1', name: 'African Boy Hoodie', size: 'M', quantity: 2 }],
    };

    const result = processInventoryDeduction(order, product);

    expect(result.order.status).toBe('pending');
    expect(result.order.payment_status).toBe('unpaid');
    expect(result.product.stock_quantity).toBe(20);
    expect(result.product.stock.M).toBe(10);
    expect(result.deducted).toBe(false);
  });

  it('TEST 2 — Failed Payment: Customer attempts payment but payment fails -> Inventory unchanged', () => {
    const product: MockProduct = {
      id: 'p-1',
      name: 'African Boy Hoodie',
      stock_quantity: 20,
      stock: { M: 10, L: 10 },
    };

    const order: MockOrder = {
      id: 'ord-002',
      status: 'failed',
      payment_status: 'failed',
      inventory_deducted: false,
      items: [{ product_id: 'p-1', name: 'African Boy Hoodie', size: 'L', quantity: 3 }],
    };

    const result = processInventoryDeduction(order, product);

    expect(result.order.payment_status).toBe('failed');
    expect(result.product.stock_quantity).toBe(20);
    expect(result.product.stock.L).toBe(10);
    expect(result.deducted).toBe(false);
  });

  it('TEST 3 — Successful Payment: Customer places an order and successfully pays -> Inventory deducted by exact quantity', () => {
    const product: MockProduct = {
      id: 'p-1',
      name: 'African Boy Hoodie',
      stock_quantity: 10,
      stock: { M: 5, L: 5 },
    };

    const order: MockOrder = {
      id: 'ord-003',
      status: 'pending',
      payment_status: 'paid',
      inventory_deducted: false,
      items: [{ product_id: 'p-1', name: 'African Boy Hoodie', size: 'M', quantity: 2 }],
    };

    const result = processInventoryDeduction(order, product);

    expect(result.order.inventory_deducted).toBe(true);
    expect(result.product.stock_quantity).toBe(8);
    expect(result.product.stock.M).toBe(3);
    expect(result.deducted).toBe(true);
  });

  it('TEST 4 — Duplicate Webhook: Send/process the same successful payment callback twice -> Inventory deducted ONLY ONCE', () => {
    let product: MockProduct = {
      id: 'p-1',
      name: 'African Boy Tee',
      stock_quantity: 10,
      stock: { XL: 10 },
    };

    let order: MockOrder = {
      id: 'ord-004',
      status: 'pending',
      payment_status: 'paid',
      inventory_deducted: false,
      items: [{ product_id: 'p-1', name: 'African Boy Tee', size: 'XL', quantity: 2 }],
    };

    // First Webhook execution
    const res1 = processInventoryDeduction(order, product);
    expect(res1.deducted).toBe(true);
    expect(res1.product.stock_quantity).toBe(8);

    // Second Duplicate Webhook execution
    order = res1.order;
    product = res1.product;
    const res2 = processInventoryDeduction(order, product);

    expect(res2.deducted).toBe(false);
    expect(res2.product.stock_quantity).toBe(8); // Must remain 8, not become 6!
  });

  it('TEST 5 — Admin Completion: Admin manually marks an unpaid order as completed/paid -> Inventory deducted once', () => {
    const product: MockProduct = {
      id: 'p-1',
      name: 'African Boy Jacket',
      stock_quantity: 15,
      stock: { L: 15 },
    };

    let order: MockOrder = {
      id: 'ord-005',
      status: 'pending',
      payment_status: 'unpaid',
      inventory_deducted: false,
      items: [{ product_id: 'p-1', name: 'African Boy Jacket', size: 'L', quantity: 5 }],
    };

    // Admin updates order status to completed
    order.status = 'completed';
    order.payment_status = 'paid';

    const result = processInventoryDeduction(order, product);

    expect(result.order.inventory_deducted).toBe(true);
    expect(result.product.stock_quantity).toBe(10);
    expect(result.deducted).toBe(true);
  });

  it('TEST 6 — Edit Completed Order: Admin opens or edits an already completed order -> Inventory does NOT get deducted again', () => {
    let product: MockProduct = {
      id: 'p-1',
      name: 'African Boy Cap',
      stock_quantity: 12,
      stock: { 'One Size': 12 },
    };

    let order: MockOrder = {
      id: 'ord-006',
      status: 'completed',
      payment_status: 'paid',
      inventory_deducted: true, // Already completed & stock previously deducted
      items: [{ product_id: 'p-1', name: 'African Boy Cap', size: 'One Size', quantity: 3 }],
    };

    // Admin edits notes or shipping details on completed order
    const result = processInventoryDeduction(order, product);

    expect(result.deducted).toBe(false);
    expect(result.product.stock_quantity).toBe(12); // Must NOT decrease again
  });

  it('TEST 7 — Product Variant: Customer buys Black / XL / Quantity 2 -> Only Black / XL stock decreases by 2', () => {
    const product: MockProduct = {
      id: 'p-variant',
      name: 'African Boy T-Shirt',
      stock_quantity: 20,
      stock: {
        'Black / L': 5,
        'Black / XL': 5,
        'White / L': 5,
        'White / XL': 5,
      },
    };

    const order: MockOrder = {
      id: 'ord-007',
      status: 'completed',
      payment_status: 'paid',
      inventory_deducted: false,
      items: [{
        product_id: 'p-variant',
        name: 'African Boy T-Shirt',
        color: 'Black',
        size: 'XL',
        quantity: 2,
      }],
    };

    const result = processInventoryDeduction(order, product);

    expect(result.deducted).toBe(true);
    expect(result.product.stock_quantity).toBe(18);
    expect(result.product.stock['Black / XL']).toBe(3); // Decreased by 2
    expect(result.product.stock['Black / L']).toBe(5);  // Unchanged
    expect(result.product.stock['White / L']).toBe(5);  // Unchanged
    expect(result.product.stock['White / XL']).toBe(5); // Unchanged
  });

});
