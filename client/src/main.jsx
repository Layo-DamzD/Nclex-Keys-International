import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'aos/dist/aos.css';
import AOS from 'aos';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';
import { registerAppServiceWorker } from './services/appServiceWorker';
import { initPwaInstallTracking } from './services/pwaInstall';

// Set axios defaults - use relative paths for API calls
// The Vercel rewrites will proxy these to the backend
// Only use VITE_API_BASE_URL for development/local testing
const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
if (apiBaseUrl && import.meta.env.DEV) {
  // Only use explicit API URL in development mode
  axios.defaults.baseURL = apiBaseUrl.replace(/\/+$/, '');
}
// In production, use relative paths so Vercel rewrites work

AOS.init({
  duration: 1000,
  once: true,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerAppServiceWorker();
initPwaInstallTracking();
