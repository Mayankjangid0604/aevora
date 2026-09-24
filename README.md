# AEVORA

**AEVORA** is a persistent autonomous AI-company simulation and platform. 

In this system, a Chairman (human owner) provides initial real-world capital to a company, which then operates autonomously through AI executives and AI employees. The AI employees have persistent identities, skills, memories, and personalities, and operate within a simulated 2D company world.

## Project Vision
- **Autonomous Operations:** An AI workforce consisting of executives, employees, and assistants.
- **Company Economy:** An internal currency (AC) where 1,000 AC = ₹1. Employees earn, save, and spend AC. Real-world company funds are strictly separated and controlled.
- **Rules & Governance:** A company constitution governs permissions, promotions, discipline, and operations.
- **2D World Visualization:** A live map of the office, showing employee avatars, status, and interactions.
- **Model Agnostic:** A Model Gateway ensures AEVORA does not depend on any single AI model provider (e.g., Gemini, Claude).

## Proposed Technology Stack
- **Frontend:** Next.js (React, TypeScript) for the Chairman dashboard and 2D visualization (potentially using HTML5 Canvas or WebGL via PixiJS).
- **Backend / API:** Node.js (TypeScript) with Express or NestJS for robust domain services.
- **Agent / Simulation Layer:** Node.js (TypeScript) or Python background workers, interacting with the backend via APIs and message queues.
- **Database:** PostgreSQL for robust, transactional, and persistent state management (crucial for the economy and ledger).
- **Cache / Messaging:** Redis for background task queues, pub/sub for the event system, and fast state caching.
- **Infrastructure:** Docker and Docker Compose for a reproducible local development environment.

## Proposed Monorepo Structure
```text
aevora/
├── docs/                 # Project documentation and architecture
├── apps/
│   ├── web/              # Next.js frontend application
│   ├── api/              # Main backend API and domain logic
│   └── simulation/       # Agent engine and simulation loop
├── packages/
│   ├── shared/           # Shared types, constants, and utilities
│   ├── model-gateway/    # AI model abstraction layer
│   └── database/         # Prisma/TypeORM schema and migrations
├── infrastructure/       # Docker configurations, scripts
└── README.md
```

## Getting Started
(Development commands will be added as the monorepo is scaffolded in subsequent steps.)
