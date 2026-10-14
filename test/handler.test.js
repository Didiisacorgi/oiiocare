const test = require("node:test");
const assert = require("node:assert/strict");
const { handleChat } = require("../server/chat-handler");

function mockRes() {
  const chunks = [];
  return {
    code: 0,
    headers: {},
    writeHead(code, headers) {
      this.code = code;
      this.headers = headers || {};
    },
    write(chunk) {
      chunks.push(String(chunk));
    },
    end(chunk) {
      if (chunk) chunks.push(String(chunk));
      this.done = true;
      this.body = chunks.join("");
    }
  };
}

async function mockReq(method, body, headers) {
  const raw = body ? Buffer.from(typeof body === "string" ? body : JSON.stringify(body)) : Buffer.alloc(0);
  return {
    method,
    headers: headers || {},
    async *[Symbol.asyncIterator]() {
      if (raw.length) yield raw;
    }
  };
}

function eventsOf(res) {
  return res.body.split("\n\n").filter(Boolean).map((block) => JSON.parse(block.replace(/^data:\s*/, "")));
}

function clearKeys() {
  delete process.env.OIIO_AI_API_KEY;
  delete process.env.OIIO_VISION_API_KEY;
  delete process.env.OIIO_AI_BASE_URL;
  delete process.env.OIIO_VISION_BASE_URL;
  delete process.env.OIIO_VISION_MODEL;
}

test("GET reports mock mode when no provider key is set", async () => {
  clearKeys();
  const res = mockRes();
  await handleChat(await mockReq("GET"), res);
  assert.equal(res.code, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.ok, true);
  assert.equal(json.mode, "mock");
  assert.equal(JSON.stringify(json).includes("sk-"), false);
});

test("POST streams a persona reply and never echoes a key", async () => {
  clearKeys();
  process.env.OIIO_AI_MOCK_FAST = "1";
  const res = mockRes();
  await handleChat(await mockReq("POST", {
    messages: [{ role: "user", content: "下午可能还会喝杯奶茶" }]
  }), res);
  assert.equal(res.code, 200);
  assert.match(res.headers["content-type"], /text\/event-stream/);
  assert.match(res.body, /等真发生了/);
  assert.equal(res.body.includes("OIIO_AI_API_KEY"), false);
  const events = res.body.split("\n\n").filter(Boolean).map((block) => JSON.parse(block.replace(/^data:\s*/, "")));
  assert.equal(events.some((e) => e.type === "done" && e.mock === true), true);
});

test("crisis posts skip the model and return the care line", async () => {
  process.env.OIIO_AI_API_KEY = "should-not-be-sent";
  process.env.OIIO_AI_MOCK_FAST = "1";
  const res = mockRes();
  await handleChat(await mockReq("POST", {
    messages: [{ role: "user", content: "我不想活了" }]
  }), res);
  assert.match(res.body, /紧急援助/);
  assert.equal(res.body.includes("should-not-be-sent"), false);
  clearKeys();
});

test("OPTIONS allows the OSS and local origins and rejects others", async () => {
  const ok = mockRes();
  await handleChat(await mockReq("OPTIONS", null, { origin: "https://www.oiiocare.com" }), ok);
  assert.equal(ok.code, 204);
  assert.equal(ok.headers["access-control-allow-origin"], "https://www.oiiocare.com");
  assert.match(ok.headers["access-control-allow-methods"], /POST/);
  assert.match(ok.headers["access-control-allow-headers"], /Content-Type/);

  const apex = mockRes();
  await handleChat(await mockReq("OPTIONS", null, { origin: "https://oiiocare.com" }), apex);
  assert.equal(apex.headers["access-control-allow-origin"], "https://oiiocare.com");

  const preview = mockRes();
  await handleChat(await mockReq("OPTIONS", null, { origin: "https://oiiocare-web-git-main-orangewangs-projects.vercel.app" }), preview);
  assert.equal(preview.code, 204);

  const local = mockRes();
  await handleChat(await mockReq("OPTIONS", null, { origin: "http://127.0.0.1:4173" }), local);
  assert.equal(local.code, 204);
  assert.equal(local.headers["access-control-allow-origin"], "http://127.0.0.1:4173");

  const denied = mockRes();
  await handleChat(await mockReq("OPTIONS", null, { origin: "https://evil.example" }), denied);
  assert.equal(denied.code, 403);
  assert.equal(denied.headers["access-control-allow-origin"], undefined);
});

test("POST from an allowed origin keeps CORS headers on the SSE response", async () => {
  clearKeys();
  process.env.OIIO_AI_MOCK_FAST = "1";
  const res = mockRes();
  await handleChat(await mockReq("POST", {
    messages: [{ role: "user", content: "下午可能还会喝杯奶茶" }]
  }, { origin: "https://oiiocare.com" }), res);
  assert.equal(res.code, 200);
  assert.equal(res.headers["access-control-allow-origin"], "https://oiiocare.com");
  assert.match(res.headers["content-type"], /text\/event-stream/);
  assert.match(res.body, /等真发生了/);
});

test("a disallowed Origin is rejected before the model", async () => {
  process.env.OIIO_AI_API_KEY = "should-not-be-sent";
  const res = mockRes();
  await handleChat(await mockReq("POST", {
    messages: [{ role: "user", content: "你好" }]
  }, { origin: "https://not-oiiocare.example" }), res);
  assert.equal(res.code, 403);
  assert.equal(res.body.includes("should-not-be-sent"), false);
  assert.equal(res.headers["access-control-allow-origin"], undefined);
  clearKeys();
});

test("vision without a vision key does not call DeepSeek", async () => {
  clearKeys();
  process.env.OIIO_AI_API_KEY = "text-key-should-stay-put";
  process.env.OIIO_AI_BASE_URL = "https://api.deepseek.com/v1";
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url) => {
    calls.push(String(url));
    throw new Error("should not fetch");
  };
  try {
    const res = mockRes();
    await handleChat(await mockReq("POST", {
      purpose: "vision",
      text: "",
      image: { mediaType: "image/jpeg", data: "aaaa" }
    }), res);
    assert.equal(calls.length, 0);
    assert.equal(res.code, 200);
    const meta = eventsOf(res).find((evt) => evt.type === "meta");
    assert.deepEqual(meta.items, []);
    assert.equal(res.body.includes("text-key-should-stay-put"), false);
  } finally {
    global.fetch = original;
    clearKeys();
  }
});

test("an image without purpose still uses the vision provider", async () => {
  clearKeys();
  process.env.OIIO_AI_API_KEY = "text-key";
  process.env.OIIO_AI_BASE_URL = "https://api.deepseek.com/v1";
  process.env.OIIO_VISION_API_KEY = "vision-key";
  process.env.OIIO_VISION_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  process.env.OIIO_VISION_MODEL = "qwen-vl-plus";
  let seen;
  const original = global.fetch;
  global.fetch = async (url, init) => {
    seen = { url: String(url), body: JSON.parse(init.body), auth: init.headers.authorization };
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{\"items\":[{\"name\":\"牛肉面\",\"portion\":\"1碗\"}]}" } }] })
    };
  };
  try {
    const res = mockRes();
    await handleChat(await mockReq("POST", {
      image: { mediaType: "image/jpeg", data: "bbbb" }
    }), res);
    assert.equal(seen.url, "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    assert.equal(seen.auth, "Bearer vision-key");
    assert.equal(seen.body.model, "qwen-vl-plus");
    assert.equal(seen.body.stream, false);
    assert.equal(seen.body.messages[1].content[1].type, "image_url");
    assert.equal(seen.body.messages[1].content[1].image_url.url.includes("api.deepseek.com"), false);
    const meta = eventsOf(res).find((evt) => evt.type === "meta");
    assert.equal(meta.items[0].name, "牛肉面");
    assert.equal(res.body.includes("vision-key"), false);
    assert.equal(res.body.includes("text-key"), false);
  } finally {
    global.fetch = original;
    clearKeys();
  }
});

test("text chat keeps using the text provider and never attaches an image", async () => {
  clearKeys();
  process.env.OIIO_AI_API_KEY = "text-key";
  process.env.OIIO_AI_BASE_URL = "https://api.deepseek.com/v1";
  process.env.OIIO_AI_MODEL = "deepseek-chat";
  process.env.OIIO_VISION_API_KEY = "vision-key";
  let seen;
  const original = global.fetch;
  global.fetch = async (url, init) => {
    seen = { url: String(url), body: JSON.parse(init.body), auth: init.headers.authorization };
    return {
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: {\"choices\":[{\"delta\":{\"content\":\"我在。\"}}]}\n\n"));
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        }
      })
    };
  };
  try {
    const res = mockRes();
    await handleChat(await mockReq("POST", {
      messages: [{ role: "user", content: "有点累" }]
    }), res);
    assert.equal(seen.url, "https://api.deepseek.com/v1/chat/completions");
    assert.equal(seen.auth, "Bearer text-key");
    assert.equal(seen.body.model, "deepseek-chat");
    assert.equal(seen.body.stream, true);
    assert.equal(typeof seen.body.messages[1].content, "string");
    assert.match(res.body, /我在/);
  } finally {
    global.fetch = original;
    delete process.env.OIIO_AI_MODEL;
    clearKeys();
  }
});

test("oversized text, message lists, and images are rejected", async () => {
  clearKeys();
  process.env.OIIO_AI_API_KEY = "text-key";
  const original = global.fetch;
  global.fetch = async () => { throw new Error("should not fetch"); };
  try {
    const long = mockRes();
    await handleChat(await mockReq("POST", { text: "啊".repeat(2001) }), long);
    assert.equal(long.code, 400);
    assert.match(long.body, /text_too_long/);

    const many = mockRes();
    const messages = Array.from({ length: 31 }, () => ({ role: "user", content: "嗨" }));
    await handleChat(await mockReq("POST", { messages }), many);
    assert.equal(many.code, 400);
    assert.match(many.body, /too_many_messages/);

    const image = mockRes();
    await handleChat(await mockReq("POST", {
      purpose: "vision",
      image: { mediaType: "image/jpeg", data: "a".repeat(4 * 1024 * 1024 + 1) }
    }), image);
    assert.equal(image.code, 413);
    assert.match(image.body, /image_too_large/);
  } finally {
    global.fetch = original;
    clearKeys();
  }
});
