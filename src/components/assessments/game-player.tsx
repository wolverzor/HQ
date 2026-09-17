"use client";

import { useGameProgress } from "@/hooks/use-game-progress";
import type { GameId } from "@/lib/assessments/catalog";
import { KeypressGame } from "@/components/assessments/games/keypress-game";
import { DigitsMemoryGame } from "@/components/assessments/games/digits-memory-game";
import { FacesGame } from "@/components/assessments/games/faces-game";
import { BalloonGame } from "@/components/assessments/games/balloon-game";
import { TowerGame } from "@/components/assessments/games/tower-game";
import { MoneyExchange1Game } from "@/components/assessments/games/money-exchange-1-game";
import { MoneyExchange2Game } from "@/components/assessments/games/money-exchange-2-game";
import { HardOrEasyGame } from "@/components/assessments/games/hard-or-easy-game";
import { StopGame } from "@/components/assessments/games/stop-game";
import { ArrowsGame } from "@/components/assessments/games/arrows-game";
import { LengthsGame } from "@/components/assessments/games/lengths-game";
import { CardsGame } from "@/components/assessments/games/cards-game";

const GAME_COMPONENTS: Record<GameId, React.ComponentType<{ onComplete: (result: import("@/hooks/use-game-progress").GameResult) => void }>> = {
  keypress: KeypressGame,
  "digits-memory": DigitsMemoryGame,
  faces: FacesGame,
  balloon: BalloonGame,
  tower: TowerGame,
  "money-exchange-1": MoneyExchange1Game,
  "money-exchange-2": MoneyExchange2Game,
  "hard-or-easy": HardOrEasyGame,
  stop: StopGame,
  arrows: ArrowsGame,
  lengths: LengthsGame,
  cards: CardsGame,
};

export function GamePlayer({ gameId }: { gameId: GameId }) {
  const { recordResult } = useGameProgress();
  const GameComponent = GAME_COMPONENTS[gameId];

  return <GameComponent onComplete={(result) => recordResult(gameId, result)} />;
}
