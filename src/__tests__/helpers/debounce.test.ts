import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../../helpers/debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('delays invocation', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('first');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('cancels previous call when invoked again', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('first');
    vi.advanceTimersByTime(150);
    debounced('second');
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('preserves context', () => {
    const spy = vi.fn();
    const context = { value: 1, run(this: { value: number }, arg: number) { spy(this.value, arg); } };
    const debounced = debounce(context.run, 100).bind(context);

    debounced(5);
    vi.advanceTimersByTime(100);

    expect(spy).toHaveBeenCalledWith(1, 5);
  });
});
