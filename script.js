
const fs = require("fs");
let s = fs.readFileSync("src/app/features/auth/pages/login-page.component.html", "utf8");
s = s.replace(/<h2>Welcome Back,<br>Driver!<\/h2>/g, "<h2 [innerHTML]=\"\x27auth.welcomeBack\x27 | translate\"></h2>");
s = s.replace(/<p>Continue your journey.+(?=<\/p>)<\/p>/g, "<p>{{ \x27auth.continueJourney\x27 | translate }}</p>");
s = s.replace(/Rich lessons across 5 chapters/g, "{{ \x27auth.richLessons\x27 | translate }}");
s = s.replace(/AI explains every mistake you make/g, "{{ \x27auth.aiExplains\x27 | translate }}");
s = s.replace(/Real exam-style quiz questions/g, "{{ \x27auth.realExam\x27 | translate }}");
s = s.replace(/Visual progress tracking/g, "{{ \x27auth.visualProgress\x27 | translate }}");
s = s.replace(/<span class=\"auth-brand-text\">DriveWise<\/span>/g, "<span class=\"auth-brand-text\">{{ \x27brand\x27 | translate }}</span>");
s = s.replace(/<h2>Sign In<\/h2>/g, "<h2>{{ \x27auth.signInBtn\x27 | translate }}</h2>");
s = s.replace(/No account\? <a/g, "{{ \x27auth.noAccount\x27 | translate }} <a");
s = s.replace(/Register free<\/a>/g, "{{ \x27auth.registerFree\x27 | translate }}</a>");
s = s.replace(/<label for=\"email\" class=\"field-label\">Email Address<\/label>/g, "<label for=\"email\" class=\"field-label\">{{ \x27auth.email\x27 | translate }}</label>");
s = s.replace(/placeholder=\"user@example\.com\"/g, "[placeholder]=\"\x27user@example.com\x27\"");
s = s.replace(/<label for=\"password\" class=\"field-label\">Password<\/label>/g, "<label for=\"password\" class=\"field-label\">{{ \x27auth.password\x27 | translate }}</label>");
s = s.replace(/<span>Signing in\.\.\.<\/span>/g, "<span>{{ \x27auth.signingIn\x27 | translate }}</span>");
s = s.replace(/<span>Sign In<\/span>/g, "<span>{{ \x27auth.signInBtn\x27 | translate }}</span>");
s = s.replace(/<span>Email is required<\/span>/g, "<span>{{ \x27auth.emailReq\x27 | translate }}</span>");
s = s.replace(/<span>Invalid email format<\/span>/g, "<span>{{ \x27auth.emailInv\x27 | translate }}</span>");
s = s.replace(/<span>Password is required<\/span>/g, "<span>{{ \x27auth.pwdReq1\x27 | translate }}</span>");
fs.writeFileSync("src/app/features/auth/pages/login-page.component.html", s, "utf8");
console.log("Done html");

