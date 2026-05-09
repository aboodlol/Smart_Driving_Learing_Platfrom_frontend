import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Chapter } from '../../../core/models/lesson.models';
import { ChapterProgress } from '../../../core/models/progress.models';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { ProgressApiService } from '../../../core/services/progress-api.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';

type FilterKey = 'all' | 'inProgress' | 'completed' | 'notStarted';
type ChapterStatus = 'Not Started' | 'In Progress' | 'Completed';
type AccentKey = 'teal' | 'amber' | 'info' | 'success' | 'error';

interface ChapterMeta {
  icon: string;
  accent: AccentKey;
}

const CHAPTER_META: ChapterMeta[] = [
  { icon: 'directions_car', accent: 'teal' },
  { icon: 'flag', accent: 'amber' },
  { icon: 'shield', accent: 'info' },
  { icon: 'schedule', accent: 'success' },
  { icon: 'shield', accent: 'teal' },
  { icon: 'menu_book', accent: 'amber' },
  { icon: 'quiz', accent: 'error' },
  { icon: 'auto_awesome', accent: 'info' },
  { icon: 'directions_car', accent: 'success' },
];

const MIN_PER_SUBLESSON = 2;

@Component({
  selector: 'app-lessons-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './lessons-page.component.html',
  styleUrl: './lessons-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonsPageComponent {
  private readonly lessonApi = inject(LessonApiService);
  private readonly progressApi = inject(ProgressApiService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly chapters = signal<Chapter[]>([]);
  protected readonly progressMap = signal<Map<string, ChapterProgress>>(new Map());
  protected readonly filter = signal<FilterKey>('all');
  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');

  protected readonly filters: { key: FilterKey; labelKey: string }[] = [
    { key: 'all', labelKey: 'lessons.filterAll' },
    { key: 'inProgress', labelKey: 'progress.statusInProgress' },
    { key: 'completed', labelKey: 'progress.statusCompleted' },
    { key: 'notStarted', labelKey: 'progress.statusNotStarted' },
  ];

  protected readonly visibleChapters = computed(() => {
    const f = this.filter();
    const all = this.chapters();
    if (f === 'all') return all;
    return all.filter(c => {
      const status = this.statusFor(c);
      if (f === 'completed') return status === 'Completed';
      if (f === 'inProgress') return status === 'In Progress';
      return status === 'Not Started';
    });
  });

  protected readonly totalSubLessons = computed(() =>
    this.chapters().reduce((sum, c) => sum + c.lessons.length, 0),
  );

  protected readonly completedSubLessons = computed(() =>
    this.chapters().reduce((sum, c) => sum + this.completedFor(c), 0),
  );

  protected readonly overallPercent = computed(() => {
    const total = this.totalSubLessons();
    return total > 0 ? Math.round((this.completedSubLessons() / total) * 100) : 0;
  });

  protected readonly totalMinutes = computed(() => this.totalSubLessons() * MIN_PER_SUBLESSON);

  protected readonly subtitle = computed(() => {
    const chapters = this.chapters().length;
    const subs = this.totalSubLessons();
    const mins = this.totalMinutes();
    const hours = Math.floor(mins / 60);
    const remMin = mins % 60;
    if (this.isArabicMode()) {
      const study = hours > 0
        ? `${this.toArabic(hours)} ساعة${remMin ? ` و${this.toArabic(remMin)} دقيقة` : ''}`
        : `${this.toArabic(remMin)} دقيقة`;
      return `${this.toArabic(chapters)} فصول · ${this.toArabic(subs)} درسًا فرعيًا · ${study} للدراسة`;
    }
    const study = hours > 0 ? `${hours}h ${remMin ? `${remMin}m` : ''}`.trim() : `${remMin}m`;
    return `${chapters} chapters · ${subs} sub-lessons · ${study} of study`;
  });

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
          map.set(lesson.chapterId, lesson);
        }
        this.progressMap.set(map);
      });
  }

  protected setFilter(key: FilterKey): void {
    this.filter.set(key);
  }

  protected metaFor(index: number): ChapterMeta {
    return CHAPTER_META[index % CHAPTER_META.length];
  }

  protected statusFor(chapter: Chapter): ChapterStatus {
    return this.progressMap().get(chapter._id)?.status ?? 'Not Started';
  }

  protected statusKeyFor(chapter: Chapter): string {
    const status = this.statusFor(chapter);
    if (status === 'Completed') return 'progress.statusCompleted';
    if (status === 'In Progress') return 'progress.statusInProgress';
    return 'progress.statusNotStarted';
  }

  protected statusToneFor(chapter: Chapter): 'success' | 'amber' | 'neutral' {
    const status = this.statusFor(chapter);
    if (status === 'Completed') return 'success';
    if (status === 'In Progress') return 'amber';
    return 'neutral';
  }

  protected completedFor(chapter: Chapter): number {
    return this.progressMap().get(chapter._id)?.completedSubLessons ?? 0;
  }

  protected percentFor(chapter: Chapter): number {
    const total = chapter.lessons.length;
    const completed = this.completedFor(chapter);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  protected minutesFor(chapter: Chapter): number {
    return chapter.lessons.length * MIN_PER_SUBLESSON;
  }

  protected titleFor(chapter: Chapter): string {
    return this.isArabicMode() && chapter.titleAR ? chapter.titleAR : chapter.title;
  }

  protected indexLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected continueChapter = computed<Chapter | null>(() => {
    const inProgress = this.chapters().find(c => this.statusFor(c) === 'In Progress');
    if (inProgress) return inProgress;
    return this.chapters().find(c => this.statusFor(c) === 'Not Started') ?? null;
  });

  protected getTextDirection(): 'rtl' | 'ltr' {
    return this.isArabicMode() ? 'rtl' : 'ltr';
  }

  private toArabic(n: number): string {
    return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }
}
