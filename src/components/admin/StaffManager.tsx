import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Store, StoreStaff } from '../../types';
import { UserCheck, Plus, Trash2, Search, UserX, Shield, Store as StoreIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
}

export default function StaffManager() {
  const [staffList, setStaffList] = useState<(StoreStaff & { profile?: Profile; store?: Store })[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<'sales_rep' | 'store_manager'>('sales_rep');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch stores
      const { data: dbStores } = await supabase.from('stores').select('*').order('id');
      if (dbStores) setStores(dbStores as Store[]);

      // 2. Fetch staff assignments
      const { data: dbStaff } = await supabase.from('store_staff').select('*, store:stores(*)');
      
      // 3. Fetch profiles to match user_id with email
      const { data: dbProfiles } = await supabase.from('profiles').select('id, full_name, email, phone_number');
      if (dbProfiles) setProfiles(dbProfiles as Profile[]);

      if (dbStaff && dbProfiles) {
        const profileMap = new Map(dbProfiles.map(p => [p.id, p]));
        const enriched = dbStaff.map(s => ({
          ...s,
          profile: profileMap.get(s.user_id),
        }));
        setStaffList(enriched as any);
      }
    } catch (err) {
      console.error('Error fetching staff manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserEmail) {
      toast.error('Please enter or select a user email');
      return;
    }

    const matchedProfile = profiles.find(p => p.email?.toLowerCase() === selectedUserEmail.toLowerCase().trim());
    if (!matchedProfile) {
      toast.error(`No user profile found matching email "${selectedUserEmail}"`);
      return;
    }

    const { error } = await supabase
      .from('store_staff')
      .upsert({
        user_id: matchedProfile.id,
        store_id: selectedStoreId,
        staff_role: selectedRole,
      }, { onConflict: 'user_id,store_id' });

    if (error) {
      toast.error(`Failed to assign staff: ${error.message}`);
    } else {
      toast.success(`Assigned ${matchedProfile.email} to store!`);
      setIsModalOpen(false);
      setSelectedUserEmail('');
      fetchData();
    }
  };

  const handleRemoveStaff = async (id: string, email?: string) => {
    if (!confirm(`Are you sure you want to remove store staff assignment for ${email || 'this staff member'}?`)) return;

    const { error } = await supabase.from('store_staff').delete().eq('id', id);
    if (error) {
      toast.error('Failed to remove staff assignment');
    } else {
      toast.success('Staff assignment removed');
      fetchData();
    }
  };

  const filteredStaff = staffList.filter(s =>
    (s.profile?.email && s.profile.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.profile?.full_name && s.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.store?.name && s.store.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tight">STORE <span className="text-primary">STAFF ASSIGNMENTS</span></h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Manage store-scoped sales reps & managers</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-md"
        >
          <Plus size={16} /> ASSIGN STORE STAFF
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search staff by email, name, or store..."
            className="w-full pl-11 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-foreground/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-foreground/5">
                <th className="px-6 py-4">Staff User</th>
                <th className="px-6 py-4">Assigned Store</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground font-bold">Loading staff assignments...</td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground font-bold">No staff assignments configured. Click "Assign Store Staff" above to add one.</td>
                </tr>
              ) : (
                filteredStaff.map(st => (
                  <tr key={st.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {st.profile?.full_name?.charAt(0) || st.profile?.email?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{st.profile?.full_name || 'Staff User'}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{st.profile?.email || st.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-foreground/5 rounded-full text-[10px] font-black uppercase tracking-widest text-foreground border border-foreground/10 flex items-center gap-1.5 w-fit">
                        <StoreIcon size={12} className="text-primary" /> {st.store?.name || `Store #${st.store_id}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {st.staff_role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveStaff(st.id, st.profile?.email || undefined)}
                        className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl transition-colors"
                        title="Remove Staff Assignment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form for Assigning Staff */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-card border border-foreground/10 rounded-[32px] p-8 shadow-2xl space-y-6 z-10">
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tight">Assign Store Staff</h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Grant store-scoped permissions to an existing user account</p>
            </div>

            <form onSubmit={handleAssignStaff} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">User Email Address</label>
                <input
                  type="email"
                  required
                  value={selectedUserEmail}
                  onChange={e => setSelectedUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Assign Store</label>
                <select
                  value={selectedStoreId}
                  onChange={e => setSelectedStoreId(Number(e.target.value))}
                  className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id} className="bg-card text-foreground font-bold">
                      {s.name} ({s.country_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Staff Role</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as any)}
                  className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-xs font-bold focus:border-primary outline-none"
                >
                  <option value="sales_rep" className="bg-card text-foreground font-bold">Sales Representative</option>
                  <option value="store_manager" className="bg-card text-foreground font-bold">Store Manager</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-foreground/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-foreground/5 hover:bg-foreground/10 rounded-2xl text-xs font-bold uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary text-primary-foreground font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
