# Agent Instructions: E-commerce Mini-App

## Project Goal

Build a senior-level take-home e-commerce product catalog using:

- Frontend: Next.js
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Full local setup via Docker Compose
- Basic CI/CD via GitHub Actions

The project should demonstrate:

- Security
- Performance
- Clean architecture
- Edge-case handling
- Clear documentation
- Smooth reviewer experience

## Recommended Setup

Use Docker Compose for the full project so the reviewer can run everything with one command:

```bash
docker compose up --build
```

Docker Compose should start:

- PostgreSQL
- NestJS backend
- Next.js frontend

Also keep manual npm-based setup as a fallback in the README.

Do not over-engineer Docker. Avoid Nginx, Kubernetes, complex production deployment, or unnecessary infrastructure.

Recommended local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

## Initial Scaffolding Commands

Use official CLI commands for initial project setup when possible.

Important:

- Run these commands only if the project has not already been scaffolded.
- Before running commands, inspect the repository structure.
- Do not recreate `backend/` if it already exists.
- Do not recreate `frontend/` if it already exists.
- Do not delete and recreate existing folders without explicit approval.
- Do not overwrite existing implementation files unless the change is intentional and explained.
- Prefer command-based scaffolding for credit efficiency.
- After scaffolding, implement custom logic according to this file and the nearest `AGENTS.md`.

### Backend Scaffolding

If `backend/` does not exist, create the NestJS backend:

```bash
npx @nestjs/cli new backend --package-manager npm
```

Then install backend dependencies:

```bash
cd backend
npm install @nestjs/config @nestjs/throttler @prisma/client cookie-parser helmet bcrypt class-validator class-transformer
npm install -D prisma @types/cookie-parser @types/bcrypt
npx prisma init
cd ..
```

### Frontend Scaffolding

If `frontend/` does not exist, create the Next.js frontend:

```bash
npx create-next-app@latest frontend
```

If the CLI asks interactive questions, choose the recommended options below.

Recommended choices:

```txt
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src directory: Yes
App Router: Yes
Turbopack: Yes
Import alias: Yes
```

Then install frontend dependencies:

```bash
cd frontend
npm install @tanstack/react-query
cd ..
```

### Support Files

Create these files if they do not already exist:

```bash
touch docker-compose.yml
touch backend/Dockerfile
touch frontend/Dockerfile
mkdir -p .github/workflows
touch .github/workflows/ci.yml
touch README.md
```

### After Scaffolding

After scaffolding, continue with this implementation order:

1. Configure Docker Compose.
2. Configure backend Dockerfile.
3. Configure frontend Dockerfile.
4. Configure Prisma schema.
5. Add migrations and seed data.
6. Implement backend auth/session logic.
7. Implement product pagination API.
8. Implement frontend login and product pages.
9. Add CI workflow.
10. Complete README.
11. Run lint/build/tests and fix errors.

## Core Architecture Decision

Use server-side sessions with HTTP-only cookies instead of pure stateless JWT.

Reason:

The assignment requires persistent sessions after browser restart and automatic invalidation after 30 minutes of inactivity. A pure stateless JWT can handle fixed expiration but cannot reliably enforce inactivity timeout or immediate logout without server-side state.

Use an opaque session token stored in an HTTP-only cookie. Store only the hashed session token in PostgreSQL.

## Authentication Requirements

- Login screen
- Secure password hashing using `bcrypt` or `argon2`
- HTTP-only cookie named `session_token`
- Store only hashed session tokens in PostgreSQL
- Use generic login failure message: `Invalid email or password`
- Logout must revoke the server-side session and clear the cookie
- Add brute-force protection using rate limiting and failed login tracking
- Add temporary lockout after repeated failed login attempts
- Add protected route/session guard
- Add `GET /auth/me` to return the current authenticated user

Do not store auth tokens in:

- `localStorage`
- `sessionStorage`
- client-side JavaScript state only

Do not expose whether an email exists.

## Session Table

The session table should include:

- `id`
- `userId`
- `tokenHash`
- `createdAt`
- `lastActivityAt`
- `expiresAt`
- `revokedAt`

## Session Cookie

Use:

- Cookie name: `session_token`
- `httpOnly: true`
- `secure: false` for local HTTP development
- `secure: true` in production
- `sameSite: "lax"`
- Persistent `maxAge`, for example 7 days

## Session Validation Logic

On every protected request:

1. Read session token from HTTP-only cookie.
2. Hash the token.
3. Find session by `tokenHash`.
4. Reject if session is missing.
5. Reject if `revokedAt` is not null.
6. Reject if `expiresAt` is in the past.
7. Reject if `now - lastActivityAt > 30 minutes`.
8. If valid, update `lastActivityAt`.
9. Attach user/session to request context.

If the session is inactive for more than 30 minutes:

- Set `revokedAt`
- Clear cookie
- Return `401 Unauthorized`

Logout should:

- Revoke the current session
- Clear the `session_token` cookie
- Return success

## Brute-force Protection

Implement layered protection:

- Rate-limit login endpoint
- Track failed login attempts by email/user
- Optional IP-based throttling
- Lock account temporarily after repeated failed attempts
- Reset failed attempts after successful login
- Always return generic login error

Recommended behavior:

- 5 failed login attempts
- 15-minute temporary lockout

## Product Requirements

- Product listing with infinite scroll
- User-configurable page size
- Minimum page size: `5`
- Maximum page size: `50`
- Backend must validate `pageSize`
- Use cursor-based pagination
- Sort products by `createdAt DESC, id DESC`
- Seed at least 100 sample products

Recommended API:

```http
GET /products?pageSize=20&cursor=<cursor>
```

Recommended response:

```json
{
  "items": [],
  "nextCursor": null,
  "hasMore": false
}
```

Invalid `pageSize` should return `400 Bad Request`.

Prefer rejecting invalid page size instead of silently clamping.

## Pagination Strategy

Use cursor pagination instead of offset pagination.

Reason:

Cursor pagination is better for large lists and more stable when new products are inserted. It helps avoid skipped or duplicated records during infinite scrolling.

Recommended database index:

```sql
CREATE INDEX idx_products_created_at_id ON products(created_at DESC, id DESC);
```

## Frontend Requirements

Implement:

- Next.js login page
- Authenticated products page
- Infinite scroll using TanStack Query `useInfiniteQuery` for paginated fetching and `IntersectionObserver` as the scroll trigger
- Page size selector
- Loading state
- Error state with retry
- Empty state
- Prevent duplicate fetches while loading
- Stop fetching when `hasMore` is false

Recommendation:

Use TanStack Query `useInfiniteQuery` for paginated product fetching. Use `IntersectionObserver` to detect when the bottom sentinel enters the viewport and then call `fetchNextPage()`. Avoid manually managing pagination state unless TanStack Query causes setup issues.

Frontend requests that need cookies must use:

```ts
credentials: "include"
```

## Backend Requirements

Recommended NestJS modules:

- `AuthModule`
- `UsersModule`
- `ProductsModule`
- `PrismaModule`

Recommended backend endpoints:

```http
POST /auth/login
POST /auth/logout
GET /auth/me
GET /products?pageSize=20&cursor=<cursor>
```

Use DTO validation with `class-validator`.

Use `helmet`.

Use CORS with explicit frontend origin and credentials enabled.

## Database Models

### User

- `id`
- `email`
- `passwordHash`
- `failedLoginAttempts`
- `lockedUntil`
- `createdAt`
- `updatedAt`

### Session

- `id`
- `userId`
- `tokenHash`
- `createdAt`
- `lastActivityAt`
- `expiresAt`
- `revokedAt`

### Product

- `id`
- `name`
- `description`
- `price`
- `imageUrl`
- `stock`
- `createdAt`
- `updatedAt`

Seed one demo user:

```txt
Email: demo@example.com
Password: Password123!
```

Mention demo credentials in the README.

## Docker Requirements

Use Docker Compose as the primary setup.

The reviewer should be able to run:

```bash
docker compose up --build
```

This should start:

- PostgreSQL
- Backend
- Frontend

Important Docker notes:

- Backend should connect to PostgreSQL using Docker hostname `postgres`.
- Browser should call backend using `http://localhost:3001`.
- Frontend should use `NEXT_PUBLIC_API_URL=http://localhost:3001`.
- Backend CORS should allow `http://localhost:3000`.
- Local cookie config should work over HTTP.
- The backend container should run Prisma migrations and seed data automatically during startup, or the README must clearly document the command to do it manually.

Recommended project structure:

```txt
ecommerce-mini-app/
  AGENTS.md
  README.md
  docker-compose.yml
  backend/
    AGENTS.md
    Dockerfile
    package.json
    prisma/
  frontend/
    AGENTS.md
    Dockerfile
    package.json
  .github/
    AGENTS.md
    workflows/
      ci.yml
```

## CI/CD Requirements

Create GitHub Actions workflow that:

- Installs backend dependencies
- Runs backend lint
- Runs backend tests
- Builds backend
- Installs frontend dependencies
- Runs frontend lint
- Builds frontend

Keep CI simple and reliable.

## README Requirements

The README must include:

- Project overview
- Tech stack
- Architecture decisions
- Why server-side sessions were chosen
- Authentication/session design
- Brute-force protection
- Product pagination design
- Performance considerations
- Docker quick start
- Manual local setup fallback
- Environment variables
- Database migration and seed instructions
- Demo credentials
- Running tests
- CI/CD explanation
- Known trade-offs

Include this architecture explanation:

```txt
I chose server-side sessions with an HTTP-only cookie because the assignment requires both persistent login across browser restarts and automatic invalidation after 30 minutes of inactivity. A purely stateless JWT can handle fixed expiration, but it cannot reliably enforce inactivity timeout or immediate logout without adding server-side state. The server-side session model keeps the browser token opaque, stores only a hashed token in the database, and allows the backend to revoke expired or inactive sessions immediately.
```

Include this pagination explanation:

```txt
The product catalog uses cursor-based pagination rather than offset pagination. Cursor pagination is more stable for infinite scrolling because it avoids skipped or duplicated records when new products are inserted. Products are ordered deterministically by creation date and ID, and the backend validates the requested page size to ensure it stays between 5 and 50 items.
```

## Known Trade-offs

Mention:

- This project is optimized for the take-home scope.
- Docker Compose is used for reviewer convenience.
- Server-side sessions are stored in PostgreSQL for simplicity.
- In production, Redis could be used for faster session and rate-limit storage.
- Stronger bot protection could be added.
- More E2E tests could be added.
- Product virtualization could be added for extremely large lists.
- Observability, audit logs, and monitoring could be added for production.

## Implementation Order

Follow this order:

1. Inspect the current repository structure.
2. Use official CLI scaffolding commands only if `backend/` or `frontend/` do not exist.
3. Create or update root project structure.
4. Add `docker-compose.yml`.
5. Create or update NestJS backend.
6. Add Prisma.
7. Define User, Session, and Product models.
8. Add migration and seed data.
9. Implement auth login/logout.
10. Implement session guard.
11. Implement 30-minute inactivity timeout.
12. Implement brute-force protection.
13. Implement product cursor pagination API.
14. Create or update Next.js frontend.
15. Implement login page.
16. Implement authenticated products page.
17. Implement infinite scroll.
18. Add page size selector.
19. Add loading, error, and empty states.
20. Add Dockerfiles for backend and frontend.
21. Make `docker compose up --build` run the whole app.
22. Add GitHub Actions CI.
23. Write professional README.
24. Run lint/build/tests.
25. Fix errors.
26. Summarize completed work.

## Agent Working Rules

- Always recommend the best practical approach when there are multiple options.
- Prefer official CLI scaffolding commands for initial setup instead of manually writing boilerplate.
- Do not run scaffolding commands if the target folder already exists.
- Do not delete and recreate existing `backend/` or `frontend/` folders without explicit user approval.
- Prefer simple, senior-level, reviewer-friendly implementation.
- Before making large changes, explain the plan.
- List files that will be modified.
- Make changes step by step.
- After changes, run relevant commands.
- Fix lint, type, build, or test errors.
- Prefer readable code over over-engineering.
- Do not make broad unrelated refactors.
- Do not store tokens in `localStorage`.
- Do not rely only on frontend inactivity timeout.
- Do not skip `pageSize` validation.
- Do not expose `passwordHash`.
- Do not ignore Docker/browser/backend networking differences.
- Keep the README clear enough for a reviewer to run the app quickly.
- Keep implementation focused on the assignment requirements.
