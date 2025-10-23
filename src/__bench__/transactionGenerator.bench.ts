import { bench, beforeAll, afterAll, expect, vi } from 'vitest';
/**
 * Benchmark: transactionGenerator (100k)
 * What it measures: end-to-end generation in the Web Worker (seed + batched messages)
 * from init to final "done" without main-thread work. Uses vitest bench (tinybench)
 * and stubs self.postMessage + mocks wait() to 0 for deterministic runs.
 *
 * How to run:
 *   - yarn bench:transactions100k
 *   - or: yarn bench (runs all benches)
 *
 * Outputs: logs a single line, e.g. "Generated 100000 records in <ms> ms".
 * Use this for relative comparisons between commits to catch regressions.
 */

vi.mock('../helpers/wait', () => ({
  __esModule: true,
  default: vi.fn(() => Promise.resolve()),
}));

let handleMessage: (event: MessageEvent<unknown>) => Promise<void> | void;
let postMessage: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  vi.resetModules();

  const listeners: Array<(event: MessageEvent<unknown>) => void> = [];
  postMessage = vi.fn();

  vi.stubGlobal('self', {
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (type === 'message') {
        listeners.push(listener as (event: MessageEvent<unknown>) => void);
      }
    }),
    removeEventListener: vi.fn(),
    postMessage,
  });

  await import(new URL('../workers/transactionGenerator.worker.ts', import.meta.url).href);

  handleMessage = listeners[0] as (event: MessageEvent<unknown>) => Promise<void> | void;
});

afterAll(() => {
  vi.unstubAllGlobals();
});

bench('transaction generator: 100k records', async () => {
  const TOTAL = 100000;
  const BATCH_SIZE = 5000;


  let generated = 0;
  let resolveDone: (() => void) | null = null;
  const done = new Promise<void>(resolve => (resolveDone = resolve));

  type GeneratorOutMsg = { type: 'seed' | 'batch'; transactions?: unknown[]; done?: boolean };

  postMessage.mockImplementation((payload: unknown) => {
    const msg = payload as GeneratorOutMsg;
    if (msg?.type === 'seed') {
      generated += msg.transactions?.length ?? 0;
      console.log(msg.transactions?.length);
    }
    if (msg?.type === 'batch') {
      generated += msg.transactions?.length ?? 0;
      if (msg.done) {
        resolveDone?.();
      }
    }
  });

  const start = performance.now();

  await handleMessage(
    new MessageEvent('message', {
      data: { type: 'init', total: TOTAL, batchSize: BATCH_SIZE },
    })
  );

  await done;

  const durationMs = performance.now() - start;

  expect(generated).toBe(TOTAL);

  console.log(`Generated ${generated} records in ${durationMs.toFixed(2)} ms`);
});
