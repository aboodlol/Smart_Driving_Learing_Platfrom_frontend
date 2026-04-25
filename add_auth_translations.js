
const fs = require("fs");

let enPath = "public/i18n/en.json";
let arPath = "public/i18n/ar.json";

let enData = JSON.parse(fs.readFileSync(enPath, "utf8"));
let arData = JSON.parse(fs.readFileSync(arPath, "utf8"));

// ── Auth Translations ──
const authEn = {
  "welcomeBack": "Welcome Back,<br>Driver!",
  "continueJourney": "Continue your journey to becoming a confident, safe driver. Your progress is waiting for you.",
  "richLessons": "Rich lessons across 5 chapters",
  "aiExplains": "AI explains every mistake you make",
  "realExam": "Real exam-style quiz questions",
  "visualProgress": "Visual progress tracking",
  "noAccount": "No account?",
  "registerFree": "Register free",
  "email": "Email Address",
  "password": "Password",
  "signInBtn": "Sign In",
  "signingIn": "Signing in...",
  "startJourney": "Start Your <br>Journey",
  "joinThousands": "Join thousands of learners mastering the rules of the road with DriveWise.",
  "comprehensiveLessons": "Comprehensive interactive lessons",
  "aiPowered": "AI-powered personalized tutoring",
  "mockExams": "Mock exams to test your knowledge",
  "detailedAnalytics": "Detailed analytics and performance tracking",
  "createAccount": "Create Account",
  "haveAccount": "Already have an account?",
  "signInLink": "Sign in",
  "fullName": "Full Name",
  "createBtn": "Create Account",
  "creating": "Creating..."
};

const authAr = {
  "welcomeBack": "مرحباً بك مجدداً، <br>أيها السائق!",
  "continueJourney": "واصل رحلتك لتصبح سائقاً واثقاً وآمناً. تقدمك في انتظارك.",
  "richLessons": "دروس غنية عبر 5 فصول",
  "aiExplains": "الذكاء الاصطناعي يشرح كل خطأ تقع فيه",
  "realExam": "أسئلة اختبار تحاكي الامتحان الحقيقي",
  "visualProgress": "تتبع تقدمك بشكل مرئي",
  "noAccount": "ليس لديك حساب؟",
  "registerFree": "سجل مجاناً",
  "email": "البريد الإلكتروني",
  "password": "كلمة المرور",
  "signInBtn": "تسجيل الدخول",
  "signingIn": "جاري الدخول...",
  "startJourney": "ابدأ رحلتك",
  "joinThousands": "انضم إلى آلاف المتعلمين الذين يتقنون قواعد الطريق عبر تطبيقنا.",
  "comprehensiveLessons": "دروس تفاعلية شاملة",
  "aiPowered": "تدريس مخصص مدعوم بالذكاء الاصطناعي",
  "mockExams": "امتحانات تجريبية لاختبار معلوماتك",
  "detailedAnalytics": "تحليلات مفصلة وتتبع الأداء",
  "createAccount": "إنشاء حساب",
  "haveAccount": "لديك حساب بالفعل؟",
  "signInLink": "تسجيل الدخول",
  "fullName": "الاسم الكامل",
  "createBtn": "إنشاء الحساب",
  "creating": "جاري الإنشاء..."
};

enData.auth = authEn;
arData.auth = authAr;

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), "utf8");
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), "utf8");
console.log("Auth translations added!");

