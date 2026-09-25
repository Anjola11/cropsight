import { Detection, OverlayMode } from '../types/scans';
import { getClassColor } from './colors';

export async function downloadAnnotatedImage(
  imageUrl: string,
  imageWidth: number,
  imageHeight: number,
  detections: Detection[],
  overlayMode: OverlayMode,
  minConfidence: number,
  filename: string = 'cropsight-annotated.png'
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageUrl;
  });

  // 1. Draw base image
  ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

  const showBoxes = overlayMode === 'boxes' || overlayMode === 'both';
  const showMasks = overlayMode === 'masks' || overlayMode === 'both';

  // 2. Draw detections
  for (const det of detections) {
    if (det.confidence < minConfidence) continue;

    const colors = getClassColor(det.class_name, det.class_id);

    // Draw Polygon Mask
    if (showMasks && det.polygon && det.polygon.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(det.polygon[0][0], det.polygon[0][1]);
      for (let i = 1; i < det.polygon.length; i++) {
        ctx.lineTo(det.polygon[i][0], det.polygon[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.stroke;
      ctx.stroke();
    }

    // Draw Bounding Box
    if (showBoxes) {
      const [x1, y1, x2, y2] = det.box;
      const w = Math.max(x2 - x1, 2);
      const h = Math.max(y2 - y1, 2);

      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.stroke;
      ctx.strokeRect(x1, y1, w, h);

      // Label Pill
      const label = `${det.class_name} ${Math.round(det.confidence * 100)}%`;
      ctx.font = 'bold 12px sans-serif';
      const textMetrics = ctx.measureText(label);
      const textW = textMetrics.width + 12;
      const textH = 20;
      const badgeX = Math.max(0, Math.min(x1, imageWidth - textW));
      const badgeY = y1 >= textH + 4 ? y1 - textH - 2 : Math.min(y1 + 4, imageHeight - textH);

      ctx.fillStyle = colors.stroke;
      ctx.fillRect(badgeX, badgeY, textW, textH);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, badgeX + 6, badgeY + 14);
    }
  }

  // 3. Export to blob & trigger download
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
