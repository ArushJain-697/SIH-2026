// B3 harness: drives the REAL sanitizeWidgetHtml() from the pinned WorldMonitor
// repo (src/utils/widget-sanitizer.ts) with happy-dom (the project's own DOM
// test engine, see vitest.dom.config.mts) so we can actually MOUNT the
// sanitizer's output into a live document and observe whether a marker
// executes or a global gets clobbered -- not just inspect the output string.
import { Window } from 'happy-dom';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const SRC = process.env.WM_SRC;
const window = new Window({ url: 'https://lab.local/' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.Element = window.Element;
globalThis.HTMLIFrameElement = window.HTMLIFrameElement;
globalThis.Node = window.Node;
globalThis.MutationObserver = window.MutationObserver;
globalThis.navigator = window.navigator;

const mod = await import(pathToFileURL(`${SRC}/src/utils/widget-sanitizer.ts`).href + `?t=${Date.now()}`);
const { sanitizeWidgetHtml, wrapWidgetHtml } = mod;

let fired = [];
window.fireMarker = (name) => fired.push(name);

function test(name, payload) {
  fired = [];
  const out = sanitizeWidgetHtml(payload);
  const host = document.createElement('div');
  host.innerHTML = out;
  document.body.appendChild(host);
  // happy-dom executes inline event handler attributes assigned via
  // innerHTML the same way a real browser's HTML parser does (onerror etc
  // fire when the element is actually inserted/the image fails to load).
  const clobbered = window['wsRelayUrl'] !== undefined || window['CONFIG'] !== undefined;
  console.log(JSON.stringify({
    name,
    inputLen: payload.length,
    outputLen: out.length,
    markerFired: fired.length > 0,
    outputSample: out.slice(0, 220),
    clobberedGlobalDetected: clobbered,
  }));
  host.remove();
}

// 1. Classic mXSS structural trick: math/mi/style/img nesting that some
//    sanitizers mis-serialize-then-reparse into a live <img onerror>.
test('mxss-math-mi-style-img', `<math><mi><a><style><img src=x onerror="window.fireMarker('mxss1')"></style></a></mi></math>`);

// 2. Simple onerror on an allowed-looking tag not in ALLOWED_TAGS (img is NOT
//    in PURIFY_CONFIG.ALLOWED_TAGS -- confirms DOMPurify's own allowlist, not
//    just the custom style hook, is doing the real work).
test('plain-img-onerror', `<img src=x onerror="window.fireMarker('plain1')">`);

// 3. svg IS in ALLOWED_TAGS -- test the classic SVG/foreignObject/script path.
test('svg-foreignobject-script', `<svg><foreignObject><script>window.fireMarker('svg1')</script></foreignObject></svg>`);

// 4. style attribute is ALLOWED -- test the custom UNSAFE_STYLE_PATTERN hook
//    with common bypass techniques (unicode escape, comments inside url().
test('style-url-bypass-1', `<div style="background:url(javascript:window.fireMarker('style1'))">x</div>`);
test('style-url-bypass-2', `<div style="background:ur\\6cl(javascript:window.fireMarker('style2'))">x</div>`);
test('style-expression-ie-legacy', `<div style="width:expression(window.fireMarker('style3'))">x</div>`);

// 5. DOM Clobbering: a named element shadowing a global the app might read
//    as window.X instead of a local const. Testing both the historical
//    (now-debunked) wsRelayUrl name and a generic 'CONFIG' guess.
test('clobber-named-anchor', `<a id="wsRelayUrl" href="https://evil.example">x</a><a id="CONFIG" href="https://evil.example">y</a>`);

// 6. FORBID_TAGS coverage check -- button/input/form/select/textarea.
test('forbidden-tags', `<form><input onfocus="window.fireMarker('form1')" autofocus></form><button onclick="window.fireMarker('btn1')">x</button>`);

// 7. wrapWidgetHtml() end-to-end (the actual call path CustomWidgetPanel uses).
const wrapped = wrapWidgetHtml(`<div class="x" onclick="window.fireMarker('wrap1')">hi<img src=x onerror="window.fireMarker('wrap2')"></div>`);
console.log(JSON.stringify({ name: 'wrapWidgetHtml-e2e-sample', output: wrapped.slice(0, 300) }));
