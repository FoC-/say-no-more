import { reactive as _reactive, raw, isProxy, unreactive } from "../src/reactivity";
import { isState, Scope } from "../src/scope";
import { assert, delay } from "./utils";
const scope = new Scope();
const { watch, state } = scope;
const reactive = _reactive(scope);

class Data {
  v;

  constructor(v) {
    this.v = v;
  }

  get extended() {
    return this.v * 10;
  }

  set extended(v) {
    this.v = v / 10;
  }

  toStr() {
    return `V:(${this.v}), E:(${this.extended})`;
  }
}

export const array_basic = async () => {
  const data = reactive([1, 2]);
  let calledTimes = 0;
  const json = watch(() => {
    calledTimes++;
    return JSON.stringify(data);
  });

  assert(isProxy(data)).equal(true);
  assert(isState(data)).equal(false);
  assert(isProxy(data.length)).equal(false);
  assert(data.length).equal(2);
  assert(isProxy(data[0])).equal(false);
  assert(isState(data[0])).equal(false);
  assert(data[0]).equal(1);
  assert(json.value).equal("[1,2]");
  assert(calledTimes).equal(1);
  data[0] = 3;
  await delay();

  assert(json.value).equal("[3,2]");
  assert(calledTimes).equal(2);
  data.push(4);
  await delay();

  assert(json.value).equal("[3,2,4]");
  assert(calledTimes).equal(3);
  delete data[1];
  await delay();

  assert(json.value).equal("[3,null,4]");
  assert(calledTimes).equal(4);
};

export const array_length = async () => {
  const data = reactive([]);
  let calledTimes = 0;
  const length = watch(() => {
    calledTimes++;
    return data.length;
  });

  assert(length.value).equal(0);
  assert(calledTimes).equal(1);
  data.push(false);
  await delay();

  assert(length.value).equal(1);
  assert(calledTimes).equal(2);
  data.push(false);
  await delay();

  assert(length.value).equal(2);
  assert(calledTimes).equal(3);
  data.pop();
  await delay();

  assert(length.value).equal(1);
  assert(calledTimes).equal(4);
  data.pop();
  await delay();

  assert(length.value).equal(0);
  assert(calledTimes).equal(5);
};

export const array_raw = async () => {
  const data = reactive([1, 2, 3]);

  let calledTimes = 0;
  watch(() => {
    calledTimes++;
    return JSON.stringify(raw(data));
  });

  assert(calledTimes).equal(1);

  data.push(4, 5);
  await delay();

  assert(calledTimes).equal(1);
};

export const basic = async () => {
  const base = reactive({
    a: 1,
    b: 2,
    c: null,
    d: undefined,
    ob: {
      a: "a1",
      b: "b1",
    },
    ar: [11, 22],
  });
  assert(Object.keys(base)).equal(["a", "b", "c", "d", "ob", "ar"]);
  assert(base.a).equal(1);
  assert(base.b).equal(2);
  assert(base.c).equal(null);
  assert(base.d).equal(undefined);
  assert(base.ob.a).equal("a1");
  assert(base.ob.b).equal("b1");
  assert(base.ar.length).equal(2);
  assert(base.ar).equal([11, 22]);
  assert(base.ar[0]).equal(11);
  assert(base.ar[1]).equal(22);

  const derived = reactive({
    a: watch(() => base.a * 10),
    b: watch(() => ({
      double: base.b * 2,
      triple: base.b * 3,
    })),
    c: watch(() => String(base.c)),
    d: watch(() => String(base.d)),
    ob: watch(() => `${base.ob.a} ${base.ob.b}`),
    ar: watch(() => ({
      size: base.ar.length,
      sum: base.ar.reduce((a, c) => a + c, 0),
    })),
  });
  assert(Object.keys(derived)).equal(["a", "b", "c", "d", "ob", "ar"]);
  assert(derived.a).equal(10);
  assert(derived.b.double).equal(4);
  assert(derived.b.triple).equal(6);
  assert(derived.c).equal("null");
  assert(derived.d).equal("undefined");
  assert(derived.ob).equal("a1 b1");
  assert(derived.ar.size).equal(2);
  assert(derived.ar.sum).equal(33);

  base.a = 5;
  base.b = 10;
  base.ob.a = "a2";
  base.ob.b = "b2";
  base.c = true;
  base.d = false;
  base.ar[2] = 33;
  await delay();

  assert(derived.a).equal(50);
  assert(derived.b.double).equal(20);
  assert(derived.b.triple).equal(30);
  assert(derived.c).equal("true");
  assert(derived.d).equal("false");
  assert(derived.ob).equal("a2 b2");
  assert(derived.ar.size).equal(3);
  assert(derived.ar.sum).equal(66);

  base.c = undefined;
  base.d = null;
  base.ob = { a: "a3", b: "b3" };
  base.ar = [10, -10];
  derived.b.double = -10;
  derived.b.triple = -20;
  await delay();

  assert(derived.b.double).equal(-10);
  assert(derived.b.triple).equal(-20);
  assert(derived.c).equal("undefined");
  assert(derived.d).equal("null");
  assert(derived.ob).equal("a3 b3");
  assert(derived.ar.size).equal(2);
  assert(derived.ar.sum).equal(0);
};

export const basic_object = () => {
  const ob = reactive({ a: { a1: {} }, b: [{}] });
  assert(isProxy(ob.a)).equal(true);
  assert(isProxy(ob.a.a1)).equal(true);
  assert(isProxy(ob.b)).equal(true);
};

export const delete_fields = async () => {
  const data = reactive({ a: 1 });
  assert(data.a).equal(1);
  delete data.a;
  assert(data.a).equal(undefined);
  data.a = 2;
  assert(data.a).equal(2);
  data.a = 3;
  await delay();
  assert(data.a).equal(3);
};

export const delete_property = () => {
  const data = reactive({ a: 1, b: 2 });
  delete data.a;
  assert(data).equal('{"b":2}');
  assert(Object.keys(data)).equal(["b"]);
  delete data.b;
  assert(data).equal("{}");
  assert(Object.keys(data)).equal([]);
};

export const existing_class_with_custom_get = async () => {
  class Data {
    constructor(public x: number, public y: number) {}
    get sum() {
      return this.x + this.y;
    }
  }
  const data = reactive(new Data(1, 2));

  assert(data.x).equal(1);
  assert(data.y).equal(2);
  assert(data.sum).equal(3);

  data.x = 3;
  data.y = 4;
  await delay();

  assert(data.x).equal(3);
  assert(data.y).equal(4);
  assert(data.sum).equal(7);
};

export const existing_class_with_custom_set = async () => {
  class Data {
    constructor(public x: number) {}
    get y() {
      return this.x * 2;
    }
    set y(value) {
      this.x = value / 2;
    }
  }
  const data = reactive(new Data(5));

  assert(data.x).equal(5);
  assert(data.y).equal(10);

  data.x = 10;
  await delay();

  assert(data.x).equal(10);
  assert(data.y).equal(20);

  data.y = 6;
  await delay();

  assert(data.x).equal(3);
  assert(data.y).equal(6);
};

export const existing_class_with_method = async () => {
  class Data {
    constructor(public a: number) {}
    plusOne() {
      return this.a + 1;
    }
  }
  const data = reactive(new Data(1));

  assert(data.a).equal(1);
  assert(data.plusOne()).equal(2);

  data.a = 2;
  await delay();

  assert(data.a).equal(2);
  assert(data.plusOne()).equal(3);
};

export const function_field = async () => {
  const data = reactive({ func: () => "abc" });
  assert(data.func()).equal("abc");

  data.func = () => "def";
  await delay();

  assert(data.func()).equal("def");
};

export const insert_new_field = async () => {
  const base = reactive({});
  assert(Object.keys(base)).equal([]);

  base.a = { a1: 1, b1: 2 };
  assert(Object.keys(base)).equal(["a"]);
  assert(Object.keys(base.a)).equal(["a1", "b1"]);

  const derived = reactive({});
  assert(Object.keys(derived)).equal([]);

  derived.sum = watch(() => base.a.a1 + base.a.b1);
  assert(Object.keys(derived)).equal(["sum"]);
  assert(derived.sum).equal(3);

  base.a.a1 = 10;
  await delay();

  assert(derived.sum).equal(12);
};

export const object_json = async () => {
  const data = reactive({ a: 1, b: 2 });
  let calledTimes = 0;
  const json = watch(() => {
    calledTimes++;
    return JSON.stringify(data);
  });

  assert(json.value).equal('{"a":1,"b":2}');
  assert(calledTimes).equal(1);
  data.a = 3;
  await delay();

  assert(json.value).equal('{"a":3,"b":2}');
  assert(calledTimes).equal(2);
  data.c = 4;
  await delay();

  assert(json.value).equal('{"a":3,"b":2,"c":4}');
  assert(calledTimes).equal(3);
  delete data.b;
  await delay();

  assert(json.value).equal('{"a":3,"c":4}');
  assert(calledTimes).equal(4);
};

export const raw_basic = async () => {
  const data = reactive({ a: 1, b: 2 });
  let calledTimes = 0;
  watch(() => {
    calledTimes++;
    return raw(data).a + data.b;
  });

  assert(calledTimes).equal(1);

  data.a++;
  await delay();

  assert(calledTimes).equal(1);

  data.b++;
  await delay();
  assert(calledTimes).equal(2);
};

export const raw_existing_class_with_custom_get = async () => {
  class Data {
    constructor(public a: number, public b: number) {}
    get sum() {
      return this.a + this.b;
    }
  }
  const data = reactive(new Data(1, 2));
  let calledTimes = 0;
  watch(() => {
    calledTimes++;
    return raw(data).sum;
  });

  assert(calledTimes).equal(1);

  data.a++;
  data.b++;
  await delay();

  assert(calledTimes).equal(1);
};

export const raw_existing_class_with_method = async () => {
  class Data {
    constructor(public a: number) {}
    plusOne() {
      return this.a + 1;
    }
  }
  const data = reactive(new Data(1));

  let calledTimes = 0;
  watch(() => {
    calledTimes++;
    return raw(data).sum;
  });

  assert(calledTimes).equal(1);

  data.a++;
  await delay();

  assert(calledTimes).equal(1);
};

export const raw_nested_object = async () => {
  const data = reactive({ a: { a1: 1 }, b: { b1: 2 } });
  let calledTimes = 0;
  watch(() => {
    calledTimes++;
    return raw(data).a.a1 + data.b.b1;
  });

  assert(calledTimes).equal(1);

  data.a.a1++;
  await delay();

  assert(calledTimes).equal(1);

  data.b.b1++;
  await delay();

  assert(calledTimes).equal(2);
};

export const types_validated = async () => {
  class Foo {}
  assert(isProxy(reactive(null))).equal(false);
  assert(isProxy(reactive(undefined))).equal(false);
  assert(isProxy(reactive(false))).equal(false);
  assert(isProxy(reactive(0))).equal(false);
  assert(isProxy(reactive(""))).equal(false);
  assert(isProxy(reactive(() => 0))).equal(false);
  assert(isProxy(reactive(state(1)))).equal(false);
  assert(isProxy(reactive([]))).equal(true);
  assert(isProxy(reactive({}))).equal(true);
  assert(isProxy(reactive(new Foo()))).equal(true);
};

export const reactive_array = async () => {
  const data = reactive([1, 2]);
  let updatedTimes = 0;
  const json = watch(() => {
    updatedTimes++;
    return JSON.stringify(data);
  });
  assert(json.value).equal([1, 2]);
  assert(updatedTimes).equal(1);

  data[0] = 3;
  await delay();
  assert(json.value).equal([3, 2]);
  assert(updatedTimes).equal(2);

  data.push(4);
  await delay();
  assert(json.value).equal([3, 2, 4]);
  assert(updatedTimes).equal(3);

  delete data[1];
  await delay();
  assert(json.value).equal([3, null, 4]);
  assert(updatedTimes).equal(4);
};

export const reactive_array_length = async () => {
  const data = reactive([]);
  let updatedTimes = 0;
  const length = watch(() => {
    updatedTimes++;
    return data.length;
  });
  assert(length.value).equal(0);
  assert(updatedTimes).equal(1);

  data.push(1);
  await delay();
  assert(length.value).equal(1);
  assert(updatedTimes).equal(2);

  data.pop();
  await delay();
  assert(length.value).equal(0);
  assert(updatedTimes).equal(3);

  data[3] = 6;
  await delay();
  assert(length.value).equal(4);
  assert(updatedTimes).equal(4);

  data.length = 1;
  await delay();
  assert(length.value).equal(1);
  assert(updatedTimes).equal(5);
};

export const reactive_basic = async () => {
  const base = reactive({
    a: 1,
    b: 2,
    c: null,
    d: undefined,
    ob: {
      a: "a1",
      b: "b1",
    },
    ar: [11, 22],
  });
  assert(Object.keys(base)).equal(["a", "b", "c", "d", "ob", "ar"]);
  assert(base.a).equal(1);
  assert(base.b).equal(2);
  assert(base.c).equal(null);
  assert(base.d).equal(undefined);
  assert(base.ob.a).equal("a1");
  assert(base.ob.b).equal("b1");
  assert(base.ar.length).equal(2);
  assert(base.ar).equal([11, 22]);
  assert(base.ar[0]).equal(11);
  assert(base.ar[1]).equal(22);

  const derived = reactive({
    a: watch(() => base.a * 10),
    b: watch(() => ({
      double: base.b * 2,
      triple: base.b * 3,
    })),
    c: watch(() => String(base.c)),
    d: watch(() => String(base.d)),
    ob: watch(() => `${base.ob.a} ${base.ob.b}`),
    ar: watch(() => ({
      size: base.ar.length,
      sum: base.ar.reduce((a, c) => a + c, 0),
    })),
  });
  assert(Object.keys(derived)).equal(["a", "b", "c", "d", "ob", "ar"]);
  assert(derived.a).equal(10);
  assert(derived.b.double).equal(4);
  assert(derived.b.triple).equal(6);
  assert(derived.c).equal("null");
  assert(derived.d).equal("undefined");
  assert(derived.ob).equal("a1 b1");
  assert(derived.ar.size).equal(2);
  assert(derived.ar.sum).equal(33);

  base.a = 5;
  base.b = 10;
  base.ob.a = "a2";
  base.ob.b = "b2";
  base.c = true;
  base.d = false;
  base.ar[2] = 33;
  await delay();

  assert(derived.a).equal(50);
  assert(derived.b.double).equal(20);
  assert(derived.b.triple).equal(30);
  assert(derived.c).equal("true");
  assert(derived.d).equal("false");
  assert(derived.ob).equal("a2 b2");
  assert(derived.ar.size).equal(3);
  assert(derived.ar.sum).equal(66);

  base.c = undefined;
  base.d = null;
  base.ob = { a: "a3", b: "b3" };
  base.ar = [10, -10];
  derived.b.double = -10;
  derived.b.triple = -20;
  await delay();

  assert(derived.b.double).equal(-10);
  assert(derived.b.triple).equal(-20);
  assert(derived.c).equal("undefined");
  assert(derived.d).equal("null");
  assert(derived.ob).equal("a3 b3");
  assert(derived.ar.size).equal(2);
  assert(derived.ar.sum).equal(0);
};

export const reactive_insertNewField = async () => {
  const base = reactive({});
  assert(base).equal({});

  base.data = { a: 1, b: 2 };
  assert(base).equal({ data: { a: 1, b: 2 } });

  const derived = reactive({});
  derived.sum = watch(() => base.data.a + base.data.b);

  const s = watch(() => derived.sum);
  assert(s.value).equal(3);

  base.data.a++;
  base.data.b++;
  await delay();
  assert(s.value).equal(5);

  base.data = { a: 10, b: 20 };
  await delay();
  assert(s.value).equal(30);
};

export const reactive_class_func = async () => {
  const data = reactive(new Data(1));
  const s = watch(() => data.toStr());
  assert(s.value).equal("V:(1), E:(10)");

  data.v++;
  await delay();
  assert(s.value).equal("V:(2), E:(20)");
};

export const reactive_class_get = async () => {
  const data = reactive(new Data(1));
  const s = watch(() => data.extended);
  assert(s.value).equal(10);

  data.v++;
  await delay();
  assert(s.value).equal(20);
};

export const reactive_class_set = async () => {
  const data = reactive(new Data(1));
  const s = watch(() => data.extended);
  assert(s.value).equal(10);

  data.extended = 20;
  await delay();
  assert(s.value).equal(20);
};

export const reactive_object = async () => {
  const data = reactive({ a: 1, b: 2 });
  let updatedTimes = 0;
  const json = watch(() => {
    updatedTimes++;
    return JSON.stringify(data);
  });
  assert(json.value).equal({ a: 1, b: 2 });
  assert(updatedTimes).equal(1);

  data.a = 3;
  await delay();
  assert(json.value).equal({ a: 3, b: 2 });
  assert(updatedTimes).equal(2);

  data.c = 4;
  await delay();
  assert(json.value).equal({ a: 3, b: 2, c: 4 });
  assert(updatedTimes).equal(3);

  delete data.b;
  await delay();
  assert(json.value).equal({ a: 3, c: 4 });
  assert(updatedTimes).equal(4);
};

export const reactive_nullOrUndefinedFields = async () => {
  const data = reactive({
    a: null,
    b: undefined,
    c: 1,
    d: 2,
  });

  const s = watch(() => `${String(data.a)}:${String(data.b)}:${String(data.c)}:${String(data.d)}`);
  assert(s.value).equal("null:undefined:1:2");

  data.c = null;
  data.d = undefined;
  await delay();
  assert(s.value).equal("null:undefined:null:undefined");
};

export const reactive_deletedFields = async () => {
  const data = reactive({ a: 1 });
  assert(data.a).equal(1);

  delete data.a;
  await delay();
  assert(data.a).equal(undefined);

  data.a = 2;
  await delay();
  assert(data.a).equal(2);
};

export const reactive_functionField = async () => {
  const data = reactive({ cb: () => "abc" });
  const s = watch(() => data.cb());
  assert(s.value).equal("abc");

  data.cb = () => "def";
  await delay();
  assert(s.value).equal("def");
};

export const unreactive_array = async () => {
  const data = reactive([unreactive(new Array(8))]);
  const s = watch(() => data.map((buffer) => buffer.length));

  assert(s.value).equal([8]);

  data.push(unreactive(new Array(24)));
  await delay();
  assert(s.value).equal([8, 24]);

  data.shift();
  await delay();
  assert(s.value).equal([24]);
};

export const unreactive_object = async () => {
  const data = reactive({
    a: unreactive(new Array(8)),
  });

  const s = watch(() => Object.entries(data).map(([k, v]) => v.length));
  assert(s.value).equal([8]);

  data.b = unreactive(new Array(24));
  await delay();
  assert(s.value).equal([8, 24]);

  delete data.a;
  await delay();
  assert(s.value).equal([24]);
};

export const raw_class_func = async () => {
  const data = reactive(new Data(1));

  const a = watch(() => data.toStr());
  const b = watch(() => raw(data).toStr());

  assert(a.value).equal("V:(1), E:(10)");
  assert(b.value).equal("V:(1), E:(10)");

  data.v++;
  await delay();
  assert(a.value).equal("V:(2), E:(20)");
  assert(b.value).equal("V:(1), E:(10)");
};

export const raw_class_get = async () => {
  const data = reactive(new Data(1));

  const a = watch(() => data.extended);
  const b = watch(() => raw(data).extended);
  assert(a.value).equal(10);
  assert(b.value).equal(10);

  data.v++;
  await delay();
  assert(a.value).equal(20);
  assert(b.value).equal(10);
};

export const raw_nested_obj = async () => {
  const base = reactive({ a: { a: 1, b: 2 }, b: { a: 3, b: 4 } });
  const derived = reactive({
    s: watch(() => raw(base).a.a + raw(base).a.b + base.b.a + base.b.b),
  });

  const a = watch(() => raw(base).a.a + base.b.a);
  const b = watch(() => raw(base).a.b + base.b.b);
  const s = watch(() => derived.s);
  assert(a.value).equal(4);
  assert(b.value).equal(6);
  assert(s.value).equal(10);

  // Changing `base.a.a` won't trigger any derivations, as `base.a.a` is accessed via
  // `raw(base).a.a`.
  base.a.a++;
  await delay();
  assert(a.value).equal(4);
  assert(b.value).equal(6);
  assert(s.value).equal(10);

  // Changing `base.b.a` will trigger all the relevant derivations, as `base.b.a` is accessed
  // via `base.b.a`.
  base.b.a++;
  await delay();
  assert(a.value).equal(6);
  assert(b.value).equal(6);
  assert(s.value).equal(12);

  // Changing `base.a.b` won't trigger any derivations, as `base.a.b` is accessed via
  // `raw(base).a.b`.
  base.a.b++;
  await delay();
  assert(a.value).equal(6);
  assert(b.value).equal(6);
  assert(s.value).equal(12);

  // Changing `base.b.b` will trigger all the relevant derivations, as `base.b.b` is accessed
  // via `base.b.b`.
  base.b.b++;
  await delay();
  assert(a.value).equal(6);
  assert(b.value).equal(8);
  assert(s.value).equal(14);

  // Changing the entire object of `base.a` won't trigger any derivations, as `base.a` is
  // accessed via `raw(base).a`.
  base.a = { a: 11, b: 12 };
  await delay();
  assert(a.value).equal(6);
  assert(b.value).equal(8);
  assert(s.value).equal(14);

  // Changing the entire object of `base.b` will trigger all the derivations, as `base.b` is
  // accessed via `raw(base).b`.
  base.b = { a: 13, b: 14 };
  await delay();
  assert(a.value).equal(24);
  assert(b.value).equal(26);
  assert(s.value).equal(50);
};
