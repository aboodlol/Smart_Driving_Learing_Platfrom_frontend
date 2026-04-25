import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { I18nService } from './core/services/i18n.service';
import { ThemeService } from './core/services/theme.service';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authTokenInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: (i18n: I18nService) => () => i18n.preload(),
      deps: [I18nService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (theme: ThemeService) => () => theme.init(),
      deps: [ThemeService],
      multi: true,
    },
  ],
};
