import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiService } from '@/lib/ai-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ['pending', 'reviewed', 'resolved'];
    if (!validStatuses.includes(body.status.toLowerCase())) {
      return NextResponse.json(
        { error: 'Status must be one of: pending, reviewed, resolved' },
        { status: 400 }
      );
    }

    // Prepare request body for AI service
    const requestBody: { status: string; admin_notes?: string } = {
      status: body.status.toLowerCase(),
    };

    if (body.admin_notes !== undefined) {
      requestBody.admin_notes = body.admin_notes;
    }

    // Update missing condition via AI service
    const response = await aiService.patch(`/missing-conditions/${id}`, requestBody);

    if (!response.data) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error updating missing condition:', error);
    
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data?.error || 'Failed to update missing condition' },
        { status: error.response.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

