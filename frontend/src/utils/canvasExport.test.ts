import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAnnotatedImage } from './canvasExport';
import { Detection } from '../types/scans';

describe('canvasExport utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const dummyDetections: Detection[] = [
    {
      class_id: 1,
      class_name: 'Maize',
      confidence: 0.9,
      box: [10, 10, 80, 80],
      polygon: [[10, 10], [80, 10], [80, 80], [10, 80]],
    },
  ];

  it('safely handles a File source, creates object URL, draws and cleans up', async () => {
    const dummyFile = new File(['dummy content'], 'photo.jpg', { type: 'image/jpeg' });
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test-temp');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    // Mock HTMLCanvasElement.prototype.getContext & toBlob
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      fillText: vi.fn(),
    });

    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(new Blob(['dummy png'], { type: 'image/png' }));
    });

    // Mock Image load
    const originalImage = window.Image;
    window.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      src = '';
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    } as any;

    try {
      await expect(
        downloadAnnotatedImage(
          dummyFile,
          640,
          640,
          dummyDetections,
          'both',
          0.25,
          'custom_annotated.png'
        )
      ).resolves.not.toThrow();

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalled();
    } finally {
      window.Image = originalImage;
    }
  });

  it('handles image loading error gracefully without crashing', async () => {
    const dummyFile = new File(['bad content'], 'bad.jpg', { type: 'image/jpeg' });
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:bad');
    window.URL.revokeObjectURL = vi.fn();

    const originalImage = window.Image;
    window.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      src = '';
      constructor() {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Event('error'));
        }, 10);
      }
    } as any;

    try {
      // Should not throw an unhandled rejection, instead catches error and notifies
      await expect(
        downloadAnnotatedImage(
          dummyFile,
          640,
          640,
          [],
          'boxes',
          0.25
        )
      ).resolves.not.toThrow();
    } finally {
      window.Image = originalImage;
    }
  });
});
