import { v2 as cloudinary } from 'cloudinary';
import config from '../config';
import { db } from '../config/firebase';
import { admin } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadToFirebaseStorage = async (
  buffer: Buffer,
  folder: string = 'tryonx'
): Promise<{ url: string; publicId: string }> => {
  console.log('[DEBUG-FIREBASE-STORAGE] Uploading image buffer to Firebase Storage fallback...');
  let bucket = admin.storage().bucket();
  const filename = `${folder}/${uuidv4()}.png`;
  let file = bucket.file(filename);

  try {
    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
      },
    });
  } catch (err: any) {
    if (err.code === 404 || err.message?.includes('bucket does not exist')) {
      console.warn('[DEBUG-FIREBASE-STORAGE] Default .appspot.com bucket not found, trying fallback .firebasestorage.app bucket...');
      const fallbackBucketName = `${config.firebase.projectId}.firebasestorage.app`;
      bucket = admin.storage().bucket(fallbackBucketName);
      file = bucket.file(filename);
      await file.save(buffer, {
        metadata: {
          contentType: 'image/png',
        },
      });
    } else {
      throw err;
    }
  }

  let url = '';
  try {
    await file.makePublic();
    url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
  } catch (err: any) {
    console.warn('[DEBUG-FIREBASE-STORAGE] makePublic failed, generating signed URL fallback:', err.message);
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2099',
    });
    url = signedUrl;
  }

  console.log('[DEBUG-FIREBASE-STORAGE] Successfully uploaded to Firebase Storage. URL:', url);
  return {
    url,
    publicId: filename,
  };
};

export const uploadToFirebaseStorageFromUrl = async (
  imageUrl: string,
  folder: string = 'tryonx'
): Promise<{ url: string; publicId: string }> => {
  console.log('[DEBUG-FIREBASE-STORAGE] Uploading from URL to Firebase Storage fallback...', imageUrl);
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return uploadToFirebaseStorage(buffer, folder);
};

export const uploadImage = async (
  filePath: string,
  folder: string = 'tryonx'
): Promise<{ url: string; publicId: string }> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `tryonx/${folder}`,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.warn('[CLOUDINARY] Upload failed, falling back to Firebase Storage:', error.message || error);
    try {
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return await uploadToFirebaseStorageFromUrl(filePath, folder);
      } else {
        const fs = require('fs');
        const buffer = fs.readFileSync(filePath);
        return await uploadToFirebaseStorage(buffer, folder);
      }
    } catch (fbError: any) {
      console.error('[FIREBASE-FALLBACK] Firebase fallback also failed:', fbError.message || fbError);
      throw error;
    }
  }
};

export const uploadImageBuffer = async (
  buffer: Buffer,
  folder: string = 'tryonx'
): Promise<{ url: string; publicId: string }> => {
  try {
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      throw new Error('Cloudinary is unconfigured');
    }
    
    return await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `tryonx/${folder}`,
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Upload failed'));
              return;
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        )
        .end(buffer);
    });
  } catch (error: any) {
    console.warn('[CLOUDINARY] Buffer upload failed, falling back to Firebase Storage:', error.message || error);
    try {
      return await uploadToFirebaseStorage(buffer, folder);
    } catch (fbError: any) {
      console.error('[FIREBASE-FALLBACK] Firebase fallback also failed:', fbError.message || fbError);
      throw error;
    }
  }
};

export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    console.warn('[CLOUDINARY] Delete failed, trying Firebase Storage deletion...', error.message || error);
    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(publicId);
      await file.delete();
      console.log('[FIREBASE-STORAGE] Successfully deleted from Firebase Storage:', publicId);
    } catch (fbError: any) {
      console.error('[FIREBASE-STORAGE-DELETE] Firebase delete failed:', fbError.message || fbError);
    }
  }
};

export const getOptimizedUrl = (publicId: string, options?: {
  width?: number;
  height?: number;
  crop?: string;
}): string => {
  // If it's a GCS path, return the direct or signed URL
  if (publicId.startsWith('tryon/') || publicId.startsWith('tryon_results/') || publicId.includes('/')) {
    const bucket = admin.storage().bucket();
    return `https://storage.googleapis.com/${bucket.name}/${publicId}`;
  }
  
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        width: options?.width || 800,
        height: options?.height || 800,
        crop: options?.crop || 'fill',
      },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  });
};
