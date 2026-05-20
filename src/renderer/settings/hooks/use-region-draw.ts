import { useState, useCallback } from 'react';
import type { BlurRegion } from '@shared/types/profile.types.js';
import { clamp } from '@shared/utils/geometry.js';

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

const MIN_REGION_SIZE = 2;
const DEFAULT_BLUR_STRENGTH = 20;

interface DrawingState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ResizingState {
  regionId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  originalRegion: BlurRegion;
}

export interface UseRegionDrawReturn {
  regions: BlurRegion[];
  draftRegion: BlurRegion | null;
  selectedRegionId: string | null;
  startDraw: (x: number, y: number) => void;
  updateDraw: (x: number, y: number) => void;
  commitDraw: () => BlurRegion[];
  cancelDraw: () => void;
  selectRegion: (id: string) => void;
  clearSelection: () => void;
  deleteSelectedRegion: () => void;
  startResize: (id: string, handle: ResizeHandle, x: number, y: number) => void;
  updateResize: (x: number, y: number) => void;
  commitResize: () => BlurRegion[];
  updateBlurStrength: (id: string, strength: number) => void;
  setRegions: (regions: BlurRegion[]) => void;
}

function computeDraft(drawing: DrawingState): Omit<BlurRegion, 'id' | 'blurStrength'> {
  const x = clamp(Math.min(drawing.startX, drawing.currentX), 0, 100);
  const y = clamp(Math.min(drawing.startY, drawing.currentY), 0, 100);
  const right = clamp(Math.max(drawing.startX, drawing.currentX), 0, 100);
  const bottom = clamp(Math.max(drawing.startY, drawing.currentY), 0, 100);
  return { x, y, width: right - x, height: bottom - y };
}

function applyResize(
  original: BlurRegion,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): BlurRegion {
  const right = original.x + original.width;
  const bottom = original.y + original.height;
  let { x, y, width, height } = original;

  switch (handle) {
    case 'nw':
      x = clamp(original.x + dx, 0, right - MIN_REGION_SIZE);
      y = clamp(original.y + dy, 0, bottom - MIN_REGION_SIZE);
      width = right - x;
      height = bottom - y;
      break;
    case 'ne':
      y = clamp(original.y + dy, 0, bottom - MIN_REGION_SIZE);
      width = clamp(original.width + dx, MIN_REGION_SIZE, 100 - original.x);
      height = bottom - y;
      break;
    case 'sw':
      x = clamp(original.x + dx, 0, right - MIN_REGION_SIZE);
      width = right - x;
      height = clamp(original.height + dy, MIN_REGION_SIZE, 100 - original.y);
      break;
    case 'se':
      width = clamp(original.width + dx, MIN_REGION_SIZE, 100 - original.x);
      height = clamp(original.height + dy, MIN_REGION_SIZE, 100 - original.y);
      break;
  }

  return { ...original, x, y, width, height };
}

export function useRegionDraw(initialRegions: readonly BlurRegion[]): UseRegionDrawReturn {
  const [regions, setRegionsState] = useState<BlurRegion[]>(() => [...initialRegions]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [, setResizing] = useState<ResizingState | null>(null);

  const draftRegion: BlurRegion | null = drawing
    ? { id: '__draft__', blurStrength: DEFAULT_BLUR_STRENGTH, ...computeDraft(drawing) }
    : null;

  const startDraw = useCallback((x: number, y: number): void => {
    setSelectedRegionId(null);
    setDrawing({ startX: x, startY: y, currentX: x, currentY: y });
  }, []);

  const updateDraw = useCallback((x: number, y: number): void => {
    setDrawing((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));
  }, []);

  const commitDraw = useCallback((): BlurRegion[] => {
    if (!drawing) return regions;
    const draft = computeDraft(drawing);
    setDrawing(null);
    if (draft.width >= MIN_REGION_SIZE && draft.height >= MIN_REGION_SIZE) {
      const newRegion: BlurRegion = {
        id: crypto.randomUUID(),
        blurStrength: DEFAULT_BLUR_STRENGTH,
        ...draft,
      };
      const newRegions = [...regions, newRegion];
      setRegionsState(newRegions);
      return newRegions;
    }
    return regions;
  }, [drawing, regions]);

  const cancelDraw = useCallback((): void => {
    setDrawing(null);
  }, []);

  const selectRegion = useCallback((id: string): void => {
    setSelectedRegionId(id);
  }, []);

  const clearSelection = useCallback((): void => {
    setSelectedRegionId(null);
  }, []);

  const deleteSelectedRegion = useCallback((): void => {
    setSelectedRegionId((id) => {
      if (id !== null) {
        setRegionsState((r) => r.filter((region) => region.id !== id));
      }
      return null;
    });
  }, []);

  const startResize = useCallback(
    (id: string, handle: ResizeHandle, x: number, y: number): void => {
      const region = regions.find((r) => r.id === id);
      if (!region) return;
      setResizing({ regionId: id, handle, startX: x, startY: y, originalRegion: region });
    },
    [regions],
  );

  const updateResize = useCallback((x: number, y: number): void => {
    setResizing((prev) => {
      if (!prev) return null;
      const dx = x - prev.startX;
      const dy = y - prev.startY;
      const updated = applyResize(prev.originalRegion, prev.handle, dx, dy);
      setRegionsState((r) =>
        r.map((region) => (region.id === prev.regionId ? updated : region)),
      );
      return prev;
    });
  }, []);

  const commitResize = useCallback((): BlurRegion[] => {
    setResizing(null);
    return regions;
  }, [regions]);

  const updateBlurStrength = useCallback((id: string, strength: number): void => {
    setRegionsState((r) =>
      r.map((region) => (region.id === id ? { ...region, blurStrength: strength } : region)),
    );
  }, []);

  const setRegions = useCallback((newRegions: BlurRegion[]): void => {
    setRegionsState(newRegions);
  }, []);

  return {
    regions,
    draftRegion,
    selectedRegionId,
    startDraw,
    updateDraw,
    commitDraw,
    cancelDraw,
    selectRegion,
    clearSelection,
    deleteSelectedRegion,
    startResize,
    updateResize,
    commitResize,
    updateBlurStrength,
    setRegions,
  };
}
