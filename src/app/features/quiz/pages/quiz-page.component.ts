import { LowerCasePipe, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { QuizQuestion } from '../../../core/models/quiz.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';
import { QuizApiService } from '../../../core/services/quiz-api.service';
import { getChapterMeta } from '../../../core/utils/chapter-meta';

import { Type } from '@angular/core';

interface QuizChapterCard {
  chapterKey: string;
  chapterTitle: string;
  chapterTitleAR?: string;
  description: string;
  descriptionAR: string;
  questionCount: number;
  index: number;
  accent: 'teal' | 'amber' | 'info' | 'success' | 'error';
  icon: Type<unknown>;
}

interface BilingualText {
  en: string;
  ar: string;
}

const CHAPTER_DESCRIPTION_MAP: Record<string, BilingualText> = {
  'basic driving skills': {
    en: 'Core vehicle control, observation, and safe driving habits.',
    ar: 'مهارات التحكم الأساسية بالمركبة والملاحظة وعادات القيادة الآمنة.',
  },
  'traffic signs': {
    en: 'Recognize and apply warning, regulatory, and guidance signs correctly.',
    ar: 'التعرف على الشواخص التحذيرية والتنظيمية والإرشادية وتطبيقها بشكل صحيح.',
  },
  'road priorities and right of way': {
    en: 'Right-of-way rules at intersections, roundabouts, and merging lanes.',
    ar: 'قواعد حق المرور عند التقاطعات والدوارات ومناطق الاندماج.',
  },
  'speed limits and safe following': {
    en: 'Speed limits and safe following distances in all conditions.',
    ar: 'حدود السرعة القانونية ومسافة الأمان في كل الظروف.',
  },
  'seat belt safety and passenger rules': {
    en: 'Seat belt requirements and key safety rules for passengers.',
    ar: 'متطلبات حزام الأمان وقواعد السلامة لجميع الركاب.',
  },
  'alcohol and driving laws': {
    en: 'Legal limits, penalties, and risks of impaired driving.',
    ar: 'الحدود القانونية والعقوبات ومخاطر القيادة تحت تأثير الكحول.',
  },
  'license categories and vehicle types': {
    en: 'License classes mapped to vehicle types and permitted privileges.',
    ar: 'فئات الرخص وأنواع المركبات المسموح بقيادتها.',
  },
  'first aid and emergency response': {
    en: 'Immediate actions for accidents and basic first aid.',
    ar: 'الإجراءات الفورية للحوادث ومبادئ الإسعافات الأولية.',
  },
  'vehicle maintenance and mechanics': {
    en: 'Maintenance checks and basic mechanical safety knowledge.',
    ar: 'فحوصات الصيانة وأساسيات السلامة الميكانيكية.',
  },
};

const ROTATION: { accent: QuizChapterCard['accent']; icon: string }[] = [];

@Component({
  selector: 'app-quiz-page',
  imports: [RouterLink, TranslatePipe, LowerCasePipe, NgComponentOutlet],
  templateUrl: './quiz-page.component.html',
  styleUrl: './quiz-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizPageComponent {
  private readonly quizApi = inject(QuizApiService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly chapters = signal<QuizChapterCard[]>([]);
  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');
  protected readonly hasChapters = computed(() => this.chapters().length > 0);
  protected readonly totalQuestions = computed(() =>
    this.chapters().reduce((sum, c) => sum + c.questionCount, 0),
  );

  constructor() {
    this.quizApi
      .getAllQuizzes()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (questions) => {
          this.loadFailed.set(false);
          this.chapters.set(this.buildChapterCards(questions));
        },
        error: () => {
          this.loadFailed.set(true);
          this.chapters.set([]);
        },
      });
  }

  protected getChapterTitle(chapter: QuizChapterCard): string {
    return this.isArabicMode() && chapter.chapterTitleAR
      ? chapter.chapterTitleAR
      : chapter.chapterTitle;
  }

  protected getChapterDescription(chapter: QuizChapterCard): string {
    return this.isArabicMode() ? chapter.descriptionAR : chapter.description;
  }

  protected getTextDirection(chapter: QuizChapterCard): 'rtl' | 'ltr' {
    if (!this.isArabicMode()) return 'ltr';
    return chapter.chapterTitleAR ? 'rtl' : 'ltr';
  }

  protected indexLabel(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  protected getEmptyTitle(): string {
    if (this.isArabicMode()) {
      return this.loadFailed()
        ? 'تعذر تحميل اختبارات الفصول حالياً.'
        : 'لا توجد اختبارات فصول متاحة حالياً.';
    }
    return this.loadFailed()
      ? 'Unable to load chapter quizzes right now.'
      : 'No chapter quizzes are available right now.';
  }

  protected getEmptyDescription(): string {
    if (this.isArabicMode()) {
      return this.loadFailed()
        ? 'يرجى التحقق من اتصال الخادم ثم المحاولة مرة أخرى.'
        : 'ستظهر اختبارات الفصول هنا عندما تصبح بيانات الاختبارات متاحة.';
    }
    return this.loadFailed()
      ? 'Please check backend connectivity and try again.'
      : 'Chapter quiz cards will appear here when quiz data is available.';
  }

  protected getEmptyDirection(): 'rtl' | 'ltr' {
    return this.isArabicMode() ? 'rtl' : 'ltr';
  }

  private buildChapterCards(questions: QuizQuestion[]): QuizChapterCard[] {
    const map = new Map<string, QuizChapterCard>();

    for (const q of questions) {
      const title = this.normalize(q.chapterTitle);
      if (!title) continue;

      const key = this.normalize(q.chapterKey) ?? title;
      const titleAR = this.normalize(q.chapterTitleAR);
      const existing = map.get(key);
      if (existing) {
        existing.questionCount += 1;
        if (!existing.chapterTitleAR && titleAR) existing.chapterTitleAR = titleAR;
        continue;
      }

      const desc = this.fallbackDescription(title);
      const order = map.size;
      const meta = getChapterMeta(title, order);
      map.set(key, {
        chapterKey: key,
        chapterTitle: title,
        chapterTitleAR: titleAR,
        description: desc.en,
        descriptionAR: desc.ar,
        questionCount: 1,
        index: order,
        accent: meta.accent,
        icon: meta.icon,
      });
    }

    return Array.from(map.values());
  }

  private fallbackDescription(title: string): BilingualText {
    const key = title.trim().toLowerCase().replace(/\s+/g, ' ');
    return (
      CHAPTER_DESCRIPTION_MAP[key] ?? {
        en: 'Practice key questions for this chapter.',
        ar: 'تدرّب على الأسئلة الأساسية لهذا الفصل.',
      }
    );
  }

  private normalize(value?: string | null): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
