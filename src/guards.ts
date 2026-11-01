import type { ControllerClass } from "./controller";

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
 * Whether a value is a controller class: a constructor that carries the
 * `location` string and the `extend` method {@link Controller} gives it.
 *
 * @param value Value to test
 * @returns True when the value is a controller class
 */
export function isControllerClass(value: unknown): value is ControllerClass {
  return (
    typeof value === "function" &&
    "prototype" in value &&
    isObject(value.prototype) &&
    "location" in value &&
    isString(value.location) &&
    "extend" in value &&
    typeof value.extend === "function"
  );
}
