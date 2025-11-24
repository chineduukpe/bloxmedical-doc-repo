import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import DocumentRepository from '@/components/DocumentRepository';
import { connectDB } from '@/lib/db';

export default async function Dashboard() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/');
  }

  // Fetch user role from database
  const client = await connectDB();
  const userResult = await client.query(
    'SELECT role FROM "bloxadmin_User" WHERE id = $1',
    [session.user.id]
  );

  const userRole = userResult.rows[0]?.role || 'COLLABORATOR';

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={{ ...session.user, role: userRole }} />
      <DocumentRepository userRole={userRole} />
    </div>
  );
}
