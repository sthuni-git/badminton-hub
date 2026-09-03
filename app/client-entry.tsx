if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.process = w.process || { env: { NODE_ENV: 'production' } };
  w.global = w.global || window;
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import { TournamentExplorer } from '@/components/tournament-explorer';
import { mockTournaments } from '@/lib/tournaments';
import './globals.css';

let isMounted = false;

export function mountBadmintonHub() {
  if (isMounted) return;
  const container = document.getElementById('root');
  if (!container) return;

  isMounted = true;
  // 기존 정적 SSG 마크업을 초기화하고 완전한 인터랙티브 React 앱으로 클린 마운트
  container.innerHTML = '';
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <TournamentExplorer tournaments={mockTournaments} />
    </React.StrictMode>
  );
  console.log('🏸 배드민턴 허브 인터랙티브 엔진 활성화 완료 (대회 수:', mockTournaments.length, '건)');
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

