import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
// import { deleteDocument } from '@/lib/ai-service';

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

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // TODO: Reintroduce AI service deletion later
    // Extract filename for AI service deletion
    // The AI service uses the original filename that was sent during upload (file.name)
    // Since we don't store the original filename separately, we'll try to extract it from fileUrl
    // The fileUrl contains the S3 filename, but we need the original filename
    // For now, we'll use the document name, but this may need adjustment based on AI service requirements
    // let fileName = document.name;
    //
    // Try to extract original filename from fileUrl if possible
    // The S3 filename format is: timestamp-random.ext, but original was file.name
    // If the AI service stores by original filename, we may need to store it separately in the future
    // For now, using document.name as the identifier
    //
    // Call AI service to delete the document first
    // try {
    //   const aiServiceResponse = await deleteDocument(fileName);
    //
    //   // Only proceed with deletion if AI service returns 200
    //   if (aiServiceResponse.status !== 200) {
    //     return NextResponse.json(
    //       { error: 'Failed to delete document from AI service' },
    //       { status: aiServiceResponse.status || 500 }
    //     );
    //   }
    // } catch (aiServiceError: any) {
    //   // If AI service deletion fails, return error and don't delete from database
    //   console.error('Error deleting document from AI service:', aiServiceError);
    //   const statusCode = aiServiceError?.response?.status || 500;
    //   const errorMessage = aiServiceError?.response?.data?.error || 'Failed to delete document from AI service';
    //   return NextResponse.json(
    //     { error: errorMessage },
    //     { status: statusCode }
    //   );
    // }

    // Delete file from S3 (non-blocking - continue even if S3 deletion fails)
    if (document.fileUrl) {
      try {
        const urlParts = document.fileUrl.split('/');
        const s3FileName = urlParts[urlParts.length - 1];
        if (s3FileName) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET!,
              Key: `documents/${s3FileName}`,
            })
          );
        }
      } catch (s3Error) {
        // Log S3 deletion error but continue with database deletion
        console.error(
          'Error deleting file from S3 (continuing with database deletion):',
          s3Error
        );
      }
    }

    // Delete from database (previously: only after successful AI service deletion)
    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
