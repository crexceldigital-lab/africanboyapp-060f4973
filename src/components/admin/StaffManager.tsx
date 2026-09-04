import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromAny } from '@/lib/supabase-helpers';
import { Store, StoreStaff } from '../../types';
import { UserCheck, Plus, Trash2, Search, UserX, Shield, Store as StoreIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface EnrichedStaff extends StoreStaff {
  user_email?: string;
  user_name?: string;
  created_at?: string;
  store?: Store;
}

export default function StaffManager() {
  const [staffList, setStaffList] = useState<EnrichedStaff[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [emailInput, setEmailInput] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<'sales_rep' | 'store_manager'>('sales_rep');
  const [inlineAlert, setInlineAlert] = useState<{ type: 'error' | 'warning' | 'success'; message: string } | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      // 1. Fetch stores
      const { data: dbStores } = await fromAny('stores').select('*').order('id');
      if (dbStores) {
        setStores(dbStores as unknown as Store[]);
        if (dbStores.length > 0 && !selectedStoreId) {
          setSelectedStoreId(dbStores[0].id);
        }
      }

      // 2. Fetch store staff rows with store object
      const { data: dbStaff, error: staffErr } = await fromAny('store_staff')
        .select('*, store:stores(*)');

      if (staffErr) {
        console.error('Error fetching store_staff:', staffErr);
        toast.error('Failed to load store staff list');
        return;
      }

      if (!dbStaff || dbStaff.length === 0) {
        setStaffList([]);
        return;
      }

      // 3. Resolve user details (emails & names) via Edge Function lookup-user-by-email
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const userIds = Array.from(new Set(dbStaff.map((s: any) => s.user_id)));

      if (token && userIds.length > 0) {
        const res = await supabase.functions.invoke('lookup-user-by-email', {
          body: { user_ids: userIds },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.users) {
          const userMap = new Map<string, { email: string; full_name: string | null }>(
            res.data.users.map((u: any) => [u.user_id, { email: u.email, full_name: u.full_name }])
          );

          const enriched: EnrichedStaff[] = dbStaff.map((s: any) => {
            const userInfo = userMap.get(s.user_id);
            return {
              ...s,
              user_email: userInfo?.email || s.user_id,
              user_name: userInfo?.full_name || null,
            };
          });

          setStaffList(enriched);
          return;
        }
      }

      // Fallback if Edge function call returned empty
      setStaffList(dbStaff.map((s: any) => ({ ...s, user_email: s.user_id })));
    } catch (err) {
      console.error('Error in fetchStaffData:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineAlert(null);

    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail) {
      setInlineAlert({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Get current session token for Edge Function authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast.error('Authentication session expired. Please sign in again.');
        setSubmitting(false);
        return;
      }

      // 2. Call lookup-user-by-email Edge Function
      const lookupRes = await supabase.functions.invoke('lookup-user-by-email', {
        body: { email: trimmedEmail },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (lookupRes.error) {
        console.error('Lookup Edge Function error:', lookupRes.error);
        setInlineAlert({
          type: 'error',
          message: lookupRes.error.message || 'Failed to perform user lookup.',
        });
        setSubmitting(false);
        return;
      }

      const lookupData = lookupRes.data;

      // Handle user not found case
      if (!lookupData || !lookupData.found) {
        setInlineAlert({
          type: 'warning',
          message: `No account found for "${trimmedEmail}". Please ask them to sign up first on the mobile app or website.`,
        });
        setSubmitting(false);
        return;
      }

      const targetUserId = lookupData.user_id;

      // 3. Attempt insert into store_staff via client (RLS enforces admin permission)
      const { error: insertErr } = await fromAny('store_staff')
        .insert({
          user_id: targetUserId,
          store_id: selectedStoreId,
          staff_role: selectedRole,
        });

      if (insertErr) {
        // Catch duplicate constraint error (user already assigned to this store)
        if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key') || insertErr.message?.includes('unique constraint')) {
          const updateConfirm = confirm(
            `This user is already assigned to this store. Would you like to update their role to "${selectedRole === 'sales_rep' ? 'Sales Representative' : 'Store Manager'}"?`
          );

          if (updateConfirm) {
            const { error: updateErr } = await fromAny('store_staff')
              .update({ staff_role: selectedRole })
              .eq('user_id', targetUserId)
              .eq('store_id', selectedStoreId);

            if (updateErr) {
              toast.error(`Failed to update role: ${updateErr.message}`);
            } else {
              toast.success(`Updated staff role for ${lookupData.email}!`);
              setEmailInput('');
              setInlineAlert(null);
              fetchStaffData();
            }
          }
        } else {
          toast.error(`Failed to assign staff: ${insertErr.message}`);
        }
      } else {
        toast.success(`Successfully assigned ${lookupData.email} as ${selectedRole === 'sales_rep' ? 'Sales Rep' : 'Store Manager'}!`);
        setEmailInput('');
        setInlineAlert(null);
        fetchStaffData();
      }
    } catch (err: any) {
      console.error('Error assigning staff:', err);
      toast.error('An unexpected error occurred while assigning staff.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStaff = async (id: string, staffEmail?: string) => {
    const isConfirmed = confirm(
      `Are you sure you want to remove store staff assignment for ${staffEmail || 'this user'}?\n\nThis will immediately revoke their store-scoped access.`
    );

    if (!isConfirmed) return;

    try {
      const { error } = await fromAny('store_staff').delete().eq('id', id);
      if (error) {
        toast.error(`Failed to remove staff assignment: ${error.message}`);
      } else {
        toast.success('Staff assignment removed successfully.');
        fetchStaffData();
      }
    } catch (err) {
      console.error('Error removing staff:', err);
      toast.error('Failed to remove staff member.');
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      (s.user_email && s.user_email.toLowerCase().includes(query)) ||
      (s.user_name && s.user_name.toLowerCase().includes(query)) ||
      (s.store?.name && s.store.name.toLowerCase().includes(query)) ||
      (s.staff_role && s.staff_role.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-primary text-xs font-bold tracking-widest uppercase">Multi-Store Management</span>
          <h2 className="text-2xl font-black italic uppercase tracking-tight">
            STORE <span className="text-primary">STAFF ASSIGNMENTS</span>
          </h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
            Assign existing user accounts to Tanzania or Nigeria store operations
          </p>
        </div>
        <button
          onClick={fetchStaffData}
          disabled={loading}
          className="px-4 py-2.5 bg-card border border-foreground/10 hover:border-primary text-foreground rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} /> Refresh
        </button>
      </div>

      {/* SECTION 1: ASSIGN NEW STAFF FORM */}
      <div className="bg-card border border-foreground/5 rounded-[32px] p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-black italic uppercase tracking-tight flex items-center gap-2">
            <UserCheck className="text-primary" size={18} /> ASSIGN NEW STORE STAFF
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
            Look up an existing user account by email and set their store permissions
          </p>
        </div>

        {inlineAlert && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-start gap-3 ${
              inlineAlert.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                : inlineAlert.type === 'error'
                ? 'bg-destructive/10 border-destructive/20 text-destructive'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            }`}
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{inlineAlert.message}</p>
              {inlineAlert.type === 'warning' && (
                <p className="text-[11px] opacity-90">
                  New users must complete initial account signup on the AFRICAN BOY application or website before they can be assigned as store staff.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleAssignSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-5 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
              User Email Address
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="sm:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
              Assigned Store
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-card text-foreground font-bold">
                  {s.name} ({s.country_code})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
              Staff Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
            >
              <option value="sales_rep" className="bg-card text-foreground font-bold">Sales Rep</option>
              <option value="store_manager" className="bg-card text-foreground font-bold">Store Manager</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-primary text-primary-foreground font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  <Plus size={16} /> Assign
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: CURRENT STAFF TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tight">ACTIVE STORE STAFF MEMBERS</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
              List of all active store-scoped representatives and store managers
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or store..."
              className="w-full pl-11 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-foreground/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-foreground/5">
                  <th className="px-6 py-4">Name / Email</th>
                  <th className="px-6 py-4">Assigned Store</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Assigned Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-bold">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span>Loading staff records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-bold">
                      {searchQuery ? 'No staff matching search query.' : 'No store staff members assigned yet. Use the form above to assign store reps.'}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((st) => {
                    const formattedDate = st.created_at
                      ? new Date(st.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A';

                    return (
                      <tr key={st.id} className="hover:bg-foreground/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0">
                              {st.user_name?.charAt(0).toUpperCase() || st.user_email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="truncate">
                              <p className="font-black text-foreground text-xs truncate">
                                {st.user_name || 'Staff User'}
                              </p>
                              <p className="text-[10px] font-mono text-muted-foreground truncate">
                                {st.user_email || st.user_id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-foreground/5 rounded-full text-[10px] font-black uppercase tracking-widest text-foreground border border-foreground/10 flex items-center gap-1.5 w-fit">
                            <StoreIcon size={12} className="text-primary shrink-0" />
                            {st.store?.name || `Store #${st.store_id}`}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              st.staff_role === 'store_manager'
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-foreground/10 text-muted-foreground border-foreground/20'
                            }`}
                          >
                            {st.staff_role === 'store_manager' ? 'Store Manager' : 'Sales Rep'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                          {formattedDate}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveStaff(st.id, st.user_email)}
                            className="p-2.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl transition-all"
                            title="Remove Store Staff Assignment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
