
const fs = require("fs");

// Home TS
let tsPath = "src/app/features/home/pages/home-page.component.ts";
let t = fs.readFileSync(tsPath, "utf8");
if (!t.includes("TranslatePipe")) {
  t = t.replace("import { AuthService } from ", "import { I18nService } from \"../../../core/services/i18n.service\";\nimport { TranslatePipe } from \"../../../core/pipes/translate.pipe\";\nimport { AuthService } from ");
  t = t.replace("imports: [RouterLink],", "imports: [RouterLink, TranslatePipe],");
  t = t.replace("currentUser = this.authService.currentUser;", "currentUser = this.authService.currentUser;\n  protected i18n = inject(I18nService);");
  fs.writeFileSync(tsPath, t, "utf8");
}
console.log("Updated Home TS");

// Home HTML
let htmlPath = "src/app/features/home/pages/home-page.component.html";
let s = fs.readFileSync(htmlPath, "utf8");
s = s.replace(/<p class=\"loading-text\">Loading dashboard\.\.\.<\/p>/g, "<p class=\"loading-text\">{{ \x27home.loading\x27 | translate }}</p>");
s = s.replace(/<h1 class=\"welcome-title\">Welcome back, /g, "<h1 class=\"welcome-title\">{{ \x27home.welcome\x27 | translate }} ");
s = s.replace(/<p class=\"welcome-subtitle\">Your driving learning dashboard.+<\/p>/g, "<p class=\"welcome-subtitle\">{{ \x27home.subtitle\x27 | translate }}</p>");
s = s.replace(/<h3 class=\"action-title\">Start Learning<\/h3>/g, "<h3 class=\"action-title\">{{ \x27home.startLearning\x27 | translate }}</h3>");
s = s.replace(/<p class=\"action-desc\">Begin your lessons on traffic rules and signs\.<\/p>/g, "<p class=\"action-desc\">{{ \x27home.startLearningDesc\x27 | translate }}</p>");
s = s.replace(/<h3 class=\"action-title\">Practice Quizzes<\/h3>/g, "<h3 class=\"action-title\">{{ \x27home.practiceQuizzes\x27 | translate }}</h3>");
s = s.replace(/<p class=\"action-desc\">Test your knowledge with exam-style questions\.<\/p>/g, "<p class=\"action-desc\">{{ \x27home.practiceQuizzesDesc\x27 | translate }}</p>");
s = s.replace(/<h3 class=\"action-title\">View Progress<\/h3>/g, "<h3 class=\"action-title\">{{ \x27home.viewProgress\x27 | translate }}</h3>");
s = s.replace(/<p class=\"action-desc\">Check your readiness for the real driving test\.<\/p>/g, "<p class=\"action-desc\">{{ \x27home.viewProgressDesc\x27 | translate }}</p>");
s = s.replace(/<h3 class=\"action-title\">Ask AI Tutor<\/h3>/g, "<h3 class=\"action-title\">{{ \x27home.askAiTutor\x27 | translate }}</h3>");
s = s.replace(/<p class=\"action-desc\">Get immediate answers to your driving questions\.<\/p>/g, "<p class=\"action-desc\">{{ \x27home.askAiTutorDesc\x27 | translate }}</p>");
s = s.replace(/<h3 class=\"action-title\">Admin Dashboard<\/h3>/g, "<h3 class=\"action-title\">{{ \x27home.adminDashboard\x27 | translate }}</h3>");
s = s.replace(/<p class=\"action-desc\">Manage users, lessons, and system content\.<\/p>/g, "<p class=\"action-desc\">{{ \x27home.adminDashboardDesc\x27 | translate }}</p>");
fs.writeFileSync(htmlPath, s, "utf8");
console.log("Updated Home HTML");

