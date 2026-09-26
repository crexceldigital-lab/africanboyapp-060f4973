import { useState, useEffect } from 'react';
import { Purchase, Order } from '../types';
import Login from './Login';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Crown, ShoppingBag, Edit2, Save, X, Globe, LogOut, Truck, MapPin } from 'lucide-react';
import { useCountry } from '../context/CountryContext';
import { useCart } from '../context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { castOrders } from '@/lib/supabase-helpers';
import MyInternationalOrders from '../components/MyInternationalOrders';

export default function Profile() {
  const { user, countries, formatPrice, logout, loading: countryLoading } = useCountry();
  const { deliveryZone, setDeliveryZone } = useCart();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: user?.full_name || '', email: user?.email || '', country_id: user?.country_id || 0 });

  useEffect(() => {
    const fetchUserPurchases = async () => {
      if (!user) return;
      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`)
          .order('created_at', { ascending: false });

        if (ordersData && ordersData.length > 0) {
          const casted = castOrders(ordersData);
          const mappedPurchases: Purchase[] = casted.map((o, idx) => ({
            id: idx + 1,
            user_id: 1,
            product_name: o.items?.[0]?.name || 'African Boy Product',
            amount: o.total_amount,
            currency_code: o.currency || 'TZS',
            date: o.created_at,
          }));
          setPurchases(mappedPurchases);
        } else {
          setPurchases([]);
        }
      } catch (err) {
        console.error('Error fetching user purchases:', err);
        setPurchases([]);
      }
    };
    fetchUserPurchases();
  }, [user]);

  if (countryLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </div>
  );

  if (!user) return <Login />;

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

      {/* Delivery Options */}
      <div className="bg-card rounded-[2rem] border border-foreground/5 p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Truck size={16} className="text-primary" />
          Delivery Option
        </h2>

        <div className="space-y-3">
          <button
            onClick={() => setDeliveryZone('inside_dar')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
              deliveryZone === 'inside_dar'
                ? 'border-primary bg-primary/10'
                : 'border-foreground/10 bg-foreground/5 hover:border-foreground/20'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              deliveryZone === 'inside_dar' ? 'border-primary' : 'border-muted-foreground'
            }`}>
              {deliveryZone === 'inside_dar' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <MapPin size={16} className="text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-bold">Inside Dar es Salaam</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Delivery within the city</p>
            </div>
            <span className="text-primary font-black text-sm">{formatPrice(3000)}</span>
          </button>

          <button
            onClick={() => setDeliveryZone('outside_dar')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
              deliveryZone === 'outside_dar'
                ? 'border-primary bg-primary/10'
                : 'border-foreground/10 bg-foreground/5 hover:border-foreground/20'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              deliveryZone === 'outside_dar' ? 'border-primary' : 'border-muted-foreground'
            }`}>
              {deliveryZone === 'outside_dar' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <MapPin size={16} className="text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-bold">Outside Dar / Other Regions</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Delivery to other regions in Tanzania</p>
            </div>
            <span className="text-primary font-black text-sm">{formatPrice(10000)}</span>
          </button>
        </div>
      </div>

      <MyOrders userId={user.id} email={user.email} />

      <MyInternationalOrders userId={user.id} />

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
