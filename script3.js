
const fs = require("fs");
let p = "src/app/features/auth/pages/register-page.component.ts";
let t = fs.readFileSync(p, "utf8");
if (!t.includes("TranslatePipe")) {
  t = t.replace("import { AuthService } from ", "import { I18nService } from \"../../../core/services/i18n.service\";\nimport { TranslatePipe } from \"../../../core/pipes/translate.pipe\";\nimport { AuthService } from ");
  t = t.replace("MatIconModule,", "MatIconModule,\n    TranslatePipe,");
  t = t.replace("protected readonly loading = signal(false);", "protected readonly loading = signal(false);\n  protected readonly i18n = inject(I18nService);");
  fs.writeFileSync(p, t, "utf8");
}
console.log("Done ts");

let htmlPath = "src/app/features/auth/pages/register-page.component.html";
let s = fs.readFileSync(htmlPath, "utf8");
s = s.replace(/<h2>Start Your <br>Journey<\/h2>/g, "<h2 [innerHTML]=\"\x27auth.startJourney\x27 | translate\"></h2>");
s = s.replace(/<p>Join thousands of learners.+<\/p>/g, "<p>{{ \x27auth.joinThousands\x27 | translate }}</p>");
s = s.replace(/Comprehensive interactive lessons/g, "{{ \x27auth.comprehensiveLessons\x27 | translate }}");
s = s.replace(/AI-powered personalized tutoring/g, "{{ \x27auth.aiPowered\x27 | translate }}");
s = s.replace(/Mock exams to test your knowledge/g, "{{ \x27auth.mockExams\x27 | translate }}");
s = s.replace(/Detailed analytics and performance tracking/g, "{{ \x27auth.detailedAnalytics\x27 | translate }}");
s = s.replace(/<span class=\"auth-brand-text\">DriveWise<\/span>/g, "<span class=\"auth-brand-text\">{{ \x27brand\x27 | translate }}</span>");
s = s.replace(/<h2>Create Account<\/h2>/g, "<h2>{{ \x27auth.createAccount\x27 | translate }}</h2>");
s = s.replace(/Already have an account\? <a/g, "{{ \x27auth.haveAccount\x27 | translate }} <a");
s = s.replace(/Sign in<\/a>/g, "{{ \x27auth.signInLink\x27 | translate }}</a>");
s = s.replace(/<label for=\"name\" class=\"field-label\">Full Name<\/label>/g, "<label for=\"name\" class=\"field-label\">{{ \x27auth.fullName\x27 | translate }}</label>");
s = s.replace(/placeholder=\"Alex Driver\"/g, "[placeholder]=\"\x27Alex Driver\x27\"");
s = s.replace(/<label for=\"email\" class=\"field-label\">Email Address<\/label>/g, "<label for=\"email\" class=\"field-label\">{{ \x27auth.email\x27 | translate }}</label>");
s = s.replace(/placeholder=\"user@example\.com\"/g, "[placeholder]=\"\x27user@example.com\x27\"");
s = s.replace(/<label for=\"password\" class=\"field-label\">Password<\/label>/g, "<label for=\"password\" class=\"field-label\">{{ \x27auth.password\x27 | translate }}</label>");
s = s.replace(/<span>Creating\.\.\.<\/span>/g, "<span>{{ \x27auth.creating\x27 | translate }}</span>");
s = s.replace(/<span>Create Account<\/span>/g, "<span>{{ \x27auth.createBtn\x27 | translate }}</span>");
s = s.replace(/<span>Name is required<\/span>/g, "<span>{{ \x27auth.nameReq\x27 | translate }}</span>");
s = s.replace(/<span>Email is required<\/span>/g, "<span>{{ \x27auth.emailReq\x27 | translate }}</span>");
s = s.replace(/<span>Invalid email format<\/span>/g, "<span>{{ \x27auth.emailInv\x27 | translate }}</span>");
s = s.replace(/<span>Password is required<\/span>/g, "<span>{{ \x27auth.pwdReq1\x27 | translate }}</span>");
s = s.replace(/<span>Password must be at least 6 characters<\/span>/g, "<span>{{ \x27auth.pwdMin\x27 | translate }}</span>");
fs.writeFileSync(htmlPath, s, "utf8");
console.log("Done html");

