## wnreader

A minimal blacked-out web reader for personal webnovels. Import `.epub` files, keep them in Postgres per-account, and read them inside a distraction-free monospace interface.

### Features
- Email / password auth powered by NextAuth + Prisma (credentials only; accounts live in Postgres).
- EPUB ingestion pipeline that parses the container + spine, extracts chapters, and stores each chapter body in the database.
- Library view to trigger imports and jump into any stored novel.
- Reader page with focus mode typography, chapter navigation, and prev/next controls.

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

### Development Notes
- EPUB parsing happens server-side via `src/lib/epub.ts` using JSZip + fast-xml-parser + Cheerio. The importer currently saves the original HTML chunk per chapter for faithful rendering.
- Session protection is handled through `middleware.ts`. Adjust the matcher if you add new public routes.
- Prisma schema lives in `prisma/schema.prisma`. Update it and rerun `npx prisma generate` after changes.
