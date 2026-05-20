import React, { useState } from 'react';
import { ProfileCard } from '../components/profile-card.js';
import { useProfiles } from '../hooks/use-profiles.js';

export interface ProfileListProps {
  onEditProfile: (id: string) => void;
}

export function ProfileList({ onEditProfile }: ProfileListProps): React.ReactElement {
  const { profiles, activeProfileId, loading, error, saveProfile, deleteProfile, setActiveProfile } =
    useProfiles();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();
    const result = await saveProfile({
      id: crypto.randomUUID(),
      name: trimmed,
      regions: [],
      createdAt: now,
      updatedAt: now,
    });

    if (result.success) {
      setNewName('');
      setCreating(false);
    }
  };

  if (loading) {
    return <div data-testid="loading">Loading profiles…</div>;
  }

  if (error !== null) {
    return <div data-testid="error">Error: {error}</div>;
  }

  return (
    <div data-testid="profile-list">
      <h1>Profiles</h1>

      {profiles.length === 0 && <p data-testid="empty-message">No profiles yet.</p>}

      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          isActive={profile.id === activeProfileId}
          onSelect={() => void setActiveProfile(profile.id)}
          onEdit={() => onEditProfile(profile.id)}
          onDelete={() => void deleteProfile(profile.id)}
        />
      ))}

      {creating ? (
        <form onSubmit={(e) => void handleCreate(e)} data-testid="new-profile-form">
          <input
            data-testid="new-profile-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Profile name"
            autoFocus
          />
          <button type="submit">Create</button>
          <button type="button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button data-testid="new-profile-btn" onClick={() => setCreating(true)}>
          New Profile
        </button>
      )}
    </div>
  );
}
