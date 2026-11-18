'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { initTikTokPixel, trackTikTokPageView } from '../utils/tiktokPixel';

function TikTokRouteTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    initTikTokPixel();
  }, []);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackTikTokPageView();
  }, [pathname]);

  return null;
}

export function TikTokPixelTracker() {
  return (
    <Suspense fallback={null}>
      <TikTokRouteTracker />
    </Suspense>
  );
}
