# oiioCare web

Marketing pages and Web Chat 0.1.

## Where it runs

| Piece | Host |
|---|---|
| Static pages | Aliyun OSS. Public URLs: `https://www.oiiocare.com` and `https://oiiocare.com` |
| `POST/GET /api/chat` | Vercel project `orangewangs-projects/oiiocare-web`, production URL `https://oiiocare-web.vercel.app`, deployed from the repo root with `vercel.json` |

`js/public-config.js` sets `window.OIIO_API_BASE`. On `localhost`, `127.0.0.1`, and any `*.vercel.app` host the chat page calls same-origin `/api/chat`. On OSS it calls `https://oiiocare-web.vercel.app`. No model key is in the front end.

Turn on Aliyun static-website hosting with `index.html` as the index document, including subdirectory indexes, so `/chat` serves `chat/index.html`.

## Environment variables (Vercel only)

Already set for text streaming:

- `OIIO_AI_API_KEY`
- `OIIO_AI_BASE_URL=https://api.deepseek.com/v1`
- `OIIO_AI_MODEL=deepseek-chat`

Still required before photo recognition works. DeepSeek does not receive images. If the vision key is empty, `/chat` keeps the in-chat “照片收到了” fallback.

- `OIIO_VISION_API_KEY` — DashScope key (same provider family as the iOS app)
- `OIIO_VISION_BASE_URL` — optional, default `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `OIIO_VISION_MODEL` — optional, default `qwen-vl-plus`

Do not put a Supabase service-role key in this repo or in a `NEXT_PUBLIC_` / browser variable. The anon key in `js/public-config.js` is the public key already shipped on the live site.

## Local check

```bash
node scripts/dev-server.js   # http://127.0.0.1:4173
npm run check                # syntax check + node --test
```

## Files to upload to OSS

Upload these paths only, keeping the same relative paths. Do not upload `api/`, `server/`, `scripts/`, `test/`, `supabase/`, `package.json`, `vercel.json`, `.env*`, or the old `oiioCare-public-site_*` snapshots.

```
about.html
app.js
assets/app-store-badge-en.svg
assets/app-store-badge-zh.svg
assets/og-card.png
assets/oiio-app-icon.png
chat/chat.css
chat/chat.js
chat/index.html
companion.html
contact.html
faq.html
features.html
guides/chat-food-journal.html
guides/craving-vs-ate.html
guides/first-record.html
guides/privacy-three-questions.html
guides/voice-privacy.html
guides/what-is-oiiocare.html
index.html
js/oiio-logic.js
js/public-config.js
js/supabase.js
llms.txt
privacy/index.html
robots.txt
sitemap.xml
styles.css
```
