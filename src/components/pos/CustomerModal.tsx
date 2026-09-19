import { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { fromAny } from '@/lib/supabase-helpers';
import { UserCheck, Search, UserPlus, X, Check, Phone, Mail, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export interface SelectedCustomerInfo {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  isWalkIn: boolean;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: SelectedCustomerInfo) => void;
  currentCustomer: SelectedCustomerInfo;
}

export default function CustomerModal({
  isOpen,
  onClose,
  onSelectCustomer,
  currentCustomer,
}: CustomerModalProps) {
  const [activeTab, setActiveTab] = useState<'walkin' | 'existing' | 'new'>('walkin');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Search existing customers
  useEffect(() => {
    if (!isOpen || activeTab !== 'existing') return;

    const searchCusts = async () => {
      setSearching(true);
      try {
        let query = fromAny('profiles').select('*').limit(20);
        if (searchQuery.trim()) {
          query = query.or(`full_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,id.eq.${searchQuery}`);
        }
        const { data, error } = await query;
        if (!error && data) {
          setSearchResults(
            data.map((p: any) => ({
              id: p.id,
              full_name: p.full_name || 'Customer',
              email: p.email || 'N/A',
              phone_number: p.phone_number || 'N/A',
              joined_date: p.created_at || new Date().toISOString(),
              total_orders: 0,
              total_spent: 0,
              status: 'active',
            }))
          );
        }
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchCusts, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, isOpen]);

  if (!isOpen) return null;

  const handleSelectWalkIn = () => {
    onSelectCustomer({ name: 'Walk-in Customer', isWalkIn: true });
    onClose();
  };

  const handleSelectExisting = (c: Customer) => {
    onSelectCustomer({
      id: c.id,
      name: c.full_name || 'Customer',
      phone: c.phone_number || undefined,
      email: c.email || undefined,
      isWalkIn: false,
    });
    onClose();
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      return toast.error('Customer name is required');
    }

    setCreating(true);
    try {
      // Create guest profile or user record
      const tempId = crypto.randomUUID();
      const { data, error } = await fromAny('profiles').insert({
        id: tempId,
        full_name: newName.trim(),
        phone_number: newPhone.trim() || null,
        created_at: new Date().toISOString(),
      }).select().single();

      if (error) {
        console.warn('Profile insert note:', error);
      }

      onSelectCustomer({
        id: data?.id || tempId,
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        isWalkIn: false,
      });

      toast.success(`Customer ${newName.trim()} selected.`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create customer');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-foreground/10 rounded-[32px] w-full max-w-lg p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg italic uppercase">Select Customer</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Walk-in or Registered Customer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-foreground/5 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('walkin')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'walkin'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Walk-in
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'existing'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Existing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'new'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            + New
          </button>
        </div>

        {/* Tab 1: Walk-In */}
        {activeTab === 'walkin' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <UserIcon size={32} />
            </div>
            <div>
              <h4 className="font-black text-base italic uppercase">Walk-in Customer</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                No account required. Sale will be registered as a standard walk-in store transaction.
              </p>
            </div>
            <button
              onClick={handleSelectWalkIn}
              className="w-full py-4 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all shadow-lg"
            >
              Set as Walk-in Customer
            </button>
          </div>
        )}

        {/* Tab 2: Existing Customer Search */}
        {activeTab === 'existing' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full pl-12 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
              {searching ? (
                <p className="text-center text-xs text-muted-foreground py-8">Searching database...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectExisting(c)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      currentCustomer.id === c.id
                        ? 'border-primary bg-primary/10'
                        : 'border-foreground/5 bg-card hover:border-foreground/20'
                    }`}
                  >
                    <div>
                      <h5 className="font-black text-xs uppercase">{c.full_name || 'Customer'}</h5>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {c.phone_number !== 'N/A' && `📱 ${c.phone_number}`} {c.email !== 'N/A' && `✉️ ${c.email}`}
                      </p>
                    </div>
                    {currentCustomer.id === c.id && <Check size={18} className="text-primary" />}
                  </button>
                ))
              ) : (
                <p className="text-center text-xs text-muted-foreground py-8 font-bold">
                  No existing customers found. Try a different query or add a new customer.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Create New Customer */}
        {activeTab === 'new' && (
          <form onSubmit={handleCreateNewCustomer} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                Full Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Hassan Mwinyi"
                required
                className="w-full px-5 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. +255 712 345 678"
                className="w-full px-5 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. hassan@example.com"
                className="w-full px-5 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-4 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus size={16} /> {creating ? 'SAVING CUSTOMER...' : 'CREATE & SELECT CUSTOMER'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
