// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileCard } from './profile-card.js';
import type { BlurProfile } from '@shared/types/profile.types.js';

function makeProfile(overrides: Partial<BlurProfile> = {}): BlurProfile {
  return {
    id: 'profile-1',
    name: 'Test Profile',
    regions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProfileCard', () => {
  it('renders profile name', () => {
    render(
      <ProfileCard
        profile={makeProfile({ name: 'My Profile' })}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('My Profile')).toBeTruthy();
  });

  it('shows "0 regions" when no regions', () => {
    render(
      <ProfileCard
        profile={makeProfile({ regions: [] })}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('0 regions')).toBeTruthy();
  });

  it('shows "1 region" for singular', () => {
    const regions = [{ id: 'r1', x: 0, y: 0, width: 10, height: 10, blurStrength: 20 }];
    render(
      <ProfileCard
        profile={makeProfile({ regions })}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('1 region')).toBeTruthy();
  });

  it('shows "2 regions" for plural', () => {
    const regions = [
      { id: 'r1', x: 0, y: 0, width: 10, height: 10, blurStrength: 20 },
      { id: 'r2', x: 20, y: 20, width: 10, height: 10, blurStrength: 20 },
    ];
    render(
      <ProfileCard
        profile={makeProfile({ regions })}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('2 regions')).toBeTruthy();
  });

  it('shows active badge when isActive is true', () => {
    render(
      <ProfileCard
        profile={makeProfile()}
        isActive={true}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('active-badge')).toBeTruthy();
  });

  it('does not show active badge when isActive is false', () => {
    render(
      <ProfileCard
        profile={makeProfile()}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('active-badge')).toBeNull();
  });

  it('select button is disabled when active', () => {
    render(
      <ProfileCard
        profile={makeProfile()}
        isActive={true}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const selectBtn = screen.getByText('Selected');
    expect((selectBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('select button is enabled when not active', () => {
    render(
      <ProfileCard
        profile={makeProfile()}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const selectBtn = screen.getByText('Select');
    expect((selectBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls onSelect when Select button clicked', () => {
    const onSelect = vi.fn();
    render(
      <ProfileCard
        profile={makeProfile()}
        isActive={false}
        onSelect={onSelect}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Select'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('calls onEdit when Edit button clicked', () => {
    const onEdit = vi.fn();
    render(
      <ProfileCard
        profile={makeProfile()}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('calls onDelete when Delete button clicked', () => {
    const onDelete = vi.fn();
    render(
      <ProfileCard
        profile={makeProfile()}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('data-testid is profile-card', () => {
    render(
      <ProfileCard
        profile={makeProfile()}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('profile-card')).toBeTruthy();
  });

  it('data-active reflects isActive prop', () => {
    const { rerender } = render(
      <ProfileCard
        profile={makeProfile()}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('profile-card').getAttribute('data-active')).toBe('false');

    rerender(
      <ProfileCard
        profile={makeProfile()}
        isActive={true}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('profile-card').getAttribute('data-active')).toBe('true');
  });
});
