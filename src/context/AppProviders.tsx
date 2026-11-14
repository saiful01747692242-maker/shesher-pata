'use client';

import React, { ReactNode } from 'react';
import { ToastProvider } from './ToastContext';
import { DataProvider } from './DataContext';
import { WishlistProvider } from './WishlistContext';
import { CartProvider } from './CartContext';
import { LanguageProvider } from './LanguageContext';
import { AuthProvider } from './AuthContext';
import { MetaPixelTracker } from '../components/MetaPixelTracker';
import type { SiteSettings } from '../types';

export const AppProviders: React.FC<{ children: ReactNode; initialSettings?: SiteSettings | null }> = ({ children, initialSettings }) => {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider initialSettings={initialSettings}>
            <WishlistProvider>
              <CartProvider>
                <MetaPixelTracker />
                {children}
              </CartProvider>
            </WishlistProvider>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
};
