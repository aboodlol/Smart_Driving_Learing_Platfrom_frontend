import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { HomeOverview } from '../models/home.models';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  getOverview(): Observable<HomeOverview> {
    const data: HomeOverview = {
      title: 'Welcome to Smart Driving Learning',
      subtitle: 'Your journey to becoming a safe and confident driver starts here.',
      actions: [
        {
          title: 'Start Learning',
          description: 'Begin your lessons on traffic rules and signs.',
          buttonLabel: 'Start Learning',
          route: '/home',
        },
        {
          title: 'Take Quiz',
          description: 'Test your knowledge with quick interactive quizzes.',
          buttonLabel: 'Start Quiz',
          route: '/home',
        },
        {
          title: 'View Progress',
          description: 'Track your learning journey and achievements.',
          buttonLabel: 'View Progress',
          route: '/home',
        },
      ],
      progress: [
        {
          label: 'Lessons Progress',
          value: 35,
          ctaLabel: 'Continue Lessons',
        },
        {
          label: 'Quiz Progress',
          value: 20,
          ctaLabel: 'Continue Quiz',
        },
      ],
    };

    return of(data).pipe(delay(300));
  }
}
