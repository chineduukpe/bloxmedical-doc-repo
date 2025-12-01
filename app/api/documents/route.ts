import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { embedDocuments, aiService } from '@/lib/ai-service';

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
    const fileType = searchParams.get('file_type') || null;
    const isIndexed = searchParams.get('is_indexed') || null;

    // Check if AI service URL is configured
    const aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL;
    if (!aiServiceUrl) {
      // Fallback to database if AI service is not configured
      const documents = await prisma.document.findMany({
        orderBy: { uploadDate: 'desc' },
      });
      return NextResponse.json({ documents });
    }

    // Build query parameters for AI service
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    };
    if (fileType) {
      params.file_type = fileType;
    }
    if (isIndexed !== null) {
      params.is_indexed = isIndexed;
    }

    // Fetch documents from external AI service
    const response = await aiService.get('/documents', { params });

    if (!response.data) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    // Map external API documents to internal format
    const mappedDocuments = response.data.documents.map((doc: any) => {
      // Extract category from filename if possible (e.g., "Cardiology- Document.docx")
      const categoryMatch = doc.original_name?.match(/^([^-]+)-/) || 
                           doc.name?.match(/^([^-]+)-/);
      const category = categoryMatch ? categoryMatch[1].trim() : 'General';

      // Map file_type to MIME type
      const fileTypeMap: Record<string, string> = {
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        pdf: 'application/pdf',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
      };
      const mimeType = fileTypeMap[doc.file_type?.toLowerCase()] || `application/${doc.file_type || 'octet-stream'}`;

      // Generate file URL from AI service
      const fileUrl = aiServiceUrl
        ? `${aiServiceUrl}/documents/${encodeURIComponent(doc.name)}`
        : '';

      return {
        id: doc.id,
        name: doc.original_name || doc.name,
        description: `Document file: ${doc.original_name || doc.name}`,
        category: category,
        fileUrl: fileUrl,
        fileType: mimeType,
        uploadDate: doc.uploaded_at,
        lastEdited: doc.last_indexed_at || doc.uploaded_at,
        embeddingStatus: doc.is_indexed ? 'COMPLETED' : 'PENDING',
        sizeBytes: doc.size_bytes,
        isIndexed: doc.is_indexed,
        lastIndexedAt: doc.last_indexed_at,
      };
    });

    return NextResponse.json({
      documents: mappedDocuments,
      pagination: response.data.pagination,
      filters: response.data.filters,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    
    // If AI service fails, try to fallback to database
    try {
      const documents = await prisma.document.findMany({
        orderBy: { uploadDate: 'desc' },
      });
      return NextResponse.json({ documents });
    } catch (dbError) {
      console.error('Error fetching from database:', dbError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}
