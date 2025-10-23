/* promise-based delay utility that pauses execution for a specified duration
 * returns a promise that resolves after the specified milliseconds
 * useful for async operations, animations, and controlling execution timing
 * defaults to 0ms if no duration is provided, allowing immediate next-tick execution */
const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

export default wait;
