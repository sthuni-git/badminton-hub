import React from "react";
import { createRoot } from "react-dom/client";
import { TournamentExplorer } from "@/components/tournament-explorer";
import { mockTournaments } from "@/lib/tournaments";
import "./globals.css";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <TournamentExplorer tournaments={mockTournaments} />
    </React.StrictMode>
  );
}

