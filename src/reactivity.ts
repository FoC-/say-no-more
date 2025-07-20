import { isFunction, isArray, isObject, hasOwn } from "./utils";
import { isState, Scope } from "./scope";

const unreactiveSymbol = Symbol();
export const unreactive = (target: object) => ((target[unreactiveSymbol] = true), target);

const notificationSymbol = Symbol();
export const isProxy = (target: object) => (target ? hasOwn(target, notificationSymbol) : false);

const rawSymbol = Symbol();
export const raw = (target: unknown) => {
  const fake = target?.[rawSymbol];
  if (!fake) return target;

  return new Proxy(fake, {
    get(target: object, key: PropertyKey, receiver?: unknown) {
      return isState(target[key]) ? raw(target[key].rawValue) : Reflect.get(target, key, receiver);
    },
  });
};


// todo move it to scope
export const reactive = (scope: Scope) => (target: any) => {
  if (!isObject(target) || isState(target) || isFunction(target) || target[unreactiveSymbol] || target[rawSymbol]) {
    return target;
  }

  const fake = isArray(target) ? [] : { __proto__: Object.getPrototypeOf(target) };
  fake[notificationSymbol] = scope.state(0);

  for (let [k, v] of Object.entries(target)) {
    fake[k] = scope.state(reactive(scope)(v));
  }

  return new Proxy(fake, {
    get(target: object, propertyKey: PropertyKey, receiver?: unknown) {
      if (propertyKey === rawSymbol) {
        return target;
      }

      if (hasOwn(target, propertyKey)) {
        if (isArray(target) && propertyKey === "length") {
          target[notificationSymbol].value;
          return target.length;
        }
        return target[propertyKey].value;
      }

      return Reflect.get(target, propertyKey, receiver);
    },

    set(target: object, propertyKey: PropertyKey, value: any, receiver?: unknown): boolean {
      if (hasOwn(target, propertyKey)) {
        if (isArray(target) && propertyKey === "length") {
          if (value !== target.length) {
            target[notificationSymbol].value++;
            target.length = value;
          }
        } else {
          target[propertyKey].value = reactive(scope)(value);
        }
        return true;
      } else if (propertyKey in target) {
        // something in prototype
        return Reflect.set(target, propertyKey, value, receiver);
      } else if (Reflect.set(target, propertyKey, scope.state(reactive(scope)(value)))) {
        target[notificationSymbol].value++;
        return true;
      }

      return false;
    },

    deleteProperty(target: object, propertyKey: PropertyKey): boolean {
      if (!Reflect.deleteProperty(target, propertyKey)) return false;
      target[notificationSymbol].value++;
      return true;
    },

    ownKeys(target: object): (string | symbol)[] {
      target[notificationSymbol].value;
      return Reflect.ownKeys(target);
    },
  });
};
