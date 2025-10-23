import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import wait from '../../helpers/wait';

describe('wait', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('resolves after specified delay', async () => {
    let resolved = false;
    const promise = wait(200).then(() => {
      resolved = true;
    });

    vi.advanceTimersByTime(199);
    await Promise.resolve();
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(1);
    await promise;
    expect(resolved).toBe(true);
  });

  it('defaults to zero delay', async () => {
    const promise = wait();
    vi.runAllTimers();
    await expect(promise).resolves.toBeUndefined();
  });
});
