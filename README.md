# BLOX Medical Admin Dashboard

This is a [Next.js](https://nextjs.org) medical document management application with role-based access control.

## Features

- **Document Management**: Upload, view, edit, and delete medical documents
- **User Management**: Create and manage users with different roles (Admin/Collaborator)
- **Role-Based Access**: Different UI and permissions based on user role
- **Email Verification**: Send verification emails to new users
- **Audit Logging**: Track all changes made to users and documents
- **Automatic Admin Creation**: Admin user is automatically created on startup

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

The application will automatically:
1. Create an admin user if it doesn't exist
2. Ensure the admin user has ADMIN role
3. Start the development server

**Default Admin Credentials:**
- Email: `admin@bloxmedical.com`
- Password: `password`
- Role: `ADMIN`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
