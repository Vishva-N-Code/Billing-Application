import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker with update prompt callback.
// When a new version is deployed, onNeedRefresh fires.
// We dispatch a custom event so the UpdatePrompt component can react.
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent('pwa-update-available', {
        detail: { updateSW },
      })
    );
  },
  onOfflineReady() {
    console.log('App is ready for offline use.');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
