import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faSliders,
  faDownload,
  faRotateRight,
  faBolt,
  faTriangleExclamation,
  faMicrochip,
  faCircleNodes,
  faCropSimple,
} from '@fortawesome/free-solid-svg-icons';
import { api, getUserErrorMessage } from '../services/api';
import { ScanResult, OverlayMode, OVERLAY_MODE_OPTIONS, AvailableModel } from '../types/scans';
import { DetectionOverlay } from '../components/scans/DetectionOverlay';
import { getClassColor } from '../utils/colors';
import { downloadAnnotatedImage } from '../utils/canvasExport';
import { SEO } from '../components/common/SEO';
import { Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

export const ScanPage: React.FC = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Model switching
  const [selectedModelId, setSelectedModelId] = useState<string>('yolo26-seg');

  const { data: models } = useQuery<AvailableModel[]>({
    queryKey: ['available-models'],
    queryFn: () =>
      api.get<{ success: boolean; data: AvailableModel[] }>('/scans/models').then((r) => r.data.data),
  });

  const activeModel = models?.find((m) => m.id === selectedModelId) || models?.[0];
  const isDetectionOnly = activeModel?.task === 'detect';

  // Viewer controls
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('both');
  const [minConfidence, setMinConfidence] = useState<number>(0.25);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically adjust overlay mode if model is detection-only
  useEffect(() => {
    if (isDetectionOnly && overlayMode === 'masks') {
      setOverlayMode('boxes');
    }
  }, [isDetectionOnly, overlayMode]);

  // Cleanup object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileProcess = useCallback(async (file: File) => {
    setErrorMsg(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Please upload a valid JPG, PNG, or WebP image.');
      return;
    }

    // Validate size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10 MB limit. Please choose a smaller image.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setScanResult(null);

    // Get image natural dimensions
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objectUrl;

    // Send scan request with selected model
    setIsScanning(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_id', selectedModelId);

    try {
      const response = await api.post(`/scans?model_id=${selectedModelId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.success && response.data.data) {
        setScanResult(response.data.data);
      } else {
        setErrorMsg('Scan returned an unexpected response format.');
      }
    } catch (err) {
      setErrorMsg(getUserErrorMessage(err, 'Failed to scan the image. Please try again.'));
    } finally {
      setIsScanning(false);
    }
  }, [selectedModelId]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Paste image support from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          handleFileProcess(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileProcess]);

  const handleReset = () => {
    setPreviewUrl(null);
    setScanResult(null);
    setErrorMsg(null);
    setHoveredIndex(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Group detections by class
  const filteredDetections = scanResult
    ? scanResult.detections.filter((d) => d.confidence >= minConfidence)
    : [];

  const classCounts = filteredDetections.reduce((acc, d) => {
    acc[d.class_name] = (acc[d.class_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleLoadSample = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#2d4b28';
    ctx.fillRect(0, 0, 640, 640);

    ctx.fillStyle = '#3c7032';
    ctx.beginPath();
    ctx.arc(200, 250, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4e9140';
    ctx.beginPath();
    ctx.arc(440, 380, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#225520';
    ctx.beginPath();
    ctx.arc(320, 180, 70, 0, Math.PI * 2);
    ctx.fill();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (blob) {
      const file = new File([blob], 'sample_field.jpg', { type: 'image/jpeg' });
      handleFileProcess(file);
    }
  };

  // Available overlay modes depending on active model
  const availableOverlayOptions = isDetectionOnly
    ? OVERLAY_MODE_OPTIONS.filter((opt) => opt.value === 'boxes')
    : OVERLAY_MODE_OPTIONS;

  return (
    <div className="w-full pb-12">
      <SEO title="Scan a photo" description="Upload a crop or field photo to identify crop and weed coordinates." />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileChange}
        className="hidden"
        id="crop-photo-upload"
      />

      {/* Error Banner */}
      {errorMsg && (
        <div className="mb-4 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Model Selector Card */}
      <div className="mb-6 p-4 rounded-[20px] bg-card border border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faMicrochip} className="text-accent text-sm" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Active Vision Model
            </span>
          </div>
          <span className="text-xs text-muted">
            Choose which AI model analyzes your photo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {models ? (
            models.map((m) => {
              const isSelected = m.id === selectedModelId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModelId(m.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent'
                      : 'border-line bg-card hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-primary flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={m.task === 'segment' ? faCircleNodes : faCropSimple}
                        className={isSelected ? 'text-accent' : 'text-muted'}
                      />
                      {m.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        m.task === 'segment'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                      }`}
                    >
                      {m.task === 'segment' ? 'Masks + Boxes' : 'Boxes Only'}
                    </span>
                  </div>
                  <p className="text-xs text-sub mb-2 leading-relaxed">{m.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {m.classes.map((cls) => {
                      const colors = getClassColor(cls.name, cls.id);
                      return (
                        <span
                          key={cls.id}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${colors.badgeBg} ${colors.badgeText}`}
                        >
                          {cls.name}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-3 text-xs text-muted">Loading available models...</div>
          )}
        </div>
      </div>

      {!previewUrl ? (
        /* Upload Area (Dropzone) */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-[24px] p-8 md:p-14 text-center cursor-pointer transition-all duration-200 select-none flex flex-col items-center justify-center min-h-[360px] md:min-h-[420px] ${
            isDragging
              ? 'border-accent bg-accent/5 scale-[1.008]'
              : 'border-line hover:border-accent/60 bg-card hover:bg-card-hover'
          }`}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-2xl md:text-3xl mb-5 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <FontAwesomeIcon icon={faCloudArrowUp} />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-primary mb-2">
            Upload a plant or field photo
          </h2>
          <p className="text-sm md:text-[15px] text-sub font-medium max-w-lg mb-6 leading-relaxed">
            Drag and drop your photo here, or click anywhere to browse. You can also paste from clipboard (Ctrl+V).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-card-hover border border-line text-sub">
              JPG, PNG, WebP
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-card-hover border border-line text-sub">
              Up to 10 MB
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-card-hover border border-line text-sub">
              {activeModel ? `${activeModel.name}` : 'Instant Detection'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose File from Device
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSample();
              }}
            >
              Try Demo Field Image
            </Button>
          </div>
        </div>
      ) : (
        /* Results / Visualizer View */
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-line">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider hidden sm:inline">
                Overlay:
              </span>
              <Segmented
                options={availableOverlayOptions}
                value={overlayMode}
                onChange={setOverlayMode}
              />
              {isDetectionOnly && (
                <span className="text-[11px] text-muted ml-2 font-medium">
                  (Boxes model)
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Confidence Slider */}
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faSliders} className="text-muted text-xs" />
                <span className="text-xs text-sub hidden sm:inline">Confidence:</span>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  className="w-20 sm:w-28 accent-accent cursor-pointer"
                  title={`Filter threshold: ${Math.round(minConfidence * 100)}%`}
                />
                <span className="text-xs font-mono font-semibold text-primary w-9">
                  {Math.round(minConfidence * 100)}%
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {scanResult && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      downloadAnnotatedImage(
                        previewUrl,
                        imageSize.width,
                        imageSize.height,
                        filteredDetections,
                        overlayMode,
                        minConfidence
                      )
                    }
                    title="Download annotated image with detected bounding boxes"
                  >
                    <FontAwesomeIcon icon={faDownload} className="mr-1.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                )}

                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <FontAwesomeIcon icon={faRotateRight} className="mr-1.5" />
                  New Scan
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
            {/* Left: Image / Detection Viewer */}
            <div className="space-y-3">
              <div className="relative">
                <DetectionOverlay
                  imageUrl={previewUrl}
                  imageWidth={imageSize.width}
                  imageHeight={imageSize.height}
                  detections={filteredDetections}
                  overlayMode={overlayMode}
                  minConfidence={minConfidence}
                  hoveredIndex={hoveredIndex}
                  onHoverIndex={setHoveredIndex}
                />

                {/* Loading Spinner Overlay during Inference */}
                {isScanning && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-20">
                    <Spinner size="md" className="text-accent mb-3" />
                    <p className="text-sm font-semibold text-primary animate-pulse">
                      Analyzing with {activeModel?.name || 'YOLO'}...
                    </p>
                    <p className="text-xs text-muted mt-1">Detecting crops, weeds and coordinates</p>
                  </div>
                )}
              </div>

              {/* Performance Timings Bar */}
              {scanResult?.timings && (
                <div className="p-3 rounded-xl bg-card border border-line flex flex-wrap items-center justify-between text-xs text-sub gap-2">
                  <div className="flex items-center gap-1.5 text-accent font-semibold">
                    <FontAwesomeIcon icon={faBolt} />
                    <span>Inference completed in {scanResult.timings.total_ms.toFixed(0)} ms</span>
                    <span className="text-muted font-normal">({scanResult.model_name})</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-muted">
                    <span>Decode: {scanResult.timings.decode_ms.toFixed(0)}ms</span>
                    <span>•</span>
                    <span>Model: {scanResult.timings.inference_ms.toFixed(0)}ms</span>
                    <span>•</span>
                    <span>Postprocess: {scanResult.timings.postprocess_ms.toFixed(0)}ms</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Results Breakdown & Coordinate List */}
            <div className="space-y-4">
              {/* Summary Card */}
              <Card title="Detected Spots">
                {isScanning ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <Spinner size="md" className="text-accent mb-2" />
                    <span className="text-xs text-muted">Running model analysis...</span>
                  </div>
                ) : filteredDetections.length === 0 ? (
                  <div className="py-8 text-center text-sub">
                    <p className="text-sm font-medium">No spots detected above {Math.round(minConfidence * 100)}%</p>
                    <p className="text-xs text-muted mt-1">Try lowering the confidence threshold slider above.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Class Breakdown Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(classCounts).map(([className, count]) => {
                        const colors = getClassColor(className);
                        return (
                          <div
                            key={className}
                            className={`px-3 py-1.5 rounded-xl border border-line flex items-center gap-2 text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${colors.dotBg}`} />
                            <span className="font-semibold">{className}:</span>
                            <span>{count}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Detections Badge */}
                    <div className="text-xs text-muted flex items-center justify-between border-t border-line pt-3">
                      <span>Total Identified Spots:</span>
                      <span className="font-semibold text-primary">{filteredDetections.length}</span>
                    </div>

                    {/* Detection Item List */}
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {filteredDetections.map((det, idx) => {
                        const isHovered = hoveredIndex === idx;
                        const colors = getClassColor(det.class_name, det.class_id);

                        return (
                          <div
                            key={`list-det-${idx}`}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                              isHovered
                                ? 'border-accent bg-accent/10 shadow-sm'
                                : 'border-line bg-card hover:bg-card-hover'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${colors.dotBg}`} />
                                <span className="text-xs font-bold text-primary">{det.class_name}</span>
                              </div>
                              <span className="text-xs font-mono font-semibold text-accent">
                                {Math.round(det.confidence * 100)}%
                              </span>
                            </div>

                            {/* Confidence Bar */}
                            <div className="w-full bg-line rounded-full h-1.5 mb-2 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.round(det.confidence * 100)}%`,
                                  backgroundColor: colors.stroke,
                                }}
                              />
                            </div>

                            {/* Coordinates Box */}
                            <div className="text-[11px] font-mono text-muted flex items-center justify-between">
                              <span>Box [X1, Y1, X2, Y2]:</span>
                              <span>
                                [{det.box.map((b) => Math.round(b)).join(', ')}]
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
