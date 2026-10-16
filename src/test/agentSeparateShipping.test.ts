import { describe, it, expect, beforeEach } from 'vitest';
import { agentService } from '@/services/agentService';
import type { AgentProfile, OrderItem, Product } from '@/types';

describe('AFRICAN BOY AGENT PORTAL — SEPARATE PRODUCT SALES AND SHIPPING COSTS', { timeout: 30000 }, () => {
  const mockAgent: AgentProfile = {
    id: 'agent-sep-ship-001',
    user_id: 'user-sep-ship-001',
    agent_code: 'AB-KE-NBO-01',
    business_model: 'Wholesale Reseller',
    assigned_country_code: 'KE',
    assigned_country_name: 'Kenya',
    assigned_territory: 'Nairobi CBD',
    is_exclusive: true,
    approved_categories: ['T-Shirt', 'Caps'],
    wholesale_discount_percent: 30,
    commission_rate: 0,
    minimum_order_quantity: 10,
    currency: 'USD',
    payment_terms: 'Pre-payment',
    status: 'active',
    full_name: 'Amina Kimani',
    email: 'amina@nairobiluxury.co.ke',
    phone_whatsapp: '+254712345678',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleProducts: Product[] = [
    {
      id: 'prod-tz-tee',
      name: 'African Boy Signature Tee',
      price: 25,
      description: 'Cotton T-Shirt',
      image_url: 'https://example.com/tee.jpg',
      category: 'T-Shirt',
      sizes: ['M', 'L', 'XL'],
      colors: [{ name: 'Black', code: '#000000' }],
      sku: 'AFB-TEE-01',
      available_origins: ['Tanzania', 'China'],
    },
    {
      id: 'prod-tz-cap',
      name: 'African Boy Gold Embroidered Cap',
      price: 20,
      description: 'Structured Cap',
      image_url: 'https://example.com/cap.jpg',
      category: 'Caps',
      sizes: ['Standard'],
      colors: [{ name: 'Gold', code: '#D4AF37' }],
      sku: 'AFB-CAP-01',
      available_origins: ['Tanzania', 'China'],
    },
    {
      id: 'prod-local-artisan',
      name: 'African Boy Handcrafted Tanzanian Leather Belt',
      price: 45,
      description: 'Crafted locally in Dar es Salaam',
      image_url: 'https://example.com/belt.jpg',
      category: 'Accessories',
      sizes: ['Standard'],
      colors: [{ name: 'Brown', code: '#8B4513' }],
      sku: 'AFB-BELT-TZ',
      available_origins: ['Tanzania'], // Local stock only - cannot ship direct from China
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  // CRITERION 1: Product Sales Exclude Shipping
  describe('1. Product Sales & Invoices Exclude Shipping', () => {
    it('creates product orders with strictly zero shipping fee and merchandise subtotal as total due', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod-tz-tee', name: 'African Boy Signature Tee', price: 20, quantity: 15 },
      ];

      const res = await agentService.createReplenishmentOrder(
        mockAgent,
        items,
        'Moi Avenue, Nairobi, Kenya',
        'Commercial wholesale order for Nairobi branch'
      );

      expect(res.success).toBe(true);
      expect(res.order).toBeDefined();

      const order = res.order!;
      expect(order.subtotal).toBe(300); // 15 * 20
      expect(order.shipping_fee).toBe(0); // Strictly zero shipping fee
      expect(order.total_amount).toBe(300); // Equal to merchandise subtotal
      expect(order.notes).toContain('Shipping is not included and will be arranged and charged separately.');
      expect(order.commercial_terms_snapshot.shipping_policy).toContain('Shipping is not included and will be arranged and charged separately.');
    });
  });

  // CRITERION 2: Separate Shipping Requests
  describe('2. Separate Shipping Requests After Order Confirmation', () => {
    it('allows agent to submit a separate shipping quotation request with destination details and origin', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod-tz-tee', name: 'African Boy Signature Tee', price: 20, quantity: 20 },
      ];
      const orderRes = await agentService.createReplenishmentOrder(
        mockAgent,
        items,
        'Kenyatta Avenue, Nairobi',
        'Standard packaging'
      );
      const order = orderRes.order!;

      const quoteRes = await agentService.requestShippingQuote({
        orderId: order.id,
        orderNumber: order.order_number,
        agentId: mockAgent.id,
        userId: mockAgent.user_id,
        shippingOrigin: 'Tanzania',
        destinationCountry: 'Kenya',
        destinationCity: 'Nairobi',
        destinationPostcode: '00100',
        deliveryAddress: 'Kenyatta Avenue Suite 4B, Nairobi',
        specialRequirements: 'Forklift available on site, morning delivery requested',
      });

      expect(quoteRes.success).toBe(true);
      expect(quoteRes.quote).toBeDefined();

      const quote = quoteRes.quote!;
      expect(quote.order_id).toBe(order.id);
      expect(quote.order_number).toBe(order.order_number);
      expect(quote.shipping_origin).toBe('Tanzania');
      expect(quote.destination_country).toBe('Kenya');
      expect(quote.destination_city).toBe('Nairobi');
      expect(quote.status).toBe('pending');
      expect(quote.is_verified).toBe(false);
      expect(quote.shipping_amount).toBeNull();
      expect(quote.shipping_payment_status).toBe('unpaid');

      // Verify audit trail logged the request
      const auditLogs = await agentService.getShippingAuditLogs(quote.id);
      expect(auditLogs.length).toBeGreaterThanOrEqual(1);
      expect(auditLogs[0].action).toBe('REQUESTED');
    });
  });

  // CRITERION 3: Tanzania and China Offered Only When Possible
  describe('3. Shipping Origin Availability (Tanzania vs China)', () => {
    it('offers both Tanzania and China when all items can be fulfilled from either location', () => {
      const items: OrderItem[] = [
        { product_id: 'prod-tz-tee', name: 'African Boy Signature Tee', price: 20, quantity: 25 },
        { product_id: 'prod-tz-cap', name: 'African Boy Gold Embroidered Cap', price: 15, quantity: 15 },
      ];

      const availableOrigins = agentService.getOrderAvailableOrigins(items, sampleProducts);
      expect(availableOrigins).toContain('Tanzania');
      expect(availableOrigins).toContain('China');
    });

    it('excludes China and offers only Tanzania when any item cannot be fulfilled from China', () => {
      const itemsWithLocalArtisan: OrderItem[] = [
        { product_id: 'prod-tz-tee', name: 'African Boy Signature Tee', price: 20, quantity: 10 },
        { product_id: 'prod-local-artisan', name: 'African Boy Handcrafted Tanzanian Leather Belt', price: 45, quantity: 5 },
      ];

      const availableOrigins = agentService.getOrderAvailableOrigins(itemsWithLocalArtisan, sampleProducts);
      expect(availableOrigins).toContain('Tanzania');
      expect(availableOrigins).not.toContain('China');
    });
  });

  // CRITERION 4: Quotation Verification & Ban on Fabricated Rates
  describe('4. Verified Shipping Quotation Management', () => {
    it('rejects unverified quotations with empty courier or invalid amounts', async () => {
      const quoteRes = await agentService.requestShippingQuote({
        orderId: 'ord-test-4',
        orderNumber: 'ARO-2026-TEST4',
        agentId: mockAgent.id,
        userId: mockAgent.user_id,
        shippingOrigin: 'China',
        destinationCountry: 'Kenya',
        destinationCity: 'Nairobi',
        deliveryAddress: 'Industrial Area, Nairobi',
      });
      const quote = quoteRes.quote!;

      // Attempt submit without courier
      const failNoCourier = await agentService.submitVerifiedShippingQuote({
        quoteId: quote.id,
        courierName: '',
        shippingAmount: 180,
        currency: 'USD',
        estimatedDeliveryTime: '5 days',
      });
      expect(failNoCourier.success).toBe(false);
      expect(failNoCourier.error).toContain('Courier or freight forwarder is required');

      // Attempt submit with negative amount
      const failNegative = await agentService.submitVerifiedShippingQuote({
        quoteId: quote.id,
        courierName: 'DHL Express',
        shippingAmount: -50,
        currency: 'USD',
        estimatedDeliveryTime: '5 days',
      });
      expect(failNegative.success).toBe(false);
      expect(failNegative.error).toContain('positive number');
    });

    it('submits verified courier quotation with customs/handling charges and sets status to sent', async () => {
      const quoteRes = await agentService.requestShippingQuote({
        orderId: 'ord-test-4b',
        orderNumber: 'ARO-2026-TEST4B',
        agentId: mockAgent.id,
        userId: mockAgent.user_id,
        shippingOrigin: 'China',
        destinationCountry: 'South Africa',
        destinationCity: 'Johannesburg',
        deliveryAddress: 'Sandton City, Johannesburg',
      });
      const quote = quoteRes.quote!;

      const verifiedRes = await agentService.submitVerifiedShippingQuote({
        quoteId: quote.id,
        courierName: 'DHL Express Worldwide',
        shippingAmount: 195,
        currency: 'USD',
        customsAndHandlingFee: 45,
        estimatedDeliveryTime: '4-6 business days',
        quoteDate: '2026-10-16',
        expiryDate: '2026-10-30',
        internalNotes: 'Forwarder quote ref #DHL-JNB-9941',
      });

      expect(verifiedRes.success).toBe(true);
      const verified = verifiedRes.quote!;
      expect(verified.is_verified).toBe(true);
      expect(verified.courier_name).toBe('DHL Express Worldwide');
      expect(verified.shipping_amount).toBe(195);
      expect(verified.currency).toBe('USD');
      expect(verified.customs_and_handling_fee).toBe(45);
      expect(verified.status).toBe('sent'); // Awaiting agent review
      expect(verified.revision_number).toBe(1);

      const auditLogs = await agentService.getShippingAuditLogs(quote.id);
      const verifyLog = auditLogs.find(l => l.action === 'QUOTE_VERIFIED_AND_SENT');
      expect(verifyLog).toBeDefined();
    });
  });

  // CRITERION 5: Agent Approval, Revision, and Price Immutability
  describe('5. Agent Review, Approval & Price Immutability', () => {
    it('allows agent to decline quote with feedback reason', async () => {
      const quoteRes = await agentService.requestShippingQuote({
        orderId: 'ord-test-5',
        orderNumber: 'ARO-2026-TEST5',
        agentId: mockAgent.id,
        userId: mockAgent.user_id,
        shippingOrigin: 'Tanzania',
        destinationCountry: 'Rwanda',
        destinationCity: 'Kigali',
        deliveryAddress: 'Remera, Kigali',
      });
      await agentService.submitVerifiedShippingQuote({
        quoteId: quoteRes.quote!.id,
        courierName: 'Air Freight',
        shippingAmount: 320,
        currency: 'USD',
        estimatedDeliveryTime: '2 days',
      });

      // Agent declines
      const declineRes = await agentService.respondToShippingQuote(
        quoteRes.quote!.id,
        false,
        'Rate exceeds freight budget; please quote consolidated road cargo.'
      );
      expect(declineRes.success).toBe(true);
      expect(declineRes.quote?.status).toBe('rejected');
      expect(declineRes.quote?.agent_rejection_reason).toContain('consolidated road cargo');
    });

    it('increments revision number and reverts to sent status if staff alters an accepted quote', async () => {
      const quoteRes = await agentService.requestShippingQuote({
        orderId: 'ord-test-5b',
        orderNumber: 'ARO-2026-TEST5B',
        agentId: mockAgent.id,
        userId: mockAgent.user_id,
        shippingOrigin: 'China',
        destinationCountry: 'Kenya',
        destinationCity: 'Mombasa',
        deliveryAddress: 'Nyali, Mombasa',
      });
      await agentService.submitVerifiedShippingQuote({
        quoteId: quoteRes.quote!.id,
        courierName: 'DHL Express',
        shippingAmount: 140,
        currency: 'USD',
        estimatedDeliveryTime: '5 days',
      });

      // Agent accepts original quote
      const acceptRes = await agentService.respondToShippingQuote(quoteRes.quote!.id, true);
      expect(acceptRes.quote?.status).toBe('accepted');
      expect(acceptRes.quote?.revision_number).toBe(1);

      // Staff alters price: revision increments and status becomes 'sent' requiring re-approval!
      const revisedRes = await agentService.submitVerifiedShippingQuote({
        quoteId: quoteRes.quote!.id,
        courierName: 'DHL Express',
        shippingAmount: 165, // Price increase
        currency: 'USD',
        estimatedDeliveryTime: '5 days',
      });
      expect(revisedRes.success).toBe(true);
      expect(revisedRes.quote?.revision_number).toBe(2);
      expect(revisedRes.quote?.status).toBe('sent'); // Must be re-approved!
    });
  });

  // CRITERION 6: Separate Product vs Shipping Payment
  describe('6. Separate Recording of Product and Shipping Payments', () => {
    it('records shipping payment separately with independent reference and status', async () => {
      const quoteRes = await agentService.requestShippingQuote({
        orderId: 'ord-test-6',
        orderNumber: 'ARO-2026-TEST6',
        agentId: mockAgent.id,
        userId: mockAgent.user_id,
        shippingOrigin: 'Tanzania',
        destinationCountry: 'Uganda',
        destinationCity: 'Kampala',
        deliveryAddress: 'Kampala Road, Kampala',
      });
      await agentService.submitVerifiedShippingQuote({
        quoteId: quoteRes.quote!.id,
        courierName: 'Posta Uganda Express',
        shippingAmount: 85,
        currency: 'USD',
        estimatedDeliveryTime: '3 days',
      });
      await agentService.respondToShippingQuote(quoteRes.quote!.id, true);

      // Record shipping payment
      const payRes = await agentService.recordShippingPayment(
        quoteRes.quote!.id,
        'UG-CRDB-TXN-9921',
        85
      );
      expect(payRes.success).toBe(true);
      const quote = payRes.quote!;
      expect(quote.shipping_payment_status).toBe('paid');
      expect(quote.shipping_payment_reference).toBe('UG-CRDB-TXN-9921');
      expect(quote.shipping_payment_date).toBeDefined();

      // Check audit log recorded payment
      const auditLogs = await agentService.getShippingAuditLogs(quote.id);
      const payLog = auditLogs.find(l => l.action === 'PAYMENT_RECORDED');
      expect(payLog).toBeDefined();
    });
  });

  // CRITERION 7: Tracking Details and Dispatch Approval Requirement
  describe('7. Dispatch Enforcement & Tracking Details', () => {
    it('prevents dispatch before the agent has approved the shipping quotation', async () => {
      const quoteRes = await agentService.requestShippingQuote({
        orderId: 'ord-test-7',
        orderNumber: 'ARO-2026-TEST7',
        agentId: mockAgent.id,
        userId: mockAgent.user_id,
        shippingOrigin: 'China',
        destinationCountry: 'Zambia',
        destinationCity: 'Lusaka',
        deliveryAddress: 'Cairo Road, Lusaka',
      });
      await agentService.submitVerifiedShippingQuote({
        quoteId: quoteRes.quote!.id,
        courierName: 'FedEx International',
        shippingAmount: 210,
        currency: 'USD',
        estimatedDeliveryTime: '5 days',
      });
      // Status is still 'sent' (NOT accepted by agent)

      const dispatchAttempt = await agentService.dispatchShipment({
        quoteId: quoteRes.quote!.id,
        courierName: 'FedEx International',
        trackingNumber: '7948291039',
      });

      expect(dispatchAttempt.success).toBe(false);
      expect(dispatchAttempt.error).toContain('approved the shipping quotation');
    });

    it('allows dispatch once accepted, recording tracking number, url, courier and updating linked order', async () => {
      const quoteRes = await agentService.requestShippingQuote({
        orderId: 'ord-test-7b',
        orderNumber: 'ARO-2026-TEST7B',
        agentId: mockAgent.id,
        userId: mockAgent.user_id,
        shippingOrigin: 'China',
        destinationCountry: 'UAE',
        destinationCity: 'Dubai',
        deliveryAddress: 'Deira Gold Souk, Dubai',
      });
      await agentService.submitVerifiedShippingQuote({
        quoteId: quoteRes.quote!.id,
        courierName: 'DHL Express',
        shippingAmount: 240,
        currency: 'USD',
        estimatedDeliveryTime: '3-4 business days',
      });
      await agentService.respondToShippingQuote(quoteRes.quote!.id, true);

      // Dispatch shipment
      const dispatchRes = await agentService.dispatchShipment({
        quoteId: quoteRes.quote!.id,
        courierName: 'DHL Express',
        trackingNumber: 'AWB-9837104921',
        trackingUrl: 'https://www.dhl.com/track?awb=AWB-9837104921',
        dispatchDate: '2026-10-16',
        estimatedDeliveryDate: '2026-10-20',
      });

      expect(dispatchRes.success).toBe(true);
      const quote = dispatchRes.quote!;
      expect(quote.status).toBe('dispatched');
      expect(quote.tracking_number).toBe('AWB-9837104921');
      expect(quote.tracking_url).toBe('https://www.dhl.com/track?awb=AWB-9837104921');
      expect(quote.dispatched_at).toBe('2026-10-16');
      expect(quote.estimated_delivery_date).toBe('2026-10-20');

      // Check linked replenishment order tracking details
      const linkedOrder = (await agentService.getAllReplenishmentOrders()).find(o => o.id === 'ord-test-7b');
      if (linkedOrder) {
        expect(linkedOrder.status).toBe('shipped');
        expect(linkedOrder.tracking_number).toBe('AWB-9837104921');
        expect(linkedOrder.courier_name).toBe('DHL Express');
      }

      // Check audit log recorded dispatch
      const auditLogs = await agentService.getShippingAuditLogs(quote.id);
      const dispatchLog = auditLogs.find(l => l.action === 'DISPATCHED');
      expect(dispatchLog).toBeDefined();
    });
  });
});
