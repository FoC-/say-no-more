const isString = (value: unknown) => typeof value === "string" || value instanceof String;
const isDom = (value: unknown) => value instanceof Element || value instanceof HTMLDocument;

let assertsCount = 0;
let expectationsCount = 0;

const assertEqual = (actual: any, expected: any) => {
  expectationsCount++;
  if (!isDom(actual) && !isDom(expected)) {
    actual = isString(actual) ? actual : JSON.stringify(actual);
    expected = isString(expected) ? expected : JSON.stringify(expected);
  }

  if (actual !== expected) throw `Should BE equal:\nactual: ${actual}\nexpected: ${expected}`;
};
const assertNotEqual = (actual: any, expected: any) => {
  expectationsCount++;
  if (!isDom(actual) && !isDom(expected)) {
    actual = isString(actual) ? actual : JSON.stringify(actual);
    expected = isString(expected) ? expected : JSON.stringify(expected);
  }

  if (actual === expected) throw `Should NOT BE equal:\nactual: ${actual}\nexpected: ${expected}`;
};
const assertRange = (actual: number, start: number, end: number) => {
  expectationsCount++;
  if (!(actual >= start && actual < end)) throw `Should be in range [${start}, ${end}):\nactual: ${actual}.`;
};
export const assert = (actual: any, unexpected: any = null) => {
  if (unexpected) throw new Error("Unexpected second parameter!");

  assertsCount++;
  return {
    equal: (expected: any) => assertEqual(actual, expected),
    not_equal: (expected: any) => assertNotEqual(actual, expected),
    range: (start: number, end: number) => assertRange(actual, start, end),
  };
};
export const allAssertsHasExpectations = () => assertsCount === expectationsCount;

export const delay = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

const interceptorSymbol = Symbol();
export const intercept = <T extends object, K extends keyof T>(proto: T, name: K, hook?: T[K]) => {
  const original = proto[name];
  if (original[interceptorSymbol]) {
    return original[interceptorSymbol];
  }

  let counts = new Map();
  proto[name] = function (...args) {
    const count = counts.get(this) || 0;
    counts.set(this, count + 1);
    return hook ? hook(original, this, args) : original.apply(this, args);
  };

  const config = { counts, reset: () => (proto[name] = original), get: (k) => counts.get(k) };
  proto[name][interceptorSymbol] = config;
  return config;
};
