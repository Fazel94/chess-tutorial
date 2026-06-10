/**
 * Farsi UI strings used by widgets.
 *
 * The site is Farsi-only at the markdown level (Material's i18n owns chrome),
 * so this is a small static dictionary. Keep entries minimal — chess notation
 * (SAN, UCI, FEN) renders verbatim regardless of locale.
 */
export const STRINGS = {
  loading:        "در حال بارگذاری...",
  notFound:       "پیدا نشد.",
  whiteToMove:    "نوبت سفید",
  blackToMove:    "نوبت سیاه",
  white:          "سفید",
  black:          "سیاه",
  checkmate:      "کیش‌مات",
  stalemate:      "پات",
  draw:           "مساوی",
  check:          "کیش",
  moveN:          (n) => `حرکت ${n}`,

  // Engine play
  engineLoading:  "در حال بارگذاری موتور...",
  engineThinking: "در حال فکر کردن...",
  engineError:    "خطا در بارگذاری موتور",
  undo:           "برگشت",
  flipBoard:      "چرخش صفحه",
  newGame:        "بازی جدید",
  difficultyLabel:"سطح",
  colorLabel:     "رنگ",
  playAsWhite:    "سفید",
  playAsBlack:    "سیاه",
  difficulty: {
    beginner:     "مبتدی",
    intermediate: "متوسط",
    advanced:     "پیشرفته",
  },

  // FEN bar
  fenCopyHint:    "کلیک برای کپی FEN",
  fenCopied:      "کپی شد!",
  fenPlaceholder: "FEN را وارد کنید...",
  fenLoad:        "بارگذاری",
  fenInvalid:     "FEN نامعتبر است",

  // Puzzle
  puzzleLabel:    "پازل",
  puzzleHint:     "راهنما",
  puzzleHintPrefix:"راهنما",
  puzzleReset:    "شروع مجدد",
  puzzleWrong:    "حرکت اشتباه — دوباره امتحان کن",
  puzzleSolved:   "پازل حل شد!",
  invalidPuzzle:  "پازل نامعتبر است. پارامترهای URL را بررسی کنید.",

  // Mobile annotation card (viewer)
  mobileNoComment: "—",

  // Keyboard shortcuts help overlay
  shortcutsLabel: "میانبرها",
  shortcutsTitle: "میانبرهای صفحه‌کلید",
  shortcutsNext:  "حرکت بعدی",
  shortcutsPrev:  "حرکت قبلی",
  shortcutsFirst: "اول بازی",
  shortcutsLast:  "آخر بازی",

  // Practice Opening
  practiceLabel:            "تمرین گشایش",
  practiceHint:             "راهنما",
  practiceRetry:            "تلاش دوباره",
  practiceYourMove:         "نوبت توست",
  practiceOpponentThinking: "...",
  practiceWrongMove:        "اشتباه — حرکت کتاب:",
  practiceComplete:         "خط را کامل بازی کردی! 🎉",
  practiceNext:             "ادامه",
  practiceMoveCounter:      (n, total) => {
    const fa = (x) => String(x).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
    return `حرکت ${fa(n)} از ${fa(total)}`;
  },
  invalidPractice:          "فایل PGN نامعتبر است.",
};
