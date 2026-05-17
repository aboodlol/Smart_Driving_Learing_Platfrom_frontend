import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminDocument } from '../../../core/models/admin.models';
import { ToastService } from '../../../core/services/toast.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-admin-documents-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './admin-documents-page.component.html',
  styleUrl: './admin-documents-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDocumentsPageComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);

  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly documents = signal<AdminDocument[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.loadDocuments();
  }

  protected triggerUpload(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.api
      .uploadDocument(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (doc) => {
          this.documents.update((list) => [doc, ...list]);
          this.uploading.set(false);
          this.toast.success(`"${doc.originalName}" uploaded successfully.`);
          input.value = '';
        },
        error: (err: Error) => {
          this.uploading.set(false);
          this.toast.error(err.message);
          input.value = '';
        },
      });
  }

  protected deleteDocument(doc: AdminDocument): void {
    if (!confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) {
      return;
    }
    this.api
      .deleteDocument(doc._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.documents.update((list) => list.filter((d) => d._id !== doc._id));
          this.toast.success('Document deleted.');
        },
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  protected formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected formatDate(dateStr: string): string {
    const locale = this.i18n.isRtl() ? 'ar' : 'en-US';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected fileIcon(mimeType: string): string {
    const m = (mimeType || '').toLowerCase();
    if (m.includes('pdf')) return 'picture_as_pdf';
    if (m.includes('word') || m.includes('document')) return 'article';
    if (m.includes('image')) return 'image';
    if (m.includes('text')) return 'description';
    return 'insert_drive_file';
  }

  protected fileTypeLabel(mimeType: string): string {
    const m = (mimeType || '').toLowerCase();
    if (m.includes('pdf')) return 'PDF';
    if (m.includes('officedocument.wordprocessingml')) return 'DOCX';
    if (m.includes('msword')) return 'DOC';
    if (m.includes('text/plain')) return 'TXT';
    const parts = m.split('/');
    return parts[1]?.toUpperCase() || 'FILE';
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getDocuments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.documents.set(data);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
