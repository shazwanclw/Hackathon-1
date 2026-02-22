"use client";

import { useRef } from 'react';

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
  capture?: 'user' | 'environment';
};

export default function UploadDropzone({ file, onFileChange, error, capture }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleSelect(files: FileList | null) {
    if (!files?.[0]) return;
    onFileChange(files[0]);
  }

  return (
    <div>
      <label className="label">Photo (max 3MB)</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="card flex w-full flex-col items-center justify-center gap-2 border-dashed border-brand-400/80 p-6 text-center hover:border-brand-600"
      >
        <p className="text-sm font-semibold text-brand-900">Tap to upload image</p>
        <p className="text-xs text-muted">JPG/PNG/WebP supported</p>
        <p className="text-xs font-semibold text-brand-700">{file ? file.name : 'No file selected'}</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        hidden
        onChange={(e) => handleSelect(e.target.files)}
      />
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}