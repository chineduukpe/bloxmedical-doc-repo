import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { reEmbedDocuments } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the embed endpoint without any file uploaded
    const embedResponse = await reEmbedDocuments();

    // If successful (200), return success response
    if (embedResponse.status === 200) {
      return NextResponse.json({ 
        success: true,
        message: 'Re-embedding completed successfully',
        data: embedResponse.data 
      });
    } else {
      return NextResponse.json(
        { error: 'Re-embedding failed', status: embedResponse.status },
        { status: embedResponse.status }
      );
    }
  } catch (error: any) {
    console.error('Error re-embedding documents:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

