"use client";

import React from 'react';
import { useRef } from 'react';

type Props = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  error?: string;
  capture?: 'user' | 'environment';
};

export default function UploadDropzone({ files, onFilesChange, error, capture }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFilesChange(Array.from(files).slice(0, 3));
  }

  return (
    <div>
      <label className="label" htmlFor="report-photo-input">Photos (max 3 files, 3MB each)</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="card flex w-full flex-col items-center justify-center gap-2 border-dashed border-brand-400/80 p-6 text-center hover:border-brand-600"
      >
        <p className="text-sm font-semibold text-brand-900">Tap to upload images</p>
        <p className="text-xs text-muted">JPG/PNG/WebP supported</p>
        <p className="text-xs font-semibold text-brand-700">
          {files.length > 0 ? `${files.length} file(s): ${files.map((file) => file.name).join(', ')}` : 'No files selected'}
        </p>
      </button>
      <input
        id="report-photo-input"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture={capture}
        hidden
        onChange={(e) => handleSelect(e.target.files)}
      />
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
