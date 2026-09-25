import { BatchScanItem, BatchSummary } from '../types/scans';

/**
 * Computes aggregate metrics across all scanned batch items.
 */
export function computeBatchSummary(items: BatchScanItem[], minConfidence = 0.25): BatchSummary {
  let totalCrops = 0;
  let totalWeeds = 0;
  let completed = 0;
  let failed = 0;
  const classCounts: Record<string, number> = {};

  for (const item of items) {
    if (item.status === 'done' && item.result) {
      completed++;
      const detections = item.result.detections.filter((d) => d.confidence >= minConfidence);
      for (const d of detections) {
        classCounts[d.class_name] = (classCounts[d.class_name] || 0) + 1;
        const nameLower = d.class_name.toLowerCase();
        if (nameLower.includes('weed')) {
          totalWeeds++;
        } else {
          totalCrops++;
        }
      }
    } else if (item.status === 'error') {
      failed++;
    }
  }

  const totalPlants = totalCrops + totalWeeds;
  const weedRatio = totalPlants > 0 ? (totalWeeds / totalPlants) * 100 : 0;

  return {
    total: items.length,
    completed,
    failed,
    totalCrops,
    totalWeeds,
    weedRatio,
    classCounts,
  };
}

/**
 * Downloads a complete JSON report covering all images in the batch.
 */
export function exportBatchSummaryJson(
  items: BatchScanItem[],
  modelName: string,
  minConfidence = 0.25
): void {
  const summary = computeBatchSummary(items, minConfidence);

  const payload = {
    report_title: 'CropSight Bulk Scan Analysis Report',
    exported_at: new Date().toISOString(),
    model_name: modelName,
    filter_min_confidence: minConfidence,
    summary: {
      total_photos: summary.total,
      completed_photos: summary.completed,
      failed_photos: summary.failed,
      total_crops_detected: summary.totalCrops,
      total_weeds_detected: summary.totalWeeds,
      overall_weed_infestation_pct: Math.round(summary.weedRatio * 10) / 10,
      class_breakdown: summary.classCounts,
    },
    photos: items.map((item, idx) => ({
      index: idx + 1,
      filename: item.name,
      status: item.status,
      error: item.errorMsg || null,
      dimensions: { width: item.width, height: item.height },
      timings: item.result?.timings || null,
      detections_count: item.result?.detections.filter((d) => d.confidence >= minConfidence).length || 0,
      detections: (item.result?.detections || [])
        .filter((d) => d.confidence >= minConfidence)
        .map((d) => ({
          class_id: d.class_id,
          class_name: d.class_name,
          confidence: Math.round(d.confidence * 1000) / 1000,
          box_xyxy: d.box,
          has_polygon: !!d.polygon,
        })),
    })),
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cropsight_batch_report_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads single photo results as JSON.
 */
export function exportSingleItemJson(item: BatchScanItem, minConfidence = 0.25): void {
  if (!item.result) return;

  const validDets = item.result.detections.filter((d) => d.confidence >= minConfidence);
  const payload = {
    report_title: 'CropSight Individual Photo Analysis',
    filename: item.name,
    exported_at: new Date().toISOString(),
    model_name: item.result.model_name,
    dimensions: { width: item.width, height: item.height },
    timings: item.result.timings,
    detections_count: validDets.length,
    detections: validDets,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.name.replace(/\.[^/.]+$/, '')}_analysis.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
