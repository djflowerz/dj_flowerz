
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Currency = 'KES' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
  convert: (amount: number, from: Currency, to: Currency) => number;
  rates: { KES_TO_USD: number; USD_TO_KES: number };
}

const KES_TO_USD = 0.0075; // Approx rate
const USD_TO_KES = 133.33;

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('preferred_currency') as Currency) || 'KES';
  });

  useEffect(() => {
    localStorage.setItem('preferred_currency', currency);
  }, [currency]);

  const formatPrice = (amount: number) => {
    if (currency === 'KES') {
      return `KES ${amount.toLocaleString()}`;
    } else {
      const usdAmount = amount * KES_TO_USD;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(usdAmount);
    }
  };

  const convert = (amount: number, from: Currency, to: Currency) => {
    if (from === to) return amount;
    if (from === 'KES' && to === 'USD') return amount * KES_TO_USD;
    if (from === 'USD' && to === 'KES') return amount * USD_TO_KES;
    return amount;
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatPrice, 
      convert,
      rates: { KES_TO_USD, USD_TO_KES }
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
