'use client';

import dynamic from 'next/dynamic';

// Mirror the root map page: the pets app is Leaflet-backed and touches
// window/document at import time, so it must be client-only (ssr:false).
const PetsApp = dynamic(() => import('./PetsApp'), { ssr: false });

export default function PetsPage() {
  return <PetsApp />;
}
