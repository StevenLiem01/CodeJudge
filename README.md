# CodeJudge

CodeJudge adalah aplikasi online judge untuk mengerjakan dan menguji solusi pemrograman. Project ini terdiri dari backend API berbasis Express dan frontend berbasis React yang menyediakan editor kode serta pengiriman submission.

## Teknologi

- **Frontend:** React, TypeScript, Vite, Monaco Editor
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL dengan Drizzle ORM
- **Authentication:** Better Auth
- **Testing:** Vitest

## Prasyarat

- Node.js dan npm
- PostgreSQL
- `g++` jika ingin menjalankan submission C++
- Python dan Node.js jika ingin menjalankan submission Python atau JavaScript

## Setup Database

Buat database PostgreSQL, misalnya `codejudge`, lalu buat file `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/codejudge
BETTER_AUTH_URL=http://localhost:3000
PORT=3000
```

Ganti `PASSWORD` sesuai password PostgreSQL lokal.

## Instalasi

Install dependency backend:

```bash
cd backend
npm install
```

Install dependency frontend di terminal lain:

```bash
cd frontend
npm install
```

## Menjalankan Project

Push schema database terlebih dahulu:

```bash
cd backend
npm run db:push
```

Jalankan backend:

```bash
cd backend
npm run dev
```

Backend tersedia di `http://localhost:3000`.

Jalankan frontend di terminal lain:

```bash
cd frontend
npm run dev
```

Frontend biasanya tersedia di `http://localhost:5173`.

## Testing dan Build

Menjalankan test backend:

```bash
cd backend
npm test
```

Build backend:

```bash
cd backend
npm run build
```

Build frontend:

```bash
cd frontend
npm run build
```

Lint frontend:

```bash
cd frontend
npm run lint
```

## Struktur Project

```text
backend/     API, autentikasi, database, code runner, dan test
frontend/    Aplikasi React dan editor kode
```

Jangan commit file `backend/.env`. File tersebut berisi kredensial database dan sudah dikecualikan melalui `.gitignore`.