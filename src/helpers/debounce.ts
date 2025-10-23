/* custom debounce function that delays function execution until after a specified wait period
 * preserves the 'this' context and arguments for the debounced function
 * cancels previous invocations if called again before the delay expires */

export const debounce = <This, Args>(
  func: (this: This, ...args: Args[]) => void,
  ms: number
) => {
  // stores the timeout ID to enable cancellation of pending executions
  let timer: ReturnType<typeof setTimeout> | null = null;

  /* returns a new function that wraps the original with debounce behavior
   * maintains the same signature and 'this' binding as the original function */
  return function (this: This, ...args: Args[]) {
    // clears any existing timer to reset the delay countdown
    if (timer) clearTimeout(timer);

    /* schedules the function to execute after the specified delay
     * uses .apply to preserve the correct 'this' context and arguments */
    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, ms);
  };
};
