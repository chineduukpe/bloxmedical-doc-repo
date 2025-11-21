import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { embedDocuments } from '@/lib/ai-service';

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
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const file = formData.get('file') as File;

    if (!name || !description || !category || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type - only allow Word, PDF, and Excel
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const fileExtensionWithDot = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const isValidType = allowedTypes.includes(file.type.toLowerCase());
    const isValidExtension = allowedExtensions.includes(fileExtensionWithDot);
    
    if (!isValidType && !isValidExtension) {
      return NextResponse.json(
        { error: 'Only Word documents (.doc, .docx), PDF (.pdf), and Excel files (.xls, .xlsx) are allowed.' },
        { status: 400 }
      );
    }

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

    // Save to database with PENDING embedding status
    const document = await prisma.document.create({
      data: {
        name,
        description,
        category,
        fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        fileType: file.type,
        uploadDate: new Date(),
        lastEdited: new Date(),
        embeddingStatus: 'PENDING',
      },
    });

    // Update status to PROCESSING and send to AI service
    try {
      await prisma.document.update({
        where: { id: document.id },
        data: { embeddingStatus: 'PROCESSING' },
      });

      // Call the embed endpoint with the file
      const embedResponse = await embedDocuments(
        buffer,
        file.name,
        file.type
      );

      // If successful (200), update status to COMPLETED
      if (embedResponse.status === 200) {
        await prisma.document.update({
          where: { id: document.id },
          data: { embeddingStatus: 'COMPLETED' },
        });
      } else {
        // If not 200, mark as FAILED
        await prisma.document.update({
          where: { id: document.id },
          data: { embeddingStatus: 'FAILED' },
        });
      }
    } catch (embedError) {
      // If embedding fails, mark as FAILED but don't fail the entire request
      console.error('Error embedding document:', embedError);
      await prisma.document.update({
        where: { id: document.id },
        data: { embeddingStatus: 'FAILED' },
      });
    }

    // Fetch the updated document to return
    const updatedDocument = await prisma.document.findUnique({
      where: { id: document.id },
    });

    return NextResponse.json({ document: updatedDocument });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      orderBy: { uploadDate: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
