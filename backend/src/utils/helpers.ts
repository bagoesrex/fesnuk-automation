export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomDelay = (minMs: number, maxMs: number): Promise<void> =>
  delay(randomInt(minMs, maxMs));
