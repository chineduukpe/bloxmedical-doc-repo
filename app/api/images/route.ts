import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiService } from '@/lib/ai-service';
import axios from 'axios';
import FormData from 'form-data';

const baseURL = process.env.NEXT_PUBLIC_AI_SERVICE_URL;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Check if AI service URL is configured
    if (!baseURL) {
      return NextResponse.json(
        { error: 'AI Service URL is not configured' },
        { status: 500 }
      );
    }

    // Build query parameters for AI service
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    };

    // Fetch images from external AI service
    const response = await aiService.get('/images', { params });

    if (!response.data) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    // Map the API response structure
    const results = response.data.results || [];
    const totalCount = response.data.count || results.length;
    const hasNext = response.data.next !== null;
    const hasPrevious = response.data.previous !== null;
    
    // Calculate total pages based on count and limit
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      images: results,
      pagination: {
        current_page: page,
        per_page: limit,
        total_images: totalCount,
        total_pages: totalPages,
        has_next: hasNext,
        has_previous: hasPrevious,
      },
      filters: response.data.filters || {},
    });
  } catch (error: any) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch images from AI service',
        details: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!baseURL) {
      return NextResponse.json(
        { error: 'AI Service URL is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file types - only allow image files
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    const invalidFiles: string[] = [];
    for (const file of files) {
      const fileExtensionWithDot =
        '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type.toLowerCase());
      const isValidExtension = allowedExtensions.includes(fileExtensionWithDot);

      if (!isValidType && !isValidExtension) {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        {
          error:
            'Invalid file types. Only image files (JPEG, PNG, GIF, WEBP) are allowed.',
          invalidFiles,
        },
        { status: 400 }
      );
    }

    // Create FormData for AI service
    const uploadFormData = new FormData();

    // Convert File objects to buffers and add to form data
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      uploadFormData.append('files', buffer, {
        filename: file.name,
        contentType: file.type,
      });
    }

    // Upload to AI service
    const response = await axios.post(`${baseURL}/images`, uploadFormData, {
      headers: {
        ...uploadFormData.getHeaders(),
      },
      timeout: 300000, // 5 minutes timeout for multiple image uploads
    });

    return NextResponse.json({
      success: true,
      data: response.data,
      count: files.length,
    });
  } catch (error: any) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload images to AI service',
        details: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
