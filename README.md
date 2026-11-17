# FocusHub

[![CI](https://github.com/Ashu-1104/focushub/actions/workflows/ci.yml/badge.svg)](https://github.com/Ashu-1104/focushub/actions/workflows/ci.yml)

FocusHub is a modern productivity workspace with notes, tasks, focus sessions, saved resources, settings, authentication, and a persistent AI assistant.

## Features

- Dashboard with task summaries, streaks, and activity.
- Notes with folders, tags, markdown-style content, and favorites.
- Tasks with priority, status, due dates, and filtering.
- **Calendar view**: month and week calendar of tasks; drag a task to another day to reschedule it, or click a day to add one.
- **Recurring tasks**: repeat daily, weekly or monthly; completing a task schedules the next one automatically.
- **Reminders**: optional due time with a reminder (at due time, 10 min, 1 hour or 1 day before) as a browser notification and in-app toast.
- **Real-time sync**: task changes appear in your other tabs and devices within a second or two (Server-Sent Events), with a live connection indicator.
- Focus mode with session tracking and productivity stats.
- Jobs, links, and file-style organization.
- Command palette and responsive app-style navigation.
- AI Assistant powered by **Gemini 3 Flash** through OpenRouter.

## Tech stack

React 18, Redux Toolkit, Vite, Tailwind CSS, dnd-kit, Recharts · Node.js, Express, MongoDB/Mongoose, Server-Sent Events, JWT auth, Zod validation · Vitest, Supertest, Testing Library, ESLint, GitHub Actions · Vercel (static site + serverless API).

## Real-time sync

Every task change is also written to a small `SyncEvent` collection (kept for a day). Each open tab listens on `GET /api/events`, a Server-Sent Events stream that sends that user's new events as they arrive, skipping the tab that made the change (`X-Client-Id`). Streams end after a few minutes, which keeps them within serverless limits; the browser reconnects with `Last-Event-ID` and resumes exactly where it left off, so no change is missed. The same code runs on a long-lived Node server and on Vercel.

## Deploying to Vercel

The repository root is a single Vercel project (`vercel.json`): the React app in `client/` is built as the static site, and `api/index.js` runs the Express API as one serverless function under `/api`, so the site and the API share an origin and cookies just work.

Set these environment variables in the Vercel project:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` or `MONGODB_URL` | MongoDB Atlas connection string (Vercel Storage → MongoDB Atlas with the prefix `MONGODB` adds `MONGODB_URL`) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | long random strings |
| `JWT_EXPIRE`, `JWT_REFRESH_EXPIRE` | `15m`, `7d` |
| `NODE_ENV` | `production` |
| `VITE_API_URL` | `/api` |
| `OPENROUTER_API_KEY` | optional, for the AI assistant |

## Testing

```bash
cd server && npm test        # API, recurrence and real-time tests (in-memory MongoDB, or set MONGODB_URI_TEST)
cd client && npm run lint && npm test
```

GitHub Actions runs the server tests against a MongoDB service and the client lint, tests and production build on every push and pull request.

## AI Provider Architecture

The backend owns all AI provider calls so API keys never ship to the browser.

1. The React assistant page sends chat messages to `POST /api/assistant/chat`.
2. The Express controller loads the current conversation from MongoDB.
3. `server/src/services/aiProvider.js` builds an OpenAI-compatible chat payload.
4. OpenRouter receives the request at `https://openrouter.ai/api/v1/chat/completions`.
5. FocusHub streams the OpenRouter response server-side, aggregates it, saves the assistant reply, and returns clean model metadata to the UI.

Required OpenRouter headers:

```http
Authorization: Bearer <OPENROUTER_API_KEY>
Content-Type: application/json
```

Optional but configured headers:

```http
HTTP-Referer: <your app URL>
X-Title: FocusHub
```

## AI Models

Primary model:

```text
google/gemini-3-flash-preview
```

Fallback chain:

```text
google/gemini-3.1-flash-lite-preview
google/gemini-3.1-flash-lite
google/gemini-2.5-flash-lite
deepseek/deepseek-chat-v3-0324:free
meta-llama/llama-3.3-70b-instruct:free
mistralai/mistral-small-24b-instruct-2501:free
mistralai/mistral-small-3.2-24b-instruct
```

Notes:

- `Gemini 3 Flash` is displayed in the UI for the primary model.
- OpenRouter's live model catalog currently exposes `mistralai/mistral-small-3.2-24b-instruct` as the valid Mistral Small 3.2 ID, without the `:free` suffix.
- `mistralai/mistral-small-24b-instruct-2501:free` is included as the free Mistral fallback.
- Legacy Flash model settings are normalized to `google/gemini-3-flash-preview`.

## OpenRouter Setup

1. Create an OpenRouter account.
2. Create an API key from the OpenRouter dashboard.
3. Add the key to `server/.env`.
4. Set your deployed frontend URL in `CLIENT_URL` and `OPENROUTER_HTTP_REFERER`.
5. Restart the server after changing environment variables.

## Environment Variables

Example `server/.env`:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/focushub

JWT_SECRET=change_this_jwt_secret
JWT_REFRESH_SECRET=change_this_refresh_secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

CLIENT_URL=http://localhost:5173
API_VERSION=v1

OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key
OPENROUTER_MODEL=google/gemini-3-flash-preview
OPENROUTER_FALLBACK_MODELS=google/gemini-3.1-flash-lite-preview,google/gemini-3.1-flash-lite,google/gemini-2.5-flash-lite,deepseek/deepseek-chat-v3-0324:free,meta-llama/llama-3.3-70b-instruct:free,mistralai/mistral-small-24b-instruct-2501:free,mistralai/mistral-small-3.2-24b-instruct
OPENROUTER_HTTP_REFERER=http://localhost:5173
OPENROUTER_APP_TITLE=FocusHub
AI_STREAMING=true
AI_REQUEST_TIMEOUT_MS=20000
AI_MAX_TOKENS=700
AI_TEMPERATURE=0.35
```

Example `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_ENV=development
```

## Fallback Behavior

FocusHub tries each model once, in order. It preserves the same system message, recent conversation history, and latest user prompt for every fallback attempt.

Fallback activates for provider errors such as:

- Rate limits.
- Timeout responses.
- Empty responses.
- Model unavailable errors.
- Malformed provider responses.
- Temporary OpenRouter or upstream provider errors.

Fallback stops early for invalid or unauthorized API keys because another model cannot fix a bad key.

The UI shows the active fallback model after a fallback succeeds and shows a friendly error when every model fails.

## Troubleshooting AI

**Invalid API key**

Check `OPENROUTER_API_KEY` on the server. It must be sent as `Authorization: Bearer <key>`.

**Rate limited**

OpenRouter free models can have strict limits. FocusHub will try the next fallback automatically. Retry later if the whole chain is rate limited.

**Model unavailable**

OpenRouter model IDs change over time. Check the live model catalog at `https://openrouter.ai/api/v1/models` and update `OPENROUTER_FALLBACK_MODELS`.

**Timeouts**

Lower `AI_MAX_TOKENS`, shorten the prompt, or increase `AI_REQUEST_TIMEOUT_MS`.

**Empty responses**

Retry or rephrase. Some upstream providers can return empty completions for filtered or overloaded requests.

**Browser shows a generic error**

Check the server logs. Provider attempts are logged with the failed model and reason.

## Local Development

Install and run the server:

```bash
cd server
npm install
npm run dev
```

Install and run the client:

```bash
cd client
npm install
npm run dev
```

Build the client for production:

```bash
cd client
npm run build
```

## Deployment

- Frontend: Vercel or any static host that supports React SPA fallback.
- Backend: Render, Railway, Fly.io, or another Node.js host.
- Database: MongoDB Atlas or a compatible MongoDB deployment.

Set server environment variables on the backend host, and set `VITE_API_URL` on the frontend host.

## Demo account

After running `npm run seed` in `server`, sign in with:

```text
Email: demo@focushub.com
Password: DemoPass123
```

## Credits

FocusHub is built on [NexusDesk](https://github.com/ManakRaj-7/NexusDesk-Premium-Productivity-Desktop-Web-App) by Manak Raj, released under the MIT License. The original copyright notice is kept in [LICENSE](./LICENSE).

## License

[MIT](./LICENSE)
