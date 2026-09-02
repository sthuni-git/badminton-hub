import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { TournamentExplorer } from '@/components/tournament-explorer';
import { mockTournaments } from '@/lib/tournaments';
import './globals.css';

export function mountBadmintonHub() {
  const container = document.getElementById('root');
  if (!container) return;

  const appElement = (
    <React.StrictMode>
      <TournamentExplorer tournaments={mockTournaments} />
    </React.StrictMode>
  );

  try {
    if (container.hasChildNodes()) {
      hydrateRoot(container, appElement);
    } else {
      const root = createRoot(container);
      root.render(appElement);
    }
  } catch (err) {
    console.warn('Hydration fallback to createRoot:', err);
    const root = createRoot(container);
    root.render(appElement);
  }
}

if (typeof window !== 'undefined') {
  (window as any).__mountApp = mountBadmintonHub;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountBadmintonHub);
  } else {
    mountBadmintonHub();
  }
}

export default mountBadmintonHub;

