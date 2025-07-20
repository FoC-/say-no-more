import { isFunction, isObject, isPlainObject, isPrimitive } from "../src/utils";
import { assert } from "./utils";

class Foo {}
const div = document.createElement("div");

const assertFn = (fn) => (value, expected) => assert(fn(value)).equal(expected);

export const is_function = async () => {
  const assertValue = assertFn(isFunction);
  assertValue(null, false);
  assertValue(null, false);
  assertValue(undefined, false);
  assertValue("", false);
  assertValue(0, false);
  assertValue(false, false);

  assertValue({}, false);
  assertValue([], false);
  assertValue(() => {}, true);
  assertValue(function () {}, true);
  assertValue(new String(""), false);
  assertValue(new Number(0), false);
  assertValue(new Date(), false);
  assertValue(new Foo(), false);
  assertValue(div, false);
};

export const is_object = async () => {
  const assertValue = assertFn(isObject);
  assertValue(null, false);
  assertValue(undefined, false);
  assertValue("", false);
  assertValue(0, false);
  assertValue(false, false);

  assertValue({}, true);
  assertValue([], true);
  assertValue(() => {}, false);
  assertValue(function () {}, false);
  assertValue(new String(""), true);
  assertValue(new Number(0), true);
  assertValue(new Date(), true);
  assertValue(new Foo(), true);
  assertValue(div, true);
};

export const is_plain_object = async () => {
  const assertValue = assertFn(isPlainObject);
  assertValue(null, false);
  assertValue(undefined, false);
  assertValue("", false);
  assertValue(0, false);
  assertValue(false, false);

  assertValue({}, true);
  assertValue([], false);
  assertValue(() => {}, false);
  assertValue(function () {}, false);
  assertValue(new String(""), false);
  assertValue(new Number(0), false);
  assertValue(new Date(), false);
  assertValue(new Foo(), false);
  assertValue(div, false);
};

export const is_primitive = async () => {
  const assertValue = assertFn(isPrimitive);
  assertValue(null, true);
  assertValue(undefined, true);
  assertValue("", true);
  assertValue(0, true);
  assertValue(false, true);

  assertValue({}, false);
  assertValue([], false);
  assertValue(() => {}, false);
  assertValue(function () {}, false);
  assertValue(new String(""), false);
  assertValue(new Number(0), false);
  assertValue(new Date(), false);
  assertValue(new Foo(), false);
  assertValue(div, false);
};
