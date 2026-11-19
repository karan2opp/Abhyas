# Abhyas: AI Mock Exam Platform

A platform where teachers build exams and assignments, students take them, and AI helps with the hard parts: making
questions from a question bank, marking written answers, and explaining results.

## What it does

- **Classrooms and groups.** Teachers run classrooms, add students with a join code or an email invite, and split them
  into groups. Joining a classroom also joins its organisation, and the platform records which code each student used.
- **Organisations.** Managers look after several teachers and classrooms. A system admin manages organisations, plans
  and credits.
- **Exams and assignments.** Build them by hand or from the question bank. Exams can have a start time; students who
  arrive early see a countdown screen. Teachers can preview an exam exactly as a student sees it.
- **Question bank.** Upload a PDF; it is read, split into questions, tagged by topic and stored for search. Exams can
  then pick questions by topic and difficulty.
- **AI marking and feedback.** Written answers are marked against a rubric, and students get feedback on their result.
- **Plans and credits.** Plans limit teachers, managers and AI use. AI use is paid for with credits
  (1 credit = $0.10). New organisations start on a Trial plan that a system admin assigns.
- **Phone friendly.** Every screen is built phone first.

## How it is built

| Part | What it uses |
|---|---|
| Website (`client/`) | Next.js 16, React 19, Tailwind CSS 4, Zustand, React Hook Form |
| API (`server/`) | Node.js, Express 5, TypeScript |
| Database | PostgreSQL with Drizzle ORM (migrations in `server/drizzle/`) |
| Background jobs | Inngest (the PDF pipeline), BullMQ with Redis |
| Question search | Qdrant (vector search) |
| AI | OpenAI models and embeddings |
| Files and email | Cloudinary (PDFs, images), Resend (emails) |
| PDF reading | Python and PyMuPDF (`server/python/pdf_extractor/`) |

```
client/   the website: pages in src/app, shared components in src/components
server/   the API: one folder per feature in src/module, prompts in src/prompts
render.yaml, DEPLOY.md   hosting on Render
docker-compose.yml       local Postgres, Qdrant and Redis
```

## Running it on your computer

You need Node.js, Docker and Python 3 (with `pip install -r server/python/pdf_extractor/requirements.txt`).

1. **Start the databases.**
   ```bash
   docker compose up -d
   ```
   The compose file reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` and `POSTGRES_PORT` from a `.env` file in
   the project root.

2. **Set up the API.**
   ```bash
   cd server
   cp .env.example .env     # then fill in the values
   npm install
   npm run db:migrate
   npm run dev              # API on http://localhost:8000, plus the local Inngest dashboard
   ```

3. **Set up the website.**
   ```bash
   cd client
   cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api
   npm install
   npm run dev                  # website on http://localhost:3000
   ```

### Settings the API needs (`server/.env`)

`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `OPENAI_API_KEY`, `QDRANT_URL`,
`QDRANT_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `EMAIL_API_KEY`,
`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`. `MISTRAL_API_KEY` and `MEM0_API_KEY` are optional.
`server/.env.example` has the full list with placeholders. Never commit real keys.

## Useful commands

| Where | Command | What it does |
|---|---|---|
| `server/` | `npm run typecheck` | Checks the types without building |
| `server/` | `npm run build` | Builds to `dist/` |
| `server/` | `npm run db:generate` | Makes a new migration after a schema change |
| `server/` | `npm run studio` | Opens Drizzle Studio to look at the data |
| `client/` | `npm run lint` | Runs ESLint |
| `client/` | `npm run build` | Builds the website |

## Rules the code follows

- Every list the API returns is paged on the server: `?page` and `?limit`, answering with
  `{ data, total, page, limit, hasMore }` (see `server/src/common/utils/pagination.ts`).
- Shared behaviour lives in one shared component or helper, not in copies.

## Deploying

See [DEPLOY.md](DEPLOY.md) for the Render setup, the keys to have ready, and how to connect the website, the API and
Inngest.
