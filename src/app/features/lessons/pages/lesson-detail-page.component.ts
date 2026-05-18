import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Chapter, NextChapterRef } from '../../../core/models/lesson.models';
import { LessonBookmark } from '../../../core/models/bookmark.models';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';
import { LessonBookmarkApiService } from '../../../core/services/lesson-bookmark-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';

type SubStatus = 'completed' | 'current' | 'upcoming';

const MIN_PER_SUBLESSON = 2;

@Component({
  selector: 'app-lesson-detail-page',
  imports: [RouterLink, TranslatePipe, LowerCasePipe],
  templateUrl: './lesson-detail-page.component.html',
  styleUrl: './lesson-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lessonApi = inject(LessonApiService);
  private readonly progressApi = inject(ProgressApiService);
  private readonly bookmarksApi = inject(LessonBookmarkApiService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly minutesPerSubLesson = MIN_PER_SUBLESSON;

  protected readonly loading = signal(true);
  protected readonly chapter = signal<Chapter | null>(null);
  protected readonly completedSet = signal<Set<number>>(new Set());
  protected readonly currentIndex = signal(0);
  protected readonly completing = signal(false);
  protected readonly studyComplete = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly nextChapter = signal<NextChapterRef | null>(null);
  protected readonly bookmarks = signal<LessonBookmark[]>([]);
  protected readonly bookmarkBusy = signal(false);
  protected readonly showBookmarksPanel = signal(false);

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

  protected readonly currentBookmarkId = computed(() => {
    const ch = this.chapter();
    if (!ch) return null;
    const idx = this.currentIndex();
    return this.bookmarks().find(b => b.chapterId === ch._id && b.subLessonIndex === idx)?._id ?? null;
  });

  protected readonly isCurrentBookmarked = computed(() => this.currentBookmarkId() !== null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadData(id);
  }

  private loadData(id: string): void {
    this.loading.set(true);

    forkJoin({
      chapter: this.lessonApi.getLesson(id),
      progress: this.progressApi.getLessonProgress(),
      bookmarks: this.bookmarksApi.list(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ chapter, progress, bookmarks }) => {
        this.chapter.set(chapter);
        this.bookmarks.set(bookmarks);
        this.reviewing.set(false);

        const completedIndexes = progress.completedLessons
          .filter((entry) => entry.chapterId === chapter._id)
          .map((entry) => entry.subLessonIndex);
        this.completedSet.set(new Set(completedIndexes));

        const allDone =
          chapter.lessons.length > 0 && completedIndexes.length === chapter.lessons.length;

        if (allDone) {
          this.currentIndex.set(Math.max(0, chapter.lessons.length - 1));
          this.studyComplete.set(true);
        } else {
          const firstUnfinished = chapter.lessons.findIndex((_, idx) => !completedIndexes.includes(idx));
          this.currentIndex.set(firstUnfinished >= 0 ? firstUnfinished : 0);
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

  protected goPrevious(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
      this.studyComplete.set(false);
    }
  }

  protected next(): void {
    const ch = this.chapter();
    const subLesson = this.currentSubLesson();
    if (!ch || !subLesson || this.completing()) return;

    const index = this.currentIndex();
    const previousSet = this.completedSet();
    const wasStudyComplete = this.studyComplete();

    this.completedSet.update((set) => {
      const newSet = new Set(set);
      newSet.add(index);
      return newSet;
    });

    const isLast = index >= ch.lessons.length - 1;
    if (!isLast) {
      this.currentIndex.set(index + 1);
    }

    this.completing.set(true);

    this.progressApi
      .completeLesson(ch._id, index)
      .pipe(
        finalize(() => this.completing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.nextChapter) {
            this.nextChapter.set(res.nextChapter);
          }
          // While reviewing a finished chapter, only show completion when the
          // user actually navigates back to the last sub-lesson — ignore the
          // backend's `isChapterCompleted` flag, which is always true here.
          const allowFromBackend = !this.reviewing() && !!res.isChapterCompleted;
          if (isLast || allowFromBackend) {
            this.studyComplete.set(true);
            this.reviewing.set(false);
          }
        },
        error: (err: Error) => {
          this.completedSet.set(previousSet);
          this.currentIndex.set(index);
          this.studyComplete.set(wasStudyComplete);
          this.toast.error(err.message);
        },
      });
  }

  protected reviewChapter(): void {
    this.studyComplete.set(false);
    this.reviewing.set(true);
    this.currentIndex.set(0);
  }

  protected goToNextChapter(): void {
    const next = this.nextChapter();
    if (next) {
      this.router.navigate(['/lessons', next._id]).then(() => {
        this.studyComplete.set(false);
        this.nextChapter.set(null);
        this.loadData(next._id);
      });
    }
  }

  protected toggleBookmarksPanel(): void {
    this.showBookmarksPanel.update(v => !v);
  }

  protected toggleBookmark(): void {
    const ch = this.chapter();
    if (!ch || this.bookmarkBusy()) return;
    const idx = this.currentIndex();
    const existingId = this.currentBookmarkId();
    this.bookmarkBusy.set(true);

    if (existingId) {
      this.bookmarksApi
        .removeById(existingId)
        .pipe(
          finalize(() => this.bookmarkBusy.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: () => {
            this.bookmarks.update(list => list.filter(b => b._id !== existingId));
          },
          error: (err: Error) => this.toast.error(err.message),
        });
    } else {
      this.bookmarksApi
        .create({ chapterId: ch._id, subLessonIndex: idx })
        .pipe(
          finalize(() => this.bookmarkBusy.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (bm) => {
            this.bookmarks.update(list => [bm, ...list.filter(b => b._id !== bm._id)]);
          },
          error: (err: Error) => this.toast.error(err.message),
        });
    }
  }

  protected removeBookmark(bookmark: LessonBookmark): void {
    if (this.bookmarkBusy()) return;
    this.bookmarkBusy.set(true);
    this.bookmarksApi
      .removeById(bookmark._id)
      .pipe(
        finalize(() => this.bookmarkBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.bookmarks.update(list => list.filter(b => b._id !== bookmark._id));
        },
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  protected openBookmark(bookmark: LessonBookmark): void {
    const ch = this.chapter();
    if (ch && bookmark.chapterId === ch._id) {
      this.currentIndex.set(bookmark.subLessonIndex);
      this.studyComplete.set(false);
      this.showBookmarksPanel.set(false);
      return;
    }
    this.router.navigate(['/lessons', bookmark.chapterId]).then(() => {
      this.showBookmarksPanel.set(false);
      this.loadData(bookmark.chapterId);
      // After load, jump to the bookmarked sub-lesson once chapter is set.
      setTimeout(() => {
        this.currentIndex.set(bookmark.subLessonIndex);
        this.studyComplete.set(false);
      }, 0);
    });
  }

  protected getBookmarkTitle(bookmark: LessonBookmark): string {
    return this.isArabicMode() && bookmark.titleAR ? bookmark.titleAR : bookmark.title;
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

  protected getCurrentImage(): string {
    return this.currentSubLesson()?.image || '';
  }

  protected getCurrentVideo(): string {
    return this.currentSubLesson()?.video || '';
  }

  protected getNextChapterTitle(): string {
    const next = this.nextChapter();
    if (!next) return '';
    return this.isArabicMode() && next.titleAR ? next.titleAR : next.title;
  }

  protected getTextDirection(): 'rtl' | 'ltr' {
    return this.isArabicMode() ? 'rtl' : 'ltr';
  }

  protected isFirst(): boolean {
    return this.currentIndex() === 0;
  }

  protected isLast(): boolean {
    const total = this.totalLessons();
    return total > 0 && this.currentIndex() >= total - 1;
  }

  protected quizRoute(chapter: Chapter): string {
    const slug = chapter.chapterKey?.trim() ? chapter.chapterKey : chapter.title;
    return `/quiz/chapter/${encodeURIComponent(slug)}`;
  }
}
