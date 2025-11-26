import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from './db';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Required for Vercel and production deployments
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const client = await connectDB();
        const result = await client.query(
          'SELECT * FROM "bloxadmin_User" WHERE email = $1',
          [credentials.email]
        );

        if (result.rows.length === 0) {
          return null;
        }

        const user = result.rows[0];

        if (!user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Handle absolute URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Default redirect to dashboard
      return `${baseUrl}/dashboard`;
    },
  },
});
