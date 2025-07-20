//https://dev.to/devcorner/the-complete-typescript-type-checking-guide-one-stop-solution-for-all-type-checking-techniques-3fm4

export const isArray = Array.isArray;
export const isDom = (value: unknown) => value instanceof Element || value instanceof HTMLDocument;
export const isFunction = (value: unknown): value is Function => value instanceof Function;
export const isIndex = (value: any) => value > 0 && Number.isInteger(value);
export const isObject = (value: unknown) => value !== null && typeof value === "object";
export const isPlainObject = (value: unknown) => Object.getPrototypeOf(value ?? true) === Object.prototype;
export const isPrimitive = (value: unknown) => value !== Object(value);
export const isString = (value: unknown): value is string => typeof value === "string" || value instanceof String;
export const isSymbol = (value: unknown): value is symbol => typeof value === "symbol";
export const hasOwn = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);

export const executeOnce = (fn: () => void, ms = 0) => {
  let _timeout = 0;
  return () => {
    if (_timeout) return;
    _timeout = setTimeout(() => {
      _timeout = 0;
      fn();
    }, ms);
  };
};
