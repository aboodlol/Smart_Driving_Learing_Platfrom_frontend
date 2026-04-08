import { Pipe, PipeTransform } from '@angular/core';
import { UserRole } from '../models/auth.models';

@Pipe({
  name: 'userRole',
})
export class UserRolePipe implements PipeTransform {
  transform(role: UserRole | null | undefined): string {
    if (!role) {
      return 'Guest';
    }

    return role === 'admin' ? 'Administrator' : 'Student';
  }
}
