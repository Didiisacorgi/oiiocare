const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../js/oiio-logic");

function at(iso) {
  return new Date(iso);
}

test("breakfast soy milk and bun matches the mock macros and reply", () => {
  const route = logic.routeTurn({
    text: "早上一杯豆浆一个包子",
    now: at("2026-10-14T08:20:00")
  });
  assert.equal(route.type, "meal");
  assert.equal(route.meal.slot, "早餐");
  assert.deepEqual(
    route.meal.items.map((i) => i.name + i.portion),
    ["豆浆1杯", "包子1个"]
  );
  assert.equal(route.meal.macros.p, 17);
  assert.equal(route.meal.macros.c, 58);
  assert.equal(route.meal.macros.f, 8);
  assert.equal(route.meal.reply, "记上了～豆浆配包子，挺舒服的早饭。");
});

test("lunch plus breakfast lands on the daily rings in the mock", () => {
  const breakfast = logic.routeTurn({
    text: "早上一杯豆浆一个包子",
    now: at("2026-10-14T08:20:00")
  }).meal;
  const lunch = logic.routeTurn({
    text: "中午吃了碗牛肉面，加了个卤蛋",
    now: at("2026-10-14T12:31:00")
  });
  assert.equal(lunch.type, "meal");
  assert.equal(lunch.meal.slot, "午餐");
  assert.equal(lunch.meal.reply, "记上了～");
  const sum = logic.addMacros([breakfast.macros, lunch.meal.macros]);
  assert.deepEqual(sum, { p: 44, c: 138, f: 29 });
  assert.deepEqual(logic.rings(sum), { protein: 46, carb: 52, fat: 55 });
  assert.match(lunch.meal.note, /清淡/);
});

test("afternoon noodles ask once with the solid chip first", () => {
  const route = logic.routeTurn({
    text: "刚吃了点面",
    now: at("2026-10-14T16:10:00"),
    context: { clarifyCount: 0 }
  });
  assert.equal(route.type, "clarify");
  assert.equal(route.question, "收到～这碗面算下午加餐，还是午餐？");
  assert.equal(route.options[0].primary, true);
  assert.equal(route.options[0].label, "下午加餐");
  assert.equal(route.options[2].id, "dismiss");
});

test("clarification stops after the daily cap", () => {
  const route = logic.routeTurn({
    text: "刚吃了点面",
    now: at("2026-10-14T16:10:00"),
    context: { clarifyCount: 2 }
  });
  assert.equal(route.type, "meal");
  assert.equal(route.meal.slot, "下午加餐");
});

test("craving opens companionship instead of a meal card", () => {
  const route = logic.routeTurn({
    text: "今天又加班，晚上就想吃点甜的",
    now: at("2026-10-14T22:40:00")
  });
  assert.equal(route.type, "companion");
  assert.match(route.reply, /想吃点甜的很正常/);
});

test("a maybe-later line stays a chat turn so it can queue offline", () => {
  const route = logic.routeTurn({
    text: "下午可能还会喝杯奶茶",
    now: at("2026-10-14T12:40:00")
  });
  assert.equal(route.type, "chat");
});

test("correction rewrites the last bowl", () => {
  const last = {
    content: "刚吃了点面",
    items: [{ name: "面", key: "面", portion: "1碗", p: 12, c: 68, f: 12 }],
    deleted: false
  };
  const route = logic.routeTurn({
    text: "不对，那个是米粉不是面",
    now: at("2026-10-14T19:41:00"),
    context: { lastRecord: last }
  });
  assert.equal(route.type, "correction");
  assert.equal(route.from, "面");
  assert.equal(route.to, "米粉");
  assert.equal(route.reply, "好，改成米粉了。");
  const next = logic.applyCorrection(last, route);
  assert.equal(next.items[0].name, "米粉");
});

test("spoken replies drop calories, orders, and pet names", () => {
  const text = logic.filterSpoken("亲爱的你必须控制住。这顿大约 300 千卡。我在。");
  assert.equal(text.includes("千卡"), false);
  assert.equal(text.includes("你必须"), false);
  assert.equal(text.includes("亲爱的"), false);
  assert.match(text, /我在/);
});

test("crisis text never asks the model for a method", () => {
  const route = logic.routeTurn({ text: "我不想活了", now: new Date() });
  assert.equal(route.type, "crisis");
  assert.match(route.reply, /紧急援助/);
  assert.equal(/割|方法|步骤/.test(route.reply), false);
});

test("merge payload keeps client_request_id and source web", () => {
  const payload = logic.entryPayload({
    kind: "ate",
    content: "中午吃了碗牛肉面",
    items: [{ name: "牛肉面", portion: "1碗" }],
    clientRequestId: "11111111-1111-4111-8111-111111111111",
    reply: "记上了～"
  });
  assert.equal(payload.source, "web");
  assert.equal(payload.client_request_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(payload.portion, "牛肉面 1碗");
});

test("noon nudge appears after breakfast only", () => {
  const records = [{ slot: "早餐", createdAt: "2026-10-14T08:20:00", deleted: false }];
  const nudge = logic.nudgeFor(records, at("2026-10-14T12:05:00"));
  assert.equal(nudge.id, "lunch");
  assert.match(nudge.text, /中午/);
  const none = logic.nudgeFor(records, at("2026-10-14T08:30:00"));
  assert.equal(none, null);
});
