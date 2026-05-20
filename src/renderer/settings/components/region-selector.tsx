import React, { useRef, useState } from 'react';
import type { BlurRegion } from '@shared/types/profile.types.js';
import { clamp } from '@shared/utils/geometry.js';
import { useRegionDraw, type ResizeHandle } from '../hooks/use-region-draw.js';

export interface RegionSelectorProps {
  regions: readonly BlurRegion[];
  onChange: (regions: BlurRegion[]) => void;
}

interface RegionDivProps {
  region: BlurRegion;
  isSelected: boolean;
  isDraft?: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onResizeHandleMouseDown: (handle: ResizeHandle, e: React.MouseEvent<HTMLDivElement>) => void;
}

const HANDLE_POSITIONS: Record<ResizeHandle, React.CSSProperties> = {
  nw: { top: -5, left: -5, cursor: 'nw-resize' },
  ne: { top: -5, right: -5, cursor: 'ne-resize' },
  sw: { bottom: -5, left: -5, cursor: 'sw-resize' },
  se: { bottom: -5, right: -5, cursor: 'se-resize' },
};

const HANDLES: ResizeHandle[] = ['nw', 'ne', 'sw', 'se'];

function RegionDiv({
  region,
  isSelected,
  isDraft = false,
  onMouseDown,
  onResizeHandleMouseDown,
}: RegionDivProps): React.ReactElement {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${region.x}%`,
    top: `${region.y}%`,
    width: `${region.width}%`,
    height: `${region.height}%`,
    boxSizing: 'border-box',
    border: isSelected
      ? '2px solid #3b82f6'
      : isDraft
        ? '1px dashed #9ca3af'
        : '1px solid rgba(255, 255, 255, 0.4)',
    background: isDraft ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    cursor: isDraft ? 'crosshair' : 'pointer',
  };

  return (
    <div
      style={style}
      onMouseDown={onMouseDown}
      data-testid={isDraft ? 'draft-region' : 'region-div'}
      data-region-id={region.id}
      data-selected={isSelected}
    >
      {isSelected &&
        HANDLES.map((handle) => (
          <div
            key={handle}
            data-testid={`resize-handle-${handle}`}
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              background: '#3b82f6',
              borderRadius: 2,
              ...HANDLE_POSITIONS[handle],
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeHandleMouseDown(handle, e);
            }}
          />
        ))}
    </div>
  );
}

type MouseMode = 'idle' | 'drawing' | 'resizing';

export function RegionSelector({ regions, onChange }: RegionSelectorProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseMode, setMouseMode] = useState<MouseMode>('idle');
  const draw = useRegionDraw(regions);

  const getPercent = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  };

  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.currentTarget !== e.target) return;
    const { x, y } = getPercent(e);
    setMouseMode('drawing');
    draw.startDraw(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    const { x, y } = getPercent(e);
    if (mouseMode === 'drawing') {
      draw.updateDraw(x, y);
    } else if (mouseMode === 'resizing') {
      draw.updateResize(x, y);
    }
  };

  const handleMouseUp = (): void => {
    if (mouseMode === 'drawing') {
      onChange(draw.commitDraw());
    } else if (mouseMode === 'resizing') {
      onChange(draw.commitResize());
    }
    setMouseMode('idle');
  };

  const handleRegionMouseDown = (regionId: string, e: React.MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    draw.selectRegion(regionId);
  };

  const handleResizeHandleMouseDown = (
    regionId: string,
    handle: ResizeHandle,
    e: React.MouseEvent<HTMLDivElement>,
  ): void => {
    const { x, y } = getPercent(e);
    setMouseMode('resizing');
    draw.startResize(regionId, handle, x, y);
  };

  return (
    <div
      ref={containerRef}
      data-testid="region-selector"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        userSelect: 'none',
        cursor: 'crosshair',
        overflow: 'hidden',
      }}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {draw.regions.map((region) => (
        <RegionDiv
          key={region.id}
          region={region}
          isSelected={region.id === draw.selectedRegionId}
          onMouseDown={(e) => handleRegionMouseDown(region.id, e)}
          onResizeHandleMouseDown={(handle, e) =>
            handleResizeHandleMouseDown(region.id, handle, e)
          }
        />
      ))}
      {draw.draftRegion !== null && (
        <RegionDiv
          region={draw.draftRegion}
          isSelected={false}
          isDraft
          onMouseDown={() => undefined}
          onResizeHandleMouseDown={() => undefined}
        />
      )}
    </div>
  );
}
