import { Scope } from "../src/scope";
import { tags } from "../src/tags";
import { assert } from "./utils";
const { div } = tags(new Scope());

export const basic_rendering = () => {
  assert(div().outerHTML).equal("<div></div>");
  assert(div(null).outerHTML).equal("<div></div>");
  assert(div(undefined).outerHTML).equal("<div></div>");
  assert(div(0).outerHTML).equal("<div>0</div>");
  assert(div("0").outerHTML).equal("<div>0</div>");
  assert(div(document.createElement("span")).outerHTML).equal("<div><span></span></div>");

  assert(div(0, undefined, 1, null, [], 2, [3, ["4"], null, 5]).outerHTML).equal("<div>012345</div>");

  const dangerousPayload = '">gt;&gt;&#62%3E%253E<!--';
  assert(div({ data: dangerousPayload }, dangerousPayload).outerHTML).equal(
    '<div data="&quot;>gt;&amp;gt;&amp;#62%3E%253E<!--">"&gt;gt;&amp;gt;&amp;#62%3E%253E&lt;!--</div>'
  );
};

export const attributes_handling = () => {
  let onClickCalled = 0;
  let onCustomCalled = 0;
  const el = div({
    onclick: () => onClickCalled++,
    oncustom: () => onCustomCalled++,
    data: 1,
    onchange: null,
    class: null,
  });
  el.click();
  el.dispatchEvent(new Event("custom"));

  assert(el.outerHTML).equal('<div data="1" class="null"></div>');
  assert(el.onchange).equal(null);
  assert(el.className).equal(null);
  assert(onClickCalled).equal(1);
  assert(onCustomCalled).equal(1);
};
