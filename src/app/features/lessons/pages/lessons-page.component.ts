import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Chapter } from '../../../core/models/lesson.models';
import { ChapterProgress } from '../../../core/models/progress.models';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-lessons-page',
  imports: [RouterLink, TranslatePipe, LowerCasePipe],
  templateUrl: './lessons-page.component.html',
  styleUrl: './lessons-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonsPageComponent {
  private readonly lessonApi = inject(LessonApiService);
  private readonly progressApi = inject(ProgressApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly chapters = signal<Chapter[]>([]);
  protected readonly progressMap = signal<Map<string, ChapterProgress>>(new Map());

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    forkJoin({
      chapters: this.lessonApi.getLessons(),
      progress: this.progressApi.getProgressSummary(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ chapters, progress }) => {
        this.chapters.set(chapters);
        const map = new Map<string, ChapterProgress>();
        for (const lesson of progress.lessons) {
          map.set(lesson.title, lesson);
        }
        this.progressMap.set(map);
      });
  }

  protected getStatus(chapter: Chapter): string {
    const progress = this.progressMap().get(chapter.title);
    return progress?.status ?? 'Not Started';
  }

  protected getStatusClass(chapter: Chapter): string {
    const status = this.getStatus(chapter);
    if (status === 'Completed') return 'badge-completed';
    if (status === 'In Progress') return 'badge-in-progress';
    return 'badge-not-started';
  }

  protected getStatusKey(chapter: Chapter): string {
    const status = this.getStatus(chapter);
    if (status === 'Completed') return 'progress.statusCompleted';
    if (status === 'In Progress') return 'progress.statusInProgress';
    return 'progress.statusNotStarted';
  }

  protected getCompletedCount(chapter: Chapter): number {
    return this.progressMap().get(chapter.title)?.completedSubLessons ?? 0;
  }

  protected getChapterPercent(chapter: Chapter): number {
    const total = chapter.lessons.length;
    const completed = this.getCompletedCount(chapter);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
