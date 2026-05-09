# Mini E-commerce Catalog

A e-commerce mini-app with a Next.js frontend, NestJS backend, PostgreSQL database, Prisma ORM, Docker Compose local setup, and simple GitHub Actions CI.

The app demonstrates cookie-based authentication, server-side session invalidation, brute-force login protection, cursor-paginated product listing, and a reviewer-friendly local workflow.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, TanStack Query
- Backend: NestJS, TypeScript, Prisma
- Database: PostgreSQL
- Auth: server-side sessions with an HTTP-only cookie
- Local orchestration: Docker Compose
- CI: GitHub Actions

## Docker Quick Start

From the repository root:

```bash
docker compose up --build
```

This starts:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

The backend container runs Prisma migrations and seed data at startup.

## Demo Credentials

```txt
Email: demo@example.com
Password: Password123!
```

## Manual Local Setup

Start PostgreSQL locally or through Docker:

```bash
docker compose up -d postgres
```

Install and prepare the backend:

```bash
cd backend
npm ci
cp .env.example .env
npm run prisma:generate
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

Install and run the frontend:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment Variables

Backend local development:

```txt
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mini_ecommerce?schema=public
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
```

Backend inside Docker Compose:

```txt
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mini_ecommerce?schema=public
```

Frontend:

```txt
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Authentication And Sessions

Authentication uses server-side sessions with an HTTP-only cookie named `session_token`.

I chose server-side sessions with an HTTP-only cookie because the assignment requires both persistent login across browser restarts and automatic invalidation after 30 minutes of inactivity. A purely stateless JWT can handle fixed expiration, but it cannot reliably enforce inactivity timeout or immediate logout without adding server-side state. The server-side session model keeps the browser token opaque, stores only a hashed token in the database, and allows the backend to revoke expired or inactive sessions immediately.

Session behavior:

- The browser receives only an opaque `session_token` cookie.
- The raw session token is never stored in PostgreSQL.
- PostgreSQL stores only a SHA-256 hash of the session token.
- Cookies are `httpOnly`, `sameSite: lax`, and persistent for about 7 days.
- `secure` is enabled in production and disabled for local HTTP development.
- Protected requests update `lastActivityAt`.
- Sessions inactive for more than 30 minutes are revoked and rejected with `401`.
- Logout revokes the server-side session and clears the cookie.

The frontend never stores auth tokens in `localStorage`, `sessionStorage`, or JavaScript-accessible token state. API requests use `credentials: "include"` so the browser sends the HTTP-only cookie.

## Brute-force Protection

Login is protected in two layers:

- The login endpoint is rate-limited.
- Failed login attempts are tracked on the user record.

After 5 failed attempts, the account is locked for 15 minutes. Login failures always return the generic message:

```txt
Invalid email or password
```

The API does not reveal whether an email exists.

## Product Pagination

The product catalog uses cursor-based pagination rather than offset pagination. Cursor pagination is more stable for infinite scrolling because it avoids skipped or duplicated records when new products are inserted. Products are ordered deterministically by creation date and ID, and the backend validates the requested page size to ensure it stays between 5 and 50 items.

Endpoint:

```http
GET /products?pageSize=20&cursor=<cursor>
```

The products endpoint requires a valid authenticated session. Browser requests
include the HTTP-only `session_token` cookie with `credentials: "include"`.

Response:

```json
{
  "items": [],
  "nextCursor": null,
  "hasMore": false
}
```

Pagination details:

- `pageSize` must be between 5 and 50.
- Invalid `pageSize` returns `400 Bad Request`.
- Products are ordered by `createdAt DESC, id DESC`.
- The database has an index for this ordering.
- Seed data includes 100 products.

## Frontend Infinite Scroll

The frontend uses TanStack Query `useInfiniteQuery` for paginated product fetching. An `IntersectionObserver` watches a bottom sentinel and calls `fetchNextPage()` when the user reaches the end of the current list.

The products page includes:

- Page size selector
- Loading state
- Error state with retry
- Empty state
- Duplicate-fetch prevention while a next page is already loading
- Logout button
- Redirect to `/login` when authentication fails
- Redirect from `/login` to `/products` when an authenticated user visits the login page

Changing page size changes the query key, so pagination resets from the first page.

## API Routes

Backend:

```http
POST /auth/login
POST /auth/logout
GET /auth/me
GET /products?pageSize=20&cursor=<cursor>
```

`GET /products` is protected by the same server-side session guard used by
`/auth/me` and `/auth/logout`.

Frontend:

```txt
/
/login
/products
```

The root page redirects to `/products` when authenticated and `/login` otherwise.
The login page is guest-only; authenticated users who visit `/login` are redirected to `/products`.

## Running Checks

Backend:

```bash
cd backend
npm run prisma:generate
npm run lint
npm run test
npm run build
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Docker Compose validation:

```bash
docker compose config
```

## Manual App Test

1. Run `docker compose up --build`.
2. Open http://localhost:3000.
3. Sign in with `demo@example.com / Password123!`.
4. Confirm the products page loads.
5. Scroll down and confirm more products load.
6. Change the page size and confirm the list resets.
7. Refresh the browser and confirm the session persists.
8. Click logout and confirm direct access to `/products` redirects to `/login`.

## CI/CD

GitHub Actions runs on pushes to `main` and on pull requests.

The workflow:

- Installs backend dependencies with `npm ci`
- Generates the Prisma client
- Runs backend lint
- Runs backend tests
- Builds the backend
- Installs frontend dependencies with `npm ci`
- Runs frontend lint
- Builds the frontend

There are no deployment steps and no Docker image publishing. PostgreSQL is not started in CI because the current automated tests do not require database access.

## Known Trade-offs

- This project is optimized for the take-home scope.
- Docker Compose is used for reviewer convenience.
- Server-side sessions are stored in PostgreSQL for simplicity.
- In production, Redis could be used for faster session and rate-limit storage.
- Stronger bot protection could be added.
- More E2E tests could be added.
- Product virtualization could be added for extremely large lists.
- Observability, audit logs, and monitoring could be added for production.
- The Docker setup is intentionally simple and avoids Nginx, Kubernetes, or cloud deployment complexity.
