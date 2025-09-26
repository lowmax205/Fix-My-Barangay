// Image compression utility per spec (max 10MB upload, compress ~2MB target at 85% quality)
// Uses browser canvas to resize/compress images before uploading to backend

export interface CompressedImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  ratio: number; // compressed/original
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB hard limit
const TARGET_MAX_BYTES = 2 * 1024 * 1024; // Aim for ~2MB after compression
const DEFAULT_QUALITY = 0.85; // 85% quality per spec
const MAX_DIMENSION = 2560; // Prevent extremely large dimensions

export async function compressImage(file: File, options?: { quality?: number; maxDimension?: number }): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image exceeds 10MB limit');
  }

  // Early exit if already small enough (< ~2MB)
  if (file.size <= TARGET_MAX_BYTES) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      ratio: 1,
    };
  }

  const quality = options?.quality ?? DEFAULT_QUALITY;
  const maxDim = options?.maxDimension ?? MAX_DIMENSION;

  const imageBitmap = await createImageBitmap(file);

  let { width, height } = imageBitmap;
  if (width > maxDim || height > maxDim) {
    // Scale down preserving aspect ratio
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  // Determine output format (prefer original if jpeg/png/webp)
  let outputType = 'image/jpeg';
  if (file.type === 'image/png') outputType = 'image/png';
  if (file.type === 'image/webp') outputType = 'image/webp';
  if (file.type === 'image/avif') outputType = 'image/avif';

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error('Compression failed'));
        resolve(b);
      },
      outputType,
      quality
    );
  });

  // If still bigger than target and we used jpeg/webp, try iterative quality reduction
  let finalBlob = blob;
  if (finalBlob.size > TARGET_MAX_BYTES && (outputType === 'image/jpeg' || outputType === 'image/webp')) {
    let currentQuality = quality;
    for (let i = 0; i < 3 && finalBlob.size > TARGET_MAX_BYTES; i++) {
      currentQuality -= 0.15; // reduce quality
      finalBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
          outputType,
          Math.max(0.4, currentQuality)
        );
      });
    }
  }

  const compressedFile = new File([finalBlob], file.name.replace(/(\.[a-z0-9]+)?$/i, '.jpg'), {
    type: outputType,
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    ratio: compressedFile.size / file.size,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function uploadCompressedImage(file: File, endpoint?: string): Promise<{ url: string; public_id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  // Always use /api/v1/upload/image for backend
  const uploadUrl = endpoint || `${process.env.NEXT_PUBLIC_API_URL}/api/v1/upload/image`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'Upload failed');
  }

  return { url: data.data.url, public_id: data.data.public_id };
}
