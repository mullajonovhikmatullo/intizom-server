# Habit Expense Keeper Server

Node.js + TypeScript + Express + Prisma + PostgreSQL backend skeleton.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Health check:

```bash
curl http://localhost:4000/health
```

## Prisma Migrations

Set `DATABASE_URL` in `.env` first.

Create and apply a new development migration:

```bash
npm run prisma:migrate -- --name init
```

Create another migration after schema changes:

```bash
npm run prisma:migrate -- --name add_next_change
```

Regenerate Prisma Client manually:

```bash
npm run prisma:generate
```

Apply existing migrations in production or CI:

```bash
npx prisma migrate deploy
```

Open Prisma Studio:

```bash
npm run prisma:studio
```
