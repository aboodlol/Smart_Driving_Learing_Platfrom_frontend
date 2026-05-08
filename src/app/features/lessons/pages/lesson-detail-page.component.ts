import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Chapter } from '../../../core/models/lesson.models';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';

type SubStatus = 'completed' | 'current' | 'upcoming';

const MIN_PER_SUBLESSON = 4;

@Component({
  selector: 'app-lesson-detail-page',
  imports: [RouterLink, TranslatePipe, LowerCasePipe],
  templateUrl: './lesson-detail-page.component.html',
  styleUrl: './lesson-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly lessonApi = inject(LessonApiService);
  private readonly progressApi = inject(ProgressApiService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly chapter = signal<Chapter | null>(null);
  protected readonly completedSet = signal<Set<number>>(new Set());
  protected readonly currentIndex = signal(0);
  protected readonly completing = signal(false);
  protected readonly studyComplete = signal(false);
  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');

  protected readonly currentSubLesson = computed(() => {
    const ch = this.chapter();
    return ch?.lessons[this.currentIndex()] ?? null;
  });

  protected readonly completedCount = computed(() => this.completedSet().size);

  protected readonly totalLessons = computed(() => this.chapter()?.lessons.length ?? 0);

  protected readonly percent = computed(() => {
    const total = this.totalLessons();
    return total > 0 ? Math.round((this.completedCount() / total) * 100) : 0;
  });

  protected readonly totalMinutes = computed(() => this.totalLessons() * MIN_PER_SUBLESSON);

  protected readonly chapterIndexLabel = computed(() => {
    const order = this.chapter()?.order ?? 1;
    return String(order).padStart(2, '0');
  });

  protected readonly currentIndexLabel = computed(() => String(this.currentIndex() + 1).padStart(2, '0'));

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadData(id);
  }

  private loadData(id: string): void {
    this.loading.set(true);

    forkJoin({
      chapter: this.lessonApi.getLesson(id),
      progress: this.progressApi.getLessonProgress(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ chapter, progress }) => {
        this.chapter.set(chapter);
        const completedIndexes = progress.completedLessons
          .filter((entry) => entry.chapterId === chapter._id)
          .map((entry) => entry.subLessonIndex);
        this.completedSet.set(new Set(completedIndexes));

        const firstUnfinished = chapter.lessons.findIndex((_, idx) => !completedIndexes.includes(idx));
        if (firstUnfinished >= 0) {
          this.currentIndex.set(firstUnfinished);
        } else {
          this.currentIndex.set(Math.max(0, chapter.lessons.length - 1));
        }
      });
  }

  protected indexLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected statusFor(index: number): SubStatus {
    if (this.completedSet().has(index)) return 'completed';
    if (index === this.currentIndex() && !this.studyComplete()) return 'current';
    return 'upcoming';
  }

  protected actionLabelKey(index: number): string {
    const status = this.statusFor(index);
    if (status === 'completed') return 'lessons.review';
    if (status === 'current') return 'lessons.resume';
    return 'lessons.start';
  }

  protected isCompleted(index: number): boolean {
    return this.completedSet().has(index);
  }

  protected selectSubLesson(index: number): void {
    this.currentIndex.set(index);
    this.studyComplete.set(false);
  }

  protected next(): void {
    const ch = this.chapter();
    const subLesson = this.currentSubLesson();
    if (!ch || !subLesson || this.completing()) return;

    const index = this.currentIndex();
    const previousSet = this.completedSet();

    this.completedSet.update((set) => {
      const newSet = new Set(set);
      newSet.add(index);
      return newSet;
    });

    if (index < ch.lessons.length - 1) {
      this.currentIndex.set(index + 1);
    } else {
      this.studyComplete.set(true);
    }

    this.completing.set(true);

    this.progressApi
      .completeLesson(ch._id, index)
      .pipe(
        finalize(() => this.completing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => undefined,
        error: (err: Error) => {
          this.completedSet.set(previousSet);
          this.currentIndex.set(index);
          this.studyComplete.set(false);
          this.toast.error(err.message);
        },
      });
  }

  protected getChapterTitle(chapter: Chapter): string {
    return this.isArabicMode() && chapter.titleAR ? chapter.titleAR : chapter.title;
  }

  protected getChapterDescription(chapter: Chapter): string {
    return this.isArabicMode() && chapter.descriptionAR ? chapter.descriptionAR : chapter.description;
  }

  protected getSubLessonTitle(index: number): string {
    const subLesson = this.chapter()?.lessons[index];
    if (!subLesson) return '';
    return this.isArabicMode() && subLesson.titleAR ? subLesson.titleAR : subLesson.title;
  }

  protected getCurrentSubLessonTitle(): string {
    const subLesson = this.currentSubLesson();
    if (!subLesson) return '';
    return this.isArabicMode() && subLesson.titleAR ? subLesson.titleAR : subLesson.title;
  }

  protected getCurrentSubLessonContent(): string {
    const subLesson = this.currentSubLesson();
    if (!subLesson) return '';
    return this.isArabicMode() && subLesson.contentAR ? subLesson.contentAR : subLesson.content;
  }

  protected getCurrentImage(chapter: Chapter): string {
    return this.currentSubLesson()?.image || chapter.image;
  }

  protected getTextDirection(): 'rtl' | 'ltr' {
    return this.isArabicMode() ? 'rtl' : 'ltr';
  }

  protected quizRoute(chapter: Chapter): string {
    return `/quiz/chapter/${encodeURIComponent(chapter.title)}`;
  }
}
