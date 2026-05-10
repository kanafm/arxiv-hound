/**
 * Process-wide mutex enforcing arXiv's 3-second-between-requests etiquette
 * for any host arxiv-hound talks to under arxiv.org. The delay can be
 * overridden with ARXIV_HOUND_RATE_LIMIT_MS, mainly for tests.
 *
 * @see https://info.arxiv.org/help/api/tou.html
 */

const DEFAULT_DELAY_MS = 3000;

function getMinDelayMs(): number {
  const raw = process.env.ARXIV_HOUND_RATE_LIMIT_MS;
  if (raw === undefined) return DEFAULT_DELAY_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DELAY_MS;
}

let chain: Promise<unknown> = Promise.resolve();
let lastReleased = 0;

export function withArxivRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(async () => {
    const wait = Math.max(0, lastReleased + getMinDelayMs() - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      lastReleased = Date.now();
    }
  });
  chain = next.catch(() => {});
  return next as Promise<T>;
}
