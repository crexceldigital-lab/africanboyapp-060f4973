import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromAny } from '@/lib/supabase-helpers';
import { Store, StoreStaff } from '../../types';
import {
  UserCheck,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  RefreshCw,
  Edit2,
  CheckCircle2,
  X,
  User,
  MapPin,
  Briefcase,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

interface EnrichedStaff extends StoreStaff {
  user_email?: string;
  user_name?: string;
  created_at?: string;
  store?: Store;
}

interface UserSearchResult {
  user_id: string;
  email: string;
  full_name: string | null;
}

export default function StaffManager() {
  const [staffList, setStaffList] = useState<EnrichedStaff[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // User Search & Selection State
  const [userQuery, setUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  // Form State
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<'sales_rep' | 'store_manager'>('sales_rep');
  const [inlineAlert, setInlineAlert] = useState<{ type: 'error' | 'warning' | 'success'; message: string } | null>(null);

  // Edit Modal State
  const [editingStaff, setEditingStaff] = useState<EnrichedStaff | null>(null);
  const [editStoreId, setEditStoreId] = useState<number>(1);
  const [editRole, setEditRole] = useState<'sales_rep' | 'store_manager'>('sales_rep');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [updatingStaff, setUpdatingStaff] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const searchBoxRef = useRef<HTMLDivElement>(null);

  // 1. Fetch stores dynamically from database
  const fetchStores = async () => {
    setStoresLoading(true);
    try {
      const { data: dbStores, error } = await fromAny('stores').select('*').order('id');
      if (error) {
        console.error('Error fetching stores:', error);
        toast.error('Failed to load stores from database');
      } else if (dbStores && dbStores.length > 0) {
        const castedStores = dbStores as unknown as Store[];
        setStores(castedStores);
        setSelectedStoreId((prev) => (prev !== null ? prev : castedStores[0].id));
      } else {
        setStores([]);
      }
    } catch (err) {
      console.error('Error in fetchStores:', err);
    } finally {
      setStoresLoading(false);
    }
  };

  // 2. Fetch active store staff and resolve user emails/names
  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const { data: dbStaff, error: staffErr } = await fromAny('store_staff')
        .select('*, store:stores(*)');

      if (staffErr) {
        console.error('Error fetching store_staff:', staffErr);
        toast.error('Failed to load store staff list');
        setLoading(false);
        return;
      }

      if (!dbStaff || dbStaff.length === 0) {
        setStaffList([]);
        setLoading(false);
        return;
      }

      // Resolve user details via lookup-user-by-email Edge Function
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
          setLoading(false);
          return;
        }
      }

      // Fallback if Edge function returned empty
      setStaffList(dbStaff.map((s: any) => ({ ...s, user_email: s.user_id })));
    } catch (err) {
      console.error('Error in fetchStaffData:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchStaffData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live registered user search (debounced)
  useEffect(() => {
    if (selectedUser) return; // Skip searching if a user is already selected

    const timer = setTimeout(async () => {
      const q = userQuery.trim();
      setIsSearchingUsers(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setIsSearchingUsers(false);
          return;
        }

        const res = await supabase.functions.invoke('lookup-user-by-email', {
          body: { query: q },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.users) {
          setSearchResults(res.data.users);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('User search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userQuery, selectedUser]);

  // Handle assigning new staff
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineAlert(null);

    if (!selectedUser) {
      setInlineAlert({
        type: 'error',
        message: 'Please search and select an existing registered user account first.',
      });
      return;
    }

    if (!selectedStoreId) {
      setInlineAlert({
        type: 'error',
        message: 'No store selected. Please select a valid store location.',
      });
      return;
    }

    // Check duplicate assignment (same user + store + role)
    const existingDuplicate = staffList.find(
      (s) => s.user_id === selectedUser.user_id && s.store_id === selectedStoreId && s.staff_role === selectedRole
    );

    if (existingDuplicate) {
      const storeObj = stores.find((st) => st.id === selectedStoreId);
      const storeName = storeObj ? storeObj.country || storeObj.name : `Store #${selectedStoreId}`;
      const roleTitle = selectedRole === 'store_manager' ? 'Store Manager' : 'Sales Representative';

      setInlineAlert({
        type: 'warning',
        message: `This staff member (${selectedUser.email}) is already assigned to ${storeName} as ${roleTitle}.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertErr } = await fromAny('store_staff').insert({
        user_id: selectedUser.user_id,
        store_id: selectedStoreId,
        staff_role: selectedRole,
        status: 'active',
      });

      if (insertErr) {
        // Catch duplicate constraint error (user already assigned to this store)
        if (
          insertErr.code === '23505' ||
          insertErr.message?.includes('duplicate key') ||
          insertErr.message?.includes('unique constraint')
        ) {
          const updateConfirm = confirm(
            `This user is already assigned to this store. Would you like to update their role to "${
              selectedRole === 'sales_rep' ? 'Sales Representative' : 'Store Manager'
            }"?`
          );

          if (updateConfirm) {
            const { error: updateErr } = await fromAny('store_staff')
              .update({ staff_role: selectedRole, status: 'active' })
              .eq('user_id', selectedUser.user_id)
              .eq('store_id', selectedStoreId);

            if (updateErr) {
              toast.error(`Failed to update role: ${updateErr.message}`);
            } else {
              toast.success(`Updated staff role for ${selectedUser.email}!`);
              setSelectedUser(null);
              setUserQuery('');
              setInlineAlert(null);
              fetchStaffData();
            }
          }
        } else {
          toast.error(`Failed to assign staff: ${insertErr.message}`);
          setInlineAlert({ type: 'error', message: insertErr.message });
        }
      } else {
        toast.success(
          `Successfully assigned ${selectedUser.full_name || selectedUser.email} as ${
            selectedRole === 'sales_rep' ? 'Sales Rep' : 'Store Manager'
          }!`
        );
        setSelectedUser(null);
        setUserQuery('');
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

  // Open edit modal
  const handleOpenEdit = (staff: EnrichedStaff) => {
    setEditingStaff(staff);
    setEditStoreId(staff.store_id);
    setEditRole((staff.staff_role as any) || 'sales_rep');
    setEditStatus(staff.status || 'active');
  };

  // Save edited assignment
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setUpdatingStaff(true);
    try {
      const { error } = await fromAny('store_staff')
        .update({
          store_id: editStoreId,
          staff_role: editRole,
          status: editStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingStaff.id);

      if (error) {
        toast.error(`Failed to update staff assignment: ${error.message}`);
      } else {
        toast.success(`Staff assignment updated successfully for ${editingStaff.user_email}!`);
        setEditingStaff(null);
        fetchStaffData();
      }
    } catch (err) {
      console.error('Error updating staff:', err);
      toast.error('Failed to update staff assignment.');
    } finally {
      setUpdatingStaff(false);
    }
  };

  // Remove / Deactivate staff assignment
  const handleRemoveStaff = async (id: string, staffEmail?: string) => {
    const isConfirmed = confirm(
      `Are you sure you want to remove the store staff assignment for ${staffEmail || 'this user'}?\n\nIMPORTANT: The user's authentication account will remain intact. Only the store assignment relationship (User ↔ Store ↔ Role) will be removed.`
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

  // Helper for country flags
  const getCountryFlag = (countryCode?: string, countryName?: string) => {
    if (countryCode === 'TZ' || countryName?.toLowerCase() === 'tanzania') return '🇹🇿';
    if (countryCode === 'NG' || countryName?.toLowerCase() === 'nigeria') return '🇳🇬';
    if (countryCode === 'KE' || countryName?.toLowerCase() === 'kenya') return '🇰🇪';
    if (countryCode === 'UG' || countryName?.toLowerCase() === 'uganda') return '🇺🇬';
    return '🌍';
  };

  // Filter staff list based on filters & search query
  const filteredStaff = staffList.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      (s.user_email && s.user_email.toLowerCase().includes(query)) ||
      (s.user_name && s.user_name.toLowerCase().includes(query)) ||
      (s.store?.name && s.store.name.toLowerCase().includes(query)) ||
      (s.store?.country && s.store.country.toLowerCase().includes(query)) ||
      (s.staff_role && s.staff_role.toLowerCase().includes(query));

    const matchesStore = storeFilter === 'all' || String(s.store_id) === storeFilter;
    const matchesRole = roleFilter === 'all' || s.staff_role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (s.status || 'active') === statusFilter;

    return matchesSearch && matchesStore && matchesRole && matchesStatus;
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
            Assign existing user accounts to Tanzania, Nigeria, and regional store operations
          </p>
        </div>
        <button
          onClick={() => {
            fetchStores();
            fetchStaffData();
          }}
          disabled={loading || storesLoading}
          className="px-4 py-2.5 bg-card border border-foreground/10 hover:border-primary text-foreground rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw size={14} className={loading || storesLoading ? 'animate-spin text-primary' : ''} /> Refresh
        </button>
      </div>

      {/* SECTION 1: ASSIGN NEW STAFF FORM */}
      <div className="bg-card border border-foreground/5 rounded-[32px] p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-black italic uppercase tracking-tight flex items-center gap-2">
            <UserCheck className="text-primary" size={18} /> ASSIGN NEW STORE STAFF
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
            Search for an existing registered user account and assign them to a country store location
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
                  User accounts must exist before assignment. Ask staff members to register on the website or mobile app first.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleAssignSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            {/* Field 1: User Search & Selection Combobox */}
            <div className="sm:col-span-6 space-y-2 relative" ref={searchBoxRef}>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                Select Staff Member (Search Existing Users)
              </label>

              {selectedUser ? (
                /* Selected User Card */
                <div className="flex items-center justify-between p-3.5 bg-primary/10 border border-primary/30 rounded-2xl">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-xs shrink-0">
                      {selectedUser.full_name?.charAt(0).toUpperCase() || selectedUser.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="font-black text-foreground text-xs truncate">
                        {selectedUser.full_name || 'Registered Staff Member'}
                      </p>
                      <p className="text-[10px] font-mono text-primary font-bold truncate">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserQuery('');
                      setShowDropdown(true);
                    }}
                    className="p-1.5 hover:bg-primary/20 text-primary rounded-xl transition-all text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1"
                  >
                    <X size={14} /> Change
                  </button>
                </div>
              ) : (
                /* Search Input Box */
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    value={userQuery}
                    onFocus={() => setShowDropdown(true)}
                    onChange={(e) => {
                      setUserQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    placeholder="Type email or name to search registered users..."
                    className="w-full pl-11 pr-10 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
                  />
                  {isSearchingUsers && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  )}

                  {/* Dropdown Suggestions */}
                  {showDropdown && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-card border border-foreground/10 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-foreground/5">
                      {isSearchingUsers ? (
                        <div className="p-4 text-center text-xs text-muted-foreground font-bold flex items-center justify-center gap-2">
                          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          Searching existing registered users...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground font-bold">
                          {userQuery.trim() ? (
                            <p>No existing user found matching &quot;{userQuery}&quot;.</p>
                          ) : (
                            <p>Start typing an email address or name to search existing users.</p>
                          )}
                        </div>
                      ) : (
                        searchResults.map((usr) => (
                          <button
                            key={usr.user_id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(usr);
                              setShowDropdown(false);
                              setInlineAlert(null);
                            }}
                            className="w-full p-3.5 text-left hover:bg-primary/10 transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className="w-7 h-7 rounded-full bg-foreground/10 group-hover:bg-primary group-hover:text-primary-foreground text-foreground flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                                {usr.full_name?.charAt(0).toUpperCase() || usr.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <p className="font-black text-foreground text-xs truncate">
                                  {usr.full_name || 'Registered User'}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">{usr.email}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              Select →
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Field 2: Assigned Store Dropdown */}
            <div className="sm:col-span-3 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                Assigned Store
              </label>
              {storesLoading ? (
                <div className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Loading stores...
                </div>
              ) : stores.length === 0 ? (
                <div className="w-full px-5 py-3.5 bg-destructive/10 border border-destructive/20 rounded-2xl text-[11px] font-bold text-destructive">
                  No stores available. Create a store first.
                </div>
              ) : (
                <select
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                  className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id} className="bg-card text-foreground font-bold">
                      {getCountryFlag(s.country_code, s.country)} {s.country || s.name} ({s.country_code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Field 3: Staff Role Dropdown */}
            <div className="sm:col-span-3 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                Staff Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
              >
                <option value="sales_rep" className="bg-card text-foreground font-bold">
                  Sales Rep
                </option>
                <option value="store_manager" className="bg-card text-foreground font-bold">
                  Store Manager
                </option>
              </select>
            </div>
          </div>

          {/* Submit Button Bar */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting || !selectedUser || stores.length === 0}
              className="px-8 py-3.5 bg-primary text-primary-foreground font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  <Plus size={16} /> Assign Staff Member
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: ACTIVE STAFF TABLE & FILTERS */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tight">ACTIVE STORE STAFF MEMBERS</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
              List of store representatives and managers assigned across Tanzania & Nigeria
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Filter by Store */}
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-card border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
            >
              <option value="all">All Stores / Countries</option>
              {stores.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {getCountryFlag(s.country_code, s.country)} {s.country || s.name}
                </option>
              ))}
            </select>

            {/* Filter by Role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-card border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
            >
              <option value="all">All Roles</option>
              <option value="sales_rep">Sales Rep</option>
              <option value="store_manager">Store Manager</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-card border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff..."
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-foreground/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-foreground/5">
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">Assigned Store</th>
                  <th className="px-6 py-4">Country</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-bold">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span>Loading staff records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-bold">
                      {searchQuery || storeFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'No staff members match the selected filters.'
                        : 'No store staff members assigned yet. Use the form above to assign store reps.'}
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

                    const countryName = st.store?.country || (st.store?.country_code === 'TZ' ? 'Tanzania' : st.store?.country_code === 'NG' ? 'Nigeria' : 'Global');
                    const flag = getCountryFlag(st.store?.country_code, countryName);

                    return (
                      <tr key={st.id} className="hover:bg-foreground/[0.02] transition-colors">
                        {/* Column 1: Staff Member */}
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

                        {/* Column 2: Assigned Store */}
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-foreground/5 rounded-full text-[10px] font-black uppercase tracking-widest text-foreground border border-foreground/10 flex items-center gap-1.5 w-fit">
                            <span>{flag}</span>
                            <span>{st.store?.name || `Store #${st.store_id}`}</span>
                          </span>
                        </td>

                        {/* Column 3: Country */}
                        <td className="px-6 py-4 font-bold text-xs text-foreground">
                          {countryName}
                        </td>

                        {/* Column 4: Role */}
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

                        {/* Column 5: Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                              st.status === 'inactive'
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}
                          >
                            {st.status || 'Active'}
                          </span>
                        </td>

                        {/* Column 6: Assigned Date */}
                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                          {formattedDate}
                        </td>

                        {/* Column 7: Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(st)}
                              className="p-2 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-xl transition-all"
                              title="Edit Staff Assignment"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleRemoveStaff(st.id, st.user_email)}
                              className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl transition-all"
                              title="Remove Store Staff Assignment"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
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

      {/* EDIT STAFF ASSIGNMENT MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-foreground/10 rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
                  <Edit2 className="text-primary" size={18} /> EDIT STAFF ASSIGNMENT
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                  Update store location or role for {editingStaff.user_email}
                </p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* User Readonly Details */}
              <div className="p-3.5 bg-background/50 border border-foreground/10 rounded-2xl space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Staff Account</p>
                <p className="font-black text-foreground text-xs">{editingStaff.user_name || 'Staff Member'}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{editingStaff.user_email}</p>
              </div>

              {/* Store Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Assigned Store
                </label>
                <select
                  value={editStoreId}
                  onChange={(e) => setEditStoreId(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id} className="bg-card text-foreground font-bold">
                      {getCountryFlag(s.country_code, s.country)} {s.country || s.name} ({s.country_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Staff Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-4 py-3 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
                >
                  <option value="sales_rep" className="bg-card text-foreground font-bold">
                    Sales Rep
                  </option>
                  <option value="store_manager" className="bg-card text-foreground font-bold">
                    Store Manager
                  </option>
                </select>
              </div>

              {/* Status Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Assignment Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none transition-all"
                >
                  <option value="active" className="bg-card text-foreground font-bold">
                    Active
                  </option>
                  <option value="inactive" className="bg-card text-foreground font-bold">
                    Inactive
                  </option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-5 py-2.5 bg-foreground/5 hover:bg-foreground/10 text-muted-foreground rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStaff}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center gap-2"
                >
                  {updatingStaff ? (
                    <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
