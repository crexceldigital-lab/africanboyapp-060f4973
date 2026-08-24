import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Country, ExchangeRate } from '../types';
import { MOCK_COUNTRIES, MOCK_EXCHANGE_RATES } from '../data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { detectCountryCode } from '../lib/detectCountry';

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
  const [countries, setCountries] = useState<Country[]>(MOCK_COUNTRIES);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>(MOCK_EXCHANGE_RATES);
  const [guestCountry, setGuestCountry] = useState<Country | null>(MOCK_COUNTRIES[0]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // 1. Fetch countries and exchange_rates from DB
  useEffect(() => {
    let active = true;

    const fetchDatabaseData = async () => {
      try {
        const { data: dbCountries } = await supabase
          .from('countries')
          .select('*')
          .eq('is_active', true);

        const { data: dbRates } = await supabase
          .from('exchange_rates')
          .select('*');

        if (active) {
          if (dbCountries && dbCountries.length > 0) {
            setCountries(dbCountries as Country[]);
          }
          if (dbRates && dbRates.length > 0) {
            setExchangeRates(dbRates as ExchangeRate[]);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch countries/rates from Supabase, using mock fallback:', err);
      }
    };

    fetchDatabaseData();
    return () => { active = false; };
  }, []);

  // 2. Geolocation / Manual Persistence Logic
  useEffect(() => {
    let active = true;

    const resolveGuestCountry = async () => {
      const source = localStorage.getItem('country_source');
      const savedGuestId = localStorage.getItem('guest_country_id');

      if (source === 'manual' && savedGuestId) {
        const matched = countries.find(c => String(c.id) === savedGuestId);
        if (matched && active) setGuestCountry(matched);
        return;
      }

      // If user logged in and has explicit non-default country
      if (user && user.country_id && user.country_id !== 1) {
        localStorage.setItem('country_source', 'manual');
        const matched = countries.find(c => c.id === user.country_id);
        if (matched && active) setGuestCountry(matched);
        return;
      }

      // Auto-detect IP location if not manually set
      if (source !== 'manual') {
        const code = await detectCountryCode();
        if (code && active) {
          const matched = countries.find(c => c.code.toUpperCase() === code.toUpperCase());
          if (matched) {
            setGuestCountry(matched);
            localStorage.setItem('country_source', 'auto');
          }
        }
      }
    };

    resolveGuestCountry();
    return () => { active = false; };
  }, [countries, user]);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session) {
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
    ? (countries.find(c => c.id === user.country_id) || guestCountry || countries[0])
    : (guestCountry || countries[0] || null);

  const formatPrice = (priceInTZS: number) => {
    if (!selectedCountry) return `${priceInTZS.toLocaleString()} TZS`;
    const rate = exchangeRates.find(r => r.from_currency === 'TZS' && r.to_currency === selectedCountry.currency_code);
    const convertedPrice = rate ? priceInTZS * rate.rate : priceInTZS;
    if (selectedCountry.code === 'NG') {
      return `${selectedCountry.currency_symbol}${Math.round(convertedPrice).toLocaleString()}`;
    }
    if (selectedCountry.currency_symbol && selectedCountry.currency_symbol.length <= 3) {
      return `${selectedCountry.currency_symbol} ${Math.round(convertedPrice).toLocaleString()}`;
    }
    return `${Math.round(convertedPrice).toLocaleString()} ${selectedCountry.currency_code}`;
  };

  const updateUserCountry = (countryId: number) => {
    localStorage.setItem('country_source', 'manual');
    localStorage.setItem('guest_country_id', String(countryId));
    const matched = countries.find(c => c.id === countryId);
    if (matched) setGuestCountry(matched);

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
      
      if (signupData.user) {
        // Create own profile (allowed by row-level access rules for the signed-in user)
        await supabase.from('profiles').upsert({
          id: signupData.user.id,
          full_name: data.full_name || '',
          phone_number: data.phone_number || '',
          country_id: data.country_id || 1,
        });
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
