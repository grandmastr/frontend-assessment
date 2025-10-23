/*
* unit test for the wait helper testing:
* - promise resolution after specified delay
* - default delay behavior when no argument provided
**/

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import wait from '../../helpers/wait';

describe('wait', () => {
  // setup fake timers before each test to control time progression
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // cleanup timers after each test
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // verifies that the promise resolves only after the specified delay has elapsed
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

  // verifies that wait() with no arguments defaults to zero milliseconds delay
  it('defaults to zero delay', async () => {
    const promise = wait();
    vi.runAllTimers();
    await expect(promise).resolves.toBeUndefined();
  });
});
