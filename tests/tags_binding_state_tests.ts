import { tags, NodeBinder } from "../src/tags";
import { Scope } from "../src/scope";
import { assert, delay, intercept } from "./utils";
const scope = new Scope();
const { state } = scope;
const { i } = tags(scope);

const nodeBinderUpdate = intercept(NodeBinder.prototype, "update");

export const child_connected = async (dom) => {
  const data = state(1 as any);
  dom.append(i(data));
  assert(dom.innerHTML).equal("<i>1</i>");

  data.value = 2;
  await delay();
  assert(dom.innerHTML).equal("<i>2</i>");

  data.value = "";
  await delay();
  assert(dom.innerHTML).equal("<i></i>");

  data.value = 0;
  await delay();
  assert(dom.innerHTML).equal("<i>0</i>");

  data.value = NaN;
  await delay();
  assert(dom.innerHTML).equal("<i>NaN</i>");

  data.value = null; // remove text node
  await delay();
  assert(dom.innerHTML).equal("<i></i>");

  data.value = 3; // reset make no effect
  await delay();
  assert(dom.innerHTML).equal("<i></i>");
};

export const child_disconnected = async () => {
  const data = state(1);
  const dom = i(data);
  assert(dom.outerHTML).equal("<i>1</i>");

  data.value = 2;
  await delay();
  assert(dom.outerHTML).equal("<i>1</i>");
};

export const single_update_connected = async (dom) => {
  const data = state(1000);
  const el = i(data);
  const text = el.firstChild;

  dom.append(el);

  for (let i = 0; i < 10; i++) {
    data.value++;
  }
  await delay(); // request update after all changes

  assert(dom.innerHTML).equal("<i>1010</i>");
  assert(el.firstChild !== text).equal(true);
  assert(text instanceof Text).equal(true);
  assert(data.watchers.length).equal(1);

  const watcher = data.watchers[0];
  assert(watcher instanceof NodeBinder).equal(true);
  assert(nodeBinderUpdate.get(watcher)).equal(1);
};

export const multiple_updates_connected = async (dom) => {
  const data = state(1000);
  const el = i(data);
  const text = el.firstChild;

  dom.append(el);

  for (let i = 0; i < 10; i++) {
    data.value++;
    await delay(); // request update after each change
  }

  assert(dom.innerHTML).equal("<i>1010</i>");
  assert(el.firstChild !== text).equal(true);
  assert(text instanceof Text).equal(true);
  assert(data.watchers.length).equal(1);

  const watcher = data.watchers[0];
  assert(watcher instanceof NodeBinder).equal(true);
  assert(nodeBinderUpdate.get(watcher)).equal(10);
};

export const attributes_connected = async (dom) => {
  const data = state("");
  dom.append(i({ data }));

  assert(dom.innerHTML).equal('<i data=""></i>');

  data.value = undefined;
  await delay();
  assert(dom.innerHTML).equal('<i data="undefined"></i>');

  data.value = "abc";
  await delay();

  assert(dom.innerHTML).equal('<i data="abc"></i>');
};

export const attributes_disconnected = async () => {
  const data = state("123");
  const dom = i({ data });

  assert(dom.outerHTML).equal('<i data="123"></i>');

  data.value = undefined;
  await delay();
  assert(dom.outerHTML).equal('<i data="123"></i>');

  data.value = "abc";
  await delay();

  assert(dom.outerHTML).equal('<i data="123"></i>');
};

export const handler_connected = async (dom) => {
  let clicked1 = 0;
  let clicked2 = 0;

  const handler = state(({ detail }) => (clicked1 += detail || 10));
  const el = i({ onclick: handler, oncustom: handler });
  dom.append(el);
  el.click();
  el.dispatchEvent(new CustomEvent("custom", { detail: 1 }));
  assert(dom.innerHTML).equal("<i></i>");
  assert(clicked1).equal(11);
  assert(clicked2).equal(0);

  handler.value = ({ detail }) => (clicked2 += detail || 20);
  await delay();

  el.click();
  el.dispatchEvent(new CustomEvent("custom", { detail: 2 }));
  assert(clicked1).equal(11);
  assert(clicked2).equal(22);

  handler.value = null;
  await delay();

  el.click();
  el.dispatchEvent(new CustomEvent("custom", { detail: 3 }));
  assert(clicked1).equal(11);
  assert(clicked2).equal(22);
};

export const handler_disconnected = async () => {
  let clicked1 = 0;
  let clicked2 = 0;

  const onclick = state(() => clicked1++);
  const dom = i({ onclick });
  dom.click();
  assert(dom.outerHTML).equal("<i></i>");

  onclick.value = () => clicked2++;
  await delay();
  dom.click();
  assert(clicked1).equal(2);
  assert(clicked2).equal(0);
};
