import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import crypto from 'crypto';

// Ensure required environment variables are set
const requiredEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`⚠️ Missing Cloudinary env vars: ${missing.join(', ')} (image upload endpoint will be disabled until provided)`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface ImageUploadResult {
  public_id: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  created_at: string;
}

export interface UploadOptions {
  folder?: string;
  tags?: string[];
  overwrite?: boolean;
  transformation?: UploadApiOptions['transformation'];
}

export function isCloudinaryEnabled(): boolean {
  return requiredEnv.every((k) => !!process.env[k]);
}

// Generate a deterministic public_id for potential duplicate detection (optional)
function generatePublicId(originalName?: string): string {
  const hash = crypto.randomBytes(8).toString('hex');
  const base = originalName?.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 40) || 'report';
  return `reports/${base}-${hash}`;
}

export async function uploadImage(buffer: Buffer, mimetype: string, originalName?: string, options: UploadOptions = {}): Promise<ImageUploadResult> {
  if (!isCloudinaryEnabled()) {
    throw new Error('Cloudinary not configured');
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if (!allowed.includes(mimetype)) {
    throw new Error('Unsupported image type');
  }

  // Enforce size limit (10MB per spec) - buffer length in bytes
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Image exceeds 10MB limit');
  }

  const public_id = generatePublicId(originalName);

  return new Promise<ImageUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id,
        folder: options.folder || 'reports',
        resource_type: 'image',
        overwrite: options.overwrite ?? false,
        tags: options.tags,
        transformation: options.transformation || [
          { quality: '85', fetch_format: 'auto' }, // compress to ~2MB target (Cloudinary auto-optimizes)
        ],
      } as UploadApiOptions,
      (error: any, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(error || new Error('Upload failed'));
        }
        resolve({
          public_id: result.public_id,
          url: result.secure_url,
          width: result.width,
            height: result.height,
          bytes: result.bytes,
          format: result.format,
          created_at: result.created_at,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<boolean> {
  if (!isCloudinaryEnabled()) return false;
  const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  return res.result === 'ok' || res.result === 'not found';
}

export default { uploadImage, deleteImage, isCloudinaryEnabled };
