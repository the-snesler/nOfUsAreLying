import type { Player, Article } from "@nofus/shared";
import PlayerGrid from "../../shared/PlayerGrid";
import HostPlayerCard from "./HostPlayerCard";

interface ArticleMonitorProps {
  players: Record<string, Player>;
  selectedArticles: Record<string, Article[]>;
  expectedCount: number;
}

export default function ArticleMonitor({
  players,
  selectedArticles,
  expectedCount
}: ArticleMonitorProps) {
  return (
    <PlayerGrid>
      {Object.values(players).map((player) => {
        const playerArticles = selectedArticles[player.id] || [];
        const hasSubmitted = playerArticles.length >= expectedCount;

        return (
          <HostPlayerCard
            key={player.id}
            player={player}
            status={hasSubmitted ? 'ready' : 'waiting'}
          />
        );
      })}
    </PlayerGrid>
  );
}
