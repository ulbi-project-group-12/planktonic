let currentGeneration = 0;

export function bumpSessionGeneration(): void {
  currentGeneration += 1;
}

export function getSessionGeneration(): number {
  return currentGeneration;
}
