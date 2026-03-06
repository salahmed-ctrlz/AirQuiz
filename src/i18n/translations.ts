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

        // Student Login
        'login.firstName': 'First Name',
        'login.lastName': 'Last Name',
        'login.group': 'Group',
        'login.room': 'Room Code',
        'login.join': 'Join Room',

        // Waiting Room
        'waiting.connecting': 'Connecting to Room...',
        'waiting.pleaseWait': 'Please wait...',
        'waiting.youAreIn': 'You are in!',
        'waiting.waitingForHost': 'Waiting for host to start...',
        'waiting.errorJoining': 'Error Joining Room',

        // Quiz Active
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
        'about.scaleVal': '180+ real students (500+ by June 2026)',
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

        // Student Login
        'login.firstName': 'الاسم',
        'login.lastName': 'اللقب',
        'login.group': 'الفوج',
        'login.room': 'رمز الغرفة',
        'login.join': 'انضم للغرفة',

        // Waiting Room
        'waiting.connecting': 'جارٍ الاتصال بالغرفة...',
        'waiting.pleaseWait': 'يرجى الانتظار...',
        'waiting.youAreIn': '!أنت في الغرفة',
        'waiting.waitingForHost': 'في انتظار بدء الأستاذ...',
        'waiting.errorJoining': 'خطأ في الانضمام للغرفة',

        // Quiz Active
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
        'about.scaleVal': 'أكثر من 180 طالبًا (500+ بحلول جوان 2026)',
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
