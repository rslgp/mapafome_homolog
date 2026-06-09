import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Legacy CRA-style mount shim. In the Next.js app this module is not on any
// import path (pages mount <App /> directly), so this only runs in a standalone
// CRA-style host that provides a #root node. Guard the lookup so it is a no-op
// when that node is absent instead of throwing.
const rootEl = typeof document !== 'undefined' && document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}