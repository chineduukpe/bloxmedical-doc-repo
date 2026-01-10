import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteImages } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image_ids } = body;

    if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
      return NextResponse.json(
        { error: 'image_ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    try {
      // Call AI service to delete the images
      const aiServiceResponse = await deleteImages(image_ids);

      // Check if AI service returned success (200 or 204)
      if (
        aiServiceResponse.status === 200 ||
        aiServiceResponse.status === 204
      ) {
        return NextResponse.json({
          success: true,
          message: `Successfully deleted ${image_ids.length} image(s)`,
        });
      } else if (aiServiceResponse.status === 404) {
        // Images not found in AI service
        return NextResponse.json(
          { error: 'One or more images not found in AI service' },
          { status: 404 }
        );
      } else {
        // Other error from AI service
        return NextResponse.json(
          {
            error: `AI service returned status ${aiServiceResponse.status}`,
          },
          { status: aiServiceResponse.status || 500 }
        );
      }
    } catch (aiServiceError: any) {
      // Handle errors gracefully
      const statusCode = aiServiceError?.response?.status;
      const errorMessage =
        aiServiceError?.response?.data?.error ||
        aiServiceError?.message ||
        'Failed to delete images from AI service';

      if (statusCode === 404) {
        return NextResponse.json(
          { error: 'One or more images not found in AI service' },
          { status: 404 }
        );
      }

      console.error('Error deleting images from AI service:', aiServiceError);
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode || 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting images:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
