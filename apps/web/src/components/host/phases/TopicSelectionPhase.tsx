import type { Player, Article } from "@nofus/shared";
import ArticleMonitor from "../components/ArticleMonitor";

interface TopicSelectionPhaseProps {
  players: Record<string, Player>;
  selectedArticles: Record<string, Article[]>;
  researchRoundIndex: number;
}

export default function TopicSelectionPhase({
  players,
  selectedArticles,
  researchRoundIndex
}: TopicSelectionPhaseProps) {
  return (
    <div className="bg-gray-800 text-white rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">
        Players Choosing Articles (Round {researchRoundIndex + 1}/3)
      </h3>
      <ArticleMonitor
        players={players}
        selectedArticles={selectedArticles}
        expectedCount={researchRoundIndex + 1}
      />
    </div>
  );
}
