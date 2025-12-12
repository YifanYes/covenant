# ARQ

A personal productivity app for managing tasks, habits, and objectives with an RPG-style gamification system.

## Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime)
- [Node.js](https://nodejs.org/) (v18+)
- PostgreSQL database

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
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # React hooks
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Utility functions
│   │   └── views/        # Page components
│   └── ...
├── server/         # Backend server (tRPC + Prisma)
│   ├── prisma/          # Database schema
│   ├── routers/         # tRPC routers
│   ├── services/        # Business logic
│   └── ...
├── shared/         # Shared code between front and server
│   └── schemas/         # Zod validation schemas
└── docs/           # Documentation
```

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
