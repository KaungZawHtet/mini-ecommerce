# Backend Agent Instructions

## Stack

- NestJS
- Prisma
- PostgreSQL
- HTTP-only cookie server-side sessions

## Backend Priorities

- Secure authentication
- Server-side session validation
- 30-minute inactivity timeout
- Brute-force protection
- Product cursor pagination
- DTO validation
- Clean NestJS modules
- Clear error handling

## Scaffolding Rule

If the backend has not been scaffolded, prefer the official NestJS CLI from the project root:

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

Do not run these commands if `backend/` already exists. Do not recreate or overwrite an existing backend without explicit approval.

## Required Modules

Use or create these modules:

- `AuthModule`
- `UsersModule`
- `ProductsModule`
- `PrismaModule`

Session logic can live inside `AuthModule` unless it becomes too large.

## Required Endpoints

```http
POST /auth/login
POST /auth/logout
GET /auth/me
GET /products?pageSize=20&cursor=<cursor>
```

`GET /auth/me` should return the current authenticated user without sensitive fields.

## Auth Rules

Use server-side sessions with an opaque session token.

- Browser stores raw token in an HTTP-only cookie named `session_token`.
- PostgreSQL stores only the hashed token.
- Do not use pure stateless JWT for this assignment.
- Do not store auth tokens in `localStorage` or `sessionStorage`.

## Session Validation Logic

On every protected request:

1. Read `session_token` cookie.
2. Hash the token.
3. Find session by `tokenHash`.
4. Reject if missing.
5. Reject if `revokedAt` is not null.
6. Reject if `expiresAt` is in the past.
7. Reject if inactive for more than 30 minutes.
8. Update `lastActivityAt`.
9. Attach user/session to request context.

If inactive for more than 30 minutes:

- Set `revokedAt`
- Clear cookie
- Return `401 Unauthorized`

Logout must:

- Revoke the current session
- Clear the cookie

## Cookie Rules

For local development:

- `httpOnly: true`
- `secure: false`
- `sameSite: "lax"`
- `maxAge`: around 7 days

For production:

- `secure: true`

Register `cookie-parser` in `main.ts` so guards/controllers can read cookies from requests.

## Brute-force Protection

Implement:

- Login rate limiting
- Failed login attempt tracking
- Temporary account lockout
- Reset failed attempts after successful login
- Generic error messages

Recommended behavior:

- 5 failed attempts
- 15-minute lockout

Always return:

```txt
Invalid email or password
```

Do not reveal whether the email exists.

## Product API

Implement:

```http
GET /products?pageSize=20&cursor=<cursor>
```

Rules:

- `pageSize` min: 5
- `pageSize` max: 50
- Invalid `pageSize` returns `400 Bad Request`
- Use cursor-based pagination
- Sort by `createdAt DESC, id DESC`
- Return `items`, `nextCursor`, and `hasMore`

The cursor must work consistently with the selected ordering. Avoid unstable pagination that can skip or duplicate products.

Response:

```json
{
  "items": [],
  "nextCursor": null,
  "hasMore": false
}
```

## Prisma Models

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

Seed:

- At least 100 sample products
- One demo user: `demo@example.com` / `Password123!`

## Security

Use:

- `helmet`
- CORS with explicit frontend origin and credentials enabled
- `class-validator` DTOs
- Global validation pipe in `main.ts` with whitelist enabled
- `bcrypt` or `argon2`
- Generic auth errors
- Hashed session tokens

Never expose `passwordHash`.

Invalid DTO inputs should return `400 Bad Request`.

## Docker Notes

Inside Docker Compose, backend should connect to PostgreSQL using hostname `postgres`, not `localhost`.

For browser/frontend communication, CORS should allow:

```txt
http://localhost:3000
```

The backend should run on:

```txt
http://localhost:3001
```

The backend Docker startup should run Prisma migration and seed data automatically if possible, or the README must clearly document the commands.

## Backend Working Rules

- Keep modules clean and focused.
- Use DTO validation for request inputs.
- Avoid broad unrelated refactors.
- Do not skip server-side validation because frontend validates.
- Run lint/build/tests after major backend changes.
