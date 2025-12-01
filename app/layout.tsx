import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import AuthSessionProvider from '@/components/SessionProvider';
import QueryProvider from '@/components/QueryProvider';
import { Toaster } from 'sonner';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BLOX AI - Medical File Upload Dashboard',
  description: 'Secure dashboard for uploading and managing medical files',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased`}>
        <QueryProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
