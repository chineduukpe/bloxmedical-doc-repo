import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import {
  embedBulkDocuments,
  deleteDocument,
  reEmbedDocuments,
} from '@/lib/ai-service';

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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate file types - only allow Word, PDF, and Excel
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];

    // Validate all files
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
          error: `Invalid file types. Only Word documents (.doc, .docx), PDF (.pdf), and Excel files (.xls, .xlsx) are allowed.`,
          invalidFiles,
        },
        { status: 400 }
      );
    }

    // Process all files
    const fileData: Array<{
      fileBuffer: Buffer;
      fileName: string;
      contentType: string;
    }> = [];
    const documentsToCreate: Array<{
      name: string;
      description: string;
      category: string;
      fileUrl: string;
      fileType: string;
      uploadDate: Date;
      lastEdited: Date;
      embeddingStatus: 'PENDING';
    }> = [];

    // Upload all files to S3 and prepare data
    for (const file of files) {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExtension}`;
      const key = `documents/${fileName}`;

      // Upload to S3
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      });

      await s3Client.send(uploadCommand);

      // Prepare file data for embedding
      fileData.push({
        fileBuffer: buffer,
        fileName: file.name,
        contentType: file.type,
      });

      // Prepare document data for database
      const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      documentsToCreate.push({
        name: file.name,
        description: file.name,
        category: 'unknown',
        fileUrl,
        fileType: file.type,
        uploadDate: new Date(),
        lastEdited: new Date(),
        embeddingStatus: 'PENDING',
      });
    }

    // Create all documents in database with PENDING status
    const createdDocuments = await Promise.all(
      documentsToCreate.map((docData) =>
        prisma.document.create({
          data: docData,
        })
      )
    );

    // Update all to PROCESSING and send to AI service
    try {
      await Promise.all(
        createdDocuments.map((doc) =>
          prisma.document.update({
            where: { id: doc.id },
            data: { embeddingStatus: 'PROCESSING' },
          })
        )
      );

      // Call the embed endpoint with all files at once
      const embedResponse = await embedBulkDocuments(fileData);

      // If successful (200), update all statuses to COMPLETED
      if (embedResponse.status === 200) {
        await Promise.all(
          createdDocuments.map((doc) =>
            prisma.document.update({
              where: { id: doc.id },
              data: { embeddingStatus: 'COMPLETED' },
            })
          )
        );
      } else {
        // If not 200, mark all as FAILED
        await Promise.all(
          createdDocuments.map((doc) =>
            prisma.document.update({
              where: { id: doc.id },
              data: { embeddingStatus: 'FAILED' },
            })
          )
        );
      }
    } catch (embedError) {
      // If embedding fails, mark all as FAILED but don't fail the entire request
      console.error('Error embedding documents:', embedError);
      await Promise.all(
        createdDocuments.map((doc) =>
          prisma.document.update({
            where: { id: doc.id },
            data: { embeddingStatus: 'FAILED' },
          })
        )
      );
    }

    // Fetch the updated documents to return
    const updatedDocuments = await Promise.all(
      createdDocuments.map((doc) =>
        prisma.document.findUnique({
          where: { id: doc.id },
        })
      )
    );

    return NextResponse.json({
      documents: updatedDocuments,
      count: updatedDocuments.length,
    });
  } catch (error) {
    console.error('Error bulk uploading documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { names } = body; // Changed from ids to names

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json(
        { error: 'No document names provided' },
        { status: 400 }
      );
    }

    const aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL;

    if (!aiServiceUrl) {
      // Fallback to database if AI service is not configured
      const documents = await prisma.document.findMany({
        where: {
          name: {
            in: names,
          },
        },
      });

      if (documents.length === 0) {
        return NextResponse.json(
          { error: 'No documents found' },
          { status: 404 }
        );
      }

      // Delete from database only
      const deleteResult = await prisma.document.deleteMany({
        where: {
          name: {
            in: names,
          },
        },
      });

      return NextResponse.json({
        success: true,
        deletedCount: deleteResult.count,
      });
    }

    // Delete from AI service
    const deletePromises = names.map(async (fileName: string) => {
      try {
        const response = await deleteDocument(fileName);
        return {
          fileName,
          success: response.status === 200 || response.status === 204,
        };
      } catch (error) {
        console.error(
          `Error deleting document ${fileName} from AI service:`,
          error
        );
        return { fileName, success: false };
      }
    });

    const results = await Promise.all(deletePromises);
    const successfulDeletes = results.filter((r) => r.success);

    if (successfulDeletes.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete any documents from AI service' },
        { status: 500 }
      );
    }

    // Trigger re-embedding asynchronously after successful deletion
    // setImmediate(async () => {
    //   try {
    //     await reEmbedDocuments();
    //     console.log(
    //       'Re-embedding completed successfully after bulk document deletion'
    //     );
    //   } catch (error) {
    //     console.error(
    //       'Error re-embedding documents after bulk deletion:',
    //       error
    //     );
    //     // Don't throw - this is fire-and-forget
    //   }
    // });

    return NextResponse.json({
      success: true,
      deletedCount: successfulDeletes.length,
      failedCount: results.length - successfulDeletes.length,
    });
  } catch (error) {
    console.error('Error bulk deleting documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
