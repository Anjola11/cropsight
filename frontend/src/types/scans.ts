export type DetectionKind = 'crop' | 'weed' | 'disease' | 'other';
export type OverlayMode = 'boxes' | 'masks' | 'both';

export const OVERLAY_MODE_OPTIONS: { value: OverlayMode; label: string }[] = [
  { value: 'boxes', label: 'Boxes' },
  { value: 'masks', label: 'Masks' },
  { value: 'both', label: 'Both' },
];

export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  box: [number, number, number, number];
  polygon: [number, number][] | null;
}

export interface ScanTimings {
  decode_ms: number;
  inference_ms: number;
  postprocess_ms: number;
  total_ms: number;
}

export interface ScanResult {
  image_width: number;
  image_height: number;
  model_name: string;
  task?: 'segment' | 'detect';
  detections: Detection[];
  timings: ScanTimings;
}

export interface ScanRecord extends ScanResult {
  id: string;
  created_at: string;
  image_data_url: string;
  client_total_ms: number;
}

export interface ModelClass {
  id: number;
  name: string;
}

export interface AvailableModel {
  id: string;
  name: string;
  task: 'segment' | 'detect';
  description: string;
  classes: ModelClass[];
}

export interface ModelInfo {
  name: string;
  task: string;
  imgsz: number;
  confidence_threshold: number;
  classes: ModelClass[];
}

