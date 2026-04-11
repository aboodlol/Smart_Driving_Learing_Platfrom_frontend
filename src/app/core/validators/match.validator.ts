import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function matchValidator(controlName: string, matchingControlName: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const control = formGroup.get(controlName);
    const matchingControl = formGroup.get(matchingControlName);

    if (!control || !matchingControl) {
      return null;
    }

    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ ...matchingControl.errors, mismatch: true });
      return { mismatch: true };
    }

    if (matchingControl.errors?.['mismatch']) {
      const { mismatch, ...remainingErrors } = matchingControl.errors;
      matchingControl.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
    }

    return null;
  };
}
