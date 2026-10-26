// Tests for script.js with a minimal DOM stub - no browser or deps needed.
// Run: node --test
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SCRIPT = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

function makePage() {
    function el(tag) {
        return {
            tag,
            children: [],
            parent: null,
            className: "",
            innerText: "",
            value: "",
            listeners: {},
            scrollTop: 0,
            scrollHeight: 0,
            appendChild(child) {
                this.children.push(child);
                child.parent = this;
            },
            remove() {
                if (this.parent) {
                    const i = this.parent.children.indexOf(this);
                    if (i >= 0) this.parent.children.splice(i, 1);
                    this.parent = null;
                }
            },
            addEventListener(type, fn) {
                this.listeners[type] = fn;
            },
            get lastChild() {
                return this.children[this.children.length - 1];
            },
            texts() {
                return this.children.map((c) => c.innerText);
            },
        };
    }
    const chat = el("div");
    const input = el("input");
    // One vm context per test: top-level consts in script.js must not leak
    // between tests.
    const ctx = vm.createContext({
        document: {
            getElementById: (id) => ({ chat, input })[id],
            createElement: el,
        },
        console: { error() {} },
        setTimeout, clearTimeout, AbortController, Event,
    });
    vm.runInContext(SCRIPT, ctx, { filename: "script.js" });
    return {
        chat,
        input,
        setFetch(fn) { ctx.fetch = fn; },
        send(msg) { input.value = msg; return vm.runInContext("send()", ctx); },
    };
}

function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

test("two quick sends keep both replies", async () => {
    const page = makePage();
    const a = deferred();
    const b = deferred();
    let calls = 0;
    page.setFetch(() => (++calls === 1 ? a.promise : b.promise));

    const first = page.send("question one");
    const second = page.send("question two");
    a.resolve({ json: async () => ({ reply: "answer one" }) });
    await first;
    b.resolve({ json: async () => ({ reply: "answer two" }) });
    await second;

    assert.deepStrictEqual(page.chat.texts(), [
        "question one",
        "question two",
        "answer one",
        "answer two",
    ]);
});

test("typing indicator is removed on success", async () => {
    const page = makePage();
    page.setFetch(async () => ({ json: async () => ({ reply: "hi" }) }));
    await page.send("hello");
    assert.deepStrictEqual(page.chat.texts(), ["hello", "hi"]);
});

test("whitespace-only input sends nothing", async () => {
    const page = makePage();
    let called = false;
    page.setFetch(() => { called = true; });
    await page.send("   ");
    assert.strictEqual(called, false);
    assert.deepStrictEqual(page.chat.texts(), []);
});

test("Enter key sends the message", async () => {
    const page = makePage();
    page.setFetch(async () => ({ json: async () => ({ reply: "ok" }) }));
    page.input.value = "via keyboard";
    page.input.listeners.keydown({ key: "Enter" });
    await new Promise((r) => setImmediate(r));
    assert.deepStrictEqual(page.chat.texts(), ["via keyboard", "ok"]);
});

test("request is abortable and abort shows a timeout message", async () => {
    const page = makePage();
    let gotSignal = null;
    page.setFetch((url, opts) => {
        gotSignal = opts && opts.signal;
        return new Promise((_, reject) => {
            opts.signal.addEventListener("abort", () =>
                reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        });
    });
    const pending = page.send("slow question");
    assert.ok(gotSignal && gotSignal.aborted === false, "fetch must receive an AbortSignal");
    gotSignal.dispatchEvent(new Event("abort")); // what the timer does after 45s
    await pending;
    assert.deepStrictEqual(page.chat.texts()[1], "The AI took too long to answer. Please try again.");
});

test("network failure shows a friendly message", async () => {
    const page = makePage();
    page.setFetch(async () => { throw new TypeError("Failed to fetch"); });
    await page.send("hello");
    assert.deepStrictEqual(page.chat.texts(), ["hello", "Could not reach the AI service. Please try again."]);
});
