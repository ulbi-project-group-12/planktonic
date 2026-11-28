let currentGeneration = 0;

export function bumpSessionGeneration(): number {
  currentGeneration += 1;
  return currentGeneration;
}

export function getSessionGeneration(): number {
  return currentGeneration;
}
