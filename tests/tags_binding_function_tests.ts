import { tags, getWatchers, NodeBinder } from "../src/tags";
import { Scope } from "../src/scope";
import { assert, intercept, delay } from "./utils";

// let update;
// const runner = (fn) => {
//   update = fn;
//   return () => {};
// };
// const delay = () => update();

const scope = new Scope();
const { watch, state } = scope;
const { a, b, button, div, i, input, ul, li } = tags(scope);

const nodeBinderUpdate = intercept(NodeBinder.prototype, "update");

export const child_array = (dom) => {
  const arr = [1, 2, 3];
  dom.append(div(() => ul(arr.map((n) => li(n)))));
  assert(dom.innerHTML).equal("<div><ul><li>1</li><li>2</li><li>3</li></ul></div>");
};

export const child_connected = async (dom) => {
  const data = state(1);
  dom.append(i(() => data.value));
  assert(dom.innerHTML).equal("<i>1</i>");

  data.value = 2;
  await delay();

  assert(dom.innerHTML).equal("<i>2</i>");
};

export const child_disconnected = async () => {
  const data = state(1);
  const dom = i(() => data.value);
  assert(dom.outerHTML).equal("<i>1</i>");

  data.value = 2;
  await delay();

  assert(dom.outerHTML).equal("<i>1</i>");
};

export const old_value = async (dom) => {
  const s = state(0);
  assert(s.oldValue).equal(0);
  s.value++;
  assert(s.oldValue).equal(1);

  dom.append(i(() => b(`${s.oldValue}:${s.value}`))); // binding
  const disconnected = dom.querySelector("b");
  assert(disconnected.outerHTML).equal("<b>1:1</b>");
  assert(dom.innerHTML).equal("<i><b>1:1</b></i>");

  s.value++;
  assert(s.oldValue).equal(1);
  assert(disconnected.outerHTML).equal("<b>1:1</b>");
  assert(dom.innerHTML).equal("<i><b>1:1</b></i>");

  await delay();
  assert(s.oldValue).equal(2);
  assert(disconnected.outerHTML).equal("<b>1:1</b>");
  assert(dom.innerHTML).equal("<i><b>1:2</b></i>"); // rendering has old and new value

  s.value++;
  await delay();
  assert(s.oldValue).equal(3);
  assert(disconnected.outerHTML).equal("<b>1:1</b>");
  assert(dom.innerHTML).equal("<i><b>2:3</b></i>"); // rendering has old and new value
};

export const raw_value = async (dom) => {
  const history = new Array<number>();
  const a = state(1);
  const b = state(2);
  const s = watch(() => a.rawValue + b.value);
  watch(() => history.push(a.rawValue + b.value));

  dom.append(div(() => a.rawValue + b.value));
  dom = dom.firstChild;

  assert(s.value).equal(3);
  assert(history).equal([3]);
  assert(dom.innerHTML).equal("3");

  a.value++;
  await delay();
  assert(s.value).equal(3);
  assert(history).equal([3]);
  assert(dom.innerHTML).equal("3");

  b.value++;
  await delay();
  assert(s.value).equal(5);
  assert(history).equal([3, 5]);
  assert(dom.innerHTML).equal("5");
};

export const with_watch = async (dom) => {
  const s = state(0);

  const component = (data) => {
    watch(() => console.log(data.value));
    return b(data);
  };

  dom.append(i(component(s)));
  s.value++;
  await delay();
  s.value++;
  await delay();
  s.value++;
  await delay();

  assert(dom.innerHTML).equal("<i><b>3</b></i>");
  assert(nodeBinderUpdate.get(getWatchers(dom)[0])).equal(undefined); // <div>
  assert(nodeBinderUpdate.get(getWatchers(dom.firstChild)[0])).equal(undefined); // <i>
  assert(nodeBinderUpdate.get(getWatchers(dom.firstChild.firstChild)[0])).equal(undefined); // <b>
  assert(nodeBinderUpdate.get(getWatchers(dom.firstChild.firstChild.firstChild)[0])).equal(3); //text
};

export const child_conditional = async (dom) => {
  const flag = state(false);
  const data = state("abc");

  const el = i(() => (flag.value ? a(data) : b(data)));
  dom.append(el);

  assert(dom.innerHTML).equal("<i><b>abc</b></i>");
  assert(flag.watchers.length).equal(1);
  assert(data.watchers.length).equal(2);

  data.value = "def";
  await delay();

  assert(flag.watchers.length).equal(1);

  assert(dom.innerHTML).equal("<i><b>def</b></i>");

  const bel = dom.querySelector("b"); // disconnect
  flag.value = true;
  await delay();

  assert(dom.innerHTML).equal("<i><a>def</a></i>");

  data.value = "ghi";
  await delay();

  assert(dom.innerHTML).equal("<i><a>ghi</a></i>");
  assert(bel.outerHTML).equal("<b>def</b>"); // disconnected - thus not updated
};

export const child_conditional_falsy = async (dom) => {
  const flag = state(true);
  const data = state(1);
  dom.append(
    div(
      () => (flag.value ? data.value : false),
      () => (flag.value ? data.value : 0),
      () => (flag.value ? data.value : null),
      () => (flag.value ? data.value : undefined)
    )
  );
  assert(dom.innerHTML).equal("<div>1111</div>");

  data.value++;
  await delay();
  assert(dom.innerHTML).equal("<div>2222</div>");

  flag.value = false;
  await delay();
  assert(dom.innerHTML).equal("<div>false0</div>");

  data.value++;
  await delay();
  assert(dom.innerHTML).equal("<div>false0</div>");

  flag.value = true;
  await delay();
  assert(dom.innerHTML).equal("<div>33</div>"); // `false` and `0` return as binding
};

export const child_error_thrown = async (dom) => {
  const data = state("abc");

  dom.append(div(data, () => i(data.value.length)));
  assert(dom.innerHTML).equal("<div>abc<i>3</i></div>");

  data.value = null;
  await delay();
  assert(dom.innerHTML).equal("<div><i>3</i></div>");
};

export const child_nested = async (dom) => {
  const component = (type, child) => type(child);

  const el = i(() => component(a, () => component(b, "const text")));
  dom.append(el);

  assert(dom.innerHTML).equal("<i><a><b>const text</b></a></i>");

  const i_watchers = getWatchers(el);
  assert(i_watchers.length).equal(0);

  const a_watchers = getWatchers(el.firstChild);
  assert(a_watchers.length).equal(1);
  assert(nodeBinderUpdate.get(a_watchers.find((w) => w instanceof NodeBinder))).equal(undefined);

  const b_watchers = getWatchers(el.firstChild.firstChild);
  assert(b_watchers.length).equal(1);
  assert(nodeBinderUpdate.get(b_watchers.find((w) => w instanceof NodeBinder))).equal(undefined);

  const text_watchers = getWatchers(el.firstChild.firstChild.firstChild);
  assert(text_watchers.length).equal(0);
};

export const child_conditional_multiple_updates = async (dom) => {
  const flag = state(false);
  const data = state(1);

  const component = (type) => {
    watch(() => data.value); // noop
    return type(data);
  };

  const el = i(() => (flag.value ? component(a) : component(b))); // <i><???>1</???></i>
  dom.append(el);

  assert(getWatchers(el).length).equal(0);
  assert(flag.watchers.length).equal(1);

  for (let i = 0; i < 20; ++i) {
    flag.value = !flag.value;
    await delay();
    assert(dom.innerHTML).equal(flag.value ? "<i><a>1</a></i>" : "<i><b>1</b></i>");
  }
  await delay();

  assert(nodeBinderUpdate.get(getWatchers(dom.firstChild.firstChild)[0])).equal(20); // <???>
  assert(data.watchers.length).equal(23);

  await delay(1000);

  assert(data.watchers.length).equal(3);
};

export const binding_handler_watched = async (dom) => {
  const flag = state(false);
  const s = state(1);
  let assigned = 0;

  const el = div(() =>
    (flag.value ? a : b)(
      button({
        onclick: watch(() => {
          assigned++;
          return s.value === 1 ? () => {} : () => {};
        }),
      })
    )
  );
  dom.append(el);

  for (let i = 0; i < 10; ++i) {
    flag.value = !flag.value;
    await delay();
  }

  assert(nodeBinderUpdate.get(getWatchers(el.firstChild)[0])).equal(10);
  assert(assigned).equal(11);

  s.value++;
  await delay();

  assert(assigned).equal(13);

  s.value++;
  await delay();

  assert(assigned).equal(15);
  assert(s.watchers.length).equal(1);
};

export const binding_minimize_updates = async (dom) => {
  const s = state("0");

  const C1 = () => {
    const renderedTimes = state(0);
    return i("C1:", renderedTimes, ":", () => {
      renderedTimes.value++;
      return s.value === "0" ? "N" : "Y";
    });
  };

  const C2 = () => {
    const renderedTimes = state(0);
    const isO = watch(() => s.value === "0");
    return i("C2:", renderedTimes, ":", () => {
      renderedTimes.value++;
      return isO.value ? "N" : "Y";
    });
  };

  dom.append(div(input({ value: s, onchange: (e) => (s.value = e.target.value) }), C1(), C2()));
  const dom1 = dom.querySelector("input");
  const set = (value) => {
    dom1.value = value;
    dom1.dispatchEvent(new Event("change"));
  };

  await delay();
  assert(dom.innerHTML).equal("<div><input><i>C1:1:N</i><i>C2:1:N</i></div>");

  set(1);
  await delay();
  set(2);
  await delay();
  set(3);
  await delay(10);
  assert(dom.innerHTML).equal("<div><input><i>C1:4:Y</i><i>C2:2:Y</i></div>");

  set(0);
  await delay(10);
  assert(dom.innerHTML).equal("<div><input><i>C1:5:N</i><i>C2:3:N</i></div>");

  set(1);
  await delay();
  set(2);
  await delay();
  set(3);
  await delay(10);
  assert(dom.innerHTML).equal("<div><input><i>C1:8:Y</i><i>C2:4:Y</i></div>");
};

export const binding_handler_watch_connected = async (dom) => {
  const data = state(1);
  const handler = (element) =>
    watch(() => {
      const value = data.value;
      return () => dom.append(element(value));
    });

  dom.append(button({ onclick: handler(i), oncustom: handler(b) }));

  dom.querySelector("button").click();
  dom.querySelector("button").dispatchEvent(new Event("custom"));
  assert(dom.innerHTML).equal("<button></button><i>1</i><b>1</b>");

  data.value = 2;
  await delay();
  dom.querySelector("button").click();
  dom.querySelector("button").dispatchEvent(new Event("custom"));
  assert(dom.innerHTML).equal("<button></button><i>1</i><b>1</b><i>2</i><b>2</b>");
};

export const binding_handler_watch_disconnected = async () => {
  const data = state(1);
  const dom = button({
    onclick: watch(() => {
      const value = data.value;
      return () => dom.append(i(value));
    }),
  });

  dom.click();
  assert(dom.outerHTML).equal("<button><i>1</i></button>");

  data.value++;
  await delay();
  dom.click();
  assert(dom.outerHTML).equal("<button><i>1</i><i>1</i></button>");
};

export const binding_handler_state_disconnected = async () => {
  const onclick = state(() => dom.append(i(1)));
  const dom = button({ onclick });
  dom.click();
  assert(dom.outerHTML).equal("<button><i>1</i></button>");

  onclick.value = () => dom.append(i(2));
  await delay();
  dom.click();
  assert(dom.outerHTML).equal("<button><i>1</i><i>1</i></button>");
};

export const binding_property_disconnected = async () => {
  const data = state("123");
  let closure = 1;
  const dom = div({ "data-state": data, "data-fn": () => `${data.value.length}:${closure++}` });

  assert(dom.outerHTML).equal('<div data-state="123" data-fn="3:1"></div>');

  data.value = undefined;
  await delay();
  assert(dom.outerHTML).equal('<div data-state="123" data-fn="3:1"></div>');

  data.value = "abc";
  await delay();

  assert(dom.outerHTML).equal('<div data-state="123" data-fn="3:1"></div>');
};

export const binding_conditional = async (dom) => {
  const flag = state(false);
  const data = state(1);
  dom.append(div(() => (flag.value ? a(data) : b(data))));

  assert(dom.innerHTML).equal("<div><b>1</b></div>");
  data.value++;
  await delay();

  assert(dom.innerHTML).equal("<div><b>2</b></div>");

  const be = dom.querySelector("b");
  flag.value = true;
  await delay();

  assert(dom.innerHTML).equal("<div><a>2</a></div>");

  data.value++;
  await delay();

  assert(dom.innerHTML).equal("<div><a>3</a></div>");
  assert(be.outerHTML).equal("<b>2</b>"); // disconnected - thus not updated
};

export const binding_conditional_falsy = async (dom) => {
  const flag = state(true);
  const data = state(1);
  dom.append(
    div(
      () => (flag.value ? data.value : false),
      () => (flag.value ? data.value : 0),
      () => (flag.value ? data.value : null),
      () => (flag.value ? data.value : undefined)
    )
  );
  assert(dom.innerHTML).equal("<div>1111</div>");

  data.value++;
  await delay();
  assert(dom.innerHTML).equal("<div>2222</div>");

  flag.value = false;
  await delay();
  assert(dom.innerHTML).equal("<div>false0</div>");

  data.value++;
  await delay();
  assert(dom.innerHTML).equal("<div>false0</div>");

  flag.value = true;
  await delay();
  assert(dom.innerHTML).equal("<div>33</div>"); // `false` and `0` return as binding
};

export const binding_function_with_watch = async (dom) => {
  const flag = state(false);
  const s = state(1);
  dom.append(
    div(() => {
      const text = watch(() => s.value);
      return (flag.value ? a : b)(text);
    })
  );
  for (let i = 0; i < 20; ++i) {
    flag.value = !flag.value;
    await delay();
  }
  await delay(1000);
  assert(flag.watchers.length).equal(1);
  assert(s.watchers.length).range(1, 3);
};

export const fixed_component_property_connected = async (dom) => {
  const data = state("");
  let closure = 1;
  dom.append(div({ "data-state": data, "data-fn": () => `${data.value.length}:${closure++}` }));

  assert(dom.innerHTML).equal('<div data-state="" data-fn="0:1"></div>');

  data.value = undefined;
  await delay();
  assert(dom.innerHTML).equal('<div data-state="undefined" data-fn="0:1"></div>');

  data.value = "abc";
  await delay();

  assert(dom.innerHTML).equal('<div data-state="abc" data-fn="3:2"></div>');
};

export const dynamic_component_property_connected = async (dom) => {
  const flag = state(false);
  const data = state("");
  let updatedTimes = 0;
  dom.append(
    div(() =>
      (flag.value ? a : b)({
        "data-state": data,
        "data-fn": () => {
          updatedTimes++;
          return data.value.length;
        },
      })
    )
  );

  for (let i = 0; i < 20; ++i) {
    flag.value = !flag.value;
    await delay();
  }

  await delay(1000);

  assert(updatedTimes).equal(21);
  assert(flag.watchers.length).equal(1);
  assert(data.watchers.length).equal(3);
};
