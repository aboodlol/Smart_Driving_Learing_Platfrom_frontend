import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Chapter } from '../../../core/models/lesson.models';
import { LessonApiService } from '../../../core/services/lesson-api.service';

@Component({
  selector: 'app-quiz-page',
  imports: [RouterLink],
  templateUrl: './quiz-page.component.html',
  styleUrl: './quiz-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizPageComponent {
  private readonly lessonApi = inject(LessonApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly chapters = signal<Chapter[]>([]);

  constructor() {
    this.lessonApi
      .getLessons()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((chapters) => this.chapters.set(chapters));
  }
}
