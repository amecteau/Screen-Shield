import type { BrowserWindow } from 'electron';

export class SettingsWindowController {
  constructor(private readonly win: BrowserWindow) {}

  show(): void {
    this.win.show();
    this.win.focus();
  }

  hide(): void {
    this.win.hide();
  }

  isVisible(): boolean {
    return this.win.isVisible();
  }
}
