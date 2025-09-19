/**
 * Assertion utilities for strict null checks and invariants.
 *
 * Use these to keep functions focused and avoid deep nesting by failing fast
 * when required preconditions are not met.
 */

/**
 * Asserts that a value is present (not null/undefined).
 * Throws an Error with the provided message if the value is absent.
 */
export function assertPresent<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value == null) {
    throw new Error(message);
  }
}

/**
 * Asserts that a condition holds true. If not, throws an Error with the message.
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
