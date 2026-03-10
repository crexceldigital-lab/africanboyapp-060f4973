import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Country, ExchangeRate } from '../types';
import { MOCK_USER, MOCK_COUNTRIES, MOCK_EXCHANGE_RATES } from '../data/mockData';

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

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
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
    }
  };

  const refreshUser = () => {
    // No-op in mock mode
  };

  const ADMIN_EMAIL = 'africanboy.admin@gmail.com';
  const ADMIN_PASSWORD = 'Africanboyadminrevoltek';

  const login = async (identifier: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!identifier || !password) return false;

    const isAdmin = identifier.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
    const role = isAdmin ? 'admin' : 'user';

    setUser({
      ...MOCK_USER,
      email: identifier.includes('@') ? identifier : MOCK_USER.email,
      phone_number: !identifier.includes('@') ? identifier : MOCK_USER.phone_number,
      role,
    });
    return true;
  };

  const signup = async (data: any) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const country = countries.find(c => c.id === data.country_id) || countries[0];
    setUser({
      ...MOCK_USER,
      full_name: data.full_name || 'New User',
      email: data.email || '',
      phone_number: data.phone_number || '',
      role: 'user',
      country_id: country.id,
      country_name: country.name,
      country_code: country.code,
      currency_code: country.currency_code,
      currency_symbol: country.currency_symbol,
    });
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <CountryContext.Provider value={{
      user,
      countries,
      exchangeRates,
      selectedCountry,
      loading,
      error,
      formatPrice,
      updateUserCountry,
      refreshUser,
      login,
      signup,
      logout
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
