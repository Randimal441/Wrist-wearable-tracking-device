# Wrist Wearable Tracking Device

Wrist Wearable Tracking Device is a smart-glove and wrist-wearable tracking platform for collecting sensor readings and presenting bowler performance insights through a web dashboard.

The application is implemented as a Next.js web application in [`myapp/`](./myapp/). It uses PostgreSQL for application data and supports local development and Docker Compose deployment.

## Features

- User signup, login, logout, and JWT-based sessions
- Wearable device registration
- Sensor reading ingestion and session tracking
- Wrist-angle and grip-status monitoring
- Delivery-speed and release-speed tracking
- Personalized performance recommendations
- User profile and session history views
- Administrator dashboard with user and session management
- Seed scripts for administrator accounts and sensor data

## Technology Stack

- Next.js 16 with the App Router
- React 19 and TypeScript
- PostgreSQL 16
- Node.js 20
- JWT and bcrypt-based authentication
- Docker and Docker Compose

## Project Structure

```text
.
├── README.md                 # Project documentation
└── myapp/
    ├── app/                  # Pages, layouts, dashboards, and API routes
    ├── components/           # Shared React components
    ├── lib/                  # Database, authentication, sensor, and domain logic
    ├── scripts/              # Migrations, seeders, and maintenance scripts
    ├── public/               # Static assets
    ├── Dockerfile
    └── docker-compose.yml
```

## Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL 16 or a compatible PostgreSQL database

Docker users can run the application and PostgreSQL together without installing PostgreSQL locally.

## Local Development

1. Enter the application directory:

   ```bash
   cd myapp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with the required configuration:

   ```dotenv
   DATABASE_URL=postgresql://postgres:password@localhost:5432/smart_glove
   DATABASE_SSL=false
   JWT_SECRET=replace-with-a-long-random-secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   `DATABASE_CA_CERT` may be provided when the database requires a custom TLS certificate.

4. Run the database migration:

   ```bash
   npm run db:migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Available Commands

Run these commands from [`myapp/`](./myapp/):

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:backfill:summaries` | Backfill delivery summaries |
| `npm run db:seed:admin` | Create or seed an administrator account |
| `npm run db:seed:sensors` | Insert demonstration sensor data |

## Docker Compose

The Compose configuration starts PostgreSQL and the production application together.

From [`myapp/`](./myapp/), create a `.env` file containing at least:

```dotenv
JWT_SECRET=replace-with-a-long-random-secret
```

Then run:

```bash
docker compose up --build
```

The application is available at [http://localhost:3000](http://localhost:3000). PostgreSQL data is stored in the `postgres_data` Docker volume.

For deployments, replace the sample database password and use a strong, randomly generated `JWT_SECRET`.

## Application API Areas

The application exposes route handlers for:

- Authentication: signup, login, and logout
- User profiles and registered devices
- Sensor readings
- Wrist angle and grip status
- Delivery speeds and sessions
- Session readings, live status, next-ball data, and session completion
- Administrative statistics, users, and user sessions

API routes are located under [`myapp/app/api/`](./myapp/app/api/).

## Security Notes

- Do not commit `.env` or `.env.local` files.
- Use a unique, high-entropy `JWT_SECRET` outside local development.
- Change the default PostgreSQL credentials before sharing or deploying the Compose configuration.
- Use TLS-enabled database connections in production when required by the database provider.
