import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.open(message, ['toast-success']);
  }

  error(message: string): void {
    this.open(message, ['toast-error']);
  }

  info(message: string): void {
    this.open(message, ['toast-info']);
  }

  private open(message: string, panelClass: string[]): void {
    this.snackBar.open(message, 'Close', {
      duration: 3200,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass,
    });
  }
}
