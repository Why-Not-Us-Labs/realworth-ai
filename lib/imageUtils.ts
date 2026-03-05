'use client';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Upload a file to Supabase Storage and return its public URL.
 * @param pathPrefix - Storage path prefix (e.g., 'partner/bullseye/' or '{userId}/uploads/')
 */
export async function uploadFile(file: File, pathPrefix = 'partner/bullseye/'): Promise<string | null> {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(7);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${pathPrefix}${ts}-${rand}.${ext}`;

  const { error } = await supabase.storage
    .from('appraisal-images')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('appraisal-images')
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * Compress an image if it exceeds 1.5MB. Returns the original if already small enough.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => resolve(file), 3000);

    img.onload = () => {
      clearTimeout(timeout);
      let { width, height } = img;
      const max = 1600;
      if (width > max || height > max) {
        if (width > height) { height = (height / width) * max; width = max; }
        else { width = (width / height) * max; height = max; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else resolve(file);
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => { clearTimeout(timeout); resolve(file); };
    img.src = URL.createObjectURL(file);
  });
}
