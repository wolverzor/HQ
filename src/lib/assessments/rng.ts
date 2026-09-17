// Thin wrappers around impure browser APIs, kept outside any component/hook body
// so the React Compiler's purity checks don't flag call sites in game logic.
export function now(): number {
  return performance.now();
}

export function rand(): number {
  return Math.random();
}
