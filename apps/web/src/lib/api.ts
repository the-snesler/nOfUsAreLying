import { PlayerViewState } from "@nofus/shared";
import { MachineSnapshot } from "xstate";
import { gameMachine } from "../machines/gameMachine";
import { useMachine } from "@xstate/react";

const API_BASE = "/api/v1";

export interface CreateRoomResponse {
  roomCode: string;
  hostToken: string;
}

export async function createRoom(): Promise<CreateRoomResponse> {
  const response = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to create room");
  }

  return response.json();
}

export function getWebSocketUrl(
  roomCode: string,
  params: Record<string, string>
): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const queryString = new URLSearchParams(params).toString();
  return `${protocol}//${host}${API_BASE}/rooms/${roomCode}/ws?${queryString}`;
}

export function machineStateToPlayerViewState(
  state: ReturnType<typeof useMachine<typeof gameMachine>>[0],
  playerId: string
): PlayerViewState {
  // writing and selecting
  const isFirstHalf =
    state.matches("writing") || state.matches("topicSelection");
  // guessing, presenting, voting, reveal
  const isSecondHalf =
    state.matches("guessing") ||
    state.matches("presenting") ||
    state.matches("voting") ||
    state.matches("reveal");
  let response = {
    roomCode: state.context.roomCode,
    phase: state.value.toString() as any,
    playerId: playerId,
    timer: state.context.timer,
    players: state.context.players,
  };
  if (isFirstHalf) {
    const currentRound = state.context.currentRoundIndex;
    return {
      ...response,
      articleOptions: state.context.articleOptions[playerId] || [],
      currentArticle:
        state.context.selectedArticles[playerId][currentRound] || null,
    };
  }
  if (isSecondHalf) {
    const currentRound = state.context.rounds[state.context.currentRoundIndex];
    return {
      ...response,
      answers: Object.entries(currentRound.lies).map(([id, text]) => ({
        id,
        text,
      })),
      hasSubmitted: currentRound.votes[playerId] !== undefined,
      hasVoted: currentRound.votes[playerId] !== undefined,
    };
  }
  return response;
}
