import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.BUCKET_NAME || 'borderbooks-storage';

const getObjectKey = (workspaceId: string, uploadId: string) => `uploads/${workspaceId}/${uploadId}`;

export async function saveUploadFile(workspaceId: string, uploadId: string, data: Buffer) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: getObjectKey(workspaceId, uploadId),
    Body: data,
  });
  await s3Client.send(command);
}

export async function readUploadFile(workspaceId: string, uploadId: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: getObjectKey(workspaceId, uploadId),
  });
  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error('File not found or empty body');
  }
  const chunks: Uint8Array[] = [];
  // @ts-ignore
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteUploadFile(workspaceId: string, uploadId: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: getObjectKey(workspaceId, uploadId),
  });
  await s3Client.send(command).catch(() => undefined);
}
