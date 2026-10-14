/* Web chat model adapter. The provider key is read from the environment only.
   Required for live replies: OIIO_AI_API_KEY
   Optional: OIIO_AI_BASE_URL (default https://api.openai.com/v1)
             OIIO_AI_MODEL (default gpt-4o-mini)
   With no key the handler streams a local persona reply so /chat still works. */

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

function envOf(extra) {
  return Object.assign({}, process.env, extra || {});
}

function hasKey(env) {
  return Boolean(env.OIIO_AI_API_KEY && String(env.OIIO_AI_API_KEY).trim());
}

function lastUserText(body) {
  const messages = (body && body.messages) || [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i] && messages[i].role === "user") return String(messages[i].content || "");
  }
  return String((body && body.text) || "");
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

async function callModel(body, env) {
  const base = (env.OIIO_AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.OIIO_AI_MODEL || "gpt-4o-mini";
  const text = lastUserText(body);
  const userContent = body.image && body.image.data
    ? [
        { type: "text", text: text || "请看这张图片。" },
        { type: "image_url", image_url: { url: "data:" + (body.image.mediaType || "image/jpeg") + ";base64," + body.image.data } }
      ]
    : text;
  const payload = {
    model,
    stream: body.purpose !== "vision",
    temperature: 0.7,
    messages: [
      { role: "system", content: body.purpose === "vision"
        ? SYSTEM_PROMPT + "\n只输出 JSON：{\"items\":[{\"name\":\"\",\"portion\":\"\"}],\"slot\":\"早餐|午餐|下午加餐|晚餐|夜宵|加餐|\"}。看不清就让 items 为空。不要写卡路里。"
        : SYSTEM_PROMPT },
      { role: "user", content: userContent }
    ]
  };
  const r = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.OIIO_AI_API_KEY,
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

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleChat(req, res) {
  const env = envOf();
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ ok: true, mode: hasKey(env) ? "live" : "mock" }));
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "bad_json" }));
    return;
  }

  const text = lastUserText(body).slice(0, 500);
  if (body.image && body.image.data && String(body.image.data).length > 2_200_000) {
    res.writeHead(413, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "image_too_large" }));
    return;
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "connection": "keep-alive",
    "x-accel-buffering": "no"
  });

  try {
    if (logic.isCrisis(text)) {
      await streamText(res, logic.CRISIS_REPLY, Object.assign({}, env, { OIIO_AI_MOCK_FAST: "1" }));
      res.end();
      return;
    }

    if (body.purpose === "vision" && !hasKey(env)) {
      sse(res, { type: "meta", items: [], mock: true });
      sse(res, { type: "done", text: "", mock: true });
      res.end();
      return;
    }

    if (!hasKey(env)) {
      sse(res, { type: "meta", mock: true });
      await streamText(res, logic.localChatReply(text), env);
      res.end();
      return;
    }

    const upstream = await callModel(Object.assign({}, body, { text }), env);
    if (body.purpose === "vision") {
      const json = await upstream.json();
      const raw = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
      const parsed = parseVisionJson(raw);
      sse(res, { type: "meta", items: parsed.items, slot: parsed.slot || "", mock: false });
      sse(res, { type: "done", text: "", mock: false });
      res.end();
      return;
    }

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

module.exports = { handleChat, SYSTEM_PROMPT, hasKey };
