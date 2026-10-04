import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { castOrders } from '@/lib/supabase-helpers';
import { Customer, Order } from '../../types';
import { Search, Eye, RefreshCw, UserCheck, FileText, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import CustomerDetailsModal from './CustomerDetailsModal';
import CustomerInvoiceModal from './CustomerInvoiceModal';
import EditInvoiceSettingsModal from './EditInvoiceSettingsModal';

export default function CustomersManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isEditInvoiceMode, setIsEditInvoiceMode] = useState(false);
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false);

  const fetchCustomersData = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      // Fetch all orders to aggregate metrics
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*');

      if (ordersError) {
        console.error('Error fetching orders for customers view:', ordersError);
      }

      const orders = castOrders(ordersData || []);
      const profilesMap = new Map<string, any>();
      
      // Index profiles by id
      if (profilesData) {
        profilesData.forEach((p: any) => {
          profilesMap.set(p.id, p);
        });
      }

      // Aggregate orders per user_id or customer_email
      const customerAggregates = new Map<string, {
        id: string;
        full_name: string | null;
        email: string | null;
        phone_number: string | null;
        joined_date: string;
        total_orders: number;
        total_spent: number;
      }>();

      // Process profiles first
      profilesData?.forEach((prof: any) => {
        customerAggregates.set(prof.id, {
          id: prof.id,
          full_name: prof.full_name || 'Registered User',
          email: null,
          phone_number: prof.phone_number || null,
          joined_date: prof.created_at || new Date().toISOString(),
          total_orders: 0,
          total_spent: 0,
        });
      });

      // Aggregate orders
      orders.forEach((ord) => {
        const key = ord.user_id || ord.customer_email || ord.customer_phone || ord.id;
        let existing = customerAggregates.get(key);

        if (!existing && ord.customer_email) {
          // Check if there is an entry with matching email
          for (const [k, v] of customerAggregates.entries()) {
            if (v.email === ord.customer_email) {
              existing = v;
              break;
            }
          }
        }

        if (!existing) {
          existing = {
            id: ord.user_id || ord.customer_email || ord.id,
            full_name: ord.customer_name || 'Guest Customer',
            email: ord.customer_email || null,
            phone_number: ord.customer_phone || null,
            joined_date: ord.created_at,
            total_orders: 0,
            total_spent: 0,
          };
          customerAggregates.set(existing.id, existing);
        }

        if (ord.customer_name && existing.full_name === 'Registered User') {
          existing.full_name = ord.customer_name;
        }
        if (ord.customer_email && !existing.email) {
          existing.email = ord.customer_email;
        }
        if (ord.customer_phone && !existing.phone_number) {
          existing.phone_number = ord.customer_phone;
        }

        existing.total_orders += 1;
        if (ord.status !== 'cancelled' && ord.status !== 'refunded') {
          existing.total_spent += Number(ord.total_amount) || 0;
        }
      });

      const customerList: Customer[] = Array.from(customerAggregates.values()).map((c) => ({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        phone_number: c.phone_number,
        joined_date: c.joined_date,
        total_orders: c.total_orders,
        total_spent: c.total_spent,
        status: c.total_orders > 0 ? 'active' : 'inactive',
      }));

      // Sort by total spent descending
      customerList.sort((a, b) => b.total_spent - a.total_spent);
      setCustomers(customerList);

    } catch (err) {
      console.error('Failed to build customers list:', err);
      toast.error('Failed to load customer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersData();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      (c.full_name && c.full_name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone_number && c.phone_number.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex-1 relative min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer name, email, or phone number..."
            className="w-full pl-12 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
          />
        </div>
        <button
          onClick={() => {
            setInvoiceCustomer(null);
            setIsEditInvoiceMode(false);
            setIsInvoiceOpen(true);
          }}
          className="px-4 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
        >
          <FileText size={16} /> Generate Invoice
        </button>
        <button
          onClick={() => {
            setIsEditSettingsOpen(true);
          }}
          className="px-4 py-3 bg-card border border-foreground/10 hover:border-amber-500/50 text-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
        >
          <Edit3 size={16} className="text-amber-500" /> Edit Invoice Details
        </button>
        <button
          onClick={fetchCustomersData}
          className="p-3 bg-card border border-foreground/10 hover:border-primary rounded-2xl text-muted-foreground hover:text-foreground transition-all"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs font-bold text-muted-foreground">Aggregating customer accounts...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-16 text-center text-xs font-bold text-muted-foreground">No customer records found.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-foreground/5 bg-foreground/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Orders</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Spent</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Joined</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-xs text-primary italic uppercase">
                          {customer.full_name ? customer.full_name.substring(0, 2) : 'CU'}
                        </div>
                        <div>
                          <p className="text-sm font-black italic uppercase">{customer.full_name || 'Anonymous'}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{customer.id.substring(0, 12)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs">
                      <p className="font-mono font-bold">{customer.email || 'No email'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{customer.phone_number || 'No phone'}</p>
                    </td>
                    <td className="px-8 py-6 font-mono text-sm font-bold">
                      {customer.total_orders}
                    </td>
                    <td className="px-8 py-6 font-mono text-sm font-bold text-primary">
                      {customer.total_spent.toLocaleString()} TZS
                    </td>
                    <td className="px-8 py-6 text-xs text-muted-foreground font-bold">
                      {new Date(customer.joined_date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        customer.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border-foreground/10'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right space-x-1">
                      <button
                        title="Generate Invoice"
                        onClick={() => {
                          setInvoiceCustomer(customer);
                          setIsEditInvoiceMode(false);
                          setIsInvoiceOpen(true);
                        }}
                        className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-all inline-flex items-center justify-center"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        title="Edit Invoice Details"
                        onClick={() => {
                          setInvoiceCustomer(customer);
                          setIsEditInvoiceMode(true);
                          setIsInvoiceOpen(true);
                        }}
                        className="p-2 hover:bg-amber-500/10 rounded-xl text-amber-500 transition-all inline-flex items-center justify-center"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        title="View Customer Details"
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all inline-flex items-center justify-center"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />

      {/* Customer Invoice Modal */}
      <CustomerInvoiceModal
        customer={invoiceCustomer}
        isOpen={isInvoiceOpen}
        initialEditMode={isEditInvoiceMode}
        onClose={() => {
          setIsInvoiceOpen(false);
          setInvoiceCustomer(null);
          setIsEditInvoiceMode(false);
        }}
      />

      {/* Edit Invoice Settings Modal */}
      <EditInvoiceSettingsModal
        isOpen={isEditSettingsOpen}
        onClose={() => setIsEditSettingsOpen(false)}
        onSaved={() => fetchCustomersData()}
      />
    </div>
  );
}
