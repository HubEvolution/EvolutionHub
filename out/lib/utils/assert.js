'use strict';
/**
 * Assertion utilities for strict null checks and invariants.
 *
 * Use these to keep functions focused and avoid deep nesting by failing fast
 * when required preconditions are not met.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.assertPresent = assertPresent;
exports.invariant = invariant;
/**
 * Asserts that a value is present (not null/undefined).
 * Throws an Error with the provided message if the value is absent.
 */
function assertPresent(value, message) {
  if (value == null) {
    throw new Error(message);
  }
}
/**
 * Asserts that a condition holds true. If not, throws an Error with the message.
 */
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
