import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiService } from '@/lib/ai-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const status = searchParams.get('status') || null;

    // Build query parameters for AI service
    const params: Record<string, string> = {
      page,
      limit,
    };
    if (status) {
      params.status = status;
    }

    // Fetch missing conditions from external AI service
    const response = await aiService.get('/missing-conditions', { params });

    if (!response.data) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching missing conditions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


