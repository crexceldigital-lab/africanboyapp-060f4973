import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useCountry } from '../../context/CountryContext';
import { NavTab } from '../../types';
import AdminLogin from '../../pages/AdminLogin';

interface RequireAdminProps {
  children: ReactNode;
  onNavigate?: (tab: NavTab) => void;
}

export default function RequireAdmin({ children, onNavigate }: RequireAdminProps) {
  const { user, logout, loading } = useCountry();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-primary font-bold text-[10px] tracking-widest uppercase">Verifying Privileges...</p>
        </div>
      </div>
    );
  }

  // Not authenticated at all -> Show Admin Login Portal
  if (!user) {
    return <AdminLogin />;
  }

  // Authenticated but not an admin -> Show Access Denied UI
  if (user.role !== 'admin') {
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
            <span className="text-primary text-xs font-bold tracking-widest uppercase">SECURITY BOUNDARY</span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter italic uppercase text-foreground">
              ACCESS <span className="text-destructive">DENIED</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium pt-2">
              This account does not have administrative privileges. You are not authorized to view the management suite.
            </p>
          </div>

          <div className="p-4 bg-card border border-foreground/10 rounded-2xl text-left space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CURRENT ACCOUNT</p>
            <p className="text-sm font-extrabold text-foreground truncate">{user.email || user.full_name || 'Customer'}</p>
            <p className="text-xs text-primary font-semibold capitalize">Role: {user.role || 'user'}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => onNavigate?.('home')}
              className="flex-1 py-3.5 bg-primary text-primary-foreground font-black tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> RETURN TO HOME
            </button>
            <button
              onClick={() => logout()}
              className="py-3.5 px-6 bg-card border border-foreground/10 text-foreground font-bold tracking-widest text-xs rounded-2xl hover:bg-foreground/5 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> SIGN OUT
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Authenticated and role === 'admin' -> Render Admin content
  return <>{children}</>;
}
