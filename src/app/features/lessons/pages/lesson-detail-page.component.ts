import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Chapter } from '../../../core/models/lesson.models';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-lesson-detail-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './lesson-detail-page.component.html',
  styleUrl: './lesson-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly lessonApi = inject(LessonApiService);
  private readonly progressApi = inject(ProgressApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly chapter = signal<Chapter | null>(null);
  protected readonly completedSet = signal<Set<string>>(new Set());
  protected readonly completing = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadData(id);
  }

  private loadData(id: string): void {
    this.loading.set(true);

    forkJoin({
      chapter: this.lessonApi.getLesson(id),
      progress: this.progressApi.getProgressSummary(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ chapter, progress }) => {
        this.chapter.set(chapter);
        const lessonProgress = progress.lessons.find((l) => l.title === chapter.title);
        if (lessonProgress) {
          // We need the raw progress to get completed identifiers
          // For now, use the summary data - completedSubLessons count
          // We'll track what we complete in this session
        }
      });
  }

  protected isCompleted(subLessonTitle: string): boolean {
    return this.completedSet().has(subLessonTitle);
  }

  protected markComplete(subLessonTitle: string): void {
    const ch = this.chapter();
    if (!ch || this.completing()) return;

    this.completing.set(subLessonTitle);

    this.lessonApi
      .completeSubLesson(ch._id, subLessonTitle)
      .pipe(
        finalize(() => this.completing.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.completedSet.update((set) => {
            const newSet = new Set(set);
            newSet.add(subLessonTitle);
            return newSet;
          });
          this.toast.success(`"${subLessonTitle}" marked as complete!`);
        },
        error: (err: Error) => {
          this.toast.error(err.message);
        },
      });
  }
}
