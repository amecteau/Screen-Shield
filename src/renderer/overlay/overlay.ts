import type { BlurRegion, OverlayApi } from '@shared/types/profile.types.js';

function createRegionDiv(region: BlurRegion, settingsMode: boolean): HTMLDivElement {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = `${region.x}vw`;
  div.style.top = `${region.y}vh`;
  div.style.width = `${region.width}vw`;
  div.style.height = `${region.height}vh`;
  div.style.backdropFilter = `blur(${region.blurStrength}px)`;

  if (settingsMode) {
    div.style.background = 'rgba(0, 100, 255, 0.1)';
    div.style.border = '2px solid rgba(255, 255, 255, 0.8)';
    div.style.boxSizing = 'border-box';
  } else {
    div.style.background = 'rgba(0, 0, 0, 0.01)';
  }

  return div;
}

function renderRegions(
  root: HTMLElement,
  regions: readonly BlurRegion[],
  settingsMode: boolean,
): void {
  root.innerHTML = '';
  root.style.background = settingsMode ? 'rgba(0, 0, 0, 0.2)' : 'transparent';

  for (const region of regions) {
    root.appendChild(createRegionDiv(region, settingsMode));
  }
}

export function initOverlay(): void {
  const root = document.getElementById('overlay-root');
  if (!root) return;

  const api = (window as unknown as { screenShield: OverlayApi }).screenShield;
  let currentRegions: readonly BlurRegion[] = [];
  let settingsMode = false;

  api.onRegionsUpdate((regions) => {
    currentRegions = regions;
    renderRegions(root, currentRegions, settingsMode);
  });

  api.onSettingsModeChange((active) => {
    settingsMode = active;
    renderRegions(root, currentRegions, settingsMode);
  });
}

initOverlay();
