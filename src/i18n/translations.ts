/**
 * AirQuiz — Translation dictionary (EN + AR).
 * Add keys here as features grow. Fallback is always English.
 */

export const translations = {
    en: {
        // Landing
        'landing.title': 'AirQuiz',
        'landing.subtitle': 'Real-time classroom assessment platform',
        'landing.student': 'I am a Student',
        'landing.studentDesc': 'Join a quiz session',
        'landing.teacher': 'I am a Teacher',
        'landing.teacherDesc': 'Manage & launch exams',
        'landing.about': 'About this project',
        // Join page
        'join.title': 'Join a quiz',
        'join.subtitle': 'Enter the code your teacher is showing.',
        'join.code': 'Room code',
        'join.codeHint': '6 digits, shown on the teacher\'s screen',
        'join.nearby': 'Open rooms',
        'join.firstName': 'First name',
        'join.lastName': 'Last name',
        'join.email': 'Email (optional)',
        'join.group': 'Group',
        'join.submit': 'Join',
        'join.connecting': 'Connecting…',
        'join.teacher': 'Teacher? Open the dashboard',
        'join.offline': 'Not connected to the classroom network',
        'join.restored': 'Welcome back — your details were filled in.',


        // Student Login
        'login.firstName': 'First Name',
        'login.lastName': 'Last Name',
        'login.group': 'Group',
        'login.room': 'Room Code',
        'login.join': 'Join Room',

        // Waiting Room
        'waiting.back': 'Back to the join page',
        'waiting.keepOpen': 'Keep this page open. The quiz starts by itself when your teacher begins.',
        'waiting.connecting': 'Connecting to Room...',
        'waiting.pleaseWait': 'Please wait...',
        'waiting.youAreIn': 'You are in!',
        'waiting.waitingForHost': 'Waiting for host to start...',
        'waiting.errorJoining': 'Error Joining Room',

        // Quiz Active
        'quiz.saving': 'Saving…',
        'quiz.next': 'Next',
        'quiz.previous': 'Previous',
        'quiz.finish': 'Finish',
        'quiz.flag': 'Flag for review',
        'quiz.unflag': 'Unflag question',
        'quiz.connectionLost': 'Connection Lost',
        'quiz.reconnecting': 'Reconnecting automatically...',
        'quiz.answersSaved': 'Your answers are saved locally.',
        'quiz.loading': 'Loading Exam...',
        'quiz.examEnded': 'Exam Ended',
        'quiz.timeUp': "Time is up! Your answers are locked.",
        'quiz.examFinished': 'Exam Finished',
        'quiz.submitted': 'You have submitted your exam.',
        'quiz.timeExtended': 'Time Extended',
        'quiz.moreTime': 'The instructor has added more time.',

        // Locked / Done
        'done.goodJob': 'Good Job!',
        'done.completed': "You've completed the exam. We've securely saved all your answers.",
        'done.status': 'Status',
        'done.submitted': 'Submitted',
        'done.waitForResults': 'Please wait for the instructor to reveal the results.',

        // Results
        'results.complete': 'Quiz Complete!',
        'results.greatJob': 'Great job,',
        'results.yourScore': 'Your Final Score',
        'results.correct': 'correct',
        'results.viewDetails': 'View Answer Details',
        'results.hideDetails': 'Hide Details',
        'results.correctAnswer': 'Correct:',
        'results.yourAnswer': 'Your answer:',
        'results.noAnswer': 'No answer',
        'results.thanks': "Thank you for participating in today's quiz session!",
        'results.backHome': 'Back to Home',

        // About
        'about.title': 'About AirQuiz',
        'about.subtitle': 'The Story Behind the Platform',
        'about.fieldTest': 'The Field Test',
        'about.fieldTestDesc': 'This is a battle-tested system, not just a prototype.',
        'about.duration': 'Duration',
        'about.durationVal': 'Full week of continuous operations',
        'about.scale': 'Scale',
        'about.scaleVal': '289+ real students (500+ by June 2026)',
        'about.infra': 'Infrastructure',
        'about.infraVal': 'Dedicated router, closed LAN, no internet',
        'about.perf': 'Performance',
        'about.perfVal': '20+ simultaneous connections, zero crashes',
        'about.developer': 'Developer',
        'about.openSource': 'Open Source',
        'about.openSourceDesc': 'This project is fully open-source and available for community contribution.',

        // Common
        'common.answered': 'answered',
    },

    ar: {
        // Landing
        'landing.title': 'AirQuiz',
        'landing.subtitle': 'منصة التقييم التفاعلي في الفصل الدراسي',
        'landing.student': 'أنا طالب',
        'landing.studentDesc': 'انضم إلى جلسة اختبار',
        'landing.teacher': 'أنا أستاذ',
        'landing.teacherDesc': 'إدارة وإطلاق الامتحانات',
        'landing.about': 'حول هذا المشروع',
        // Join page
        'join.title': 'الانضمام إلى اختبار',
        'join.subtitle': 'أدخل الرمز الذي يعرضه الأستاذ.',
        'join.code': 'رمز القاعة',
        'join.codeHint': '6 أرقام تظهر على شاشة الأستاذ',
        'join.nearby': 'القاعات المفتوحة',
        'join.firstName': 'الاسم',
        'join.lastName': 'اللقب',
        'join.email': 'البريد الإلكتروني (اختياري)',
        'join.group': 'الفوج',
        'join.submit': 'انضمام',
        'join.connecting': 'جارٍ الاتصال…',
        'join.teacher': 'أستاذ؟ افتح لوحة التحكم',
        'join.offline': 'غير متصل بشبكة القسم',
        'join.restored': 'مرحبًا بعودتك — تم ملء بياناتك.',


        // Student Login
        'login.firstName': 'الاسم',
        'login.lastName': 'اللقب',
        'login.group': 'الفوج',
        'login.room': 'رمز الغرفة',
        'login.join': 'انضم للغرفة',

        // Waiting Room
        'waiting.back': 'العودة إلى صفحة الانضمام',
        'waiting.keepOpen': 'أبقِ هذه الصفحة مفتوحة. سيبدأ الاختبار تلقائيًا عندما يبدأه الأستاذ.',
        'waiting.connecting': 'جارٍ الاتصال بالغرفة...',
        'waiting.pleaseWait': 'يرجى الانتظار...',
        'waiting.youAreIn': '!أنت في الغرفة',
        'waiting.waitingForHost': 'في انتظار بدء الأستاذ...',
        'waiting.errorJoining': 'خطأ في الانضمام للغرفة',

        // Quiz Active
        'quiz.saving': 'جارٍ الحفظ…',
        'quiz.next': 'التالي',
        'quiz.previous': 'السابق',
        'quiz.finish': 'إنهاء',
        'quiz.flag': 'تحديد للمراجعة',
        'quiz.unflag': 'إلغاء التحديد',
        'quiz.connectionLost': 'انقطع الاتصال',
        'quiz.reconnecting': 'جاري إعادة الاتصال تلقائياً...',
        'quiz.answersSaved': 'إجاباتك محفوظة محلياً.',
        'quiz.loading': 'جارٍ تحميل الامتحان...',
        'quiz.examEnded': 'انتهى الامتحان',
        'quiz.timeUp': 'انتهى الوقت! تم تأمين إجاباتك.',
        'quiz.examFinished': 'تم إنهاء الامتحان',
        'quiz.submitted': 'تم تقديم امتحانك.',
        'quiz.timeExtended': 'تم تمديد الوقت',
        'quiz.moreTime': 'أضاف الأستاذ وقتاً إضافياً.',

        // Locked / Done
        'done.goodJob': '!أحسنت',
        'done.completed': 'لقد أكملت الامتحان. تم حفظ جميع إجاباتك بأمان.',
        'done.status': 'الحالة',
        'done.submitted': 'تم التقديم',
        'done.waitForResults': 'يرجى الانتظار حتى يكشف الأستاذ عن النتائج.',

        // Results
        'results.complete': '!اكتمل الاختبار',
        'results.greatJob': 'أحسنت يا',
        'results.yourScore': 'نتيجتك النهائية',
        'results.correct': 'صحيحة',
        'results.viewDetails': 'عرض تفاصيل الإجابات',
        'results.hideDetails': 'إخفاء التفاصيل',
        'results.correctAnswer': ':الإجابة الصحيحة',
        'results.yourAnswer': ':إجابتك',
        'results.noAnswer': 'لم تُجب',
        'results.thanks': '!شكراً لمشاركتك في جلسة الاختبار اليوم',
        'results.backHome': 'العودة للرئيسية',

        // About
        'about.title': 'حول AirQuiz',
        'about.subtitle': 'القصة وراء المنصة',
        'about.fieldTest': 'مرحلة الاختبار الميداني',
        'about.fieldTestDesc': 'هذا ليس مجرد نموذج أولي، بل نظام أثبت كفاءته في الميدان.',
        'about.duration': 'المدة',
        'about.durationVal': 'أسبوع كامل من العمليات المستمرة',
        'about.scale': 'المستخدمون',
        'about.scaleVal': 'أكثر من 289 طالبًا (500+ بحلول جوان 2026)',
        'about.infra': 'البنية التحتية',
        'about.infraVal': 'راوتر مخصص، شبكة محلية مغلقة، بدون إنترنت',
        'about.perf': 'الأداء',
        'about.perfVal': 'أكثر من 20 اتصالاً متزامنًا، بدون أي أعطال',
        'about.developer': 'المطور',
        'about.openSource': 'مفتوح المصدر',
        'about.openSourceDesc': 'هذا المشروع متاح بالكامل للمساهمة والتطوير.',

        // Common
        'common.answered': 'أجاب',
    }
} as const;

export type TranslationKey = keyof typeof translations['en'];
