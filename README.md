## wnreader

A minimal blacked-out web reader for personal webnovels. Import `.epub` files, keep them in Postgres per-account, and read them inside a distraction-free monospace interface.

### Features
- Email / password auth powered by NextAuth + Prisma (credentials only; accounts live in Postgres).
- EPUB ingestion pipeline that parses the container + spine, extracts chapters, and stores each chapter body in the database.
- Library view to trigger imports and jump into any stored novel.
- Reader page with focus mode typography, chapter navigation, and prev/next controls.
- Automatic reading progress tracking—each novel opens on the last chapter you read unless you request another one.

### Stack
- Next.js 16 (App Router, Server Components, Tailwind)
- TypeScript
- PostgreSQL + Prisma ORM
- NextAuth v5 (credentials)

### Prerequisites
- Node.js 18+
- PostgreSQL database & connection string

### Setup
1. (Optional) Start a local Postgres instance with Docker Compose:
   ```bash
   docker compose up -d db
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   NEXTAUTH_SECRET="generate-a-long-random-string"
   NEXTAUTH_URL="http://localhost:3000" # adjust per environment
   # Optional: enable ElevenLabs voices in the reader
   ELEVENLABS_API_KEY="your-xi-api-key"
   ELEVENLABS_DEFAULT_VOICE_ID="voice-id-from-dashboard"
   ELEVENLABS_MODEL_ID="eleven_multilingual_v2" # override with another ElevenLabs model if needed
   ```
   - If you used the bundled Docker setup, the connection string should be `postgresql://postgres:postgres@localhost:5432/wnreader?schema=public`.
4. Apply the Prisma schema to your database:
   ```bash
   npx prisma db push
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```
6. Navigate to `http://localhost:3000`. You will be directed to the login page; create an account via the linked registration form.

### High-quality voices (ElevenLabs)
- The reader now has a “Device Voices / ElevenLabs AI” toggle in the TTS panel. Device voices continue to use the browser’s speech synthesis API for instant playback and paragraph skipping.
- ElevenLabs mode calls the new API routes under `/api/tts/voices` and `/api/tts/speak`, which proxy the ElevenLabs REST API from the server runtime.
- Set `ELEVENLABS_API_KEY` in `.env` (and optionally `ELEVENLABS_DEFAULT_VOICE_ID`) to expose your ElevenLabs voices in the UI. The client fetches voices on demand and requests audio for each chapter through your key, so usage counts toward your ElevenLabs quota.
- ElevenLabs playback currently streams audio without per-word highlighting or skip controls; browser TTS remains available as a fallback.

### Development Notes
- EPUB parsing happens server-side via `src/lib/epub.ts` using JSZip + fast-xml-parser + Cheerio. The importer currently saves the original HTML chunk per chapter for faithful rendering.
- Session protection is handled through `middleware.ts`. Adjust the matcher if you add new public routes.
- Prisma schema lives in `prisma/schema.prisma`. Update it and rerun `npx prisma generate` after changes.
