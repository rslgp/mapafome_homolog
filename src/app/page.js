'use client';

import dynamic from 'next/dynamic';

// Dynamically import your old CRA App to disable SSR
const OldApp = dynamic(() => import('./components/compatibility/App'), { ssr: false });

export default function Page() {
  return <OldApp />;
}
