
const fs = require("fs");

let enPath = "public/i18n/en.json";
let arPath = "public/i18n/ar.json";
let enData = JSON.parse(fs.readFileSync(enPath, "utf8"));
let arData = JSON.parse(fs.readFileSync(arPath, "utf8"));

enData.lessons = enData.lessons || {};
arData.lessons = arData.lessons || {};

enData.lessons.title = "Lessons";
arData.lessons.title = "الدروس";
enData.lessons.subtitle = "Master driving theory through structured chapters and sub-lessons.";
arData.lessons.subtitle = "أتقن نظرية القيادة من خلال فصول ودروس منظمة.";
enData.lessons.loading = "Loading lessons...";
arData.lessons.loading = "جاري تحميل الدروس...";

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), "utf8");
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), "utf8");

let tsPath = "src/app/features/lessons/pages/lessons-page.component.ts";
let t = fs.readFileSync(tsPath, "utf8");
if (!t.includes("TranslatePipe")) {
  t = t.replace("import { Title } from", "import { I18nService } from \"../../../core/services/i18n.service\";\nimport { TranslatePipe } from \"../../../core/pipes/translate.pipe\";\nimport { Title } from");
  t = t.replace("RouterLink,", "RouterLink,\n    TranslatePipe,");
  t = t.replace("private title: Title", "protected i18n = inject(I18nService);\n    private title: Title");
  fs.writeFileSync(tsPath, t, "utf8");
}

let htmlPath = "src/app/features/lessons/pages/lessons-page.component.html";
let s = fs.readFileSync(htmlPath, "utf8");
s = s.replace(/<h1 class=\"page-title\">Lessons<\/h1>/g, "<h1 class=\"page-title\">{{ \x27lessons.title\x27 | translate }}</h1>");
s = s.replace(/<p class=\"page-subtitle\">Master driving theory through structured chapters and sub-lessons\.<\/p>/g, "<p class=\"page-subtitle\">{{ \x27lessons.subtitle\x27 | translate }}</p>");
s = s.replace(/<p class=\"loading-text\">Loading lessons\.\.\.<\/p>/g, "<p class=\"loading-text\">{{ \x27lessons.loading\x27 | translate }}</p>");
s = s.replace(/lessons<\/span>/g, "{{ \x27lessons.title\x27 | translate | lowercase }}</span>");

fs.writeFileSync(htmlPath, s, "utf8");
console.log("Lessons page updated");

