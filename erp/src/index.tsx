import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';

const CHUNK_RELOAD_KEY = 'morantehub:last-vite-chunk-reload';
// Evita um ciclo de recarga se o chunk também estiver ausente na nova implantação.
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

window.addEventListener('vite:preloadError', (event) => {
  try {
    const now = Date.now();
    const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY));
    if (lastReload && now - lastReload < CHUNK_RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    return;
  }

  event.preventDefault();
  window.location.reload();
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
