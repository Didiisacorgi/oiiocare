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

async function mockReq(method, body) {
  const raw = body ? Buffer.from(JSON.stringify(body)) : Buffer.alloc(0);
  return {
    method,
    async *[Symbol.asyncIterator]() {
      if (raw.length) yield raw;
    }
  };
}

test("GET reports mock mode when no provider key is set", async () => {
  delete process.env.OIIO_AI_API_KEY;
  const res = mockRes();
  await handleChat(await mockReq("GET"), res);
  assert.equal(res.code, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.ok, true);
  assert.equal(json.mode, "mock");
  assert.equal(JSON.stringify(json).includes("sk-"), false);
});

test("POST streams a persona reply and never echoes a key", async () => {
  delete process.env.OIIO_AI_API_KEY;
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
  delete process.env.OIIO_AI_API_KEY;
});
