# ARQ

A personal productivity app for managing tasks, habits, and objectives with an RPG-style gamification system.

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (package manager)
- PostgreSQL database in Supabase

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/arq.git
cd arq
```

2. Install dependencies:

```bash
# Install all workspace dependencies from root
pnpm install
```

3. Configure environment variables:

```bash
# Copy the example env file
cp server/.env.example server/.env

# Edit server/.env with your database credentials
```

4. Set up the database:

```bash
cd server
npx prisma db push
npx prisma generate
```

## Development

Run the development servers:

```bash
# Terminal 1: Start the backend server
cd server && pnpm dev

# Terminal 2: Start the frontend
cd front && pnpm dev
```

## Project Structure

```
arq/
├── front/          # Next.js frontend (App Router + TypeScript)
│   ├── app/        # Next.js App Router pages
│   ├── components/ # Shared/reusable components
│   └── middleware.ts # Next.js middleware
├── server/         # Backend server (tRPC + Fastify)
│   ├── routers/    # tRPC router definitions
│   ├── services/   # Business logic layer
│   └── repositories/ # Data access layer (Prisma)
├── shared/         # Shared code (Zod schemas, types)
├── docs/           # Documentation and specifications
│   └── specs/      # Technical specifications (SDD)
├── .ai/            # AI agent context (universal)
│   ├── AGENTS.md   # Main AI instructions
│   └── CODING_STANDARDS.md
├── mission.md      # Project mission and pillars
└── roadmap.md      # Project timeline and phases
```

## Architecture

The backend follows a layered architecture to ensure separation of concerns and maintainability:

1.  **tRPC Routers**: Handle incoming requests, validation, and protocol logic. They should be "thin" and delegate business logic to services.
2.  **Services**: Contain the core business logic. They are orchestrated by a `ServiceFactory` and use Repositories for data access.
3.  **Repositories**: Encapsulate all database operations using Prisma. This allows for cleaner services and easier testing/refactoring.
4.  **Shared Layer**: Centralizes Zod schemas and inferred types, serving as the single source of truth for both frontend and backend.

## Spec-Driven Development (SDD)

This project follows **Spec-Driven Development** principles to ensure architectural consistency and quality:

1.  **Define the Spec**: Before implementing complex features, a technical specification is created.
2.  **Implementation**: Development follows the approved specification strictly.
3.  **Validation**: Post-implementation verification to ensure the code meets the spec requirements.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4, TanStack Query, Zustand
- **Backend**: Node.js, tRPC, Prisma, PostgreSQL
- **Validation**: Zod
- **Internationalization**: i18next

## Building for Production

```bash
# Build the frontend (Next.js)
cd front && pnpm build

# Start the frontend in production
cd front && pnpm start

# Start the server in production
cd server && pnpm start
```

## Testing

The server uses [Vitest](https://vitest.dev/) for unit and integration testing.

### Running Tests

To run the test suite for the server:

```bash
cd server
pnpm test
```

### Coverage

To generate a coverage report:

```bash
cd server
pnpm test:coverage
```
