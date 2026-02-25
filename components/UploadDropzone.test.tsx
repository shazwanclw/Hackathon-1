import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UploadDropzone from './UploadDropzone';

describe('UploadDropzone', () => {
  it('forwards up to 3 selected files', () => {
    const onFilesChange = vi.fn();
    render(<UploadDropzone files={[]} onFilesChange={onFilesChange} />);

    const input = screen.getByLabelText(/photo/i) as HTMLInputElement;
    const f1 = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    const f3 = new File(['c'], 'c.jpg', { type: 'image/jpeg' });
    const f4 = new File(['d'], 'd.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [f1, f2, f3, f4] } });

    expect(onFilesChange).toHaveBeenCalledWith([f1, f2, f3]);
  });
});
