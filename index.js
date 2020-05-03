const stateTracker = () => {
  const store = {};
  const alive = {};
  let scope = null;
  let index = -1;

  const setScope = (key) => {
    scope = key;
    index = -1;
    alive[key] = true;
  };
  const cleanup = () => {
    Object.keys(store).forEach((key) => {
      if (alive[key]) {
        delete alive[key];
      } else {
        (store[key] || []).filter(({ onDestroy }) => onDestroy).forEach(({ onDestroy }) => onDestroy());
        delete store[key];
      }
    });
  };

  const get = (key, i) => () => (store[key][i] || {}).value;
  const set = (key, i) => (value) => {
    store[key][i] = store[key][i] || {};
    store[key][i].value = value;
  };
  const onDestroy = (key, i) => (cb) => {
    if (typeof cb !== 'function') return;
    store[key][i] = store[key][i] || {};
    store[key][i].onDestroy = cb;
  };

  const getContext = () => {
    store[scope] = store[scope] || [];
    index++;
    return { get: get(scope, index), set: set(scope, index), onDestroy: onDestroy(scope, index) };
  };

  return { setScope, cleanup, getContext };
};

const treeBuilder = () => {
  const node = (payload) => (visit, state) => {
    payload.siblings.reduce((acc, child) => child(visit, acc) || acc, visit(payload, state));
  };

  const mapToNode = (component, key) => {
    switch (typeof component) {
      case 'function':
        return node({ key, siblings: [], type: 'element', component });
      case 'string':
        return node({ key, siblings: [], type: 'text', component: () => ({ nodeValue: component }) });
      default:
        return node({ key, siblings: [], type: 'not-supported' });
    }
  };

  const mapToRoot = (component) => mapToNode(component, '0');

  const loggerVisitor = ({ key, type, siblings, ...rest }) => console.log(key, type, rest);

  return { mapToNode, mapToRoot, loggerVisitor };
};

const hooks = ({ getContext }) => {
  const isShallowEqual = (prev, next) => {
    if (!prev || !next) return false;

    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    return prevKeys.length === nextKeys.length && prevKeys.every((key) => Object.is(prev[key], next[key]));
  };

  const useState = (initialValue) => {
    const { get, set } = getContext();

    let state = get();
    if (!state) {
      state = typeof initialValue === 'function' ? initialValue() : initialValue;
      set(state);
    }

    const setState = (value) => {
      const state = get();
      value = typeof value === 'function' ? value(state) : value;
      Object.is(state, value) || set(value);
    };
    return [state, setState];
  };

  const useRef = (current) => useState({ current })[0];

  const useReducer = (reducer, initialState, init) => {
    const [state, setState] = useState(init ? () => init(initialState) : initialState);
    const dispatch = (action) => setState((s) => reducer(s, action));
    return [state, dispatch];
  };

  const useEffect = (update, next) => {
    const { get, set, onDestroy } = getContext();
    let { prev, cleanup } = get() || {};
    if (!isShallowEqual(prev, next)) {
      cleanup && cleanup();
      const nextCleanup = update();
      set({ prev: next, cleanup: nextCleanup });
      onDestroy(nextCleanup);
    }
  };

  const useCallback = (fn, next) => {
    const { get, set } = getContext();
    let { prev, callback } = get() || {};
    if (!isShallowEqual(prev, next)) {
      set({ prev: next, callback: fn });
      return fn;
    }
    return callback;
  };

  const useMemo = (update, next) => {
    const { get, set } = getContext();
    let { prev, state } = get() || {};
    if (!isShallowEqual(prev, next)) {
      state = update();
      set({ prev: next, state });
    }
    return state;
  };
  return { useState, useRef, useReducer, useCallback, useEffect, useMemo };
};

const renderVisitor = ({ setScope, mapToNode, useRef, useEffect }) => {
  const createElement = (type, tagName, nodeValue = '') => {
    switch (type) {
      case 'text': {
        return document.createTextNode(nodeValue);
      }
      case 'element': {
        return document.createElement(tagName);
      }
    }
  };

  const updateElement = (element, { ref: prevRef, ...prev }, { ref: nextRef, ...next }) => {
    let refWasUpdated = false;
    if (!Object.is(prevRef, nextRef) && nextRef) {
      typeof nextRef === 'function' ? nextRef(element) : (nextRef.current = element);
      refWasUpdated = true;
    }

    const removedCount = Object.entries(prev)
      .filter(([key]) => !(key in next))
      .map(([key]) => (element[key] = null)).length;

    const updatedCount = Object.entries(next)
      .filter(([key, value]) => !Object.is(value, prev[key]))
      .map(([key, value]) => (element[key] = value)).length;

    return refWasUpdated || removedCount || updatedCount;
  };

  const removeElement = (element) => {
    ((element.attributes && [...element.attributes]) || [])
      .filter((a) => typeof a === 'function')
      .forEach((a) => {
        element.attributes[a.name] = null;
      });
    element.remove();
  };

  return ({ key, type, component, siblings }, container) => {
    setScope(key);
    const { children = [], tagName = 'div', ...props } = component(); // hooks invoked
    children.forEach((childComponent, i) => siblings.push(mapToNode(childComponent, `${key}.${i}`))); // lazy tree

    const elementRef = useRef(null);
    useEffect(() => {
      elementRef.current = createElement(type, tagName, props.nodeValue);
      container.appendChild(elementRef.current);
      return () => removeElement(elementRef.current);
    }, [type, tagName]);

    const [prev, setPrev] = useState({});
    updateElement(elementRef.current, prev, props) && setPrev(props);

    return elementRef.current;
  };
};

(() => {
  const factory = () => {
    const { getContext, setScope, cleanup } = stateTracker();
    const { useRef, useEffect, ...otherHooks } = hooks({ getContext });
    const { mapToNode, mapToRoot } = treeBuilder();
    const render = renderVisitor({ setScope, mapToNode, useRef, useEffect });

    const workLoop = (component, dom) => {
      const loop = () => {
        const root = mapToRoot(component);
        root(render, dom);
        cleanup();
        setTimeout(loop, 50);
      };
      setTimeout(loop, 50);
    };

    return { useRef, useEffect, ...otherHooks, render: workLoop };
  };

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    this['say-no-more'] = factory();
  }
})();
