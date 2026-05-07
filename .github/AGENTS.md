# CI/CD Agent Instructions

## Goal

Create a simple GitHub Actions CI pipeline that proves the project can be installed, checked, tested where available, and built.

Do not implement deployment.

## Required Workflow

Create:

```txt
.github/workflows/ci.yml
```

The workflow should run on:

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

Use Node.js 22 unless the project specifies a different version.

## Backend CI Steps

- Install backend dependencies
- Generate Prisma client if needed
- Run backend lint
- Run backend tests if available
- Build backend

If the backend uses Prisma, run this before lint/test/build when needed:

```bash
npx prisma generate
```

Use `working-directory: backend` for backend steps unless root scripts already exist.

## Frontend CI Steps

- Install frontend dependencies
- Run frontend lint
- Build frontend

Use `working-directory: frontend` for frontend steps unless root scripts already exist.

## PostgreSQL in CI

Use a PostgreSQL service only if backend tests require database access.

If tests do not require the database, keep CI simpler and skip the database service.

If a PostgreSQL service is used, keep it minimal and use environment variables that match the test configuration.

## CI Rules

- Keep CI simple and reliable.
- Do not add deployment steps.
- Do not publish Docker images.
- Do not add cloud provider setup.
- Do not overcomplicate with caching unless it is simple and safe.
- Make sure CI reflects commands documented in README when possible.
- Prefer `npm ci` over `npm install` in CI.
- Avoid CI-only commands that do not work locally.
