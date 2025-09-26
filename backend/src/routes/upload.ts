import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadImage, isCloudinaryEnabled } from '../services/cloudinary';

const router = Router();

// Multer memory storage (we'll stream to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// POST /api/v1/upload/image - single image upload
router.post('/upload/image', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!isCloudinaryEnabled()) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'Image service not configured',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'No image file provided (field name: file)',
      });
    }

    const { buffer, mimetype, originalname } = req.file;

    const result = await uploadImage(buffer, mimetype, originalname, {
      folder: 'reports',
      tags: ['report', 'submission'],
    });

    return res.status(201).json({
      success: true,
      data: {
        url: result.url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Image upload failed:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return res.status(500).json({
      error: 'UploadFailed',
      message,
    });
  }
});

export default router;
