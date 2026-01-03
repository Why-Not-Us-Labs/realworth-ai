
'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadIcon, XIcon, CameraIcon } from './icons';

interface FileUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const ImagePreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);

    // Cleanup function to revoke the object URL when the component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative group aspect-square">
      <img
        src={imageUrl}
        alt={file.name}
        className="w-full h-full object-cover rounded-lg bg-slate-100 border"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-white/90 text-slate-800 rounded-full p-1.5 shadow-md sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm"
        aria-label="Remove file"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (newFiles) {
      const fileList = Array.from(newFiles);
      setFiles(prev => [...prev, ...fileList].slice(-5)); // Limit to 5 files
    }
  }, [setFiles]);

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if(e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-3 text-center">Upload photos of your item</label>
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col justify-center items-center w-full px-4 sm:px-6 py-10 sm:py-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors touch-manipulation min-h-[140px] ${isDragging ? 'border-teal-400 bg-teal-50' : 'border-teal-500 bg-teal-50 hover:bg-teal-100 active:bg-teal-200'}`}
      >
        <div className="flex items-center gap-3 text-teal-600">
          <CameraIcon className="h-8 w-8" />
          <span className="text-slate-300 text-2xl font-light">/</span>
          <UploadIcon className="h-8 w-8" />
        </div>
        <p className="mt-3 text-sm font-semibold text-teal-700">Take Photo or Upload</p>
        <p className="mt-1 text-xs text-slate-500 hidden sm:block">or drag & drop files here</p>
      </div>

      <input ref={fileInputRef} type="file" multiple accept="image/*,.heic,.heif" onChange={onFileChange} className="hidden" aria-label="Upload photos" />

      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">Selected Images:</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {files.map((file, index) => (
              <ImagePreview
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
