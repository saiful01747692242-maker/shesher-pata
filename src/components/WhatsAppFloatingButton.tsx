'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useData } from '../context/DataContext';
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

        {/* Lightweight inline WhatsApp-style mark; avoids downloading a 150 KB PNG */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="w-8 h-8 sm:w-9 sm:h-9 transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20.1 11.8a8.1 8.1 0 0 1-12 7.1L4 20l1.1-4A8.1 8.1 0 1 1 20.1 11.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4-.1.6l-.5.6c-.2.2-.2.4 0 .6.5.9 1.2 1.6 2.1 2.1.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5 0 .4-.2 1.1-.7 1.5-.5.5-1.2.7-2 .5-1-.2-2.3-.8-3.6-2-1.1-1-1.9-2.3-2.1-3.2-.2-.8.1-1.5.5-2Z"
            fill="currentColor"
          />
        </svg>
      </a>
    </div>
  );
};
