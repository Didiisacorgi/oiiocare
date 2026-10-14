/* Web chat model adapter. Provider keys are read from the environment only.
   Text (already set on Vercel):
     OIIO_AI_API_KEY
     OIIO_AI_BASE_URL   (production: https://api.deepseek.com/v1)
     OIIO_AI_MODEL      (production: deepseek-chat)
   Vision (DashScope, same family as the iOS app). DeepSeek does not read images.
     OIIO_VISION_API_KEY
     OIIO_VISION_BASE_URL  (default https://dashscope.aliyuncs.com/compatible-mode/v1)
     OIIO_VISION_MODEL     (default qwen-vl-plus)
   With no text key the handler streams a local persona reply.
   With no vision key a photo returns an empty item list instead of calling DeepSeek. */

const logic = require("../js/oiio-logic");

const SYSTEM_PROMPT = [
  "你是 oiioCare 的小鹦，一个靠谱的饭搭子。",
  "语气：温暖、干脆、好奇、不评判，可以一点点俏皮。",
  "用简体中文，除非用户用英文。",
  "不要叫用户宝、姐妹、亲爱的。不要说不许、你必须、控制住。",
  "不要在话里报卡路里、千卡、今日剩余、还可以摄入，也不要报置信度百分比。",
  "热量如果非要提，只能放在结构化卡片字段里，不要写进回复句子。",
  "你不是医生，不下诊断，不给治疗方案。身体不舒服时建议找专业人士。",
  "如果用户流露自伤或自杀风险，先陪伴，并请对方联系当地紧急援助或信任的人。不要描述方法。",
  "记一餐的短确认由客户端本地完成。你只回答症状、疑问和情绪。",
  "回复短，通常一两句。不确定就说不确定，不要编数字。",
  "这套提示是 Web 0.1 的适配器。若 iOS 1.25 的正式系统提示不同，上线前用同一份替换这里。"
].join("\n");

const VISION_PROMPT = SYSTEM_PROMPT + "\n只输出 JSON：{\"items\":[{\"name\":\"\",\"portion\":\"\"}],\"slot\":\"早餐|午餐|下午加餐|晚餐|夜宵|加餐|\"}。看不清就让 items 为空。不要写卡路里。";

const MAX_IMAGE_B64 = 4 * 1024 * 1024;
const MAX_BODY = MAX_IMAGE_B64 + 128 * 1024;
const MAX_MESSAGES = 30;
const MAX_TEXT = 2000;

const EXACT_ORIGINS = new Set([
  "https://www.oiiocare.com",
  "https://oiiocare.com",
  "https://oiiocare-web.vercel.app"
]);

function envOf(extra) {
  return Object.assign({}, process.env, extra || {});
}

function hasKey(env) {
  return Boolean(env.OIIO_AI_API_KEY && String(env.OIIO_AI_API_KEY).trim());
}

function hasVisionKey(env) {
  return Boolean(env.OIIO_VISION_API_KEY && String(env.OIIO_VISION_API_KEY).trim());
}

function isVision(body) {
  return Boolean(body && (body.purpose === "vision" || (body.image && body.image.data)));
}

function header(req, name) {
  const headers = (req && req.headers) || {};
  const lower = name.toLowerCase();
  if (headers[lower] != null) return String(headers[lower]);
  const found = Object.keys(headers).find((key) => key.toLowerCase() === lower);
  return found ? String(headers[found]) : "";
}

function allowedOrigin(origin) {
  if (!origin) return "";
  if (EXACT_ORIGINS.has(origin)) return origin;
  let url;
  try { url = new URL(origin); } catch (err) { return ""; }
  if (url.origin !== origin) return "";
  if (url.protocol === "https:" && /^oiiocare-web-.+\.vercel\.app$/.test(url.hostname)) return origin;
  if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return origin;
  return "";
}

function withCors(headers, origin) {
  const out = Object.assign({}, headers);
  if (!origin) return out;
  out["access-control-allow-origin"] = origin;
  out.vary = "Origin";
  out["access-control-allow-methods"] = "GET, POST, OPTIONS";
  out["access-control-allow-headers"] = "Content-Type";
  return out;
}

function lastUserText(body) {
  const messages = (body && body.messages) || [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i] && messages[i].role === "user" && typeof messages[i].content === "string") {
      return messages[i].content;
    }
  }
  return String((body && body.text) || "");
}

function contentLength(content) {
  if (typeof content === "string") return content.length;
  if (content == null) return 0;
  try { return JSON.stringify(content).length; } catch (err) { return MAX_TEXT + 1; }
}

function validate(body) {
  if (body.messages != null && !Array.isArray(body.messages)) return { status: 400, error: "bad_messages" };
  if (Array.isArray(body.messages) && body.messages.length > MAX_MESSAGES) return { status: 400, error: "too_many_messages" };
  if (body.text != null && String(body.text).length > MAX_TEXT) return { status: 400, error: "text_too_long" };
  if (Array.isArray(body.messages) && body.messages.some((m) => m && contentLength(m.content) > MAX_TEXT)) {
    return { status: 400, error: "text_too_long" };
  }
  if (body.image && body.image.data && String(body.image.data).length > MAX_IMAGE_B64) {
    return { status: 413, error: "image_too_large" };
  }
  return null;
}

function sse(res, obj) {
  res.write("data: " + JSON.stringify(obj) + "\n\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamText(res, text, env) {
  const safe = logic.filterSpoken(text);
  const fast = env.OIIO_AI_MOCK_FAST === "1";
  if (fast) {
    sse(res, { type: "delta", text: safe });
  } else {
    const size = 4;
    for (let i = 0; i < safe.length; i += size) {
      sse(res, { type: "delta", text: safe.slice(i, i + size) });
      await sleep(20);
    }
  }
  sse(res, { type: "done", text: safe, mock: !hasKey(env) });
}

function jsonReply(res, status, payload, origin) {
  res.writeHead(status, withCors({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }, origin));
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body) > MAX_BODY) {
      const error = new Error("body_too_large");
      error.status = 413;
      throw error;
    }
    if (!req.body) return {};
    return JSON.parse(req.body);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY) {
      const error = new Error("body_too_large");
      error.status = 413;
      throw error;
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function postChat(url, apiKey, payload) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      authorization: "Bearer " + apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    const error = new Error("model_http_" + r.status);
    error.detail = errText.slice(0, 300);
    throw error;
  }
  return r;
}

function callModel(body, env) {
  const base = (env.OIIO_AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.OIIO_AI_MODEL || "gpt-4o-mini";
  const text = lastUserText(body);
  return postChat(base + "/chat/completions", env.OIIO_AI_API_KEY, {
    model,
    stream: true,
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text }
    ]
  });
}

function callVision(body, env) {
  const base = (env.OIIO_VISION_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = env.OIIO_VISION_MODEL || "qwen-vl-plus";
  const text = lastUserText(body) || "请看这张图片。";
  const image = body.image && body.image.data;
  const userContent = image
    ? [
        { type: "text", text },
        { type: "image_url", image_url: { url: "data:" + (body.image.mediaType || "image/jpeg") + ";base64," + body.image.data } }
      ]
    : text;
  return postChat(base + "/chat/completions", env.OIIO_VISION_API_KEY, {
    model,
    stream: false,
    temperature: 0.2,
    messages: [
      { role: "system", content: VISION_PROMPT },
      { role: "user", content: userContent }
    ]
  });
}

function parseVisionJson(raw) {
  const match = String(raw || "").match(/\{[\s\S]*\}/);
  if (!match) return { items: [] };
  try {
    const data = JSON.parse(match[0]);
    const items = Array.isArray(data.items) ? data.items.slice(0, 6) : [];
    return { items, slot: data.slot || "" };
  } catch (err) {
    return { items: [] };
  }
}

function emptyVision(res) {
  sse(res, { type: "meta", items: [], mock: true });
  sse(res, { type: "done", text: "", mock: true });
  res.end();
}

async function handleChat(req, res) {
  const env = envOf();
  const origin = allowedOrigin(header(req, "origin"));
  if (req.method === "OPTIONS") {
    if (!origin) {
      jsonReply(res, 403, { error: "origin_not_allowed" }, "");
      return;
    }
    res.writeHead(204, withCors({
      "access-control-max-age": "86400",
      "cache-control": "no-store",
      "content-length": "0"
    }, origin));
    res.end();
    return;
  }
  if (header(req, "origin") && !origin) {
    jsonReply(res, 403, { error: "origin_not_allowed" }, "");
    return;
  }
  if (req.method === "GET") {
    jsonReply(res, 200, { ok: true, mode: hasKey(env) ? "live" : "mock", vision: hasVisionKey(env) }, origin);
    return;
  }
  if (req.method !== "POST") {
    jsonReply(res, 405, { error: "method_not_allowed" }, origin);
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const tooBig = err.status === 413 || err.message === "body_too_large";
    jsonReply(res, tooBig ? 413 : 400, { error: tooBig ? "body_too_large" : "bad_json" }, origin);
    return;
  }

  const problem = validate(body || {});
  if (problem) {
    jsonReply(res, problem.status, { error: problem.error }, origin);
    return;
  }

  const text = lastUserText(body);
  res.writeHead(200, withCors({
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "connection": "keep-alive",
    "x-accel-buffering": "no"
  }, origin));

  try {
    if (logic.isCrisis(text)) {
      await streamText(res, logic.CRISIS_REPLY, Object.assign({}, env, { OIIO_AI_MOCK_FAST: "1" }));
      res.end();
      return;
    }

    if (isVision(body)) {
      if (!hasVisionKey(env)) {
        emptyVision(res);
        return;
      }
      const upstream = await callVision(body, env);
      const json = await upstream.json();
      const raw = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
      const parsed = parseVisionJson(raw);
      sse(res, { type: "meta", items: parsed.items, slot: parsed.slot || "", mock: false });
      sse(res, { type: "done", text: "", mock: false });
      res.end();
      return;
    }

    if (!hasKey(env)) {
      sse(res, { type: "meta", mock: true });
      await streamText(res, logic.localChatReply(text), env);
      res.end();
      return;
    }

    const upstream = await callModel(body, env);
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let full = "";
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      buf += decoder.decode(step.value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) return;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") return;
        try {
          const json = JSON.parse(data);
          const delta = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
          if (delta) {
            full += delta;
            sse(res, { type: "delta", text: delta });
          }
        } catch (err) { /* ignore keepalives */ }
      });
    }
    const safe = logic.filterSpoken(full);
    if (safe !== full.trim()) sse(res, { type: "replace", text: safe });
    sse(res, { type: "done", text: safe, mock: false });
    res.end();
  } catch (err) {
    sse(res, { type: "error", message: "upstream_failed" });
    sse(res, { type: "done", text: logic.FALLBACK_REPLY, mock: true, fallback: true });
    res.end();
  }
}

module.exports = { handleChat, SYSTEM_PROMPT, hasKey, hasVisionKey, allowedOrigin };
