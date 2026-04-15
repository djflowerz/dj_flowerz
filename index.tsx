import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error catcher — surfaces silent JS crashes that would blank the page
window.onerror = (msg, src, line, col, err) => {
  const el = document.getElementById('root');
  if (el && !el.children.length) {
    el.innerHTML = `<div style="color:red;font-family:monospace;padding:20px;background:#111;min-height:100vh">
      <h2 style="color:#ff4444">⚠️ App Crash</h2>
      <pre>${msg}</pre>
      <pre>${src}:${line}:${col}</pre>
      <pre>${err?.stack || ''}</pre>
    </div>`;
  }
};
window.onunhandledrejection = (e) => {
  console.error('[Unhandled Promise Rejection]', e.reason);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service Worker Registered', reg.scope))
      .catch(err => console.error('[PWA] Service Worker Failed', err));
  });
}
