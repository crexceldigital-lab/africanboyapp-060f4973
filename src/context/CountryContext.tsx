import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Country, ExchangeRate } from '../types';
import { MOCK_COUNTRIES, MOCK_EXCHANGE_RATES } from '../data/mockData';
import { supabase } from '@/integrations/supabase/client';

interface CountryContextType {
  user: User | null;
  countries: Country[];
  exchangeRates: ExchangeRate[];
  selectedCountry: Country | null;
  loading: boolean;
  error: string | null;
  formatPrice: (priceInTZS: number) => string;
  updateUserCountry: (countryId: number) => void;
  refreshUser: () => void;
  login: (identifier: string, password: string) => Promise<boolean>;
  signup: (data: any) => Promise<boolean>;
  logout: () => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [countries] = useState<Country[]>(MOCK_COUNTRIES);
  const [exchangeRates] = useState<ExchangeRate[]>(MOCK_EXCHANGE_RATES);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  const buildUserFromSession = async (session: any): Promise<User | null> => {
    if (!session?.user) return null;
    const authUser = session.user;

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // Fetch roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authUser.id);

    const isAdmin = roles?.some((r: any) => r.role === 'admin') || false;
    const country = countries.find(c => c.id === (profile?.country_id || 1)) || countries[0];

    return {
      id: authUser.id,
      email: authUser.email || '',
      phone_number: profile?.phone_number || '',
      full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
      role: isAdmin ? 'admin' : 'user',
      vip_tier: profile?.vip_tier || 'None',
      country_id: profile?.country_id || 1,
      country_name: country?.name,
      country_code: country?.code,
      currency_code: country?.currency_code,
      currency_symbol: country?.currency_symbol,
    };
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth listener FIRST (best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(async () => {
          if (!mounted) return;
          try {
            const u = await buildUserFromSession(session);
            if (mounted) setUser(u);
          } catch (e) {
            console.error('Auth state build error:', e);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        try {
          const u = await buildUserFromSession(session);
          if (mounted) setUser(u);
        } catch (e) {
          console.error('Session build error:', e);
        }
      }
      if (mounted) setLoading(false);
    }).catch((e) => {
      console.error('getSession error:', e);
      if (mounted) setLoading(false);
    });

    // Safety timeout - never hang more than 5 seconds
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const selectedCountry = user && countries.length > 0
    ? (countries.find(c => c.id === user.country_id) || countries[0])
    : (countries[0] || null);

  const formatPrice = (priceInTZS: number) => {
    if (!selectedCountry) return `${priceInTZS.toLocaleString()} TZS`;
    const rate = exchangeRates.find(r => r.from_currency === 'TZS' && r.to_currency === selectedCountry.currency_code);
    const convertedPrice = rate ? priceInTZS * rate.rate : priceInTZS;
    if (selectedCountry.code === 'NG') {
      return `${selectedCountry.currency_symbol}${Math.round(convertedPrice).toLocaleString()}`;
    }
    return `${Math.round(convertedPrice).toLocaleString()} ${selectedCountry.currency_code}`;
  };

  const updateUserCountry = (countryId: number) => {
    if (user) {
      setUser({ ...user, country_id: countryId });
      supabase.from('profiles').update({ country_id: countryId }).eq('id', user.id);
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const u = await buildUserFromSession(session);
      setUser(u);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
      if (error) {
        console.error('Login error:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (data: any) => {
    try {
      const { data: signupData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.full_name || '' },
        },
      });
      if (error) {
        console.error('Signup error:', error.message);
        return false;
      }
      
      // Setup profile and roles via security definer function
      if (signupData.user) {
        await supabase.rpc('handle_new_user_setup', {
          p_user_id: signupData.user.id,
          p_email: data.email,
          p_full_name: data.full_name || '',
        });

        // Update profile with extra fields
        if (data.phone_number || data.country_id) {
          await supabase.from('profiles').update({
            phone_number: data.phone_number || '',
            country_id: data.country_id || 1,
          }).eq('id', signupData.user.id);
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <CountryContext.Provider value={{
      user, countries, exchangeRates, selectedCountry, loading, error,
      formatPrice, updateUserCountry, refreshUser, login, signup, logout
    }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
}
