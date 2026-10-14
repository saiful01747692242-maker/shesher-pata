'use client';

import React from 'react';

interface NavigationProps {
  currentNav: string;
  onNavigate: (navId: string) => void;
}

export interface NavItem {
  id: string;
  label: string;
  badge?: string;
  categoryFilter?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'মূলপাতা' },
  { id: 'books', label: 'সকল বই' },
  { id: 'novel', label: 'উপন্যাস', categoryFilter: 'উপন্যাস' },
  { id: 'thriller', label: 'থ্রিলার ও রহস্য', categoryFilter: 'থ্রিলার ও রহস্য' },
  { id: 'islamic', label: 'ইসলামিক বই', categoryFilter: 'ইসলামিক সাহিত্য' },
  { id: 'children', label: 'শিশু-কিশোর', categoryFilter: 'শিশু-কিশোর' },
  { id: 'poetry', label: 'কবিতা', categoryFilter: 'কবিতা' },
  { id: 'english', label: 'ইংরেজি ও অনুবাদ', categoryFilter: 'ইংরেজি ও অনুবাদ' },
  { id: 'package', label: 'স্পেশাল প্যাকেজ', categoryFilter: 'স্পেশাল প্যাকেজ' },
  { id: 'authors', label: 'লেখক' },
  { id: 'publishers', label: 'প্রকাশনী' },
  { id: 'offers', label: 'স্পেশাল অফার', badge: '২০% ছাড়' },
];

export const Navigation: React.FC<NavigationProps> = ({ currentNav, onNavigate }) => {
  return (
    <nav className="border-t border-[#2A2417] bg-[#18150C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ul className="flex items-center justify-start lg:justify-center gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto hide-scrollbar py-1.5 scroll-smooth">
          {NAV_ITEMS.map((item) => {
            const isActive = currentNav === item.id;

            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`px-2.5 sm:px-3 py-1 text-xs sm:text-[13px] font-semibold rounded-md transition-all cursor-pointer select-none whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#E5A913] bg-[#2A2417] font-bold shadow-xs ring-1 ring-[#E5A913]/30'
                      : 'text-zinc-200 hover:text-[#E5A913] hover:bg-[#2A2417]/50'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="bg-[#D32F2F] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

