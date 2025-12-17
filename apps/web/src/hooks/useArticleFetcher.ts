import { useEffect } from "react";
import type { Player, Article } from "@nofus/shared";
import { fetchArticlesForPlayer } from "../lib/wikipedia";

/**
 * Hook to automatically fetch Wikipedia articles for players who need them
 * Only active when isActive is true (typically during topicSelection phase)
 */
export function useArticleFetcher(
  players: Record<string, Player>,
  articleOptions: Record<string, Article[]>,
  isActive: boolean,
  onArticlesFetched: (playerId: string, articles: Article[]) => void
): void {
  useEffect(() => {
    if (isActive) {
      // Fetch articles for all players who don't have them yet
      const playersNeedingArticles = Object.keys(players).filter(
        (playerId) => !articleOptions[playerId]
      );

      for (const playerId of playersNeedingArticles) {
        fetchArticlesForPlayer(6)
          .then((articles) => {
            onArticlesFetched(playerId, articles);
          })
          .catch((error) => {
            console.error(`Failed to fetch articles for ${playerId}:`, error);
          });
      }
    }
  }, [isActive, players, articleOptions, onArticlesFetched]);
}
