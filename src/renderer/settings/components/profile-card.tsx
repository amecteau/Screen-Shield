import React from 'react';
import type { BlurProfile } from '@shared/types/profile.types.js';

export interface ProfileCardProps {
  profile: BlurProfile;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProfileCard({
  profile,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: ProfileCardProps): React.ReactElement {
  const regionCount = profile.regions.length;
  const regionLabel = regionCount === 1 ? '1 region' : `${regionCount} regions`;

  return (
    <div data-testid="profile-card" data-active={isActive}>
      <div>
        <h3>{profile.name}</h3>
        <p>{regionLabel}</p>
        {isActive && <span data-testid="active-badge">Active</span>}
      </div>
      <div>
        <button onClick={onSelect} disabled={isActive}>
          {isActive ? 'Selected' : 'Select'}
        </button>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
