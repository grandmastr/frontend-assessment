/*
 * This is a custom debounce function that allows you to specify the this context and arguments.
 */

export const debounce = <This, Args>(
  func: (this: This, ...args: Args[]) => void,
  ms: number
) => {
  let timer: number | null = null;

  return function (this: This, ...args: Args[]) {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, ms);
  };
};
