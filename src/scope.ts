import { executeOnce } from "./utils";

export class State<T> {
  #oldValue: T;
  #watchers = new Set<Watcher>();

  constructor(
    private readonly _handleGet: (s: State<T>) => void,
    private readonly _handleSet: (s: State<T>) => void,
    public rawValue: T
  ) {
    this.#oldValue = rawValue;
  }

  get oldValue(): T {
    this._handleGet(this);
    return this.#oldValue;
  }

  get value() {
    this._handleGet(this);
    return this.rawValue;
  }

  set value(newValue) {
    this.rawValue = newValue;
    this._handleSet(this);
  }

  get shouldUpdate() {
    return !Object.is(this.#oldValue, this.rawValue) && this.#watchers.size;
  }

  get watchers() {
    return [...this.#watchers];
  }

  watch(watcher: Watcher) {
    this.#watchers.add(watcher);
  }

  unwatch(watcher: Watcher) {
    this.#watchers.delete(watcher);
  }

  fix() {
    this.#oldValue = this.rawValue;
  }
}

export const isState = <T>(value: unknown): value is State<T> => value instanceof State;

class Dependencies {
  #getters = new Set<State<any>>();
  #setters = new Set<State<any>>();
  #descendant = new Set<Watcher>();

  addGet<T>(state: State<T>) {
    this.#getters.add(state);
    return this;
  }

  addSet<T>(state: State<T>) {
    this.#setters.add(state);
    return this;
  }

  addDescendant(watcher: Watcher) {
    this.#descendant.add(watcher);
    return this;
  }

  get descendants() {
    return this.#descendant;
  }

  get all() {
    return [...this.#getters.union(this.#setters)];
  }

  gettersWithoutSetters() {
    return this.#getters.difference(this.#setters);
  }
}

export class Watcher {
  #dependencies = new Set<State<unknown>>();
  #watchers = new Set<Watcher>(); // todo instead of descendants go with ancestoR or both...

  constructor(public cb: () => void) {}

  disconnect() {
    this.#dependencies.forEach((s) => s.unwatch(this));
    this.#watchers.forEach((w) => w.disconnect());
  }

  updateDependencies(dependencies: Dependencies) {
    const pending = dependencies.gettersWithoutSetters();
    this.#dependencies.forEach((s) => !pending.has(s) && s.unwatch(this));
    pending.forEach((s) => !this.#dependencies.has(s) && s.watch(this));
    this.#dependencies = pending;

    this.#watchers.forEach((w) => !dependencies.descendants.has(w) && w.disconnect());
    this.#watchers = dependencies.descendants;
  }
}

export abstract class ConnectableWatcher<T> extends Watcher {
  abstract get isConnected(): boolean;

  constructor(protected state: State<T>) {
    super(() => this.isConnected && this.update());
    this.updateDependencies(new Dependencies().addGet(state));
  }

  abstract update(): void;
}

export class Scope {
  // !!!IMPORTANT!!! leave methods as arrow functions to make destructure possible

  #dependencies = new Array<Dependencies>();
  #backlog = new Set<State<any>>();
  #collects = new Array<Array<State<unknown>>>();
  #delayedUpdate: () => void;
  #enqueueCollect = executeOnce(() => this.#collect(), 1000);

  constructor(strategy = executeOnce) {
    this.#delayedUpdate = strategy(() => this.#update());
  }

  state = <T>(value: T) => {
    if (isState<T>(value)) return value;

    return new State<T>(
      (s) => this.#handleGet(s),
      (s) => this.#handleSet(s),
      value
    );
  };

  watch = <T>(cb: (value?: T) => T | undefined) => {
    const value = this.state<T | undefined>(undefined);
    const watcher = new Watcher(() => (value.value = cb(value.rawValue)));
    this.#dependencies[this.#dependencies.length - 1]?.addDescendant(watcher);
    this.#execute(watcher);
    return value;
  };

  #execute(watcher: Watcher) {
    this.#dependencies.push(new Dependencies());

    try {
      watcher.cb();
    } catch (e) {
      console.error(e);
    }
    const newDeps = this.#dependencies.pop()!;
    watcher.updateDependencies(newDeps);
    this.#collects.push(newDeps.all);
    this.#enqueueCollect();
  }

  #update() {
    // todo make it more async or routine based so it will be possible to manage amount of updates per timeframe
    let iteration = 0;
    const result = new Set<State<unknown>>();

    while (iteration++ < 100 && this.#backlog.size) {
      const watchers = new Array<Watcher>();
      this.#backlog.forEach((s) => {
        if (!s.shouldUpdate) return;
        result.add(s);
        watchers.push(...s.watchers.filter((w) => !(w instanceof ConnectableWatcher)));
      });

      this.#backlog.clear();

      for (let watcher of new Set(watchers)) {
        this.#execute(watcher);
      }
    }

    this.#backlog.clear(); // circular dependencies resolution
    // todo topological sort could help to prevent this

    const bindings = new Set(
      [...result]
        .filter((s) => s.shouldUpdate)
        .flatMap((s) => s.watchers.filter((w) => w instanceof ConnectableWatcher))
    );
    bindings.forEach((b) => this.#execute(b));

    result.forEach((s) => s.fix());
  }

  #collect() {
    // reimplement this thru one of these:
    // 1. MutationObserver
    // 2. WeakRef and FinalizationRegistry
    // 0. queueMicrotask
    this.#collects
      .flatMap((s) => s)
      .flatMap((s) => s.watchers)
      .filter((w) => w instanceof ConnectableWatcher)
      .reduce((a, c) => a.add(c as ConnectableWatcher<unknown>), new Set<ConnectableWatcher<unknown>>())
      .forEach((w) => w.disconnect());

    this.#collects.length = 0;
  }

  #handleGet<T>(state: State<T>) {
    const count = this.#dependencies.length;
    count && this.#dependencies[count - 1].addGet(state);
  }

  #handleSet<T>(state: State<T>) {
    const count = this.#dependencies.length;
    count && this.#dependencies[count - 1].addSet(state);

    if (state.shouldUpdate) {
      this.#backlog.add(state);
      this.#delayedUpdate();
    } else {
      state.fix();
    }
  }
}
