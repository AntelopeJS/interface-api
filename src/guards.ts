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
