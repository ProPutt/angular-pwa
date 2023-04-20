import { Component, OnInit } from '@angular/core';
import { Platform } from '@angular/cdk/platform';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';
import { ApplicationRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  isOnline: boolean;
  modalVersion: boolean;
  modalPwaEvent: any;
  modalPwaPlatform: string|undefined;
  
  constructor(appRef: ApplicationRef, updates: SwUpdate) {
    this.isOnline = false;
    this.modalVersion = false;
    // Allow the app to stabilize first, before starting
    // polling for updates with `interval()`.
    const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    everySixHoursOnceAppIsStable$.subscribe(async () => {
      try {
        const updateFound = await updates.checkForUpdate();
        console.log(updateFound ? 'A new version is available.' : 'Already on the latest version.');
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    });
  }

  public ngOnInit(): void {
    this.updateOnlineStatus();

    window.addEventListener('online',  this.updateOnlineStatus.bind(this));
    window.addEventListener('offline', this.updateOnlineStatus.bind(this));
    console.info(`check swUpdate.isEnabled`);
    
    if (this.swUpdate.isEnabled) {
      console.info(`swUpdate.isEnabled`);
      this.swUpdate.versionUpdates.pipe(
        filter((evt: any): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map((evt: any) => {
          console.info(`currentVersion=[${evt.currentVersion} | latestVersion=[${evt.latestVersion}]`);
          this.modalVersion = true;
        }),
      );
    }

    this.loadModalPwa();
  }

  private updateOnlineStatus(): void {
    this.isOnline = window.navigator.onLine;
    console.info(`isOnline=[${this.isOnline}]`);
  }

  public updateVersion(): void {
    this.modalVersion = false;
    window.location.reload();
  }

  public closeVersion(): void {
    this.modalVersion = false;
  }

  private loadModalPwa(): void {
    if (this.platform.ANDROID) {
      window.addEventListener('beforeinstallprompt', (event: any) => {
        event.preventDefault();
        this.modalPwaEvent = event;
        this.modalPwaPlatform = 'ANDROID';
      });
    }

    if (this.platform.IOS && this.platform.SAFARI) {
      const isInStandaloneMode = ('standalone' in window.navigator) && ((<any>window.navigator)['standalone']);
      if (!isInStandaloneMode) {
        this.modalPwaPlatform = 'IOS';
      }
    }
  }

  public addToHomeScreen(): void {
    this.modalPwaEvent.prompt();
    this.modalPwaPlatform = undefined;
  }

  public closePwa(): void {
    this.modalPwaPlatform = undefined;
  }

}
