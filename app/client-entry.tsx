import React from 'react';
import { createRoot } from 'react-dom/client';
import { TournamentExplorer } from '@/components/tournament-explorer';
import { mockTournaments } from '@/lib/tournaments';
import './globals.css';

export function mountBadmintonHub() {
  const container = document.getElementById('root');
  if (!container) return;

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <TournamentExplorer tournaments={mockTournaments} />
    </React.StrictMode>
  );
}

if (typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;
  win.__mountApp = mountBadmintonHub;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountBadmintonHub);
  } else {
    mountBadmintonHub();
  }
}

export default mountBadmintonHub;

