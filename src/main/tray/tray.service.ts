import { Tray, Menu, app } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProfileService } from '@main/profiles/profile.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class TrayService {
  private readonly tray: Tray;
  private active = false;

  constructor(
    private readonly profileService: ProfileService,
    private readonly onOpenSettings: () => void,
    private readonly onToggleActive: (active: boolean) => void,
    private readonly onSelectProfile: (id: string) => void,
  ) {
    const iconName =
      process.platform === 'darwin' ? 'tray-iconTemplate.png' : 'tray-icon.png';
    this.tray = new Tray(
      join(__dirname, '..', '..', '..', 'assets', 'icons', iconName),
    );
    this.tray.setToolTip('ScreenShield');
    this.refresh();
  }

  refresh(): void {
    const profilesResult = this.profileService.getAllProfiles();
    const profiles = profilesResult.success ? profilesResult.data : [];

    const activeIdResult = this.profileService.getActiveProfileId();
    const activeId = activeIdResult.success ? activeIdResult.data : null;

    const template: Electron.MenuItemConstructorOptions[] = [
      { label: 'ScreenShield', enabled: false },
      { type: 'separator' },
      {
        label: 'Active',
        type: 'checkbox',
        checked: this.active,
        click: () => {
          this.active = !this.active;
          this.onToggleActive(this.active);
        },
      },
      { type: 'separator' },
    ];

    for (const profile of profiles) {
      template.push({
        label: profile.name,
        type: 'radio',
        checked: profile.id === activeId,
        click: () => this.onSelectProfile(profile.id),
      });
    }

    if (profiles.length > 0) {
      template.push({ type: 'separator' });
    }

    template.push(
      {
        label: 'New Profile...',
        click: () => {
          const result = this.profileService.createBlankProfile('New Profile');
          if (result.success) {
            this.profileService.setActiveProfile(result.data.id);
            this.refresh();
            this.onOpenSettings();
          }
        },
      },
      {
        label: 'Edit Current...',
        click: () => this.onOpenSettings(),
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    );

    this.tray.setContextMenu(Menu.buildFromTemplate(template));
  }
}
