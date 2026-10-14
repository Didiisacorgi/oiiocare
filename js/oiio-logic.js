/* Shared routing, nutrition estimates, and persona copy for Web Chat 0.1.
   Meal confirmations stay local. The model is only asked for questions,
   symptoms, and emotions (see /api/chat). */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OiioLogic = api;
})(typeof window !== "undefined" ? window : null, function () {
  const DAILY = { protein: 95, carb: 265, fat: 53 };
  const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

  const FOODS = [
    { key: "牛肉面", unit: "碗", p: 20, c: 79, f: 16 },
    { key: "卤蛋", unit: "个", p: 7, c: 1, f: 5 },
    { key: "茶叶蛋", unit: "个", p: 7, c: 1, f: 5 },
    { key: "鸡蛋", unit: "个", p: 6, c: 1, f: 5 },
    { key: "煎蛋", unit: "个", p: 6, c: 1, f: 5 },
    { key: "豆浆", unit: "杯", p: 8, c: 12, f: 3 },
    { key: "包子", unit: "个", p: 9, c: 46, f: 5 },
    { key: "米粉", unit: "碗", p: 12, c: 70, f: 10 },
    { key: "面条", unit: "碗", p: 12, c: 68, f: 12 },
    { key: "拉面", unit: "碗", p: 14, c: 70, f: 14 },
    { key: "米饭", unit: "碗", p: 4, c: 45, f: 0.5 },
    { key: "青菜", unit: "份", p: 2, c: 4, f: 0.3 },
    { key: "奶茶", unit: "杯", p: 1, c: 38, f: 8 },
    { key: "火锅", unit: "餐", p: 28, c: 20, f: 32 },
    { key: "吐司", unit: "片", p: 3, c: 14, f: 2 },
    { key: "面包", unit: "片", p: 3, c: 15, f: 2 },
    { key: "粥", unit: "碗", p: 3, c: 28, f: 1 },
    { key: "牛奶", unit: "杯", p: 8, c: 12, f: 8 },
    { key: "咖啡", unit: "杯", p: 1, c: 2, f: 2 },
    { key: "酸奶", unit: "杯", p: 6, c: 14, f: 3 },
    { key: "沙拉", unit: "份", p: 6, c: 12, f: 8 },
    { key: "苹果", unit: "个", p: 0.4, c: 19, f: 0.2 },
    { key: "香蕉", unit: "根", p: 1, c: 23, f: 0.3 },
    { key: "面", unit: "碗", p: 12, c: 68, f: 12 }
  ];

  const FEELINGS = [
    { id: "ok", emoji: "😊", label: "刚好" },
    { id: "full", emoji: "😮", label: "有点撑" },
    { id: "unwell", emoji: "😣", label: "不舒服" },
    { id: "skip", emoji: "", label: "跳过" }
  ];

  const MODES = [
    { id: "listen", title: "听我说", sub: "我先听着，不急着给建议" },
    { id: "pause", title: "帮我缓一缓", sub: "先停一下，挑件小事做" },
    { id: "advice", title: "直接给我建议", sub: "说重点，给我一个办法" }
  ];

  const PAUSE_ACTIONS = [
    { id: "walk", emoji: "🚶", label: "离开厨房走走", reply: "好，离开厨房走走。回来想说再说。" },
    { id: "water", emoji: "💧", label: "先喝杯水", reply: "好，先去喝杯水。甜的可以等水喝完再决定。" },
    { id: "sit", emoji: "🧘", label: "坐 2 分钟", reply: "好，坐两分钟就行。钟不用太准。" },
    { id: "no", emoji: "", label: "都不想", reply: "那就不做。人在这儿就行，想说再说。" }
  ];

  const CRISIS_RE = /自杀|不想活|活不下去|结束生命|自残|割腕|伤害自己|想死/;
  const CRISIS_REPLY = "我在这儿。这种时候我帮不上专业的忙。如果你正处在危险里，请联系当地紧急援助，或找身边信任的人陪着你。";
  const FALLBACK_REPLY = "我这边卡住了，你的话我收到了。";

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function pct(value, target) {
    if (!target) return 0;
    return Math.round((value / target) * 100);
  }

  function rings(macros) {
    macros = macros || { p: 0, c: 0, f: 0 };
    return {
      protein: pct(macros.p, DAILY.protein),
      carb: pct(macros.c, DAILY.carb),
      fat: pct(macros.f, DAILY.fat)
    };
  }

  function addMacros(list) {
    return list.reduce(
      (acc, m) => ({
        p: round1(acc.p + (m.p || 0)),
        c: round1(acc.c + (m.c || 0)),
        f: round1(acc.f + (m.f || 0))
      }),
      { p: 0, c: 0, f: 0 }
    );
  }

  function dayKey(date) {
    const x = date instanceof Date ? date : new Date(date);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const d = String(x.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function parseCount(windowText) {
    const m = String(windowText || "").match(/(\d+|[一二两三四五六七八九十])/);
    if (!m) return 1;
    if (/^\d+$/.test(m[1])) return Math.max(1, Number(m[1]));
    return CN[m[1]] || 1;
  }

  function parseItems(text) {
    const found = [];
    const sorted = FOODS.slice().sort((a, b) => b.key.length - a.key.length);
    sorted.forEach((food) => {
      const idx = text.indexOf(food.key);
      if (idx < 0) return;
      const dominated = found.some((f) => f.key !== food.key && f.key.includes(food.key));
      if (dominated) return;
      const windowText = text.slice(Math.max(0, idx - 4), idx + food.key.length + 1);
      const count = parseCount(windowText);
      found.push({
        key: food.key,
        name: food.key,
        unit: food.unit,
        count,
        portion: count + food.unit,
        p: round1(food.p * count),
        c: round1(food.c * count),
        f: round1(food.f * count)
      });
    });
    return found;
  }

  function explicitSlot(text) {
    if (/下午加餐|下午茶/.test(text)) return "下午加餐";
    if (/夜宵|宵夜/.test(text)) return "夜宵";
    if (/早餐|早饭|早上/.test(text)) return "早餐";
    if (/午餐|午饭|中午/.test(text)) return "午餐";
    if (/晚餐|晚饭/.test(text)) return "晚餐";
    if (/加餐/.test(text)) return "加餐";
    return null;
  }

  function slotFromHour(hour) {
    if (hour < 10) return "早餐";
    if (hour < 14) return "午餐";
    if (hour < 17) return "下午加餐";
    if (hour < 21) return "晚餐";
    return "夜宵";
  }

  function clarifyOptions(hour) {
    if (hour >= 14 && hour < 18) {
      return [
        { id: "下午加餐", label: "下午加餐", primary: true },
        { id: "午餐", label: "午餐" },
        { id: "dismiss", label: "不是记录" }
      ];
    }
    if (hour >= 10 && hour < 14) {
      return [
        { id: "午餐", label: "午餐", primary: true },
        { id: "下午加餐", label: "下午加餐" },
        { id: "dismiss", label: "不是记录" }
      ];
    }
    if (hour >= 17 && hour < 21) {
      return [
        { id: "晚餐", label: "晚餐", primary: true },
        { id: "下午加餐", label: "下午加餐" },
        { id: "dismiss", label: "不是记录" }
      ];
    }
    return [
      { id: slotFromHour(hour), label: slotFromHour(hour), primary: true },
      { id: "加餐", label: "加餐" },
      { id: "dismiss", label: "不是记录" }
    ];
  }

  function isVagueMeal(text, items) {
    if (explicitSlot(text)) return false;
    if (items.length === 1 && (items[0].key === "面" || items[0].key === "米饭")) return true;
    if (/吃了点|吃的啥|随便吃/.test(text) && items.length <= 1) return true;
    return false;
  }

  function mealNote(macros) {
    if ((macros.c || 0) >= 70 || (macros.f || 0) >= 18) return "这餐碳水和脂肪偏高，晚饭清淡些就好";
    return "";
  }

  function mealReply(items, slot) {
    const keys = items.map((i) => i.key);
    if (keys.includes("豆浆") && keys.includes("包子")) return "记上了～豆浆配包子，挺舒服的早饭。";
    if (slot === "早餐" && items.length) return "记上了～" + items.map((i) => i.name).join("配") + "，这顿早饭记下了。";
    return "记上了～";
  }

  function isCrisis(text) {
    return CRISIS_RE.test(text || "");
  }

  function isFutureOrCraving(text) {
    return /想吃|想喝|好想|嘴馋|可能还会|等下再|还没吃|还没喝| craving/i.test(text) && !/吃了|喝了|吃过|喝过/.test(text);
  }

  function isSoftAside(text) {
    return /可能还会|等下再|等会儿再说|回头再说/.test(text) && !/想吃|加班|难过|焦虑|不舒服/.test(text);
  }

  function isCompanion(text) {
    if (isSoftAside(text)) return false;
    if (isFutureOrCraving(text)) return true;
    if (/加班|焦虑|难过|压力|心烦|好累|好烦|孤独|情绪|吃得有点乱| guilt/i.test(text) && !/吃了|喝了/.test(text)) return true;
    return false;
  }

  function companionAck(text) {
    if (/加班/.test(text) && /甜/.test(text)) return "加班到这会儿，想吃点甜的很正常。";
    if (/吃得有点乱/.test(text)) return "吃得有点乱也很常见，先不用急着补救。";
    if (/想吃|想喝/.test(text)) return "想吃的念头也可以先放在这儿。";
    if (/累|加班/.test(text)) return "听起来今天有点累。";
    return "听见了。想说的都可以先放在这儿。";
  }

  function isMeal(text) {
    if (isFutureOrCraving(text)) return false;
    if (/吃了|喝了|吃过|喝过/.test(text)) return true;
    return parseItems(text).length > 0 && /餐|早饭|午饭|晚饭|早上|中午|晚上/.test(text);
  }

  function parseCorrection(text, lastRecord) {
    if (!lastRecord || lastRecord.deleted) return null;
    const named = text.match(/是\s*([^，。,\s]{1,12}?)\s*不是\s*([^，。,\s]{1,12})/);
    const changed = text.match(/改成\s*([^，。,\s]{1,12})/);
    let to = null;
    let from = null;
    if (named) {
      to = named[1];
      from = named[2];
    } else if (/不对|不是|搞错|记错/.test(text) && changed) {
      to = changed[1];
    } else if (changed && /面|饭|蛋|菜|粉/.test(text)) {
      to = changed[1];
    }
    if (!to) return null;
    const blob = (lastRecord.content || "") + (lastRecord.items || []).map((i) => i.name).join("");
    if (from && !blob.includes(from) && !/不对|搞错|记错/.test(text)) return null;
    if (!from) {
      const hit = (lastRecord.items || []).find((i) => i.name !== to);
      from = hit ? hit.name : "上一顿";
    }
    return {
      from,
      to,
      reply: "好，改成" + to + "了。"
    };
  }

  function parseMeal(text, now) {
    const items = parseItems(text);
    const hour = now.getHours();
    const named = explicitSlot(text);
    const ambiguous = !named && isVagueMeal(text, items) && hour >= 14 && hour < 18;
    const slot = named || (ambiguous ? null : slotFromHour(hour));
    const macros = addMacros(items);
    return {
      items,
      macros,
      slot,
      ambiguous: Boolean(ambiguous && !named),
      options: clarifyOptions(hour),
      note: mealNote(macros),
      reply: mealReply(items, named || slot || slotFromHour(hour)),
      content: text
    };
  }

  function routeTurn(input) {
    const text = String((input && input.text) || "").trim();
    const now = input && input.now instanceof Date ? input.now : new Date();
    const ctx = (input && input.context) || {};
    if (isCrisis(text)) return { type: "crisis", reply: CRISIS_REPLY };
    if (input && input.image && !text) return { type: "photo" };
    const correction = parseCorrection(text, ctx.lastRecord);
    if (correction) return Object.assign({ type: "correction" }, correction);
    if (isSoftAside(text)) return { type: "chat" };
    if (isCompanion(text)) return { type: "companion", reply: companionAck(text) };
    if (isMeal(text)) {
      const meal = parseMeal(text, now);
      const clarifyCount = ctx.clarifyCount || 0;
      if (meal.ambiguous && clarifyCount < 2) {
        const food = meal.items[0] ? meal.items[0].name : "";
        const thing = food === "面" ? "这碗面" : "这个";
        return {
          type: "clarify",
          meal,
          question: "收到～" + thing + "算" + meal.options[0].label + "，还是" + meal.options[1].label + "？",
          options: meal.options
        };
      }
      if (!meal.slot) meal.slot = slotFromHour(now.getHours());
      return { type: "meal", meal };
    }
    return { type: "chat" };
  }

  function localChatReply(text) {
    if (isCrisis(text)) return CRISIS_REPLY;
    if (/可能还会|等下/.test(text)) return "行，等真发生了再说一声就行。";
    if (/奶茶/.test(text)) return "奶茶可以先放在想喝这边。真喝了再告诉我一声。";
    if (/不舒服|胀|疼|恶心/.test(text)) return "身体不舒服的话，我只能陪你记下来，不能当诊疗。严重的话去找专业的人看看。";
    return "我在。你接着说就行。";
  }

  function modeReply(modeId) {
    if (modeId === "listen") return { text: "好，我听着。从加班说，或者从那口甜的说，都行。", actions: false };
    if (modeId === "advice") {
      return {
        text: "可以先倒杯水，甜的放一放。真想吃的话，拿一小口坐下慢慢吃，吃完跟我说一声就行。",
        actions: false
      };
    }
    return { text: "好，先停一下，吃不吃等会儿再说。挑一个现在就能做的：", actions: true };
  }

  function filterSpoken(text) {
    let out = String(text || "");
    out = out.replace(/[^。！？!?]*?(卡路里|千卡|kcal|大卡|今日剩余|还可以摄入|置信度)[^。！？!?]*[。！？!?]?/gi, "");
    out = out.replace(/亲爱的|姐妹|宝儿?|不许|你必须|控制住/g, "");
    out = out.replace(/\s{2,}/g, " ").trim();
    if (!out) return "我在。你接着说就行。";
    return out;
  }

  function memoriesFrom(text, modeLabel) {
    const list = [];
    if (/甜/.test(text || "")) list.push("晚上容易想吃甜的");
    if (/面|米粉|面条/.test(text || "")) list.push("喜欢面食");
    if (/豆浆/.test(text || "")) list.push("早上常喝豆浆");
    if (modeLabel) list.push("上次选的陪法：" + modeLabel);
    return list;
  }

  function entryPayload(record) {
    const portion = (record.items || []).map((i) => i.name + " " + i.portion).join("、");
    return {
      kind: record.kind || "ate",
      content: record.content,
      portion: portion || null,
      source: "web",
      client_request_id: record.clientRequestId,
      reply: record.reply || ""
    };
  }

  function nudgeFor(records, now) {
    const hour = now.getHours();
    const today = dayKey(now);
    const todays = (records || []).filter((r) => !r.deleted && dayKey(r.createdAt) === today);
    const has = (slot) => todays.some((r) => r.slot === slot);
    if (has("早餐") && !has("午餐") && hour >= 11 && hour < 15) {
      return {
        id: "lunch",
        text: "中午～吃了吗？吃了就随口说一句，拍张照也行。",
        chips: [
          { id: "later", label: "吃了，等下说" },
          { id: "crave", label: "还没，想吃点啥" },
          { id: "photo", label: "拍一张" }
        ]
      };
    }
    return null;
  }

  function applyCorrection(record, correction) {
    const items = (record.items || []).map((item) => {
      if (item.name === correction.from || item.key === correction.from) {
        const next = parseItems(correction.to)[0];
        if (next) return next;
        return Object.assign({}, item, { name: correction.to, key: correction.to });
      }
      return item;
    });
    if (!items.some((i) => i.name === correction.to || i.key === correction.to)) {
      const parsed = parseItems(correction.to);
      if (parsed[0]) items.push(parsed[0]);
    }
    return {
      items,
      macros: addMacros(items),
      content: record.content.replace(correction.from, correction.to),
      note: mealNote(addMacros(items))
    };
  }

  return {
    DAILY,
    FEELINGS,
    MODES,
    PAUSE_ACTIONS,
    CRISIS_REPLY,
    FALLBACK_REPLY,
    pct,
    rings,
    addMacros,
    dayKey,
    parseItems,
    parseMeal,
    routeTurn,
    localChatReply,
    modeReply,
    filterSpoken,
    memoriesFrom,
    entryPayload,
    nudgeFor,
    applyCorrection,
    isCrisis,
    slotFromHour
  };
});
