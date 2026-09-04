import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useCountry } from '../../context/CountryContext';
import { NavTab, StoreStaff, Store } from '../../types';
import AdminLogin from '../../pages/AdminLogin';
import StaffDashboard from '../../pages/StaffDashboard';
import { supabase } from '@/integrations/supabase/client';
import { fromAny } from '@/lib/supabase-helpers';

interface RequireAdminProps {
  children: ReactNode;
  onNavigate?: (tab: NavTab) => void;
}

export default function RequireAdmin({ children, onNavigate }: RequireAdminProps) {
  const { user, loading } = useCountry();
  const [staffAssignment, setStaffAssignment] = useState<(StoreStaff & { store?: Store }) | null>(null);
  const [checkingStaff, setCheckingStaff] = useState(true);

  useEffect(() => {
    let active = true;

    const checkStaffRole = async () => {
      if (!user || user.role === 'admin') {
        if (active) setCheckingStaff(false);
        return;
      }

      try {
        const { data: staff } = await fromAny('store_staff')
          .select('*, store:stores(*)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (active) {
          if (staff) {
            setStaffAssignment(staff as any);
          } else {
            setStaffAssignment(null);
          }
          setCheckingStaff(false);
        }
      } catch (err) {
        console.error('Error checking staff role:', err);
        if (active) setCheckingStaff(false);
      }
    };

    checkStaffRole();
    return () => { active = false; };
  }, [user]);

  if (loading || checkingStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-primary font-bold text-[10px] tracking-widest uppercase">Initializing Portal Security...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  if (user.role !== 'admin') {
    if (staffAssignment) {
      return <StaffDashboard staffAssignment={staffAssignment} onNavigateHome={() => onNavigate?.('home')} />;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-6 text-center"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <ShieldAlert className="text-destructive w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter italic uppercase text-foreground">
              ACCESS <span className="text-destructive">DENIED</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium pt-1">
              Your account does not have admin or staff permissions.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate?.('home')}
              className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> RETURN TO HOME
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
