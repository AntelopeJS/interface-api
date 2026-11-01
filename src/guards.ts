import type { LegacyController } from "./route-registry";

/**
 * Whether a value is a string.
 *
 * @param value Value to test
 * @returns True when the value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Whether a property key is a symbol.
 *
 * @param key Property key to test
 * @returns True when the key is a symbol
 */
export function isSymbol(key: PropertyKey): key is symbol {
  return typeof key === "symbol";
}

/**
 * Whether a value is an object (a function is not one here).
 *
 * @param value Value to test
 * @returns True when the value is a non-null object
 */
export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/**
 * Whether a value is a constructor with an object `prototype`: what a handler
 * registered the 0.2 way needs from its `proto.constructor`.
 *
 * @param value Value to test
 * @returns True when the value is a {@link LegacyController}
 */
export function isLegacyController(value: unknown): value is LegacyController {
  return (
    typeof value === "function" &&
    "prototype" in value &&
    isObject(value.prototype)
  );
}
