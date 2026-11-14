'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useData } from '../context/DataContext';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl, WHATSAPP_CONFIG } from '../config/whatsapp';

export const WhatsAppFloatingButton: React.FC = () => {
  const pathname = usePathname();
  const { siteSettings } = useData();
  const [isHovered, setIsHovered] = useState(false);

  // Exclude from admin dashboard routes
  if (pathname && (pathname.startsWith('/seshadmin') || pathname.startsWith('/admin'))) {
    return null;
  }

  // Use phone number from site settings (Supabase) if available, or fall back to centralized config
  const activePhoneNumber = siteSettings?.whatsapp_number || WHATSAPP_CONFIG.phoneNumber;
  const whatsappUrl = buildWhatsAppUrl(activePhoneNumber, WHATSAPP_CONFIG.defaultMessage);

  return (
    <div
      className="fixed z-40 right-4 sm:right-6 bottom-20 lg:bottom-6 flex items-center gap-2 pointer-events-auto select-none print:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Desktop Tooltip */}
      <div
        className={`hidden md:flex items-center bg-zinc-900/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-xs border border-zinc-700/50 transition-all duration-300 pointer-events-none ${
          isHovered
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-2'
        }`}
      >
        <span>{WHATSAPP_CONFIG.tooltipText}</span>
      </div>

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={WHATSAPP_CONFIG.label}
        title={WHATSAPP_CONFIG.label}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white shadow-[0_6px_24px_rgba(37,211,102,0.45)] hover:shadow-[0_10px_32px_rgba(37,211,102,0.65)] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 cursor-pointer"
      >
        {/* Subtle breathing ripple aura */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none" />

        <MessageCircle
          aria-hidden="true"
          className="w-8 h-8 sm:w-9 sm:h-9 transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
          strokeWidth={2.4}
        />
      </a>
    </div>
  );
};
