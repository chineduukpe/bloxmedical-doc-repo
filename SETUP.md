# BLOX AI Medical Dashboard Setup

## Prerequisites

1. **PostgreSQL Database**: Make sure you have PostgreSQL running locally
2. **Node.js**: Version 18 or higher
3. **Yarn**: Package manager

## Setup Instructions

### 1. Install Dependencies
```bash
yarn install
```

### 2. Database Setup
```bash
# Generate Prisma client
yarn db:generate

# Push schema to database (creates tables)
yarn db:push

# Create test user
yarn db:setup
```

### 3. Environment Variables
Make sure your `.env` file is configured with:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for JWT signing
- `NEXTAUTH_URL`: Your application URL

### 4. Start Development Server
```bash
yarn dev
```

## Test Credentials

After running `yarn db:setup`, you can login with:
- **Email**: admin@bloxmedical.com
- **Password**: password123

## Features

- ✅ Secure authentication with NextAuth.js
- ✅ PostgreSQL database with Prisma ORM
- ✅ Login form with validation and error handling
- ✅ Protected dashboard route
- ✅ Responsive design matching the provided screenshot
- ✅ BLOX AI branding and logo

## Project Structure

```
├── app/
│   ├── api/auth/          # NextAuth API routes
│   ├── dashboard/         # Protected dashboard page
│   └── page.tsx          # Login page (when not authenticated)
├── components/
│   ├── LoginForm.tsx     # Login form component
│   └── SessionProvider.tsx # NextAuth session provider
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   └── prisma/           # Generated Prisma client
├── prisma/
│   └── schema.prisma     # Database schema
└── scripts/
    └── setup-db.js       # Database setup script
```
