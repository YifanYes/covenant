# ARQ

A personal productivity app for managing tasks, habits, and objectives with an RPG-style gamification system.

## Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime)
- [Node.js](https://nodejs.org/) (v18+)
- PostgreSQL database in Supabase

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/arq.git
cd arq
```

2. Install dependencies:

```bash
# Install root dependencies
bun install

# Install frontend dependencies
cd front && bun install && cd ..

# Install server dependencies
cd server && bun install && cd ..

# Install shared dependencies
cd shared && bun install && cd ..
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
cd server && bun run dev

# Terminal 2: Start the frontend
cd front && bun run dev
```

## Project Structure

```
arq/
├── front/          # React frontend (Vite + TypeScript)
├── server/         # Backend server (tRPC + Fastify)
│   ├── routers/    # tRPC router definitions
│   ├── services/   # Business logic layer
│   └── repositories/ # Data access layer (Prisma)
├── shared/         # Shared code (Zod schemas, types)
├── .context/       # Coding standards and AI context
├── .antigravity/   # Agent rules and directives
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

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, React Query, Zustand
- **Backend**: Bun, tRPC, Prisma, PostgreSQL
- **Validation**: Zod
- **Internationalization**: i18next

## Building for Production

```bash
# Build the frontend
cd front && bun run build

# Build the server
cd server && npx tsc
```
