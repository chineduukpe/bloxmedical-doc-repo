import axios from 'axios';
import FormData from 'form-data';

const baseURL = process.env.NEXT_PUBLIC_AI_SERVICE_URL;

if (!baseURL) {
  console.warn('NEXT_PUBLIC_AI_SERVICE_URL is not set');
}

export const aiService = axios.create({
  baseURL: baseURL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
aiService.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('AI Service Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Upload and embed documents for RAG functionality
 * @param fileBuffer Buffer containing the file data
 * @param fileName Original filename
 * @param contentType MIME type of the file
 * @returns Promise with the response from the embed endpoint
 */
export async function embedDocuments(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<any> {
  if (!baseURL) {
    throw new Error('AI Service URL is not configured');
  }

  const formData = new FormData();

  // Add the file to the form data
  formData.append('files', fileBuffer, {
    filename: fileName,
    contentType: contentType,
  });

  const response = await axios.post(`${baseURL}/embed`, formData, {
    headers: {
      ...formData.getHeaders(),
    },
    timeout: 60000, // Longer timeout for file uploads
  });

  return response;
}

/**
 * Upload and embed multiple documents for RAG functionality
 * @param files Array of objects containing fileBuffer, fileName, and contentType
 * @returns Promise with the response from the embed endpoint
 */
export async function embedBulkDocuments(
  files: Array<{ fileBuffer: Buffer; fileName: string; contentType: string }>
): Promise<any> {
  if (!baseURL) {
    throw new Error('AI Service URL is not configured');
  }

  const formData = new FormData();

  // Add all files to the form data
  files.forEach((file) => {
    formData.append('files', file.fileBuffer, {
      filename: file.fileName,
      contentType: file.contentType,
    });
  });

  const response = await axios.post(`${baseURL}/embed`, formData, {
    headers: {
      ...formData.getHeaders(),
    },
    timeout: 300000, // Longer timeout for bulk uploads (5 minutes)
  });

  return response;
}

/**
 * Re-embed documents without uploading files
 * Calls the /embed endpoint without any file data
 * @returns Promise with the response from the embed endpoint
 */
export async function reEmbedDocuments(): Promise<any> {
  if (!baseURL) {
    throw new Error('AI Service URL is not configured');
  }

  const response = await axios.post(
    `${baseURL}/embed`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 300 seconds (5 minutes) timeout for re-embedding
    }
  );

  return response;
}

/**
 * Delete documents from the AI service
 * @param documentIds Array of document IDs to delete
 * @returns Promise with the response from the delete endpoint
 */
export async function deleteDocument(documentIds: string[]): Promise<any> {
  if (!baseURL) {
    throw new Error('AI Service URL is not configured');
  }

  const response = await aiService.post(
    `/documents/delete`,
    {
      document_id: documentIds,
    },
    {
      timeout: 300000, // 300 seconds (5 minutes) timeout for document deletion
    }
  );

  return response;
}
