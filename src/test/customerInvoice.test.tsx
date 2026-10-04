import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CustomerInvoiceModal from '../components/admin/CustomerInvoiceModal';
import CustomersManager from '../components/admin/CustomersManager';
import CustomerDetailsModal from '../components/admin/CustomerDetailsModal';
import { Customer, Order } from '../types';

// Mock Supabase with chainable query builder
const mockOrdersData = [
  {
    id: 'ord-100',
    order_number: 'AFB-2026-100',
    user_id: 'usr-1',
    customer_name: 'Juma Issa',
    customer_email: 'juma@example.com',
    customer_phone: '+255711223344',
    total_amount: 120000,
    status: 'completed',
    payment_status: 'paid',
    delivery_fee: 5000,
    created_at: '2026-02-01T10:00:00Z',
    items: JSON.stringify([
      { name: 'African Boy Premium Hoodie', price: 115000, quantity: 1, size: 'XL', color: 'Black' }
    ])
  }
];

vi.mock('@/integrations/supabase/client', () => {
  const createQueryBuilder = () => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      or: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => Promise.resolve({ data: mockOrdersData, error: null })),
      then: (resolve: any) => resolve({ data: mockOrdersData, error: null }),
    };
    return builder;
  };

  return {
    supabase: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { id: 'usr-1', full_name: 'Juma Issa', phone_number: '+255711223344', created_at: '2026-01-01T00:00:00Z' }
              ],
              error: null
            })
          };
        }
        return createQueryBuilder();
      })
    }
  };
});

describe('Customer Segment Invoice Generation', () => {
  const mockCustomer: Customer = {
    id: 'usr-1',
    full_name: 'Juma Issa',
    email: 'juma@example.com',
    phone_number: '+255711223344',
    joined_date: '2026-01-01T00:00:00Z',
    total_orders: 1,
    total_spent: 120000,
    status: 'active'
  };

  const mockOrder: Order = {
    id: 'ord-100',
    order_number: 'AFB-2026-100',
    user_id: 'usr-1',
    customer_name: 'Juma Issa',
    customer_email: 'juma@example.com',
    customer_phone: '+255711223344',
    total_amount: 120000,
    delivery_fee: 5000,
    status: 'completed',
    payment_status: 'paid',
    items: [
      { name: 'African Boy Premium Hoodie', price: 115000, quantity: 1, size: 'XL', color: 'Black' }
    ],
    created_at: '2026-02-01T10:00:00Z'
  };

  it('renders CustomerInvoiceModal with pre-populated customer info', () => {
    render(
      <CustomerInvoiceModal
        customer={mockCustomer}
        order={mockOrder}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Generate Customer Invoice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Juma Issa')).toBeInTheDocument();
    expect(screen.getByDisplayValue('juma@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+255711223344')).toBeInTheDocument();
    expect(screen.getByDisplayValue('African Boy Premium Hoodie')).toBeInTheDocument();
  });

  it('calculates totals dynamically when adding items and setting fees', async () => {
    render(
      <CustomerInvoiceModal
        customer={mockCustomer}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const addItemButton = screen.getByRole('button', { name: /add item/i });
    fireEvent.click(addItemButton);

    const productInputs = screen.getAllByPlaceholderText('Product Name');
    expect(productInputs.length).toBeGreaterThan(1);

    const priceInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(priceInputs[0], { target: { value: '50000' } });

    expect(screen.getByText(/total due/i)).toBeInTheDocument();
  });

  it('renders invoice buttons on CustomersManager table and opens invoice modal', async () => {
    render(<CustomersManager />);

    await waitFor(() => {
      expect(screen.getByText('Juma Issa')).toBeInTheDocument();
    });

    const generateInvoiceButtons = screen.getAllByTitle('Generate Invoice');
    expect(generateInvoiceButtons.length).toBeGreaterThan(0);

    fireEvent.click(generateInvoiceButtons[0]);
    expect(screen.getByText('Generate Customer Invoice')).toBeInTheDocument();
  });

  it('renders generate invoice button in CustomerDetailsModal header and order rows', async () => {
    render(
      <CustomerDetailsModal
        customer={mockCustomer}
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate invoice/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTitle('Generate Invoice for Order')).toBeInTheDocument();
    });

    const orderInvoiceButton = screen.getByTitle('Generate Invoice for Order');
    fireEvent.click(orderInvoiceButton);

    expect(screen.getByText('Generate Customer Invoice')).toBeInTheDocument();
  });
});
