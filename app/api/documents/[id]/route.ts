import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { deleteDocument } from '@/lib/ai-service';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const file = formData.get('file') as File;

    if (!name || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updateData: any = {
      name,
      description,
      category,
      lastEdited: new Date(),
    };

    // If a new file is provided, upload it to S3
    if (file && file.size > 0) {
      // Validate file type - only allow Word, PDF, and Excel
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      const fileExtensionWithDot =
        '.' + file.name.split('.').pop()?.toLowerCase();

      const isValidType = allowedTypes.includes(file.type.toLowerCase());
      const isValidExtension = allowedExtensions.includes(fileExtensionWithDot);

      if (!isValidType && !isValidExtension) {
        return NextResponse.json(
          {
            error:
              'Only Word documents (.doc, .docx), PDF (.pdf), and Excel files (.xls, .xlsx) are allowed.',
          },
          { status: 400 }
        );
      }

      // Delete old file from S3
      const existingDocument = await prisma.document.findUnique({
        where: { id },
      });

      if (existingDocument?.fileUrl) {
        const oldKey = existingDocument.fileUrl.split('/').pop();
        if (oldKey) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET!,
              Key: `documents/${oldKey}`,
            })
          );
        }
      }

      // Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const key = `documents/${fileName}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      });

      await s3Client.send(uploadCommand);
      updateData.fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      updateData.fileType = file.type;
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL;
    
    if (!aiServiceUrl) {
      // Fallback to database if AI service is not configured
      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Delete from database only
      await prisma.document.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    }

    // Get the filename from query parameter or use id as filename
    // The id parameter might be a UUID, so we check for a 'name' query parameter
    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get('name') || id;

    try {
      // Call AI service to delete the document using filename
      // The AI service endpoint is /documents/{filename}
      const aiServiceResponse = await deleteDocument(fileName);

      // Only proceed if AI service returns success (200 or 204)
      if (aiServiceResponse.status !== 200 && aiServiceResponse.status !== 204) {
        return NextResponse.json(
          { error: 'Failed to delete document from AI service' },
          { status: aiServiceResponse.status || 500 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (aiServiceError: any) {
      // If AI service deletion fails, return error
      console.error('Error deleting document from AI service:', aiServiceError);
      const statusCode = aiServiceError?.response?.status || 500;
      const errorMessage =
        aiServiceError?.response?.data?.error ||
        'Failed to delete document from AI service';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
