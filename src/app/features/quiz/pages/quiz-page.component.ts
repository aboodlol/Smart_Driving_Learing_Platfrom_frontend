import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { QuizQuestion } from '../../../core/models/quiz.models';
import { ExamAttempt } from '../../../core/models/exam-attempt.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { ExamAttemptApiService } from '../../../core/services/exam-attempt-api.service';
import { I18nService } from '../../../core/services/i18n.service';
import { QuizApiService } from '../../../core/services/quiz-api.service';

interface QuizChapterCard {
  chapterKey: string;
  chapterTitle: string;
  chapterTitleAR?: string;
  description: string;
  descriptionAR: string;
  questionCount: number;
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
    en: 'Learn right-of-way rules at intersections, roundabouts, and merging lanes.',
    ar: 'فهم قواعد حق المرور عند التقاطعات والدوارات ومناطق الاندماج.',
  },
  'speed limits and safe following': {
    en: 'Use legal speed limits and maintain safe following distances in all conditions.',
    ar: 'الالتزام بحدود السرعة القانونية والحفاظ على مسافة أمان مناسبة في كل الظروف.',
  },
  'seat belt safety and passenger rules': {
    en: 'Follow seat belt requirements and key safety rules for all passengers.',
    ar: 'الالتزام بمتطلبات حزام الأمان وقواعد السلامة الأساسية لجميع الركاب.',
  },
  'alcohol and driving laws': {
    en: 'Understand legal limits, penalties, and safety risks of impaired driving.',
    ar: 'معرفة الحدود القانونية والعقوبات ومخاطر القيادة تحت تأثير الكحول.',
  },
  'license categories and vehicle types': {
    en: 'Match license classes to vehicle types and permitted driving privileges.',
    ar: 'مطابقة فئات الرخص مع أنواع المركبات وصلاحيات القيادة المسموح بها.',
  },
  'first aid and emergency response': {
    en: 'Know immediate actions for accidents, emergency calls, and basic first aid.',
    ar: 'معرفة الإجراءات الفورية للحوادث وطلب الطوارئ ومبادئ الإسعافات الأولية.',
  },
  'vehicle maintenance and mechanics': {
    en: 'Review essential maintenance checks and basic mechanical safety knowledge.',
    ar: 'مراجعة فحوصات الصيانة الضرورية وأساسيات السلامة الميكانيكية للمركبة.',
  },
};

@Component({
  selector: 'app-quiz-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './quiz-page.component.html',
  styleUrl: './quiz-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizPageComponent {
  private readonly quizApi = inject(QuizApiService);
  private readonly examAttemptApi = inject(ExamAttemptApiService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly chapters = signal<QuizChapterCard[]>([]);
  protected readonly isArabicMode = computed(() => this.i18n.currentLang() === 'ar');
  protected readonly hasChapters = computed(() => this.chapters().length > 0);
  protected readonly startingExam = signal(false);
  protected readonly checkingActive = signal(true);
  protected readonly activeAttempt = signal<ExamAttempt | null>(null);
  protected readonly hasActiveAttempt = computed(() => this.activeAttempt() !== null);

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

    this.examAttemptApi
      .getActiveExamAttempt()
      .pipe(
        finalize(() => this.checkingActive.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (attempt) => this.activeAttempt.set(attempt),
        error: () => this.activeAttempt.set(null),
      });
  }

  protected getChapterDisplayTitle(chapter: QuizChapterCard): string {
    if (this.isArabicMode()) {
      return chapter.chapterTitleAR ?? chapter.chapterTitle;
    }

    return chapter.chapterTitle;
  }

  protected getChapterDisplayDescription(chapter: QuizChapterCard): string {
    return this.isArabicMode() ? chapter.descriptionAR : chapter.description;
  }

  protected getChapterTextDirection(chapter: QuizChapterCard): 'rtl' | 'ltr' {
    if (!this.isArabicMode()) {
      return 'ltr';
    }

    return chapter.chapterTitleAR ? 'rtl' : 'ltr';
  }

  protected getEmptyStateTitle(): string {
    if (this.isArabicMode()) {
      return this.loadFailed()
        ? 'تعذر تحميل اختبارات الفصول حالياً.'
        : 'لا توجد اختبارات فصول متاحة حالياً.';
    }

    return this.loadFailed()
      ? 'Unable to load chapter quizzes right now.'
      : 'No chapter quizzes are available right now.';
  }

  protected getEmptyStateDescription(): string {
    if (this.isArabicMode()) {
      return this.loadFailed()
        ? 'يرجى التحقق من اتصال الخادم ثم المحاولة مرة أخرى.'
        : 'ستظهر اختبارات الفصول هنا عندما تصبح بيانات الاختبارات متاحة.';
    }

    return this.loadFailed()
      ? 'Please check backend connectivity and try again.'
      : 'Chapter quiz cards will appear here when quiz data is available.';
  }

  protected getEmptyStateDirection(): 'rtl' | 'ltr' {
    return this.isArabicMode() ? 'rtl' : 'ltr';
  }

  protected continueExam(): void {
    void this.router.navigateByUrl('/quiz/exam');
  }

  protected startNewExam(): void {
    if (this.startingExam()) {
      return;
    }

    this.startingExam.set(true);

    this.examAttemptApi
      .startExamAttempt()
      .pipe(
        finalize(() => this.startingExam.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/quiz/exam');
        },
        error: (err: Error) => {
          this.toast.error(err.message);
        },
      });
  }

  private buildChapterCards(questions: QuizQuestion[]): QuizChapterCard[] {
    const chapterMap = new Map<string, QuizChapterCard>();

    for (const question of questions) {
      const chapterTitle = this.normalizeText(question.chapterTitle);
      if (!chapterTitle) {
        continue;
      }

      const chapterKey = this.normalizeText(question.chapterKey) ?? chapterTitle;
      const chapterTitleAR = this.normalizeText(question.chapterTitleAR);
      const existing = chapterMap.get(chapterKey);

      if (existing) {
        existing.questionCount += 1;
        existing.chapterTitle = chapterTitle;
        if (!existing.chapterTitleAR && chapterTitleAR) {
          existing.chapterTitleAR = chapterTitleAR;
        }
        continue;
      }

      const fallbackDescription = this.getFallbackDescription(chapterTitle);
      chapterMap.set(chapterKey, {
        chapterKey,
        chapterTitle,
        chapterTitleAR,
        description: fallbackDescription.en,
        descriptionAR: fallbackDescription.ar,
        questionCount: 1,
      });
    }

    return Array.from(chapterMap.values());
  }

  private getFallbackDescription(chapterTitle: string): BilingualText {
    const chapterKey = this.normalizeChapterKey(chapterTitle);
    return (
      CHAPTER_DESCRIPTION_MAP[chapterKey] ?? {
        en: 'Practice key questions for this chapter.',
        ar: 'تدرّب على الأسئلة الأساسية لهذا الفصل.',
      }
    );
  }

  private normalizeText(value?: string | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeChapterKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
