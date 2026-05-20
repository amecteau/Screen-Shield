import React, { useEffect, useState } from 'react';
import type { BlurProfile, BlurRegion } from '@shared/types/profile.types.js';
import { RegionSelector } from '../components/region-selector.js';
import { useProfiles } from '../hooks/use-profiles.js';

export interface RegionEditorProps {
  profileId: string;
  onDone: () => void;
}

export function RegionEditor({ profileId, onDone }: RegionEditorProps): React.ReactElement {
  const { profiles, loading, error, saveProfile } = useProfiles();
  const [regions, setRegions] = useState<BlurRegion[]>([]);
  const [profileName, setProfileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      setRegions([...profile.regions]);
      setProfileName(profile.name);
    }
  }, [profiles, profileId]);

  const handleSave = async (): Promise<void> => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    setSaving(true);
    setSaveError(null);

    const updated: BlurProfile = {
      ...profile,
      regions,
      updatedAt: new Date().toISOString(),
    };

    const result = await saveProfile(updated);
    setSaving(false);

    if (result.success) {
      onDone();
    } else {
      setSaveError(result.error);
    }
  };

  if (loading) {
    return <div data-testid="loading">Loading…</div>;
  }

  if (error !== null) {
    return <div data-testid="error">Error: {error}</div>;
  }

  return (
    <div data-testid="region-editor">
      <div>
        <h2>{profileName}</h2>
        <p>Draw regions by clicking and dragging on the canvas below.</p>
      </div>

      <div
        data-testid="region-canvas"
        style={{ width: '100%', height: '60vh', background: '#1e1e2e', borderRadius: 8 }}
      >
        <RegionSelector regions={regions} onChange={setRegions} />
      </div>

      {saveError !== null && <p data-testid="save-error">{saveError}</p>}

      <div>
        <button data-testid="save-btn" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button data-testid="cancel-btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
