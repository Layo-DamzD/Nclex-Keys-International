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

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl.replace(/\/+$/, '');
}

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
