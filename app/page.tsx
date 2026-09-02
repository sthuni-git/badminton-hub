import { TournamentExplorer } from '@/components/tournament-explorer';
import { mockTournaments } from '@/lib/tournaments';

export default function Home() {
  return <TournamentExplorer tournaments={mockTournaments} />;
}
