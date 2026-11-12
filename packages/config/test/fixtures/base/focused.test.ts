declare const it: { only: (name: string, run: () => void) => void };

it.only('runs alone', () => {});

export const first = [1, 2][0]!;
