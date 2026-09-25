import { describe, it, expect, vi } from 'vitest';
import { computeBatchSummary, exportBatchSummaryJson, exportSingleItemJson } from './batchExport';
import { BatchScanItem } from '../types/scans';

describe('batchExport utility', () => {
  const dummyItems: BatchScanItem[] = [
    {
      id: '1',
      file: new File([], 'photo1.jpg'),
      name: 'photo1.jpg',
      previewUrl: 'blob:photo1',
      width: 1024,
      height: 768,
      status: 'done',
      result: {
        image_width: 1024,
        image_height: 768,
        model_name: 'Crop & Weed Segmentation (YOLO26)',
        task: 'segment',
        detections: [
          { class_id: 1, class_name: 'Maize', confidence: 0.9, box: [10, 10, 50, 50], polygon: null },
          { class_id: 0, class_name: 'BroWeed', confidence: 0.85, box: [60, 60, 90, 90], polygon: null },
        ],
        timings: { decode_ms: 5, inference_ms: 120, postprocess_ms: 2, total_ms: 127 },
      },
    },
    {
      id: '2',
      file: new File([], 'photo2.jpg'),
      name: 'photo2.jpg',
      previewUrl: 'blob:photo2',
      width: 1024,
      height: 768,
      status: 'done',
      result: {
        image_width: 1024,
        image_height: 768,
        model_name: 'Crop & Weed Segmentation (YOLO26)',
        task: 'segment',
        detections: [
          { class_id: 1, class_name: 'Maize', confidence: 0.95, box: [100, 100, 150, 150], polygon: null },
          { class_id: 2, class_name: 'NarWeed', confidence: 0.8, box: [200, 200, 250, 250], polygon: null },
          { class_id: 0, class_name: 'BroWeed', confidence: 0.75, box: [300, 300, 350, 350], polygon: null },
        ],
        timings: { decode_ms: 4, inference_ms: 110, postprocess_ms: 2, total_ms: 116 },
      },
    },
    {
      id: '3',
      file: new File([], 'photo3.jpg'),
      name: 'photo3.jpg',
      previewUrl: 'blob:photo3',
      width: 1024,
      height: 768,
      status: 'error',
      errorMsg: 'Corrupt file',
    },
  ];

  it('correctly aggregates crop and weed counts across batch items', () => {
    const summary = computeBatchSummary(dummyItems, 0.25);
    expect(summary.total).toBe(3);
    expect(summary.completed).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.totalCrops).toBe(2); // 2 Maize
    expect(summary.totalWeeds).toBe(3); // 2 BroWeed + 1 NarWeed
    expect(summary.weedRatio).toBe(60); // 3 / 5 = 60%
    expect(summary.classCounts['Maize']).toBe(2);
    expect(summary.classCounts['BroWeed']).toBe(2);
    expect(summary.classCounts['NarWeed']).toBe(1);
  });

  it('filters out low confidence detections when computing summary', () => {
    const summary = computeBatchSummary(dummyItems, 0.92);
    // Only Maize with 0.95 confidence should pass
    expect(summary.totalCrops).toBe(1);
    expect(summary.totalWeeds).toBe(0);
  });

  it('triggers JSON download for exportBatchSummaryJson without error', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:dummy');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    expect(() => {
      exportBatchSummaryJson(dummyItems, 'YOLO26', 0.25);
    }).not.toThrow();

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('triggers JSON download for exportSingleItemJson without error', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:dummy');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    expect(() => {
      exportSingleItemJson(dummyItems[0], 0.25);
    }).not.toThrow();

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });
});
