import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import UploadedFiles from '@/components/UploadedFiles';
import { connectDB } from '@/lib/db';

export default async function FilesPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/');
  }

  // Fetch user role from database
  const client = await connectDB();
  const userResult = await client.query(
    'SELECT role FROM "User" WHERE id = $1',
    [session.user.id]
  );

  const userRole = userResult.rows[0]?.role || 'COLLABORATOR';

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={{ ...session.user, role: userRole }} />
      <UploadedFiles />
    </div>
  );
}

