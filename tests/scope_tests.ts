import { Scope, isState } from "../src/scope";
import { assert, delay } from "./utils";

const scope = new Scope();
const { watch, state } = scope;

export const basic = async () => {
  const a = state(0);

  // created values are assigned immediately
  assert(isState(a)).equal(true);
  assert(a.value).equal(0);
  assert(a.oldValue).equal(0);

  // watch on raw value will be ignored
  watch(() => console.log(a.rawValue));

  a.value = 1;

  // old value changed because no watchers
  assert(a.value).equal(1);
  assert(a.oldValue).equal(1);

  await delay();

  // values are same after derivation
  assert(a.value).equal(1);
  assert(a.oldValue).equal(1);

  // attached watch to state
  watch(() => console.log(a.value));

  // change value
  a.value = 2;

  // old value was not changed
  assert(a.value).equal(2);
  assert(a.oldValue).equal(1);

  await delay();

  // old value changed
  assert(a.value).equal(2);
  assert(a.oldValue).equal(2);
};

export const circular_dependency = async () => {
  const a = state(1);
  const b = watch(() => a.value + 1); // depends on a
  watch(() => (a.value = b.value! + 1)); // update a from b

  a.value++;
  await delay();
  assert(a.value).equal(104);
  assert(b.value).equal(103);
};

export const error_thrown = async () => {
  const flag = state(false);
  const s1 = watch(() => {
    if (flag.value) throw new Error();
    return 1;
  });
  const s2 = watch(() => s1.value! + 1);
  assert(s1.value).equal(1);
  assert(s2.value).equal(2);

  flag.value = true;
  await delay();
  assert(s1.value).equal(1);
  assert(s2.value).equal(2);
};

export const loop_state_updates = async () => {
  const data = state(0);
  const history = new Array<number | undefined>();

  watch(() => history.push(data.value));

  for (let i = 0; i < 11; i++) {
    data.value = i;
    await delay();
  }

  assert(history.length).equal(11);
  assert(data.watchers.length).equal(1);
};

export const loop_state_watch = async () => {
  const data = state(0);
  let count = 0;

  for (let i = 0; i < 3; i++) {
    watch(() => {
      count++;
      console.log(data.value);
    });
  }

  assert(count).equal(3);

  data.value++;
  await delay();

  assert(count).equal(6);
};

export const minimize = async () => {
  const a = state(1);
  const b = state(2);
  let count = 0;
  const sum = watch(() => {
    count++;
    return a.value + b.value;
  });
  assert(count).equal(1);
  assert(sum.value).equal(3);

  a.value++;
  b.value++;
  await delay();
  assert(count).equal(2);
  assert(sum.value).equal(5);

  a.value++;
  a.value--;
  await delay();
  assert(count).equal(2);
  assert(sum.value).equal(5);
};

export const multi_layer = async () => {
  const a = state(1);
  const b = watch(() => a.value! * a.value!);
  const c = watch(() => b.value! * b.value!);
  const d = watch(() => c.value! * c.value!);
  let l1count = 0;
  let l2count = 0;
  const l1 = watch(() => {
    l1count++;
    return a.value! + b.value! + c.value! + d.value!;
  });
  const l2 = watch(() => {
    l2count++;
    return l1.value! * l1.value!;
  });

  assert(l1.value).equal(4);
  assert(l2.value).equal(16);
  assert(l1count).equal(1);
  assert(l2count).equal(1);

  a.value++;
  await delay();

  assert(l1.value).equal(278);
  assert(l2.value).equal(77284);
  assert(l1count).equal(5);
  assert(l2count).equal(2);
};

export const side_effect = async () => {
  const s = state(0);
  const items = new Array<number>();
  watch(() => items.push(s.value));
  assert(items).equal([0]);

  s.value = 1;
  await delay();
  assert(items).equal([0, 1]);

  s.value = 2;
  s.value = 3;
  await delay();
  assert(items).equal([0, 1, 3]);
};

export const unsubscribe = async () => {
  // this is idea that was not implemented yet
  // problem that watch store result in return value

  let actual = 0;
  const data = state(0);

  watch((oldValue, cleanup) => {
    actual++;
    if (data.value > 0) cleanup();
  });

  assert(actual).equal(1);
  data.value++;

  await delay();
  assert(actual).equal(1);

  data.value++;
  await delay();
  assert(actual).equal(1);
};

export const watch_onion = async () => {
  const flag = state(true);
  const a = state(0);
  let l1 = 0;
  let l2 = 0;
  let l3 = 0;

  watch(() => {
    l1++;

    if (flag.value) {
      watch(() => {
        l2++;
        watch(() => {
          l3++;
          console.log(a.value);
        });
      });
    }
  });

  assert(l1).equal(1);
  assert(l2).equal(1);
  assert(l3).equal(1);

  a.value++;

  await delay();

  assert(l1).equal(1);
  assert(l2).equal(1);
  assert(l3).equal(2);

  a.value++;
  flag.value = false;
  await delay();

  assert(l1).equal(2);
  assert(l2).equal(1);
  assert(l3).equal(3); // 3 !!! values changed in the same cycle

  a.value++;
  await delay();

  assert(l1).equal(2);
  assert(l2).equal(1);
  assert(l3).equal(3); // 3 watcher detached in previous cycle // todo review this logic
};

export const watch_state = async () => {
  const count = state(0);
  const list = watch(() => [...Array(count.value).keys()].map((i) => i + 1));
  const index = watch(() => (list.value, 0));
  const item = watch(() => list.value![index.value!]);

  count.value = 3;
  await delay();
  assert(count.value).equal(3);
  assert(list.value).equal([1, 2, 3]);
  assert(index.value).equal(0);
  assert(item.value).equal(1);

  index.value = 2;
  await delay();
  assert(index.value).equal(2);
  assert(item.value).equal(3);

  count.value = 5;
  await delay();
  assert(count.value).equal(5);
  assert(list.value).equal([1, 2, 3, 4, 5]);
  assert(index.value).equal(0);
  assert(item.value).equal(1);

  index.value = 3;
  await delay();
  assert(index.value).equal(3);
  assert(item.value).equal(4);
};

export const watch_conditional = async () => {
  const flag = state(true);
  const a = state(100);
  const b = state(200);
  let calls = 0;
  const s = watch(() => (calls++, flag.value ? a.value : b.value));
  assert(s.value).equal(100);
  assert(calls).equal(1);

  a.value++;
  await delay();
  assert(s.value).equal(101);
  assert(calls).equal(2);

  b.value++;
  await delay();
  assert(s.value).equal(101);
  assert(calls).equal(2);

  flag.value = false;
  await delay();
  assert(s.value).equal(201);
  assert(calls).equal(3);

  a.value++;
  await delay();
  assert(s.value).equal(201);
  assert(calls).equal(3);

  b.value++;
  await delay();
  assert(s.value).equal(202);
  assert(calls).equal(4);

  assert(flag.watchers.length).equal(1);
  assert(a.watchers.length).equal(0);
  assert(b.watchers.length).equal(1);
};

export const watch_conditional_many = async () => {
  const flag = state(true);
  const a = state(0);
  const b = state(0);
  const c = state(0);
  const d = state(0);

  watch(() => (flag.value ? a.value + b.value : c.value + d.value));
  const states = [flag, a, b, c, d];
  for (let i = 0; i < 100; ++i) {
    const stateToChange = states[i % states.length];
    if (stateToChange === flag) stateToChange.value = !stateToChange.value;
    else stateToChange.value++;
    await delay();
  }

  assert(flag.watchers.length).equal(1);
  assert(a.watchers.length).equal(1);
  assert(b.watchers.length).equal(1);
  assert(c.watchers.length).equal(0);
  assert(d.watchers.length).equal(0);
};

export const watch_conditional_watch = async () => {
  const flag = state(true);
  const a = state(0);
  const b = state(0);
  let calls = 0;
  watch(() => {
    calls++;
    flag.value ? watch(() => a.value) : watch(() => b.value);
  });

  for (let i = 0; i < 30; i++) {
    flag.value = i % 2 === 0;
    a.value++;
    b.value--;
    await delay();
  }

  assert(flag.watchers.length).equal(1);
  assert(a.watchers.length).equal(0);
  assert(b.watchers.length).equal(1);
};
