
import { useState } from 'react';
import { AppraisalRequest, AppraisalResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';

type AppraisalOutput = {
    appraisalData: Omit<AppraisalResult, 'id' | 'image'>;
    imageDataUrl: string;
    imagePath?: string;
    userId?: string;
} | null;

// Compress image to reduce file size for upload
async function compressImage(file: File, maxSizeMB: number = 2): Promise<File> {
  // If file is small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions (max 2048px on longest side)
      let { width, height } = img;
      const maxDimension = 2048;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        },
        'image/jpeg',
        0.85 // Quality
      );
    };

    img.onerror = () => resolve(file); // Fallback to original on error
    img.src = URL.createObjectURL(file);
  });
}

export const useAppraisal = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAppraisal = async (request: AppraisalRequest): Promise<AppraisalOutput> => {
    setIsLoading(true);
    setError(null);

    // Get auth token if user is logged in
    let authToken: string | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    } catch (e) {
      // User not logged in, continue without token
      console.log('No auth session found, proceeding without authentication');
    }

    const formData = new FormData();

    // Compress images before uploading to avoid 413 errors
    const compressedFiles = await Promise.all(
      request.files.map(file => compressImage(file))
    );

    compressedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('condition', request.condition);

    try {
      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/appraise', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 413) {
          throw new Error('Images are too large. Please use smaller images or fewer photos.');
        }

        // Try to parse JSON error, fallback to status text
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;

    } catch (e) {
      console.error("Error getting appraisal:", e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to get appraisal. ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { getAppraisal, isLoading, error };
};
