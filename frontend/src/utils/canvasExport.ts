import { Detection, OverlayMode } from '../types/scans';
import { getClassColor } from './colors';
import toast from 'react-hot-toast';

export async function downloadAnnotatedImage(
  imageSource: string | File | Blob,
  imageWidth: number,
  imageHeight: number,
  detections: Detection[],
  overlayMode: OverlayMode,
  minConfidence: number,
  filename: string = 'cropsight-annotated.png'
): Promise<void> {
  const canvas = document.createElement('canvas');
  const w = imageWidth > 0 ? imageWidth : 640;
  const h = imageHeight > 0 ? imageHeight : 640;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let objectUrlToRevoke: string | null = null;
  let sourceUrl: string;

  if (typeof imageSource === 'string') {
    sourceUrl = imageSource;
  } else {
    // If a File or Blob is passed, generate a dedicated temporary URL for the canvas draw
    sourceUrl = URL.createObjectURL(imageSource);
    objectUrlToRevoke = sourceUrl;
  }

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for canvas export'));
      img.src = sourceUrl;
    });

    // 1. Draw base image
    ctx.drawImage(img, 0, 0, w, h);

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
        const boxW = Math.max(x2 - x1, 2);
        const boxH = Math.max(y2 - y1, 2);

        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.stroke;
        ctx.strokeRect(x1, y1, boxW, boxH);

        // Label Pill
        const label = `${det.class_name} ${Math.round(det.confidence * 100)}%`;
        ctx.font = 'bold 12px sans-serif';
        const textMetrics = ctx.measureText(label);
        const textW = textMetrics.width + 12;
        const textH = 20;
        const badgeX = Math.max(0, Math.min(x1, w - textW));
        const badgeY = y1 >= textH + 4 ? y1 - textH - 2 : Math.min(y1 + 4, h - textH);

        ctx.fillStyle = colors.stroke;
        ctx.fillRect(badgeX, badgeY, textW, textH);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, badgeX + 6, badgeY + 14);
      }
    }

    // 3. Export to blob & trigger download
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('Canvas export failed to create blob');
    }

    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    toast.success('Annotated photo exported successfully!');
  } catch (err) {
    console.error('downloadAnnotatedImage error:', err);
    toast.error('Failed to export annotated image. Try again.');
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}
