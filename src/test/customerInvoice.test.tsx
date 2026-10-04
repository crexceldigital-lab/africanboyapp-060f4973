import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CustomerInvoiceModal from '../components/admin/CustomerInvoiceModal';
import CustomersManager from '../components/admin/CustomersManager';
import CustomerDetailsModal from '../components/admin/CustomerDetailsModal';
import EditInvoiceSettingsModal from '../components/admin/EditInvoiceSettingsModal';
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

const mockInvoiceSettings = {
  id: 'set-1',
  store_id: 1,
  business_name: 'AfricanBoy International Ltd',
  trading_name: 'AfricanBoy Apparel & Merchandise',
  business_address: 'Kariakoo Commercial District, Msimbazi Street',
  city: 'Dar es Salaam',
  country: 'Tanzania',
  phone: '+255 700 000 000',
  email: 'billing@africanboy.com',
  website: 'https://africanboy.com',
  tin_number: '123-456-789',
  vrn_number: 'VRN-40019284',
  registration_number: 'TZ-REG-2026-9482',
  bank_name: 'CRDB Bank',
  account_name: 'AfricanBoy International Co. Ltd',
  account_number: '0150294829100',
  bank_branch: 'Kariakoo Branch, Dar es Salaam',
  swift_code: 'CORUTZTZ',
  payment_instructions: 'Pay via CRDB Bank or M-Pesa Till Number: 8849201. Please include Invoice # as reference.',
  invoice_prefix: 'AFB-INV',
  default_currency: 'TZS',
  payment_terms: 'Payment due within 14 days of invoice issue date.',
  due_days: 14,
  invoice_notes: 'Thank you for shopping with AfricanBoy!',
  footer_text: 'AfricanBoy Official Commercial Invoice • All rights reserved.',
  contact_person: 'Finance Desk',
  contact_phone: '+255 700 000 000',
  contact_email: 'finance@africanboy.com',
};

vi.mock('@/integrations/supabase/client', () => {
  const createQueryBuilder = (table?: string) => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      or: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({
        data: table === 'invoice_settings' ? mockInvoiceSettings : null,
        error: null,
      })),
      single: vi.fn().mockImplementation(() => Promise.resolve({
        data: mockInvoiceSettings,
        error: null,
      })),
      upsert: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => Promise.resolve({ data: mockOrdersData, error: null })),
      then: (resolve: any) => resolve({ data: mockOrdersData, error: null }),
    };
    return builder;
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'admin-1', email: 'admin@africanboy.com' } } },
          error: null,
        }),
      },
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
        return createQueryBuilder(table);
      })
    }
  };
});

describe('Customer Segment Invoice Generation & Editing', () => {
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

    expect(screen.getByText('Customer Invoice View & Issue')).toBeInTheDocument();
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

  it('renders Edit Invoice Details modal with 4 sections', async () => {
    render(
      <EditInvoiceSettingsModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Invoice Details')).toBeInTheDocument();
      expect(screen.getByText(/A\. Business \/ Billing Information/i)).toBeInTheDocument();
      expect(screen.getByText(/B\. Bank & Payment Details/i)).toBeInTheDocument();
      expect(screen.getByText(/C\. Default Invoice Information/i)).toBeInTheDocument();
      expect(screen.getByText(/D\. Billing Contact Information/i)).toBeInTheDocument();
    });
  });

  it('renders Edit Invoice Details buttons next to Generate Invoice in CustomersManager header and table rows', async () => {
    render(<CustomersManager />);

    await waitFor(() => {
      expect(screen.getByText('Juma Issa')).toBeInTheDocument();
    });

    const generateBtns = screen.getAllByRole('button', { name: /generate invoice/i });
    const editBtnsHeader = screen.getAllByRole('button', { name: /edit invoice details/i });

    expect(generateBtns.length).toBeGreaterThan(0);
    expect(editBtnsHeader.length).toBeGreaterThan(0);

    const generateInvoiceRowBtns = screen.getAllByTitle('Generate Invoice');
    const editInvoiceRowBtns = screen.getAllByTitle('Edit Invoice Details');

    expect(generateInvoiceRowBtns.length).toBeGreaterThan(0);
    expect(editInvoiceRowBtns.length).toBeGreaterThan(0);

    // Click Edit Invoice Details from table row
    fireEvent.click(editInvoiceRowBtns[0]);
    expect(screen.getByText('Edit Customer Invoice Details')).toBeInTheDocument();
    expect(screen.getByText('Editing Details Mode')).toBeInTheDocument();
  });

  it('renders Edit Invoice Details buttons next to Generate Invoice in CustomerDetailsModal', async () => {
    render(
      <CustomerDetailsModal
        customer={mockCustomer}
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /generate invoice/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /edit invoice details/i }).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getByTitle('Generate Invoice for Order')).toBeInTheDocument();
      expect(screen.getByTitle('Edit Invoice Details')).toBeInTheDocument();
    });

    const editOrderInvoiceButton = screen.getByTitle('Edit Invoice Details');
    fireEvent.click(editOrderInvoiceButton);

    expect(screen.getByText('Edit Customer Invoice Details')).toBeInTheDocument();
    expect(screen.getByText('Editing Details Mode')).toBeInTheDocument();
  });
});
