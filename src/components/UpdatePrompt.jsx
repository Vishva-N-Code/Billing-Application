import { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Listen for update events dispatched from main.jsx
    const handleUpdateAvailable = (e) => {
      setUpdateSW(() => e.detail.updateSW);
      setShowPrompt(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('pwa-update-available', handleUpdateAvailable);
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    if (updateSW) {
      await updateSW(true); // skip waiting and reload
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="update-prompt-overlay">
      <div className={`update-prompt-card ${showPrompt ? 'update-prompt-enter' : ''}`}>
        <div className="update-prompt-icon">🚀</div>
        <div className="update-prompt-content">
          <div className="update-prompt-title">Update Available!</div>
          <div className="update-prompt-desc">
            New improvements are ready — version {APP_VERSION}
          </div>
        </div>
        <div className="update-prompt-actions">
          <button
            className="update-btn-later"
            onClick={handleDismiss}
            disabled={isUpdating}
          >
            Later
          </button>
          <button
            className="update-btn-now"
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <span className="update-spinner" />
            ) : (
              'Update Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
