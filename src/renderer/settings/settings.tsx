import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ProfileList } from './pages/profile-list.js';
import { RegionEditor } from './pages/region-editor.js';

export function App(): React.ReactElement {
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  if (editingProfileId !== null) {
    return (
      <RegionEditor
        profileId={editingProfileId}
        onDone={() => setEditingProfileId(null)}
      />
    );
  }

  return <ProfileList onEditProfile={(id) => setEditingProfileId(id)} />;
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
