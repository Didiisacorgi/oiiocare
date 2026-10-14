(() => {
  const L = window.OiioLogic;
  const SB = window.OiioSb;
  const STORE = window.OIIO_PUBLIC.APP_STORE_URL;
  const params = new URLSearchParams(location.search);
  const lang = (params.get("lang") || localStorage.getItem("oiio-lang") || "zh") === "en" ? "en" : "zh";
  const t = (zh, en) => (lang === "en" ? en : zh);
  let clockOffset = 0;
  if (params.get("clock")) {
    const target = new Date(params.get("clock"));
    if (!Number.isNaN(target.getTime())) clockOffset = target.getTime() - Date.now();
  }
  const now = () => new Date(Date.now() + clockOffset);
  const forceOffline = params.get("offline") === "1";

  let seq = 1;
  const state = {
    day: "",
    view: "chat",
    railHidden: false,
    session: null,
    records: [],
    messages: [],
    outbox: [],
    memories: [],
    meta: { gateDismissed: false, clarifyDay: "", clarifyCount: 0, nudges: [] },
    pendingPhoto: null,
    editingId: null,
    editDraft: "",
    editSlot: "",
    safetyOpen: false,
    busy: false
  };

  const $ = (sel) => document.querySelector(sel);
  const thread = () => $("[data-thread]");

  function uid() {
    return crypto.randomUUID();
  }
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function online() {
    return !forceOffline && navigator.onLine;
  }
  function hm(value) {
    return new Date(value).toLocaleTimeString(lang === "en" ? "en-GB" : "zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  function stamp(value) {
    const d = new Date(value);
    const key = L.dayKey(d);
    const today = L.dayKey(now());
    const prefix = key === today ? t("今天", "Today") : (d.getMonth() + 1) + t("月", "/") + d.getDate() + (lang === "en" ? "" : "日");
    return prefix + " " + hm(d);
  }
  function namesOf(record) {
    const items = record.items || [];
    if (!items.length) return record.content || t("一餐", "a meal");
    return items.map((i) => i.name).join("、");
  }
  function todayRecords() {
    return state.records.filter((r) => !r.deleted && L.dayKey(r.createdAt) === state.day);
  }
  function latestRecord() {
    const list = state.records.filter((r) => !r.deleted);
    return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).at(-1) || null;
  }
  function mealCount(day) {
    return state.records.filter((r) => !r.deleted && r.kind === "ate" && L.dayKey(r.createdAt) === (day || state.day)).length;
  }

  function db() {
    if (!db.p) {
      db.p = new Promise((resolve, reject) => {
        const req = indexedDB.open("oiiocare-chat", 1);
        req.onupgradeneeded = () => {
          const d = req.result;
          ["records", "messages", "outbox", "kv"].forEach((name) => {
            if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: "id" });
          });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return db.p;
  }
  function idb(store, mode, fn) {
    return db().then((d) => new Promise((resolve, reject) => {
      const tx = d.transaction(store, mode);
      let result;
      const req = fn(tx.objectStore(store));
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error || new Error("idb abort"));
      tx.onerror = () => reject(tx.error || req.error);
    }));
  }
  const getAll = (store) => idb(store, "readonly", (s) => s.getAll());
  const put = (store, value) => idb(store, "readwrite", (s) => s.put(structuredClone(value)));
  const del = (store, id) => idb(store, "readwrite", (s) => s.delete(id));

  async function loadKv(id, fallback) {
    const row = await idb("kv", "readonly", (s) => s.get(id));
    return row ? row.value : fallback;
  }
  function saveMeta() { return put("kv", { id: "meta", value: state.meta }); }
  function saveMemories() { return put("kv", { id: "memories", value: state.memories }); }

  function mirrorGuest() {
    const guest = state.records.filter((r) => !r.deleted && !r.synced).map((r) => ({
      id: r.id,
      kind: r.kind || "ate",
      content: r.content,
      source: "web",
      created_at: r.createdAt,
      guest: true
    }));
    localStorage.setItem("oiio-guest-records", JSON.stringify(guest));
  }

  async function persistMessage(message) {
    if (!message.seq) message.seq = seq++;
    state.messages.push(message);
    await put("messages", message);
  }
  async function updateMessage(message) {
    await put("messages", message);
  }
  async function persistRecord(record) {
    const idx = state.records.findIndex((r) => r.id === record.id);
    if (idx >= 0) state.records[idx] = record;
    else state.records.push(record);
    await put("records", record);
    mirrorGuest();
  }

  function remember(text, modeLabel) {
    const next = L.memoriesFrom(text, modeLabel);
    next.forEach((line) => {
      if (!state.memories.includes(line)) state.memories.push(line);
    });
    saveMemories();
  }

  function ring(percent, color) {
    const node = el("div", "ring");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 76 76");
    const radius = 30;
    const c = 2 * Math.PI * radius;
    const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    track.setAttribute("cx", "38"); track.setAttribute("cy", "38"); track.setAttribute("r", String(radius));
    track.setAttribute("fill", "none"); track.setAttribute("stroke", "#f0eaf8"); track.setAttribute("stroke-width", "7");
    const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    arc.setAttribute("cx", "38"); arc.setAttribute("cy", "38"); arc.setAttribute("r", String(radius));
    arc.setAttribute("fill", "none"); arc.setAttribute("stroke", color); arc.setAttribute("stroke-width", "7");
    arc.setAttribute("stroke-linecap", "round");
    arc.setAttribute("stroke-dasharray", Math.max(0.01, Math.min(100, percent) / 100 * c) + " " + c);
    svg.append(track, arc);
    const label = el("b", "", percent + "%");
    label.style.color = color;
    node.append(svg, label);
    return node;
  }

  function macroRow(macros) {
    const wrap = el("div", "rings");
    const spec = [
      ["protein", t("蛋白质", "Protein"), macros.p, "var(--blue)", "#5c7cfa"],
      ["carb", t("碳水", "Carbs"), macros.c, "var(--orange)", "#f4a261"],
      ["fat", t("脂肪", "Fat"), macros.f, "var(--pink)", "#f284a8"]
    ];
    const rings = L.rings(macros);
    spec.forEach(([key, label, grams, , color]) => {
      const col = el("div");
      col.append(ring(rings[key], color));
      col.append(el("small", "", label));
      col.append(el("strong", "", Math.round(grams) + "g"));
      wrap.append(col);
    });
    return wrap;
  }

  function todayPanel() {
    const meals = todayRecords().filter((r) => r.kind !== "emotion");
    const sum = L.addMacros(meals.map((r) => r.macros || { p: 0, c: 0, f: 0 }));
    const box = el("div");
    const totals = el("section", "panel");
    const head = el("header");
    head.append(el("strong", "", t("今日累计", "Today")));
    const date = now();
    head.append(el("span", "", (date.getMonth() + 1) + t("月", "/") + date.getDate() + (lang === "en" ? "" : "日")));
    totals.append(head, macroRow(sum));
    box.append(totals);

    const list = el("section", "panel");
    const listHead = el("header");
    listHead.append(el("strong", "", t("今日记录", "Entries")));
    listHead.append(el("span", "", String(meals.length)));
    list.append(listHead);
    if (!meals.length) list.append(el("p", "memory", t("今天还没有记录。想说时再说。", "Nothing yet today.")));
    meals.forEach((r) => {
      const row = el("div", "meal-line" + (r.freshUntil && r.freshUntil > Date.now() ? " new" : ""));
      const left = el("div");
      left.append(el("small", "", hm(r.createdAt) + "  "));
      const title = document.createElement("strong");
      title.textContent = (r.slot || "") + " · " + namesOf(r);
      left.append(title);
      row.append(left);
      const face = (r.history && r.history.length) ? t("已改", "Edited") : r.feeling === "full" ? "😮" : r.feeling === "unwell" ? "😣" : "😊";
      const mark = el("span", (r.history && r.history.length) ? "edited" : "", face);
      row.append(mark);
      list.append(row);
    });
    box.append(list);

    const memory = el("section", "panel");
    const memoryHead = el("header");
    memoryHead.append(el("strong", "", t("小鹦记得", "oiio remembers")));
    memory.append(memoryHead);
    if (!state.memories.length) memory.append(el("p", "memory", t("多聊几句，小鹦会把习惯记在这里。", "A few more notes and oiio will keep the pattern.")));
    state.memories.slice(-4).forEach((line) => memory.append(el("p", "memory", line)));
    box.append(memory);
    box.append(el("p", "today-foot", t("右栏可收起（⌘ .）· 1280 以下自动收起成顶部「今日」", "Hide this rail with ⌘ . · under 1280px it becomes the Today sheet")));
    return box;
  }

  function dayList() {
    const wrap = el("div");
    const neu = el("button", "new-day", t("+  新的一天", "+  New day"));
    neu.type = "button";
    neu.dataset.newDay = "1";
    wrap.append(neu);
    const groups = new Map();
    state.records.filter((r) => !r.deleted).forEach((r) => {
      const key = L.dayKey(r.createdAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    if (!groups.has(state.day)) groups.set(state.day, []);
    const keys = [...groups.keys()].sort().reverse();
    const today = L.dayKey(now());
    wrap.append(el("div", "day-label", t("今天", "Today")));
    keys.filter((k) => k === today).forEach((k) => wrap.append(dayButton(k, groups.get(k))));
    const older = keys.filter((k) => k !== today);
    if (older.length) {
      wrap.append(el("div", "day-label", t("本周", "This week")));
      older.forEach((k) => wrap.append(dayButton(k, groups.get(k))));
    }
    wrap.append(el("p", "side-note", t("对话和 App 是同一份。手机上记的，这里都看得到。", "This chat and the App share one journal.")));
    return wrap;
  }

  function dayButton(key, records) {
    const latest = records.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).at(-1);
    const btn = el("button", "day-row" + (key === state.day ? " on" : ""));
    btn.type = "button";
    btn.dataset.day = key;
    const title = latest ? (latest.slot || t("记录", "Note")) + " · " + namesOf(latest) : t("还没写", "Empty");
    btn.append(el("strong", "", title));
    btn.append(el("span", "", latest ? hm(latest.createdAt) + " · " + records.length + t("条记录", " entries") : t("从这里开始", "Start here")));
    return btn;
  }

  function welcome() {
    const row = el("div", "row");
    const img = el("img", "avatar-bird");
    img.src = "/assets/oiio-app-icon.png";
    img.alt = "";
    const bubble = el("div", "bubble");
    bubble.append(el("p", "", t("嗨，我是小鹦，你的饭搭子。刚吃了什么、想吃什么、现在什么感觉，随便说一句就行。", "Hi, I'm oiio. Tell me what you ate, what you want, or how it feels.")));
    const chips = el("div", "chips");
    [
      [t("中午吃了米饭和菜", "Rice and veg for lunch"), "text"],
      [t("喝了一杯奶茶", "I had a milk tea"), "text"],
      [t("今天吃得有点乱", "Eating felt messy today"), "text"],
      [t("拍一张", "Photo"), "photo"]
    ].forEach(([label, kind]) => {
      const b = el("button", "chip", label);
      b.type = "button";
      b.dataset.welcome = kind;
      b.dataset.label = label;
      chips.append(b);
    });
    bubble.append(chips);
    row.append(img, bubble);
    return row;
  }

  function messageNode(m) {
    if (m.type === "stamp") return el("div", "stamp", m.text);
    if (m.type === "mode-tag") {
      const line = el("div", "receipt");
      line.append(el("span", "", m.text));
      if (m.chips) line.append(chipRow(m));
      return line;
    }
    if (m.type === "receipt") {
      const line = el("div", "receipt");
      line.append(el("span", "", "✓  " + m.text));
      if (m.recordId) {
        const undo = el("button", "", t("撤销", "Undo"));
        undo.type = "button";
        undo.dataset.undo = m.recordId;
        line.append(undo);
      }
      return line;
    }
    if (m.type === "card") return cardNode(m);
    if (m.type === "gate") return gateNode(m);
    const row = el("div", "row" + (m.role === "user" ? " user" : ""));
    row.dataset.mid = m.id;
    if (m.role !== "user") {
      const img = el("img", "avatar-bird");
      img.src = "/assets/oiio-app-icon.png";
      img.alt = "";
      row.append(img);
    }
    const bubble = el("div", "bubble" + (m.type === "image" ? " photo-bubble" : ""));
    if (m.type === "image" && m.image) {
      const pic = el("img");
      pic.src = m.image;
      pic.alt = t("刚传的照片", "Uploaded photo");
      bubble.append(pic);
    }
    if (m.text) bubble.append(el("p", "bubble-text", m.text));
    if (m.chips && m.chips.length) bubble.append(chipRow(m));
    if (m.modes) bubble.append(modeList(m));
    if (m.status === "queued") {
      const fail = el("p", "fail");
      fail.append(t("没发出去，联网后自动重发 · ", "Not sent. It will retry online · "));
      const retry = el("button", "", t("现在重试", "Retry now"));
      retry.type = "button";
      retry.dataset.flush = "1";
      fail.append(retry);
      bubble.append(fail);
    }
    if (m.type === "fallback") {
      const retry = el("button", "chip", t("重试", "Retry"));
      retry.type = "button";
      retry.dataset.retry = m.retryText || "";
      retry.dataset.mid = m.id;
      const chips = el("div", "chips");
      chips.append(retry);
      bubble.append(chips);
    }
    row.append(bubble);
    return row;
  }

  function chipRow(m) {
    const chips = el("div", "chips");
    m.chips.forEach((chip) => {
      const b = el("button", "chip" + (chip.primary || chip.on ? " primary" : ""), (chip.emoji ? chip.emoji + " " : "") + chip.label);
      b.type = "button";
      b.dataset.mid = m.id;
      b.dataset.cid = chip.id;
      chips.append(b);
    });
    return chips;
  }

  function modeList(m) {
    const wrap = el("div");
    const list = el("div", "modes");
    L.MODES.forEach((mode) => {
      const b = el("button", "mode");
      b.type = "button";
      b.dataset.mid = m.id;
      b.dataset.cid = mode.id;
      const img = el("img");
      img.src = "/assets/oiio-app-icon.png";
      img.alt = "";
      const text = el("div");
      text.append(el("strong", "", mode.title));
      text.append(el("span", "", mode.sub));
      b.append(img, text);
      list.append(b);
    });
    wrap.append(list);
    const skip = el("button", "quiet-link", t("不选也行，直接说就好", "Skip this and just talk"));
    skip.type = "button";
    skip.dataset.mid = m.id;
    skip.dataset.cid = "skip";
    wrap.append(skip);
    return wrap;
  }

  function cardNode(m) {
    const record = state.records.find((r) => r.id === m.recordId);
    if (!record || record.deleted) return el("div");
    const card = el("article", "card");
    const head = el("div", "card-head");
    head.append(el("strong", "", t("这餐记录好了 ✨", "Saved ✨")));
    const edit = el("button", "linkish", t("改一下", "Edit"));
    edit.type = "button";
    edit.dataset.edit = record.id;
    head.append(edit);
    card.append(head);
    const portions = el("div", "portions");
    (record.items || []).forEach((item) => portions.append(el("span", "portion", item.name + " " + item.portion)));
    if (!(record.items || []).length) portions.append(el("span", "portion", record.content));
    card.append(portions);
    const dayMeals = state.records.filter((r) => !r.deleted && r.kind === "ate" && L.dayKey(r.createdAt) === L.dayKey(record.createdAt) && new Date(r.createdAt) <= new Date(record.createdAt));
    card.append(macroRow(L.addMacros(dayMeals.map((r) => r.macros || { p: 0, c: 0, f: 0 }))));
    const bits = [];
    if (record.note) bits.push(record.note);
    bits.push(t("今天已累计 ", "Meals today: ") + dayMeals.length + t(" 餐", ""));
    card.append(el("p", "note", bits.join(" · ")));
    if (state.editingId === record.id) {
      const form = el("div", "edit");
      const input = el("input");
      input.value = state.editDraft;
      input.dataset.editInput = "1";
      form.append(input);
      const slots = el("div", "chips");
      ["早餐", "午餐", "下午加餐", "晚餐", "加餐"].forEach((slot) => {
        const b = el("button", "chip" + (state.editSlot === slot ? " on" : ""), slot);
        b.type = "button";
        b.dataset.pickSlot = slot;
        slots.append(b);
      });
      form.append(slots);
      const save = el("button", "chip primary", t("保存", "Save"));
      save.type = "button";
      save.dataset.saveEdit = record.id;
      const cancel = el("button", "chip", t("取消", "Cancel"));
      cancel.type = "button";
      cancel.dataset.cancelEdit = "1";
      const actions = el("div", "chips");
      actions.append(save, cancel);
      form.append(actions);
      card.append(form);
    }
    return card;
  }

  function gateNode() {
    const mobile = window.matchMedia("(max-width: 899px)").matches;
    const box = el("aside", "gate");
    box.append(el("strong", "", mobile ? t("先存在这部手机的浏览器里", "Saved in this phone's browser for now") : t("这一餐先存在这台电脑上了", "This meal is on this computer for now")));
    const count = state.records.filter((r) => !r.deleted && !r.synced).length;
    box.append(el("p", "", mobile
      ? t("登录后和 App 同步。", "Sign in to sync with the App.")
      : t("登录后会和 iPhone 上的 oiioCare 同步，换设备也不丢。", "After sign-in it joins the same oiioCare account as your iPhone.")));
    const actions = el("div", "row-actions");
    const go = el("button", "chip primary", t("登录同步", "Sign in to sync"));
    go.type = "button";
    go.dataset.openAuth = "1";
    const later = el("button", "quiet-link", t("先不用", "Not now"));
    later.type = "button";
    later.dataset.dismissGate = "1";
    actions.append(go, later);
    box.append(actions);
    box.dataset.count = String(count);
    return box;
  }

  function renderThread() {
    const root = thread();
    const stick = root.parentElement.scrollHeight - root.parentElement.scrollTop - root.parentElement.clientHeight < 120;
    root.replaceChildren();
    if (state.view === "review") {
      const days = new Map();
      state.records.filter((r) => !r.deleted).forEach((r) => {
        const key = L.dayKey(r.createdAt);
        if (!days.has(key)) days.set(key, []);
        days.get(key).push(r);
      });
      if (!days.size) root.append(el("p", "stamp", t("还没有可以回看的记录。", "Nothing to review yet.")));
      [...days.keys()].sort().reverse().forEach((key) => {
        root.append(el("div", "stamp", key));
        days.get(key).forEach((r) => {
          const line = el("button", "day-row", "");
          line.type = "button";
          line.dataset.day = key;
          line.append(el("strong", "", (r.slot || "") + " · " + namesOf(r)));
          line.append(el("span", "", hm(r.createdAt)));
          root.append(line);
        });
      });
      return;
    }
    const msgs = state.messages
      .filter((m) => !m.deleted && L.dayKey(m.createdAt) === state.day)
      .sort((a, b) => (a.seq || 0) - (b.seq || 0));
    if (!msgs.length) root.append(welcome());
    let last = "";
    msgs.forEach((m) => {
      const label = stamp(m.createdAt);
      if (label !== last && m.type !== "receipt" && m.type !== "card" && m.type !== "gate") {
        root.append(el("div", "stamp", label));
        last = label;
      }
      root.append(messageNode(m));
    });
    if (stick) root.parentElement.scrollTop = root.parentElement.scrollHeight;
  }

  function renderChrome() {
    const sync = $("[data-sync]");
    const label = $("[data-sync-label]");
    const pending = state.outbox.length;
    sync.classList.toggle("offline", !online());
    sync.classList.toggle("guest", online() && !state.session);
    if (!online()) label.textContent = t("离线 · ", "Offline · ") + pending + t("条待发", " waiting");
    else if (state.session) label.textContent = t("已和 iPhone 同步", "Synced with iPhone");
    else label.textContent = t("游客 · 只存在本机", "Guest · on this device");
    $("[data-open-auth]").hidden = Boolean(state.session);
    $("[data-avatar]").hidden = !state.session;
    if (state.session && state.session.user && state.session.user.email) {
      $("[data-avatar]").textContent = state.session.user.email.slice(0, 1).toUpperCase();
    }
    $("[data-open-today]").textContent = t("今日 · ", "Today · ") + mealCount() + t(" 餐", "");
    document.querySelectorAll("[data-tab]").forEach((btn) => btn.classList.toggle("on", btn.dataset.tab === (state.view === "review" ? "review" : "chat")));
    const banner = $("[data-banner]");
    banner.hidden = online();
    banner.textContent = window.matchMedia("(max-width: 899px)").matches
      ? t("网断了 · 消息先存着", "Offline · messages stay here")
      : t("网断了 · 新消息先存在这台电脑，联网后自动发出", "Offline · new messages stay on this computer and send when you reconnect");
    $("[data-shell]").classList.toggle("banner-on", !online());
    $("[data-shell]").classList.toggle("rail-hidden", state.railHidden);
    $("[data-draft]").placeholder = online()
      ? t("想补充点什么都可以…吃了什么、想吃什么、现在感觉", "What you ate, what you want, or how it feels")
      : t("离线时也可以继续写", "You can keep writing offline");
    const send = $("[data-send]");
    const ready = Boolean($("[data-draft]").value.trim() || state.pendingPhoto);
    send.classList.toggle("ready", ready);
    const preview = $("[data-preview]");
    preview.hidden = !state.pendingPhoto;
    preview.replaceChildren();
    if (state.pendingPhoto) {
      const img = el("img");
      img.src = state.pendingPhoto.url;
      img.alt = "";
      preview.append(img, el("span", "", state.pendingPhoto.name || t("照片", "Photo")));
      const clear = el("button", "quiet-link", t("拿掉", "Remove"));
      clear.type = "button";
      clear.dataset.clearPhoto = "1";
      preview.append(clear);
    }
    $("[data-days]").replaceChildren(dayList());
    $("[data-today]").replaceChildren(todayPanel());
    const lead = $("[data-auth-lead]");
    const unsynced = state.records.filter((r) => !r.deleted && !r.synced).length;
    lead.textContent = t(
      "和 iPhone 上是同一个账号，记录会自动合在一起。刚才在这台电脑上记的 " + unsynced + " 餐 也会一起带过去。",
      "Same account as the iPhone. " + unsynced + " meal(s) on this computer come along."
    );
    renderThread();
  }

  function render() { renderChrome(); }

  async function addMessage(message) {
    await persistMessage(message);
  }

  function clarifyCount() {
    const day = L.dayKey(now());
    if (state.meta.clarifyDay !== day) return 0;
    return state.meta.clarifyCount || 0;
  }

  async function bumpClarify() {
    const day = L.dayKey(now());
    if (state.meta.clarifyDay !== day) {
      state.meta.clarifyDay = day;
      state.meta.clarifyCount = 0;
    }
    state.meta.clarifyCount += 1;
    await saveMeta();
  }

  function rpcBody(record) {
    const payload = L.entryPayload(record);
    return {
      p_kind: payload.kind,
      p_content: payload.content,
      p_portion: payload.portion,
      p_source: "web",
      p_client_request_id: payload.client_request_id,
      p_reply: payload.reply
    };
  }

  async function enqueue(item) {
    if (state.outbox.some((row) => row.id === item.id)) return;
    state.outbox.push(item);
    await put("outbox", item);
  }

  async function syncRecord(record) {
    if (!state.session) return;
    const body = rpcBody(record);
    if (!online()) {
      await enqueue({ id: "sync-" + record.clientRequestId, kind: "sync", body, createdAt: now().toISOString() });
      return;
    }
    try {
      const data = await SB.sbRpc(state.session, "create_oiio_entry", body);
      record.synced = true;
      record.serverId = data && data.record && data.record.id;
      await persistRecord(record);
    } catch (err) {
      await enqueue({ id: "sync-" + record.clientRequestId, kind: "sync", body, createdAt: now().toISOString() });
    }
  }

  async function saveMeal(meal, content, createdAt) {
    const record = {
      id: uid(),
      clientRequestId: uid(),
      kind: "ate",
      content,
      slot: meal.slot,
      items: meal.items,
      macros: meal.macros,
      note: meal.note,
      reply: meal.reply,
      feeling: "",
      source: "web",
      createdAt,
      deleted: false,
      synced: false,
      history: [],
      freshUntil: Date.now() + 4000
    };
    await persistRecord(record);
    await addMessage({ id: uid(), role: "oiio", type: "text", text: meal.reply, createdAt, chips: L.FEELINGS.map((f) => Object.assign({ recordId: record.id }, f)), askFeeling: record.id });
    await addMessage({ id: uid(), role: "oiio", type: "receipt", text: t("已记下", "Saved") + " · " + record.slot + " · " + namesOf(record), createdAt, recordId: record.id });
    await addMessage({ id: uid(), role: "oiio", type: "card", createdAt, recordId: record.id });
    remember(content);
    await syncRecord(record);
    await maybeNudge(createdAt);
    await maybeGate(createdAt);
    return record;
  }

  async function maybeGate(createdAt) {
    if (state.session || state.meta.gateDismissed) return;
    const meals = state.records.filter((r) => !r.deleted && r.kind === "ate");
    if (meals.length !== 1) return;
    if (state.messages.some((m) => m.type === "gate" && !m.deleted)) return;
    await addMessage({ id: uid(), role: "oiio", type: "gate", createdAt, text: "" });
  }

  async function maybeNudge(createdAt) {
    const nudge = L.nudgeFor(state.records, new Date(createdAt));
    if (!nudge) return;
    const key = nudge.id + ":" + L.dayKey(createdAt);
    if (state.meta.nudges.includes(key)) return;
    state.meta.nudges.push(key);
    await saveMeta();
    const when = new Date(new Date(createdAt).getTime() + 60 * 1000).toISOString();
    await addMessage({ id: uid(), role: "oiio", type: "nudge", text: nudge.text, chips: nudge.chips, createdAt: when });
  }

  async function applyRoute(route, text, createdAt) {
    if (route.type === "crisis") {
      await addMessage({ id: uid(), role: "oiio", type: "text", text: route.reply, createdAt });
      return;
    }
    if (route.type === "correction") {
      const record = latestRecord();
      if (!record) return;
      record.history = record.history || [];
      record.history.push({ content: record.content, items: record.items, macros: record.macros, slot: record.slot, note: record.note });
      const next = L.applyCorrection(record, route);
      Object.assign(record, next);
      record.freshUntil = Date.now() + 4000;
      await persistRecord(record);
      await syncRecord(record);
      await addMessage({ id: uid(), role: "oiio", type: "text", text: route.reply, createdAt });
      await addMessage({
        id: uid(), role: "oiio", type: "receipt", recordId: record.id, createdAt,
        text: t("已改", "Updated") + " · " + (record.slot || "") + " · " + route.from + " → " + route.to
      });
      remember(route.to);
      return;
    }
    if (route.type === "clarify") {
      await bumpClarify();
      await addMessage({
        id: uid(), role: "oiio", type: "clarify", text: route.question, chips: route.options, createdAt,
        pending: { text, meal: route.meal }
      });
      return;
    }
    if (route.type === "meal") {
      await saveMeal(route.meal, text, createdAt);
      return;
    }
    if (route.type === "companion") {
      remember(text);
      await addMessage({
        id: uid(), role: "oiio", type: "invite", text: route.reply, createdAt, contextText: text,
        chips: [{ id: "invite", label: t("要不要我陪你一下？  >", "Want company for a minute?") }]
      });
      return;
    }
    await streamChat(text, createdAt);
  }

  async function streamChat(text, createdAt, existingId) {
    if (!online()) {
      const user = state.messages.find((m) => m.role === "user" && m.text === text && m.status !== "queued");
      if (user) {
        user.status = "queued";
        await updateMessage(user);
      }
      const fallback = { id: uid(), role: "oiio", type: "fallback", text: L.FALLBACK_REPLY, createdAt, retryText: text };
      await addMessage(fallback);
      await enqueue({ id: "ai-" + (user ? user.id : uid()), kind: "ai", text, createdAt, fallbackId: fallback.id });
      return;
    }
    const holder = existingId
      ? state.messages.find((m) => m.id === existingId)
      : { id: uid(), role: "oiio", type: "text", text: "", createdAt, streaming: true };
    if (!existingId) await addMessage(holder);
    holder.text = "";
    holder.streaming = true;
    render();
    const ctrl = new AbortController();
    let timer = setTimeout(() => ctrl.abort(), 10000);
    let started = false;
    try {
      const recent = state.messages.filter((m) => m.text && m.type !== "card").slice(-8).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text
      }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: recent, text }),
        signal: ctrl.signal
      });
      if (!res.ok || !res.body) throw new Error("bad_response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const step = await reader.read();
        if (step.done) break;
        if (!started) {
          started = true;
          clearTimeout(timer);
          timer = setTimeout(() => ctrl.abort(), 20000);
        }
        buf += decoder.decode(step.value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const line = block.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const evt = JSON.parse(line.slice(5).trim());
          if (evt.type === "delta") holder.text += evt.text;
          if (evt.type === "replace") holder.text = evt.text;
          if (evt.type === "error") throw new Error("upstream");
          const node = document.querySelector('[data-mid="' + holder.id + '"] .bubble-text');
          if (node) node.textContent = holder.text;
          else render();
        }
      }
      holder.text = L.filterSpoken(holder.text || L.FALLBACK_REPLY);
      holder.streaming = false;
      await updateMessage(holder);
    } catch (err) {
      clearTimeout(timer);
      holder.deleted = true;
      await updateMessage(holder);
      await addMessage({ id: uid(), role: "oiio", type: "fallback", text: L.FALLBACK_REPLY, createdAt: now().toISOString(), retryText: text });
    } finally {
      clearTimeout(timer);
    }
  }

  async function sendText(raw) {
    const text = String(raw || "").trim();
    const photo = state.pendingPhoto;
    if (!text && !photo) return;
    if (state.busy) return;
    state.busy = true;
    const createdAt = now().toISOString();
    try {
      if (photo && !text) {
        await addMessage({ id: uid(), role: "user", type: "image", image: photo.url, text: "", createdAt, status: online() ? "ok" : "queued" });
        state.pendingPhoto = null;
        await addMessage({
          id: uid(), role: "oiio", type: "photo-ask", createdAt,
          text: t("照片收到了。这顿大概是什么？点一个，或者直接打一句。", "Got the photo. What was it? Tap one or type it."),
          chips: [
            { id: "meal", label: t("当一餐记下", "Log it as a meal") },
            { id: "look", label: t("只是给你看看", "Just showing you") }
          ]
        });
        if (online()) {
          fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ purpose: "vision", text: "", image: { mediaType: photo.mediaType, data: photo.data } })
          }).then((r) => r.text()).then((raw) => {
            const meta = raw.split("\n\n").map((b) => b.replace(/^data:\s*/, "")).filter(Boolean).map((line) => {
              try { return JSON.parse(line); } catch (e) { return null; }
            }).find((evt) => evt && evt.type === "meta" && evt.items && evt.items.length);
            if (!meta) return;
            const phrase = meta.items.map((item) => (item.portion ? item.portion : "") + (item.name || "")).join("、");
            if (phrase) sendText(phrase);
          }).catch(() => {});
        }
        return;
      }
      const user = { id: uid(), role: "user", type: "text", text, createdAt, status: "ok" };
      await addMessage(user);
      state.pendingPhoto = null;
      const route = L.routeTurn({
        text,
        now: new Date(createdAt),
        context: { lastRecord: latestRecord(), clarifyCount: clarifyCount(), lang }
      });
      if (!online() && route.type === "chat") {
        user.status = "queued";
        await updateMessage(user);
        const fallback = { id: uid(), role: "oiio", type: "fallback", text: L.FALLBACK_REPLY, createdAt, retryText: text };
        await addMessage(fallback);
        await enqueue({ id: "ai-" + user.id, kind: "ai", text, createdAt, fallbackId: fallback.id });
      } else {
        await applyRoute(route, text, createdAt);
      }
    } finally {
      state.busy = false;
      const draft = $("[data-draft]");
      draft.value = "";
      render();
    }
  }

  async function onChip(mid, cid) {
    const message = state.messages.find((m) => m.id === mid);
    if (!message) return;
    const createdAt = now().toISOString();
    if (message.askFeeling) {
      const record = state.records.find((r) => r.id === message.askFeeling);
      if (record && cid !== "skip") {
        record.feeling = cid;
        await persistRecord(record);
      }
      message.chips = (message.chips || []).filter((c) => c.id === cid).map((c) => Object.assign({}, c, { on: true }));
      if (cid === "skip") message.chips = [];
      await updateMessage(message);
      render();
      return;
    }
    if (message.type === "nudge") {
      message.chips = [];
      await updateMessage(message);
      if (cid === "later") await addMessage({ id: uid(), role: "oiio", type: "text", text: t("好，等你说。", "Okay, I'll wait."), createdAt });
      if (cid === "crave") await addMessage({ id: uid(), role: "oiio", type: "invite", text: t("想吃的话，说个方向就行。", "If you want something, a hint is enough."), createdAt, chips: [{ id: "invite", label: t("要不要我陪你一下？  >", "Want company for a minute?") }] });
      if (cid === "photo") $("[data-file]").click();
      render();
      return;
    }
    if (message.type === "clarify" && message.pending) {
      const chosen = (message.chips || []).find((c) => c.id === cid);
      message.chips = [];
      await updateMessage(message);
      await addMessage({ id: uid(), role: "user", type: "text", text: chosen ? chosen.label : cid, createdAt, status: "ok" });
      if (cid === "dismiss") {
        await addMessage({ id: uid(), role: "oiio", type: "text", text: t("好，这条不算记录。", "Okay, I won't log that."), createdAt });
      } else {
        const meal = Object.assign({}, message.pending.meal, { slot: cid, ambiguous: false });
        await saveMeal(meal, message.pending.text, createdAt);
      }
      render();
      return;
    }
    if (message.type === "invite" && cid === "invite") {
      message.chips = [];
      await updateMessage(message);
      await addMessage({ id: uid(), role: "oiio", type: "modes", text: t("你想让我怎么陪你？", "How do you want company?"), createdAt, modes: true, contextText: message.contextText || "" });
      render();
      return;
    }
    if (message.type === "modes") {
      if (cid === "skip") {
        message.deleted = true;
        await updateMessage(message);
        render();
        return;
      }
      const mode = L.MODES.find((m) => m.id === cid);
      const reply = L.modeReply(cid);
      state.meta.mode = cid;
      await saveMeta();
      remember(message.contextText || "", mode ? mode.title : "");
      if (mode) {
        await addMessage({ id: uid(), role: "oiio", type: "mode-tag", text: mode.title, createdAt, chips: [{ id: "switch", label: t("换个陪法", "Switch") }] });
      }
      await addMessage({
        id: uid(), role: "oiio", type: "mode-reply", text: reply.text, createdAt,
        chips: reply.actions ? L.PAUSE_ACTIONS.map((a) => ({ id: a.id, emoji: a.emoji, label: a.label })) : []
      });
      render();
      return;
    }
    if (cid === "switch") {
      await addMessage({ id: uid(), role: "oiio", type: "modes", text: t("你想让我怎么陪你？", "How do you want company?"), createdAt, modes: true });
      render();
      return;
    }
    const action = L.PAUSE_ACTIONS.find((a) => a.id === cid);
    if (action) {
      message.chips = message.chips.map((c) => Object.assign({}, c, { on: c.id === cid }));
      await updateMessage(message);
      await addMessage({ id: uid(), role: "oiio", type: "text", text: action.reply, createdAt });
      render();
      return;
    }
    if (message.type === "photo-ask") {
      message.chips = [];
      await updateMessage(message);
      if (cid === "look") await addMessage({ id: uid(), role: "oiio", type: "text", text: t("看到了。想说的时候再说。", "Seen. Say more whenever."), createdAt });
      if (cid === "meal") await addMessage({ id: uid(), role: "oiio", type: "text", text: t("好，用一句话告诉我这是什么。", "Okay, tell me what it is in one line."), createdAt });
      render();
    }
  }

  async function undo(recordId) {
    const record = state.records.find((r) => r.id === recordId);
    if (!record) return;
    const prev = (record.history || []).pop();
    if (prev) {
      Object.assign(record, prev);
      await persistRecord(record);
    } else {
      record.deleted = true;
      await persistRecord(record);
      state.messages.forEach((m) => {
        if (m.recordId === recordId || m.askFeeling === recordId) m.deleted = true;
      });
      await Promise.all(state.messages.filter((m) => m.deleted).map(updateMessage));
    }
    render();
  }

  async function saveEdit(recordId) {
    const record = state.records.find((r) => r.id === recordId);
    if (!record) return;
    const text = state.editDraft.trim() || record.content;
    const parsed = L.parseMeal(text, new Date(record.createdAt));
    record.history = record.history || [];
    record.history.push({ content: record.content, items: record.items, macros: record.macros, slot: record.slot, note: record.note });
    const from = namesOf(record);
    record.content = text;
    record.items = parsed.items.length ? parsed.items : record.items;
    record.macros = parsed.items.length ? parsed.macros : record.macros;
    record.slot = state.editSlot || parsed.slot || record.slot;
    record.note = parsed.note;
    state.editingId = null;
    await persistRecord(record);
    await syncRecord(record);
    await addMessage({
      id: uid(), role: "oiio", type: "receipt", recordId: record.id, createdAt: now().toISOString(),
      text: t("已改", "Updated") + " · " + record.slot + " · " + from + " → " + namesOf(record)
    });
    render();
  }

  async function flush() {
    if (!online() || state.busy) return;
    const queue = state.outbox.slice();
    for (const item of queue) {
      try {
        if (item.kind === "sync" && state.session) {
          await SB.sbRpc(state.session, "create_oiio_entry", item.body);
          const rec = state.records.find((r) => r.clientRequestId === item.body.p_client_request_id);
          if (rec) {
            rec.synced = true;
            await persistRecord(rec);
          }
        }
        if (item.kind === "ai") {
          const fallback = state.messages.find((m) => m.id === item.fallbackId);
          if (fallback) {
            fallback.deleted = true;
            await updateMessage(fallback);
          }
          const user = state.messages.find((m) => m.id === item.id.replace(/^ai-/, ""));
          if (user) {
            user.status = "ok";
            await updateMessage(user);
          }
          await streamChat(item.text, item.createdAt);
        }
        state.outbox = state.outbox.filter((row) => row.id !== item.id);
        await del("outbox", item.id);
      } catch (err) {
        break;
      }
    }
    render();
  }

  async function afterAuth(data) {
    state.session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      user: data.user ? { id: data.user.id, email: data.user.email } : null
    };
    const user = await SB.sbUser(state.session.access_token);
    if (!user) throw new Error("no_user");
    state.session.user = { id: user.id, email: user.email || "" };
    localStorage.setItem("oiio-session", JSON.stringify(state.session));
    localStorage.removeItem("oiio-guest");
    $("[data-auth]").close();
    await mergeGuest();
    await pullToday();
    render();
  }

  async function mergeGuest() {
    const pending = state.records.filter((r) => !r.deleted && !r.synced);
    if (!pending.length || !state.session) return;
    try {
      await SB.sbRpc(state.session, "merge_guest_entries", { p_entries: pending.map(L.entryPayload) });
      pending.forEach((r) => { r.synced = true; });
      await Promise.all(pending.map((r) => persistRecord(r)));
    } catch (err) {
      for (const rec of pending) await syncRecord(rec);
    }
    mirrorGuest();
  }

  async function pullToday() {
    if (!state.session) return;
    const since = new Date(now());
    since.setHours(0, 0, 0, 0);
    try {
      const rows = await SB.sbRest(state.session, "oiio_records?select=id,kind,content,portion,source,created_at&created_at=gte." + encodeURIComponent(since.toISOString()) + "&order=created_at.asc");
      for (const row of Array.isArray(rows) ? rows : []) {
        const known = state.records.some((r) => r.serverId === row.id || r.content === row.content);
        if (known) continue;
        const parsed = L.parseMeal(row.content || "", new Date(row.created_at));
        const record = {
          id: uid(),
          serverId: row.id,
          clientRequestId: uid(),
          kind: row.kind || "ate",
          content: row.content,
          slot: parsed.slot || L.slotFromHour(new Date(row.created_at).getHours()),
          items: parsed.items,
          macros: parsed.macros,
          note: parsed.note,
          reply: "",
          source: row.source || "web",
          createdAt: row.created_at,
          deleted: false,
          synced: true,
          history: []
        };
        await persistRecord(record);
        await addMessage({ id: uid(), role: "user", type: "text", text: row.content || "", createdAt: row.created_at, status: "ok" });
        await addMessage({ id: uid(), role: "oiio", type: "card", createdAt: row.created_at, recordId: record.id });
      }
    } catch (err) { /* RLS or network; local thread still works */ }
  }

  function readSession() {
    try { return JSON.parse(localStorage.getItem("oiio-session") || "null"); }
    catch (err) { return null; }
  }

  function fileToPhoto(file) {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 1.5 * 1024 * 1024) {
      window.alert(t("照片有点大，压到 1.5MB 以内再发。", "That photo is over 1.5MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const data = url.split(",")[1] || "";
      state.pendingPhoto = { url, data, mediaType: file.type, name: file.name };
      render();
    };
    reader.readAsDataURL(file);
  }

  function bind() {
    document.querySelectorAll("[data-store]").forEach((a) => { a.href = STORE; });
    $("[data-composer]").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!state.hydrated) {
        state.earlyText = $("[data-draft]").value;
        return;
      }
      $("[data-send]").classList.add("spring");
      setTimeout(() => $("[data-send]").classList.remove("spring"), 450);
      sendText($("[data-draft]").value);
    });
    $("[data-draft]").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        $("[data-composer]").requestSubmit();
      }
    });
    $("[data-draft]").addEventListener("input", () => {
      $("[data-send]").classList.toggle("ready", Boolean($("[data-draft]").value.trim() || state.pendingPhoto));
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        state.railHidden = !state.railHidden;
        render();
      }
    });
    document.querySelectorAll("[data-photo]").forEach((btn) => btn.addEventListener("click", () => $("[data-file]").click()));
    $("[data-camera]").addEventListener("click", () => $("[data-capture]").click());
    $("[data-file]").addEventListener("change", () => { fileToPhoto($("[data-file]").files[0]); $("[data-file]").value = ""; });
    $("[data-capture]").addEventListener("change", () => { fileToPhoto($("[data-capture]").files[0]); $("[data-capture]").value = ""; });
    document.querySelectorAll("button[data-voice]").forEach((btn) => btn.addEventListener("click", () => { $(".voice-tip").hidden = false; }));
    document.addEventListener("dragover", (e) => {
      const types = e.dataTransfer && e.dataTransfer.types ? [...e.dataTransfer.types] : [];
      if (types.includes("Files")) e.preventDefault();
    });
    document.addEventListener("drop", (e) => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      e.preventDefault();
      fileToPhoto(files[0]);
    });
    document.addEventListener("paste", (e) => {
      const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
      if (file) fileToPhoto(file);
    });
    $("[data-safety-more]").addEventListener("click", () => {
      state.safetyOpen = !state.safetyOpen;
      $("[data-safety-body]").hidden = !state.safetyOpen;
      $("[data-safety-more]").textContent = state.safetyOpen ? t("收起", "Hide") : t("展开", "More");
      $("[data-safety-more]").setAttribute("aria-expanded", String(state.safetyOpen));
    });
    document.body.addEventListener("click", (e) => {
      const welcomeChip = e.target.closest("[data-welcome]");
      if (welcomeChip) {
        if (welcomeChip.dataset.welcome === "photo") $("[data-file]").click();
        else sendText(welcomeChip.dataset.label);
        return;
      }
      if (e.target.closest("[data-new-day]")) {
        state.day = L.dayKey(now());
        state.view = "chat";
        $("[data-draft]").focus();
        render();
        return;
      }
      const day = e.target.closest("[data-day]");
      if (day) {
        state.day = day.dataset.day;
        state.view = "chat";
        closeSheet();
        render();
        return;
      }
      const chip = e.target.closest("[data-cid]");
      if (chip) onChip(chip.dataset.mid, chip.dataset.cid).catch((err) => console.error(err));
      if (e.target.closest("[data-undo]")) undo(e.target.closest("[data-undo]").dataset.undo);
      if (e.target.closest("[data-edit]")) {
        const id = e.target.closest("[data-edit]").dataset.edit;
        const record = state.records.find((r) => r.id === id);
        state.editingId = id;
        state.editDraft = record ? record.content : "";
        state.editSlot = record ? record.slot : "";
        render();
      }
      if (e.target.dataset.editInput) return;
      if (e.target.closest("[data-pick-slot]")) {
        state.editSlot = e.target.closest("[data-pick-slot]").dataset.pickSlot;
        render();
      }
      if (e.target.closest("[data-save-edit]")) saveEdit(e.target.closest("[data-save-edit]").dataset.saveEdit);
      if (e.target.closest("[data-cancel-edit]")) { state.editingId = null; render(); }
      if (e.target.closest("[data-flush]")) flush();
      const retry = e.target.closest("[data-retry]");
      if (retry) {
        const host = state.messages.find((m) => m.id === retry.dataset.mid);
        if (host) host.deleted = true;
        streamChat(retry.dataset.retry, now().toISOString()).then(render);
      }
      if (e.target.closest("[data-dismiss-gate]")) {
        state.meta.gateDismissed = true;
        saveMeta();
        state.messages.forEach((m) => { if (m.type === "gate") m.deleted = true; });
        Promise.all(state.messages.filter((m) => m.type === "gate").map(updateMessage)).then(render);
      }
      if (e.target.closest("[data-open-auth]")) openAuth();
      if (e.target.closest("[data-clear-photo]")) { state.pendingPhoto = null; render(); }
    });
    document.body.addEventListener("input", (e) => {
      if (e.target.dataset.editInput) state.editDraft = e.target.value;
    });
    document.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => {
      if (btn.dataset.tab === "today") openToday();
      else if (btn.dataset.tab === "review") { state.view = "review"; render(); }
      else { state.view = "chat"; state.railHidden = false; render(); }
    }));
    $("[data-open-today]").addEventListener("click", openToday);
    $("[data-menu]").addEventListener("click", () => {
      const card = $("[data-sheet-card]");
      card.className = "sheet-card days-sheet";
      card.replaceChildren(el("div", "handle"), dayList());
      $("[data-sheet]").hidden = false;
    });
    $("[data-sheet]").addEventListener("click", (e) => { if (e.target === $("[data-sheet]")) closeSheet(); });
    $("[data-avatar]").addEventListener("click", () => {
      if (window.confirm(t("退出登录？这台电脑上的对话还会留着。", "Sign out? This chat stays on the device."))) {
        state.session = null;
        localStorage.removeItem("oiio-session");
        render();
      }
    });
    $("[data-close-auth]").addEventListener("click", () => $("[data-auth]").close());
    $("[data-apple]").addEventListener("click", () => {
      $("[data-auth-status]").textContent = t("Sign in with Apple 还要在 Apple 后台配 Services ID。可以先用邮箱。", "Sign in with Apple needs a Services ID. Use email for now.");
    });
    $("[data-qr]").addEventListener("click", () => {
      $("[data-auth-status]").textContent = t("用 iPhone 扫码登录排在 v1，要后端发一次性码。先用邮箱就行。", "iPhone QR sign-in is a v1 item. Use email for now.");
    });
    $("[data-email-start]").addEventListener("click", () => showAuth("email"));
    $("[data-password-start]").addEventListener("click", () => showAuth("password"));
    $("[data-auth-email]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("[data-email]").value.trim();
      $("[data-auth-status]").textContent = t("正在发验证码…", "Sending a code…");
      try {
        await SB.sbAuth("otp", { email, create_user: true });
        state.email = email;
        showAuth("code");
        $("[data-auth-status]").textContent = t("验证码已发出，去邮箱看一眼。", "Code sent. Check your email.");
      } catch (err) {
        $("[data-auth-status]").textContent = t("验证码没发出去。如果这个邮箱本来用密码，可以改用密码登录。", "The code did not send. If this email uses a password, try that.");
      }
    });
    $("[data-auth-code]").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const data = await SB.sbAuth("verify", { type: "email", email: state.email, token: $("[data-code]").value.trim() });
        await afterAuth(data);
      } catch (err) {
        $("[data-auth-status]").textContent = t("验证码不对，或已经过期。", "That code did not work.");
      }
    });
    $("[data-auth-password]").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const data = await SB.sbAuth("token?grant_type=password", {
          email: $("[data-email-pw]").value.trim(),
          password: $("[data-password]").value
        });
        await afterAuth(data);
      } catch (err) {
        $("[data-auth-status]").textContent = t("邮箱或密码不对。", "Email or password did not match.");
      }
    });
    window.addEventListener("online", flush);
    window.addEventListener("offline", render);
  }

  function showAuth(pane) {
    $("[data-auth-home]").hidden = pane !== "home";
    $("[data-auth-email]").hidden = pane !== "email";
    $("[data-auth-code]").hidden = pane !== "code";
    $("[data-auth-password]").hidden = pane !== "password";
  }
  function openAuth() {
    showAuth("home");
    $("[data-auth-status]").textContent = "";
    $("[data-auth]").showModal();
  }
  function openToday() {
    const card = $("[data-sheet-card]");
    card.className = "sheet-card";
    card.replaceChildren(el("div", "handle"), todayPanel());
    $("[data-sheet]").hidden = false;
  }
  function closeSheet() { $("[data-sheet]").hidden = true; }

  async function boot() {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    state.day = L.dayKey(now());
    bind();
    try {
      state.records = await getAll("records");
      state.messages = await getAll("messages");
      state.messages.sort((a, b) => (a.seq || 0) - (b.seq || 0) || new Date(a.createdAt) - new Date(b.createdAt));
      state.messages.forEach((m) => { if (!m.seq) m.seq = seq++; });
      seq = state.messages.reduce((max, m) => Math.max(max, m.seq || 0), 0) + 1;
      state.outbox = await getAll("outbox");
      state.meta = Object.assign(state.meta, await loadKv("meta", {}));
      state.memories = await loadKv("memories", []);
    } catch (err) {
      state.records = [];
      state.messages = [];
      state.outbox = [];
    }
    const saved = readSession();
    if (saved && saved.access_token) {
      state.session = saved;
      if (online()) {
        try {
          const user = await SB.sbUser(saved.access_token);
          if (user) {
            state.session.user = { id: user.id, email: user.email || "" };
            await pullToday();
          } else {
            state.session = null;
            localStorage.removeItem("oiio-session");
          }
        } catch (err) { /* keep the saved session while the network is down */ }
      }
    }
    if (!state.records.length) {
      try {
        const legacy = JSON.parse(localStorage.getItem("oiio-guest-records") || "[]");
        for (const row of legacy) {
          const when = row.created_at || now().toISOString();
          const parsed = L.parseMeal(row.content || "", new Date(when));
          await persistRecord({
            id: row.id || uid(),
            clientRequestId: row.id || uid(),
            kind: row.kind || "ate",
            content: row.content || "",
            slot: parsed.slot || "",
            items: parsed.items,
            macros: parsed.macros,
            note: parsed.note,
            reply: "",
            source: "web",
            createdAt: when,
            deleted: false,
            synced: false,
            history: []
          });
        }
      } catch (err) { /* ignore a broken local cache */ }
    }
    state.hydrated = true;
    render();
    if (state.earlyText) {
      const early = state.earlyText;
      state.earlyText = "";
      await sendText(early);
    }
    const preset = params.get("q");
    if (preset) {
      params.delete("q");
      history.replaceState({}, "", location.pathname + (params.toString() ? "?" + params.toString() : ""));
      await sendText(preset);
    }
    if (params.get("photo") === "1") $("[data-file]").click();
    if (online()) flush();
  }

  boot();
})();
