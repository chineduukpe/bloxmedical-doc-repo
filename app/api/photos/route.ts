import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const documentId = formData.get('documentId') as string;
    const description = formData.get('description') as string;
    const files = formData.getAll('files') as File[];

    if (!documentId || !description || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, description, and files are required' },
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
      const fileExtensionWithDot = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type.toLowerCase());
      const isValidExtension = allowedExtensions.includes(fileExtensionWithDot);

      if (!isValidType && !isValidExtension) {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid file types. Only image files (JPEG, PNG, GIF, WEBP) are allowed.',
          invalidFiles,
        },
        { status: 400 }
      );
    }

    // Upload all photos to S3 and create database records
    const uploadedPhotos = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Generate unique filename
        const fileExtension = file.name.split('.').pop();
        const fileName = `photo-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.${fileExtension}`;
        const key = `photos/${fileName}`;

        // Upload to S3
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        });

        await s3Client.send(uploadCommand);

        // Create database record
        const photo = await prisma.photo.create({
          data: {
            documentId,
            description,
            fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
            fileType: file.type,
            uploadDate: new Date(),
            userId: session.user.id,
          },
        });

        uploadedPhotos.push(photo);
      } catch (error) {
        console.error(`Error uploading photo ${file.name}:`, error);
        errors.push(`Failed to upload ${file.name}`);
      }
    }

    if (uploadedPhotos.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any photos', errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      photos: uploadedPhotos,
      count: uploadedPhotos.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (documentId) {
      where.documentId = documentId;
    }

    // Get total count for pagination
    const totalPhotos = await prisma.photo.count({ where });

    // Fetch photos with pagination
    const photos = await prisma.photo.findMany({
      where,
      orderBy: { uploadDate: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        documentId: true,
        description: true,
        fileUrl: true,
        fileType: true,
      },
    });

    const totalPages = Math.ceil(totalPhotos / limit);

    return NextResponse.json({
      photos,
      pagination: {
        current_page: page,
        per_page: limit,
        total_photos: totalPhotos,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


