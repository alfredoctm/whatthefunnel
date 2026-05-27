import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

// Tailwind CSS is built separately to dist/index.css and loaded by index.html.
// Don't import it here — esbuild would re-emit it as dist/main.css.

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
