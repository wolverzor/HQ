export type GameId =
  | "keypress"
  | "digits-memory"
  | "faces"
  | "balloon"
  | "tower"
  | "money-exchange-1"
  | "money-exchange-2"
  | "hard-or-easy"
  | "stop"
  | "arrows"
  | "lengths"
  | "cards";

export interface GameMeta {
  id: GameId;
  title: string;
  tagline: string;
  description: string;
  measures: string[];
  duration: string;
}

export const GAME_CATALOG: GameMeta[] = [
  {
    id: "keypress",
    title: "Keypress",
    tagline: "Tap as fast as you can",
    description: "Press the spacebar as rapidly as possible for 40 seconds.",
    measures: ["Processing speed", "Reaction time", "Motor consistency"],
    duration: "1-2 minutes",
  },
  {
    id: "digits-memory",
    title: "Digits Memory",
    tagline: "Remember growing number sequences",
    description: "Remember and reproduce increasingly long sequences of digits.",
    measures: ["Working memory capacity", "Information processing"],
    duration: "2-3 minutes",
  },
  {
    id: "faces",
    title: "Faces",
    tagline: "Read emotions fast",
    description: "Identify emotions shown in brief facial expressions across a series of rapid trials.",
    measures: ["Emotional intelligence", "Perceptual speed"],
    duration: "2-3 minutes",
  },
  {
    id: "balloon",
    title: "Balloon",
    tagline: "Pump, but don't pop",
    description: "Pump a balloon for rewards but stop before it bursts.",
    measures: ["Risk tolerance", "Impulsivity"],
    duration: "2-3 minutes",
  },
  {
    id: "tower",
    title: "Tower",
    tagline: "Match the target arrangement",
    description: "Rearrange colored discs across three pegs to match a target layout in as few moves as possible.",
    measures: ["Planning", "Problem-solving", "Working memory"],
    duration: "5-8 minutes",
  },
  {
    id: "money-exchange-1",
    title: "Money Exchange I",
    tagline: "Send, and see what comes back",
    description: "Decide how much of a sum to send to another player who can then return a portion.",
    measures: ["Trust", "Generosity"],
    duration: "2-3 minutes",
  },
  {
    id: "money-exchange-2",
    title: "Money Exchange II",
    tagline: "Give, take, and rate the fairness",
    description: "Across two rounds, decide how much to send, give, or take from a partner, then rate how fair each outcome felt.",
    measures: ["Fairness", "Generosity"],
    duration: "2-3 minutes",
  },
  {
    id: "hard-or-easy",
    title: "Hard or Easy Task",
    tagline: "Pick your reward tradeoff",
    description: "Choose between a hard task with a bigger reward or an easy task with a smaller reward across repeated rounds.",
    measures: ["Effort allocation", "Risk vs. reward"],
    duration: "2-3 minutes",
  },
  {
    id: "stop",
    title: "Stop",
    tagline: "Go, unless the signal says otherwise",
    description: "Press a key on red circles, but hold still when you see green.",
    measures: ["Impulse control", "Inhibition"],
    duration: "2-3 minutes",
  },
  {
    id: "arrows",
    title: "Arrows",
    tagline: "Ignore the noise around it",
    description: "Match or ignore an arrow's direction based on its color.",
    measures: ["Attention control", "Cognitive inhibition"],
    duration: "2-3 minutes",
  },
  {
    id: "lengths",
    title: "Lengths",
    tagline: "Which line is longer?",
    description: "Judge which of two lines is longer across many rapid trials.",
    measures: ["Perceptual accuracy", "Consistency"],
    duration: "1-2 minutes",
  },
  {
    id: "cards",
    title: "Cards",
    tagline: "Learn which decks pay off",
    description: "Draw cards from four decks with hidden reward and penalty patterns.",
    measures: ["Learning from feedback", "Decision-making under uncertainty"],
    duration: "4-5 minutes",
  },
];

export function getGameMeta(id: string): GameMeta | undefined {
  return GAME_CATALOG.find((g) => g.id === id);
}
