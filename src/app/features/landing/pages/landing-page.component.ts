import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements AfterViewInit {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);

  protected readonly animWrapper = viewChild<ElementRef<HTMLElement>>('animWrapper');

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          }
        },
        { threshold: 0.15 },
      );

      const wrapper = this.animWrapper()?.nativeElement;
      if (wrapper) {
        const targets = wrapper.querySelectorAll('.scroll-reveal');
        targets.forEach((el) => observer.observe(el));
      }

      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
