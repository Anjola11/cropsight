import React from 'react';
import { Detection, OverlayMode } from '../../types/scans';
import { getClassColor } from '../../utils/colors';

interface DetectionOverlayProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  detections: Detection[];
  overlayMode: OverlayMode;
  minConfidence: number;
  selectedClassIds?: Set<number>;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  detections,
  overlayMode,
  minConfidence,
  selectedClassIds,
  hoveredIndex,
  onHoverIndex,
}) => {
  const showBoxes = overlayMode === 'boxes' || overlayMode === 'both';
  const showMasks = overlayMode === 'masks' || overlayMode === 'both';

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black/5 dark:bg-black/40 border border-line select-none flex items-center justify-center">
      {/* Base Image */}
      <img
        src={imageUrl}
        alt="Scan Preview"
        className="w-full h-auto object-contain max-h-[72vh] block"
        loading="eager"
      />

      {/* SVG Overlay */}
      {imageWidth > 0 && imageHeight > 0 && (
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>

          {detections.map((det, index) => {
            if (det.confidence < minConfidence) return null;
            if (selectedClassIds && !selectedClassIds.has(det.class_id)) return null;

            const isHovered = hoveredIndex === index;
            const colors = getClassColor(det.class_name, det.class_id);
            const [x1, y1, x2, y2] = det.box;
            const boxWidth = Math.max(x2 - x1, 2);
            const boxHeight = Math.max(y2 - y1, 2);

            // Label positioning
            const labelText = `${det.class_name} ${Math.round(det.confidence * 100)}%`;
            const labelCharWidth = 8;
            const labelPadding = 12;
            const badgeW = labelText.length * labelCharWidth + labelPadding;
            const badgeH = 22;
            const badgeX = Math.max(0, Math.min(x1, imageWidth - badgeW));
            const badgeY = y1 >= badgeH + 4 ? y1 - badgeH - 2 : Math.min(y1 + 4, imageHeight - badgeH);

            return (
              <g
                key={`det-${index}`}
                className="cursor-pointer pointer-events-auto transition-opacity duration-150"
                style={{ opacity: hoveredIndex !== null && !isHovered ? 0.45 : 1 }}
                onMouseEnter={() => onHoverIndex(index)}
                onMouseLeave={() => onHoverIndex(null)}
              >
                {/* Segmentation Polygon */}
                {showMasks && det.polygon && det.polygon.length >= 3 && (
                  <polygon
                    points={det.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isHovered ? 3.5 : 2}
                    strokeLinejoin="round"
                    className="transition-all duration-150"
                  />
                )}

                {/* Bounding Box */}
                {showBoxes && (
                  <rect
                    x={x1}
                    y={y1}
                    width={boxWidth}
                    height={boxHeight}
                    fill="transparent"
                    stroke={colors.stroke}
                    strokeWidth={isHovered ? 3.5 : 2}
                    rx="4"
                    strokeDasharray={showMasks ? '4 2' : undefined}
                  />
                )}

                {/* Detection Label Badge */}
                {showBoxes && (
                  <g filter="url(#glow)">
                    <rect
                      x={badgeX}
                      y={badgeY}
                      width={badgeW}
                      height={badgeH}
                      rx="4"
                      fill={colors.stroke}
                    />
                    <text
                      x={badgeX + badgeW / 2}
                      y={badgeY + 15}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="600"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {labelText}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};
