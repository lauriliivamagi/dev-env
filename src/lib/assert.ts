/**
 * Tiger Style assertion utilities.
 * These assertions run in production - they are executable documentation
 * of program invariants, not just debugging aids.
 */

/**
 * Assert a condition is truthy. Throws if condition is falsy.
 * Use for preconditions, postconditions, and invariants.
 */
export function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Mark code paths that should never be reached.
 * If this function is called, it indicates a bug in the program logic.
 */
export function unreachable(message?: string): never {
  throw new Error(
    message ? `Unreachable: ${message}` : "Unreachable code executed",
  );
}
