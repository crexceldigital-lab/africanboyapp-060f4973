import { useState } from 'react';
import { Purchase } from '../types';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Crown, ShoppingBag, Edit2, Save, X, Globe, LogOut, ChevronDown } from 'lucide-react';
import { useCountry } from '../context/CountryContext';
import { MOCK_PURCHASES } from '../data/mockData';

export default function Profile() {
  const { user, countries, refreshUser, formatPrice, logout, loading: countryLoading } = useCountry();
  const [purchases] = useState<Purchase[]>(MOCK_PURCHASES);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: user?.full_name || '', email: user?.email || '', country_id: user?.country_id || 0 });

  if (countryLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="pb-24 pt-20 px-6 max-w-2xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary mx-auto flex items-center justify-center"
        >
          <UserIcon size={40} className="text-primary" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tight">{user.full_name}</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center justify-center gap-2 mt-1">
            <Crown size={14} className="text-primary" /> {user.vip_tier} Member
          </p>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-card rounded-[2rem] border border-foreground/5 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-widest">Profile Details</h2>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1"
          >
            {isEditing ? <><X size={14} /> Cancel</> : <><Edit2 size={14} /> Edit</>}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-xl">
            <UserIcon size={16} className="text-muted-foreground" />
            {isEditing ? (
              <input
                value={editForm.full_name}
                onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                className="flex-1 bg-transparent text-sm font-bold outline-none"
              />
            ) : (
              <span className="text-sm font-bold">{user.full_name}</span>
            )}
          </div>
          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-xl">
            <Mail size={16} className="text-muted-foreground" />
            {isEditing ? (
              <input
                value={editForm.email}
                onChange={e => setEditForm({...editForm, email: e.target.value})}
                className="flex-1 bg-transparent text-sm font-bold outline-none"
              />
            ) : (
              <span className="text-sm font-bold">{user.email}</span>
            )}
          </div>
          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-xl">
            <Globe size={16} className="text-muted-foreground" />
            {isEditing ? (
              <select
                value={editForm.country_id}
                onChange={e => setEditForm({...editForm, country_id: Number(e.target.value)})}
                className="flex-1 bg-transparent text-sm font-bold outline-none appearance-none"
              >
                {countries.map(c => <option key={c.id} value={c.id}>{c.flag_emoji} {c.name}</option>)}
              </select>
            ) : (
              <span className="text-sm font-bold">{user.country_name || 'Tanzania'}</span>
            )}
          </div>
        </div>

        {isEditing && (
          <button
            onClick={() => setIsEditing(false)}
            className="w-full py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
          >
            <Save size={16} /> Save Changes
          </button>
        )}
      </div>

      {/* Order History */}
      <div className="bg-card rounded-[2rem] border border-foreground/5 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <ShoppingBag size={16} className="text-primary" />
            Order History
          </h2>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{purchases.length} ORDERS</span>
        </div>
        
        <div className="space-y-4">
          {purchases.length > 0 ? (
            purchases.map((purchase, idx) => (
              <motion.div 
                key={purchase.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="bg-foreground/5 rounded-2xl p-5 flex justify-between items-center hover:bg-card transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{purchase.product_name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      {new Date(purchase.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-primary font-black text-lg">{formatPrice(purchase.amount)}</div>
                  <div className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-1 bg-emerald-500/10 px-2 py-1 rounded-md inline-block border border-emerald-500/20">COMPLETED</div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 bg-foreground/5 rounded-[2rem] border border-dashed border-foreground/10">
              <ShoppingBag size={48} className="mx-auto text-secondary mb-4" />
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">No purchases yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="pt-8 border-t border-foreground/5">
        <button 
          onClick={logout}
          className="w-full py-4 rounded-2xl border border-destructive/20 text-destructive font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-destructive/10 transition-all"
        >
          <LogOut size={16} /> SIGN OUT OF ACCOUNT
        </button>
      </div>
    </div>
  );
}
