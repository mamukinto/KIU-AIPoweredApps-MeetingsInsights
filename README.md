# 🎥🤖 KIU Meeting Insights  
*Automate the boring, keep the insights.*


showcase: https://youtu.be/ZYhAK0J7Tko

---

## 🚀 TL;DR

Upload **audio or video** → get:

* 🎤 **Transcript** (Whisper, speaker-tagged)  
* ✏️ **2-line summary** (GPT-4o)  
* ✅ **Action items** (owner + due) → calendar links  
* 🔍 **Semantic search** across every meeting  
* 🎨 **Slide thumbnail** (DALL·E 3)  
* 🌘 Dark & light theme, drag-drop UX

All in **~700 LOC** TypeScript, stored in a single `data/db.json` file.


## Features

| 💡 | Feature | OpenAI API |
|----|---------|-----------|
| 🔈 Transcription | Audio / video → text, **speaker labels** | Whisper |
| 📜 Summary | 2-3 sentence exec summary | GPT-4o |
| ✅ Actions | structured title / owner / due via **function-calling** | GPT-4o |
| 🗓️ Calendar stubs | Google / Outlook ready links | internal |
| 🔍 Semantic search | 60-token embeddings; cosine ≥ 0.05 | text-embedding-3-small |
| 🎨 Slide thumb | Title + bullets, corporate palette | DALL·E 3 |
| 🌙 Theme | Light / Dark stored in `localStorage` | — |

---

## Quick Start

```bash
git clone https://github.com/yourUser/kiu-meeting-insights.git
cd kiu-meeting-insights

cp .env.example .env       # add your OpenAI key
pnpm install               # ⏱ tiny lockfile
pnpm dev                   # ➜ http://localhost:3000
```

### Run tests

```bash
pnpm test            # vitest, mocked OpenAI
```

---

## Architecture

```
client (React)     /api/upload (Next API)
   │ drag .mp4 ─▶  ├─ ffmpeg-static   ➜ mono wav
   │               ├─ Whisper         ➜ transcript + speakers
   │               ├─ GPT-4o          ➜ summary
   │               ├─ GPT-4o funcCall ➜ action items
   │               ├─ DALL·E 3        ➜ slide.png
   │               └─ Embeddings      ➜ 60-token vectors
   ▼
db.json (lowdb) ◀─ /api/search  ──▶ cosine ⋯ top-10 hits
```

---

## Project Structure

```
.
├── pages/
│   ├── index.tsx          ← UI (drag-drop, dark mode, bottom sheet)
│   └── api/
│       ├── upload.ts      ← full processing pipeline
│       ├── search.ts      ← semantic search endpoint
│       ├── list.ts        ← meeting sidebar feed
│       └── meeting.ts     ← single meeting by id
├── lib/
│   ├── openai.ts          ← OpenAI client (env-safe in tests)
│   ├── db.ts              ← lowdb wrapper
│   ├── similarity.ts      ← cosine helper
│   ├── calendar.ts        ← stub createEvents()
│   └── extractAudio.ts    ← ffmpeg video→wav
├── data/db.json           ← tiny JSON “database”
└── __tests__/pipeline.test.ts
```

---

## API Routes

| Method | Route              | Purpose                                          |
| ------ | ------------------ | ------------------------------------------------ |
| `POST` | `/api/upload`      | upload audio/video ⇒ store meeting               |
| `GET`  | `/api/list`        | lightweight list (`id`,`idx`,`title`,`imageUrl`) |
| `GET`  | `/api/meeting?id=` | full record (summary, actions, transcript…)      |
| `GET`  | `/api/search?q=`   | `{ hits[], relatedIds[] }`                       |

*All routes are unauthenticated to keep code tiny; add JWT / Clerk etc. if needed.*

---

## Development

| Script       | What it does               |
| ------------ | -------------------------- |
| `pnpm dev`   | Next.js + HMR              |
| `pnpm build` | `next build`               |
| `pnpm start` | production server          |
| `pnpm test`  | vitest run (OpenAI mocked) |

---

## Deployment

### Vercel

```bash
vercel --prod                   # builds on Vercel infra
```

> add `OPENAI_API_KEY` in Project ▸ Settings ▸ Environment.

`ffmpeg-static` binary works on Vercel × Serverless Function (size < 50 MB).

### Docker (Render / Fly.io)

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm build
CMD ["pnpm","start","-p","8080"]
```

---

## Tech Stack

* **Next.js 14** (pages router)
* **React 18**
* **lowdb 6** — zero-dependency JSON DB
* **Whisper / GPT-4o / DALL·E 3 / Embeddings**
* **ffmpeg-static** for video → wav
* **Vitest** + **vite-tsconfig-paths** for tests

---

## License

MIT
