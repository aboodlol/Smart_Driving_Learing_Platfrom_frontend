import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminUser, UpdateUserPayload } from '../../../core/models/admin.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-users-page.component.html',
  styleUrl: './admin-users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPageComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly editForm = signal<UpdateUserPayload>({});
  protected readonly searchQuery = signal('');

  ngOnInit(): void {
    this.loadUsers();
  }

  protected get filteredUsers(): AdminUser[] {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }

  protected startEdit(user: AdminUser): void {
    this.editingId.set(user._id);
    this.editForm.set({ name: user.name, email: user.email, role: user.role });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editForm.set({});
  }

  protected saveEdit(userId: string): void {
    const payload = this.editForm();
    this.api
      .updateUser(userId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.users.update((list) =>
            list.map((u) => (u._id === userId ? updated : u)),
          );
          this.editingId.set(null);
          this.toast.success('User updated successfully.');
        },
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  protected deleteUser(user: AdminUser): void {
    if (!confirm(`Delete user "${user.name}" (${user.email})? This cannot be undone.`)) {
      return;
    }
    this.api
      .deleteUser(user._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.users.update((list) => list.filter((u) => u._id !== user._id));
          this.toast.success('User deleted.');
        },
        error: (err: Error) => this.toast.error(err.message),
      });
  }

  protected formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private loadUsers(): void {
    this.api
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.users.set(data);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
