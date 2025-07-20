import { isFunction, isPlainObject } from "./utils";
import { ConnectableWatcher, isState, Scope, State } from "./scope";

const refs = new WeakMap(); //testing
export const getWatchers = (target: object) => {
  // horrible horrible horrible
  const binders = refs.get(target);
  return binders?.size ? [...binders] : [];
};

export type Primitive = string | number | boolean | null;
export type PropertyValue = State<EventListener | Primitive> | EventListener | Primitive;
export type ChildValue =
  | ChildValue[]
  | State<Primitive | undefined>
  | (() => Node | Primitive)
  | Node
  | Primitive
  | undefined;

export class NodeBinder extends ConnectableWatcher<unknown> {
  #node?: ChildNode;

  get isConnected(): boolean {
    return !!this.#node?.isConnected;
  }

  constructor(element: ParentNode, state: State<unknown>) {
    super(state);

    this.#node = this.#buildNode();
    element.append(this.#node); // not connected yet
  }

  disconnect() {
    // this is changing here, thus instanceof result also changed
    !this.isConnected && super.disconnect();
  }

  update() {
    const newNode = this.#buildNode();
    if (newNode) {
      if (newNode === this.#node) return;

      this.#node?.replaceWith(newNode); // dom
      this.#node = newNode; // ref
    } else {
      this.#node?.remove(); // dom
      this.#node = undefined; // ref
    }
  }

  #buildNode(): ChildNode {
    const value = this.state.value;
    if ((value ?? document).nodeType) {
      value && (refs.has(value) ? refs.get(value).add(this) : refs.set(value, new Set([this])));
      return value;
    } else {
      const text = new Text(value);
      refs.set(text, new Set([this]));
      return text;
    }
  }
}

export class HandlerBinder extends ConnectableWatcher<EventListener> {
  get isConnected(): boolean {
    return !!this._element?.isConnected; // todo dispose this
  }

  constructor(private _element: ParentNode, private event: string, state: State<EventListener>) {
    super(state);

    this.state.value && _element.addEventListener(this.event, this.state.value); // not connected yet
  }

  disconnect() {
    // this is changing here, thus instanceof result also changed
    if (this.isConnected) return;
    super.disconnect();
    this._element = undefined;
  }

  update() {
    this.state.oldValue && this._element?.removeEventListener(this.event, this.state.oldValue);
    this.state.value && this._element?.addEventListener(this.event, this.state.value);
  }
}

export class PropertyBinder extends ConnectableWatcher<Primitive> {
  get isConnected(): boolean {
    return !!this.element?.isConnected; // todo dispose this
  }

  constructor(private element: ParentNode, private setter: (s: string) => void, state: State<Primitive>) {
    super(state);
    this.update();
  }

  disconnect() {
    // this is changing here, thus instanceof result also changed
    if (this.isConnected) return;
    super.disconnect();
    this._element = undefined;
  }

  update() {
    this.setter(this.state.value as string);
  }
}

const settersCache = {} as Record<string, (s: string) => void>;
const boundSetter = (element: Element, attribute: string) => {
  const cacheKey = `${element.tagName}=>${attribute}`;

  if (!settersCache[cacheKey]) {
    for (let proto = Object.getPrototypeOf(element); !!proto; proto = Object.getPrototypeOf(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, attribute);
      if (descriptor?.set) {
        settersCache[cacheKey] = descriptor.set;
        break;
      }
    }
  }

  if (!settersCache[cacheKey]) {
    settersCache[cacheKey] = function (value: string) {
      (this as unknown as Element).setAttribute(attribute, value);
    };
  }

  return settersCache[cacheKey].bind(element);
};

const elementFactory = (scope: Scope, name: string, children: ChildValue[]) => {
  const element = document.createElement(name);
  refs.set(element, new Set());

  if (isPlainObject(children[0])) {
    for (let [attribute, value] of Object.entries(children.shift() as unknown as Record<string, PropertyValue>)) {
      if (attribute.startsWith("on")) {
        const event = attribute.slice(2);
        if (isFunction(value)) {
          element.addEventListener(event, value);
        } else if (isState<EventListener>(value)) {
          new HandlerBinder(element, event, value);
        }
      } else {
        if (isFunction(value)) {
          value = scope.watch(value);
        }
        const setter = boundSetter(element, attribute);
        if (isState<Function>(value)) {
          new PropertyBinder(element, setter, value);
        } else {
          setter(value);
        }
      }
    }
  }

  for (let child of children.flat(Infinity)) {
    if (isFunction(child)) {
      child = scope.watch(child);
    }
    if (isState<unknown>(child)) {
      new NodeBinder(element, child);
    } else if (child != undefined) {
      element.append(child);
    }
  }

  return element;
};

export type ElementFactory<T> = (
  properties?: (Partial<{ [K in keyof T]: PropertyValue }> & Record<string, PropertyValue>) | ChildValue,
  ...children: ChildValue[]
) => T;

export const tags = (scope: Scope): { [K in keyof HTMLElementTagNameMap]: ElementFactory<HTMLElementTagNameMap[K]> } =>
  new Proxy({} as any, {
    get:
      (_, name: string) =>
      (...children: ChildValue[]) =>
        elementFactory(scope, name, children),
  });
