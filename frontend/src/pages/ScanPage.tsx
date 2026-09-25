import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  faImages,
  faCheck,
  faFileExport,
  faLayerGroup,
  faArrowRight,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { api, getUserErrorMessage } from '../services/api';
import {
  BatchScanItem,
  OverlayMode,
  OVERLAY_MODE_OPTIONS,
  AvailableModel,
} from '../types/scans';
import { DetectionOverlay } from '../components/scans/DetectionOverlay';
import { getClassColor } from '../utils/colors';
import { downloadAnnotatedImage } from '../utils/canvasExport';
import {
  computeBatchSummary,
  exportBatchSummaryJson,
  exportSingleItemJson,
} from '../utils/batchExport';
import { MAX_BATCH_SIZE } from '../utils/constants';
import { SEO } from '../components/common/SEO';
import { Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

export const ScanPage: React.FC = () => {
  const [batchItems, setBatchItems] = useState<BatchScanItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Model switching
  const [selectedModelId, setSelectedModelId] = useState<string>('yolo26-seg');

  const { data: models } = useQuery<AvailableModel[]>({
    queryKey: ['available-models'],
    queryFn: () =>
      api.get<{ success: boolean; data: AvailableModel[] }>('/scans/models').then((r) => r.data.data),
  });

  const activeModel = models?.find((m) => m.id === selectedModelId) || models?.[0];
  const isDetectionOnly = activeModel?.task === 'detect';

  // Global viewer controls
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('both');
  const [minConfidence, setMinConfidence] = useState<number>(0.25);
  const [hoveredDetMap, setHoveredDetMap] = useState<Record<string, number | null>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Automatically adjust overlay mode if model is detection-only
  useEffect(() => {
    if (isDetectionOnly && overlayMode === 'masks') {
      setOverlayMode('boxes');
    }
  }, [isDetectionOnly, overlayMode]);

  // Clean up object URLs on unmount or reset
  const cleanupUrls = useCallback((items: BatchScanItem[]) => {
    items.forEach((item) => {
      if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }, []);

  const batchItemsRef = useRef<BatchScanItem[]>([]);
  useEffect(() => {
    batchItemsRef.current = batchItems;
  }, [batchItems]);

  useEffect(() => {
    return () => {
      cleanupUrls(batchItemsRef.current);
    };
  }, [cleanupUrls]);

  // Sequential batch runner for safe memory & live per-item updates
  const processBatchItems = useCallback(
    async (itemsToProcess: BatchScanItem[], modelId: string) => {
      setIsScanning(true);

      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        if (item.status === 'error') continue;

        // Mark item as scanning
        setBatchItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'scanning' } : it))
        );

        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('model_id', modelId);

        try {
          const response = await api.post(`/scans?model_id=${modelId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          if (response.data && response.data.success && response.data.data) {
            const resultData = response.data.data;
            setBatchItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, status: 'done', result: resultData } : it
              )
            );
          } else {
            setBatchItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? { ...it, status: 'error', errorMsg: 'Unexpected response from model.' }
                  : it
              )
            );
          }
        } catch (err) {
          const msg = getUserErrorMessage(err, 'Failed to scan image.');
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: 'error', errorMsg: msg } : it
            )
          );
        }
      }

      setIsScanning(false);
    },
    []
  );

  const handleSelectModel = useCallback(
    (newModelId: string) => {
      if (newModelId === selectedModelId) return;
      setSelectedModelId(newModelId);

      // If items exist, recalculate with the newly selected model
      if (batchItems.length > 0 && !isScanning) {
        const targetModel = models?.find((m) => m.id === newModelId);
        toast(`Switching to ${targetModel?.name || 'new model'}... Recalculating analysis`, {
          icon: '🔄',
        });

        const resetItems: BatchScanItem[] = batchItems.map((item) => ({
          ...item,
          status: 'idle' as const,
          result: undefined,
          errorMsg: undefined,
        }));
        setBatchItems(resetItems);
        processBatchItems(resetItems, newModelId);
      }
    },
    [batchItems, isScanning, models, processBatchItems, selectedModelId]
  );

  const handleFilesProcess = useCallback(
    async (rawFiles: FileList | File[]) => {
      setErrorMsg(null);
      const filesArray = Array.from(rawFiles);

      if (filesArray.length === 0) return;

      // Enforce batch cap
      let filesToUse = filesArray;
      if (filesArray.length > MAX_BATCH_SIZE) {
        toast.error(`Batch limit is ${MAX_BATCH_SIZE} photos. Analyzing the first ${MAX_BATCH_SIZE}.`);
        filesToUse = filesArray.slice(0, MAX_BATCH_SIZE);
      }

      // Cleanup prior preview URLs
      cleanupUrls(batchItems);

      const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
      const newItems: BatchScanItem[] = [];

      for (let idx = 0; idx < filesToUse.length; idx++) {
        const file = filesToUse[idx];
        const isMimeValid = validMimes.includes(file.type);
        const isSizeValid = file.size <= 10 * 1024 * 1024;

        const objectUrl = URL.createObjectURL(file);
        const itemId = `batch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;

        if (!isMimeValid) {
          newItems.push({
            id: itemId,
            file,
            name: file.name,
            previewUrl: objectUrl,
            width: 0,
            height: 0,
            status: 'error',
            errorMsg: 'Invalid format. Use JPG, PNG, or WebP.',
          });
        } else if (!isSizeValid) {
          newItems.push({
            id: itemId,
            file,
            name: file.name,
            previewUrl: objectUrl,
            width: 0,
            height: 0,
            status: 'error',
            errorMsg: 'File exceeds 10 MB limit.',
          });
        } else {
          newItems.push({
            id: itemId,
            file,
            name: file.name,
            previewUrl: objectUrl,
            width: 0,
            height: 0,
            status: 'idle',
          });
        }
      }

      // Read natural image dimensions
      await Promise.all(
        newItems.map((item) => {
          if (item.status === 'error') return Promise.resolve();
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              item.width = img.naturalWidth;
              item.height = img.naturalHeight;
              resolve();
            };
            img.onerror = () => {
              item.status = 'error';
              item.errorMsg = 'Could not decode image dimensions.';
              resolve();
            };
            img.src = item.previewUrl;
          });
        })
      );

      setBatchItems(newItems);
      setActiveItemIndex(0);

      // Start processing with currently selected model
      processBatchItems(newItems, selectedModelId);
    },
    [batchItems, cleanupUrls, processBatchItems, selectedModelId]
  );

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
      handleFilesProcess(e.dataTransfer.files);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesProcess(e.target.files);
    }
  };

  // Paste image support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        handleFilesProcess(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFilesProcess]);

  const handleReset = () => {
    cleanupUrls(batchItems);
    setBatchItems([]);
    setActiveItemIndex(0);
    setErrorMsg(null);
    setHoveredDetMap({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadSampleSingle = async () => {
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
      const file = new File([blob], 'demo_field_sample.jpg', { type: 'image/jpeg' });
      handleFilesProcess([file]);
    }
  };

  const handleLoadSampleBatch = async () => {
    const colors = [
      { bg: '#2d4b28', c1: '#3c7032', c2: '#4e9140' },
      { bg: '#334426', c1: '#557e38', c2: '#274b1e' },
      { bg: '#294326', c1: '#436b33', c2: '#688e4e' },
    ];

    const files: File[] = [];
    for (let i = 0; i < colors.length; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = colors[i].bg;
      ctx.fillRect(0, 0, 640, 640);
      ctx.fillStyle = colors[i].c1;
      ctx.beginPath();
      ctx.arc(180 + i * 40, 220 + i * 20, 85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors[i].c2;
      ctx.beginPath();
      ctx.arc(400 - i * 30, 360, 95, 0, Math.PI * 2);
      ctx.fill();

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (blob) {
        files.push(new File([blob], `demo_field_zone_${i + 1}.jpg`, { type: 'image/jpeg' }));
      }
    }

    if (files.length > 0) {
      handleFilesProcess(files);
    }
  };

  const scrollToItem = (idx: number, id: string) => {
    setActiveItemIndex(idx);
    const el = itemRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Compute aggregate statistics
  const batchSummary = useMemo(() => {
    return computeBatchSummary(batchItems, minConfidence);
  }, [batchItems, minConfidence]);

  const availableOverlayOptions = isDetectionOnly
    ? OVERLAY_MODE_OPTIONS.filter((opt) => opt.value === 'boxes')
    : OVERLAY_MODE_OPTIONS;

  const isBatchMode = batchItems.length > 1;

  return (
    <div className="w-full pb-16">
      <SEO
        title="Scan & Bulk Analysis"
        description="Upload single or multiple field photos to detect crop and weed coordinates with high precision."
      />

      {/* Hidden file input with multiple support */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
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

      {/* Model Selector Card (Always visible before scan, collapsible when results present) */}
      <div className="mb-6 p-4 rounded-[20px] bg-card border border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faMicrochip} className="text-accent text-sm" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Active Vision Model
            </span>
          </div>
          <span className="text-xs text-muted">
            Choose which AI model analyzes your photos
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
                  onClick={() => handleSelectModel(m.id)}
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

      {batchItems.length === 0 ? (
        /* Upload Area (Dropzone) */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-[24px] p-8 md:p-14 text-center cursor-pointer transition-all duration-200 select-none flex flex-col items-center justify-center min-h-[380px] md:min-h-[440px] ${
            isDragging
              ? 'border-accent bg-accent/5 scale-[1.008]'
              : 'border-line hover:border-accent/60 bg-card hover:bg-card-hover'
          }`}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-2xl md:text-3xl mb-5 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <FontAwesomeIcon icon={faCloudArrowUp} />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-primary mb-2">
            Upload plant or field photos
          </h2>
          <p className="text-sm md:text-[15px] text-sub font-medium max-w-lg mb-6 leading-relaxed">
            Drag and drop <strong>single or multiple photos</strong> here (up to {MAX_BATCH_SIZE} photos). You can also paste from clipboard (Ctrl+V).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-card-hover border border-line text-sub">
              JPG, PNG, WebP
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-card-hover border border-line text-sub">
              Up to 10 MB / photo
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-accent/10 border border-accent/20 text-accent">
              Bulk cap: max {MAX_BATCH_SIZE} photos
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
              <FontAwesomeIcon icon={faImages} className="mr-2" />
              Choose Photos (Single or Bulk)
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSampleSingle();
              }}
            >
              Demo Single Photo
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSampleBatch();
              }}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
              Demo Batch (3 Photos)
            </Button>
          </div>
        </div>
      ) : (
        /* Results / Stacked Bulk Visualizer View */
        <div className="space-y-6 animate-fadeIn">
          {/* Top Aggregate Summary & Batch Controls Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-line shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                  <h3 className="text-base sm:text-lg font-bold text-primary">
                    {isBatchMode ? `Bulk Analysis (${batchItems.length} Photos)` : 'Scan Analysis'}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-card-hover border border-line text-sub font-mono font-medium">
                    {activeModel?.name}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {batchSummary.completed} of {batchItems.length} completed • {batchSummary.totalCrops} crops • {batchSummary.totalWeeds} weeds detected
                </p>
              </div>

              {/* Action Buttons: Export All & New Batch */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {isBatchMode && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      exportBatchSummaryJson(
                        batchItems,
                        activeModel?.name || 'CropSight Model',
                        minConfidence
                      )
                    }
                    title="Export complete aggregate JSON report for all photos"
                  >
                    <FontAwesomeIcon icon={faFileExport} className="mr-1.5" />
                    Export All (Batch Report)
                  </Button>
                )}

                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <FontAwesomeIcon icon={faRotateRight} className="mr-1.5" />
                  New Scan
                </Button>
              </div>
            </div>

            {/* Live Progress Bar when scanning */}
            {isScanning && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-sub">
                  <span className="flex items-center gap-2 text-accent">
                    <Spinner size="sm" />
                    <span>Analyzing {batchSummary.completed + 1} of {batchItems.length} photos...</span>
                  </span>
                  <span>{Math.round((batchSummary.completed / batchItems.length) * 100)}%</span>
                </div>
                <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${(batchSummary.completed / batchItems.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Aggregate Metrics Tiles */}
            {isBatchMode && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-line">
                <div className="p-3 rounded-xl bg-card-hover border border-line">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Total Crops
                  </div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {batchSummary.totalCrops}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-card-hover border border-line">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Total Weeds
                  </div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {batchSummary.totalWeeds}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-card-hover border border-line">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Weed Pressure
                  </div>
                  <div className="text-xl font-bold text-primary">
                    {Math.round(batchSummary.weedRatio)}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-card-hover border border-line">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Field Health
                  </div>
                  <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                    {batchSummary.weedRatio <= 15 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Optimal (Low Weeds)</span>
                    ) : batchSummary.weedRatio <= 35 ? (
                      <span className="text-amber-600 dark:text-amber-400">Moderate Infestation</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">High Weed Pressure</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick-Jump Index Strip: [1/5], [2/5], [3/5] */}
            {isBatchMode && (
              <div className="pt-2 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
                    Jump to:
                  </span>
                  {batchItems.map((item, idx) => {
                    const isCurrent = activeItemIndex === idx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToItem(idx, item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          isCurrent
                            ? 'bg-accent text-white shadow-sm ring-2 ring-accent/30'
                            : 'bg-card-hover border border-line text-sub hover:text-primary hover:border-accent/40'
                        }`}
                        title={item.name}
                      >
                        {item.status === 'done' && (
                          <FontAwesomeIcon icon={faCheck} className="text-[10px] text-emerald-400" />
                        )}
                        {item.status === 'scanning' && <Spinner size="sm" />}
                        {item.status === 'error' && (
                          <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px] text-danger" />
                        )}
                        <span>{idx + 1}/{batchItems.length}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeItemIndex === 0}
                    onClick={() =>
                      scrollToItem(activeItemIndex - 1, batchItems[activeItemIndex - 1].id)
                    }
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-1" /> Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeItemIndex === batchItems.length - 1}
                    onClick={() =>
                      scrollToItem(activeItemIndex + 1, batchItems[activeItemIndex + 1].id)
                    }
                  >
                    Next <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Global Filter Bar: Overlay Mode & Confidence Slider */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider hidden sm:inline">
                  Overlay:
                </span>
                <Segmented
                  options={availableOverlayOptions}
                  value={overlayMode}
                  onChange={setOverlayMode}
                />
              </div>

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
                  className="w-24 sm:w-28 accent-accent cursor-pointer"
                  title={`Filter threshold: ${Math.round(minConfidence * 100)}%`}
                />
                <span className="text-xs font-mono font-semibold text-primary w-9">
                  {Math.round(minConfidence * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Stacked Cards: Render every photo in the batch with complete normal details */}
          <div className="space-y-8">
            {batchItems.map((item, itemIdx) => {
              const res = item.result;
              const filteredDets = res
                ? res.detections.filter((d) => d.confidence >= minConfidence)
                : [];

              const classCounts = filteredDets.reduce((acc, d) => {
                acc[d.class_name] = (acc[d.class_name] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const currentHovered = hoveredDetMap[item.id] ?? null;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[item.id] = el;
                  }}
                  className={`rounded-2xl bg-card border transition-all duration-200 overflow-hidden shadow-sm ${
                    activeItemIndex === itemIdx
                      ? 'border-accent ring-2 ring-accent/20'
                      : 'border-line'
                  }`}
                >
                  {/* Card Header with 1/N Number, Filename, and Individual Export Buttons */}
                  <div className="p-4 sm:p-5 border-b border-line bg-card-hover/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Number Badge: 1/10 */}
                      <span className="px-3 py-1 rounded-xl bg-accent text-white font-mono font-bold text-xs tracking-wider shadow-sm">
                        {itemIdx + 1} / {batchItems.length}
                      </span>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-primary truncate max-w-[280px] sm:max-w-md">
                          {item.name}
                        </h4>
                        <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                          {item.status === 'done' && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <FontAwesomeIcon icon={faCheck} />
                              Completed ({filteredDets.length} spots)
                            </span>
                          )}
                          {item.status === 'scanning' && (
                            <span className="text-accent font-semibold flex items-center gap-1 animate-pulse">
                              <Spinner size="sm" /> Analyzing...
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-danger font-semibold flex items-center gap-1">
                              <FontAwesomeIcon icon={faTriangleExclamation} />
                              {item.errorMsg || 'Failed'}
                            </span>
                          )}
                          {item.width > 0 && <span>• {item.width} × {item.height} px</span>}
                        </div>
                      </div>
                    </div>

                    {/* Individual Export Buttons for This Photo */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {res && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              downloadAnnotatedImage(
                                item.file || item.previewUrl,
                                item.width,
                                item.height,
                                filteredDets,
                                overlayMode,
                                minConfidence,
                                `${item.name.replace(/\.[^/.]+$/, '')}_annotated.png`
                              )
                            }
                            title={`Export annotated image for Photo ${itemIdx + 1}`}
                          >
                            <FontAwesomeIcon icon={faDownload} className="mr-1.5" />
                            <span>Export Image</span>
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => exportSingleItemJson(item, minConfidence)}
                            title={`Export JSON data for Photo ${itemIdx + 1}`}
                          >
                            <FontAwesomeIcon icon={faFileExport} className="mr-1.5" />
                            <span>Export JSON</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Full Normal Details (Interactive Canvas + Coordinates Breakdown) */}
                  <div className="p-4 sm:p-5">
                    {item.status === 'error' ? (
                      <div className="py-12 px-4 text-center rounded-xl bg-danger/5 border border-danger/20 text-danger">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-3xl mb-3 text-danger/80" />
                        <p className="font-semibold text-sm">{item.errorMsg || 'Failed to analyze this photo.'}</p>
                        <p className="text-xs text-muted mt-1">Please ensure the image is under 10 MB and in JPG, PNG, or WebP format.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
                        {/* Left: Image / Detection Viewer */}
                        <div className="space-y-3">
                          <div className="relative">
                            <DetectionOverlay
                              imageUrl={item.previewUrl}
                              imageWidth={item.width}
                              imageHeight={item.height}
                              detections={filteredDets}
                              overlayMode={overlayMode}
                              minConfidence={minConfidence}
                              hoveredIndex={currentHovered}
                              onHoverIndex={(idx) =>
                                setHoveredDetMap((prev) => ({ ...prev, [item.id]: idx }))
                              }
                            />

                            {/* Loading Spinner Overlay during Inference */}
                            {item.status === 'scanning' && (
                              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-20">
                                <Spinner size="md" className="text-accent mb-3" />
                                <p className="text-sm font-semibold text-primary animate-pulse">
                                  Analyzing with {activeModel?.name || 'YOLO'}...
                                </p>
                                <p className="text-xs text-muted mt-1">
                                  Detecting crops, weeds and organic coordinates
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Timings Bar */}
                          {res?.timings && (
                            <div className="p-3 rounded-xl bg-card-hover border border-line flex flex-wrap items-center justify-between text-xs text-sub gap-2">
                              <div className="flex items-center gap-1.5 text-accent font-semibold">
                                <FontAwesomeIcon icon={faBolt} />
                                <span>Inference: {res.timings.total_ms.toFixed(0)} ms</span>
                              </div>
                              <div className="flex items-center gap-3 font-mono text-[11px] text-muted">
                                <span>Decode: {res.timings.decode_ms.toFixed(0)}ms</span>
                                <span>•</span>
                                <span>Model: {res.timings.inference_ms.toFixed(0)}ms</span>
                                <span>•</span>
                                <span>Post: {res.timings.postprocess_ms.toFixed(0)}ms</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Results Breakdown & Coordinates */}
                        <div className="space-y-4">
                          <Card title={`Spots in Photo ${itemIdx + 1}`}>
                            {item.status === 'scanning' ? (
                              <div className="py-8 flex flex-col items-center justify-center text-center">
                                <Spinner size="md" className="text-accent mb-2" />
                                <span className="text-xs text-muted">Running model analysis...</span>
                              </div>
                            ) : filteredDets.length === 0 ? (
                              <div className="py-8 text-center text-sub">
                                <p className="text-sm font-medium">
                                  No spots detected above {Math.round(minConfidence * 100)}%
                                </p>
                                <p className="text-xs text-muted mt-1">
                                  Try lowering the confidence threshold above.
                                </p>
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

                                {/* Total Identified */}
                                <div className="text-xs text-muted flex items-center justify-between border-t border-line pt-3">
                                  <span>Total Identified Spots:</span>
                                  <span className="font-semibold text-primary">
                                    {filteredDets.length}
                                  </span>
                                </div>

                                {/* Coordinate Item List with Hover Highlights */}
                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                  {filteredDets.map((det, detIdx) => {
                                    const isHovered = currentHovered === detIdx;
                                    const colors = getClassColor(det.class_name, det.class_id);

                                    return (
                                      <div
                                        key={`det-${item.id}-${detIdx}`}
                                        onMouseEnter={() =>
                                          setHoveredDetMap((prev) => ({
                                            ...prev,
                                            [item.id]: detIdx,
                                          }))
                                        }
                                        onMouseLeave={() =>
                                          setHoveredDetMap((prev) => ({
                                            ...prev,
                                            [item.id]: null,
                                          }))
                                        }
                                        className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                                          isHovered
                                            ? 'border-accent bg-accent/10 shadow-sm'
                                            : 'border-line bg-card hover:bg-card-hover'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-1.5">
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${colors.dotBg}`} />
                                            <span className="text-xs font-bold text-primary">
                                              {det.class_name}
                                            </span>
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
