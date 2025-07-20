export class Context<T> {
  constructor(private _path: string, public value?: T, public onDestroy?: Function) {}

  toString() {
    return this._path;
  }
}

export class ContextManager {
  #store = new Map<string, Array<Context<any>>>();
  #index = -1;
  #key: string | null = null;

  setScope = (key: string) => {
    this.#key = key;
    this.#index = -1;
  };

  create = <T>(): Context<T> => {
    this.#index++;
    const key = this.#key!;

    if (!this.#store.has(key)) {
      this.#store.set(key, []);
    }

    const bucket = this.#store.get(key)!;

    if (!bucket[this.#index]) {
      bucket[this.#index] = new Context<T>(`${key} => ${this.#index}`);
    }

    return bucket[this.#index];
  };
}

export class Tracker {
  #path = new Array<number>();
  #index = 0;

  get current() {
    return this.#path.join(".");
  }

  start = () => {
    this.#path.push(this.#index);
    this.#index = 0;
  };

  stop = () => {
    this.#index = this.#path.pop() ?? 0;
    this.#index++;
  };

  reset = () => {
    this.#path = [];
    this.#index = 0;
  };
}

export class WeakIterable<T extends object> {
  #weakMap = new WeakMap<T, WeakRef<T>>();
  #set = new Set<WeakRef<T>>();
  #registry = new FinalizationRegistry<WeakRef<T>>((o) => this.#set.delete(o));

  add(value: T) {
    if (this.#weakMap.has(value)) return false;

    const ref = new WeakRef(value);
    this.#set.add(ref);
    this.#weakMap.set(value, ref);
    this.#registry.register(value, ref, ref);
    return true;
  }

  remove(value: T): boolean {
    const ref = this.#weakMap.get(value);
    if (!ref) return false;

    this.#set.delete(ref);
    this.#weakMap.delete(value);
    this.#registry.unregister(ref);
    return true;
  }

  *[Symbol.iterator](): IterableIterator<T> {
    for (const ref of this.#set) {
      const v = ref.deref();
      if (v) {
        yield v;
      } else {
        this.#set.delete(ref);
      }
    }
  }
}

class Node<T> {
  descendants = new Set<Node<T>>();
  constructor(public value: T) {}
}

export const topological_sort = <T>(references: T[][]) => {
  // 1. mapping
  const nodes = new Map<T, Node<T>>();
  references.forEach(([target, ...dependencies]) => {
    let targetNode = nodes.get(target);
    if (!targetNode) {
      targetNode = new Node(target);
      nodes.set(target, targetNode);
    }

    dependencies.forEach((dependency) => {
      let node = nodes.get(dependency);
      if (!node) {
        node = new Node(dependency);
        nodes.set(dependency, node);
      }
      targetNode.descendants.add(node);
    });
  });

  // 2. sorting
  const visited = new Set<Node<T>>();
  const sorted = new Array<Node<T>>();

  const visit = (node: Node<T>, ancestors = new Set<Node<T>>()) => {
    if (visited.has(node)) return;
    visited.add(node);

    ancestors.add(node);

    node.descendants.forEach((descendant) => {
      if (ancestors.has(descendant)) {
        throw new Error(`cyclic dependency: ${descendant.value} in ${node.value}`);
      }

      visit(descendant, new Set([...ancestors]));
    });

    // dependencies first then target change to .unshift() or use .reverse() on result
    sorted.push(node);
  };

  nodes.forEach((v) => visit(v));

  return sorted.map(({ value }) => value);
};
