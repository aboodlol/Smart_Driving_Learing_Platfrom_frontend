import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {}
