# Frontend Agent Instructions

## Stack

- Next.js
- TypeScript
- Tailwind CSS if available from scaffolding
- TanStack Query
- Cookie-based authentication with NestJS backend

## Frontend Priorities

- Clean login flow
- Authenticated product catalog
- Infinite scroll
- Page size selector
- Good loading/error/empty states
- No auth token in localStorage or sessionStorage
- Smooth reviewer experience

## Scaffolding Rule

If the frontend has not been scaffolded, prefer the official Next.js CLI from the project root:

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

Do not run these commands if `frontend/` already exists. Do not recreate or overwrite an existing frontend without explicit approval.

## Auth Rules

Authentication uses HTTP-only cookies.

The frontend should not manually read or store tokens.

All API requests that need authentication must use:

```ts
credentials: "include"
```

Required auth behavior:

- Login calls `POST /auth/login`.
- Logout calls `POST /auth/logout`.
- Current user check calls `GET /auth/me`.
- If `/auth/me` returns `401`, redirect to `/login`.
- If any protected API request returns `401`, redirect to `/login`.

Do not store tokens in:

- `localStorage`
- `sessionStorage`
- React state as a token value

## Required Pages

Implement:

- Login page
- Authenticated products page

Suggested routes:

```txt
/login
/products
```

The root page can redirect to `/products` or `/login` depending on auth state.

## Product Listing

Use:

```http
GET /products?pageSize=20&cursor=<cursor>
```

Implement:

- Infinite scroll
- Page size selector
- Min page size: 5
- Max page size: 50
- Loading state
- Error state with retry
- Empty state
- Stop fetching when `hasMore` is false
- Prevent duplicate fetches while already loading
- Reset product pagination when `pageSize` changes

Recommendation:

Use TanStack Query `useInfiniteQuery` for paginated product fetching. Use `IntersectionObserver` to detect when the bottom sentinel enters the viewport and then call `fetchNextPage()`. Avoid manually managing pagination state unless TanStack Query causes setup issues.

## API Configuration

Use:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Browser requests should call:

```txt
http://localhost:3001
```

Do not use Docker internal hostname `backend` from browser-side code.

## UI Expectations

Keep the UI simple and professional:

- Clear login form
- Product cards with name, description, price, stock, and image if available
- Loading skeleton or simple loading text
- Retry button on error
- Empty state if no products
- Logout button

## Performance

- Keep product card components small.
- Use lazy-loaded images.
- Avoid expensive render logic.
- Avoid unnecessary re-renders.
- Do not fetch the next page multiple times while already loading.
- Mention virtualization as a future improvement in README, but it is optional for implementation.

## Frontend Working Rules

- Keep implementation focused on the assignment.
- Do not add unnecessary UI libraries unless already installed or clearly useful.
- Keep API handling simple and readable.
- Run lint/build after major frontend changes.
