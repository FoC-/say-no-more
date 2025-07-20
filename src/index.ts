import { unreactive, isProxy, raw, reactive } from "./reactivity";
import { State, isState, Watcher, ConnectableWatcher, Scope } from "./scope";
import { getWatchers, HandlerBinder, NodeBinder, PropertyBinder, tags } from "./tags";

export default {
  unreactive,
  isProxy,
  raw,
  reactive,
  State,
  isState,
  Watcher,
  ConnectableWatcher,
  Scope,
  getWatchers,
  NodeBinder,
  HandlerBinder,
  PropertyBinder,
  tags,
};
