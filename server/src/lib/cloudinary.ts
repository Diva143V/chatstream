import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Avatar upload storage
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chatstream/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
  } as Record<string, unknown>,
});

// Message attachment storage
const attachmentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chatstream/attachments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'pdf'],
    resource_type: 'auto',
  } as Record<string, unknown>,
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

export { cloudinary };
