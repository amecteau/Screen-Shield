// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegionSelector } from './region-selector.js';
import type { BlurRegion } from '@shared/types/profile.types.js';

function makeRegion(overrides: Partial<BlurRegion> = {}): BlurRegion {
  return {
    id: 'r1',
    x: 10,
    y: 10,
    width: 30,
    height: 20,
    blurStrength: 20,
    ...overrides,
  };
}

beforeEach(() => {
  // getBoundingClientRect is not implemented in happy-dom; provide a stub
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
});

describe('RegionSelector', () => {
  it('renders container with data-testid', () => {
    render(<RegionSelector regions={[]} onChange={vi.fn()} />);
    expect(screen.getByTestId('region-selector')).toBeTruthy();
  });

  it('renders region divs for each region', () => {
    const regions = [makeRegion({ id: 'r1' }), makeRegion({ id: 'r2' })];
    render(<RegionSelector regions={regions} onChange={vi.fn()} />);
    expect(screen.getAllByTestId('region-div')).toHaveLength(2);
  });

  it('renders no region divs when empty', () => {
    render(<RegionSelector regions={[]} onChange={vi.fn()} />);
    expect(screen.queryAllByTestId('region-div')).toHaveLength(0);
  });

  it('shows draft region while drawing', () => {
    render(<RegionSelector regions={[]} onChange={vi.fn()} />);
    const container = screen.getByTestId('region-selector');

    fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(container, { clientX: 300, clientY: 250 });

    expect(screen.queryByTestId('draft-region')).toBeTruthy();
  });

  it('removes draft region after mouseUp', () => {
    render(<RegionSelector regions={[]} onChange={vi.fn()} />);
    const container = screen.getByTestId('region-selector');

    fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(container, { clientX: 300, clientY: 250 });
    fireEvent.mouseUp(container);

    expect(screen.queryByTestId('draft-region')).toBeNull();
  });

  it('calls onChange after drawing a region', () => {
    const onChange = vi.fn();
    render(<RegionSelector regions={[]} onChange={onChange} />);
    const container = screen.getByTestId('region-selector');

    fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(container, { clientX: 400, clientY: 300 });
    fireEvent.mouseUp(container);

    expect(onChange).toHaveBeenCalledOnce();
    const [newRegions] = onChange.mock.calls[0] as [BlurRegion[]];
    expect(newRegions).toHaveLength(1);
  });

  it('does not add region if too small', () => {
    const onChange = vi.fn();
    render(<RegionSelector regions={[]} onChange={onChange} />);
    const container = screen.getByTestId('region-selector');

    // 1px drag = <1% on 800px wide container
    fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(container, { clientX: 101, clientY: 101 });
    fireEvent.mouseUp(container);

    expect(onChange).toHaveBeenCalledOnce();
    const [newRegions] = onChange.mock.calls[0] as [BlurRegion[]];
    expect(newRegions).toHaveLength(0);
  });

  it('shows resize handles when region is selected', () => {
    const region = makeRegion({ id: 'r1' });
    render(<RegionSelector regions={[region]} onChange={vi.fn()} />);

    const regionDiv = screen.getByTestId('region-div');
    fireEvent.mouseDown(regionDiv, { clientX: 200, clientY: 200 });

    expect(screen.getByTestId('resize-handle-nw')).toBeTruthy();
    expect(screen.getByTestId('resize-handle-ne')).toBeTruthy();
    expect(screen.getByTestId('resize-handle-sw')).toBeTruthy();
    expect(screen.getByTestId('resize-handle-se')).toBeTruthy();
  });

  it('does not show resize handles when region is not selected', () => {
    const region = makeRegion({ id: 'r1' });
    render(<RegionSelector regions={[region]} onChange={vi.fn()} />);

    expect(screen.queryByTestId('resize-handle-se')).toBeNull();
  });

  it('clicking region div does not trigger drawing', () => {
    const region = makeRegion({ id: 'r1' });
    const onChange = vi.fn();
    render(<RegionSelector regions={[region]} onChange={onChange} />);

    const regionDiv = screen.getByTestId('region-div');
    fireEvent.mouseDown(regionDiv, { clientX: 200, clientY: 200 });
    fireEvent.mouseUp(regionDiv);

    // onChange only called during drawing/resizing commit
    expect(onChange).not.toHaveBeenCalled();
  });

  it('mouseLeave triggers same commit as mouseUp', () => {
    const onChange = vi.fn();
    render(<RegionSelector regions={[]} onChange={onChange} />);
    const container = screen.getByTestId('region-selector');

    fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(container, { clientX: 400, clientY: 300 });
    fireEvent.mouseLeave(container);

    expect(onChange).toHaveBeenCalledOnce();
  });
});
