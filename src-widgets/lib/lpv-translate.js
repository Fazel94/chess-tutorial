/**
 * Farsi translation dictionary for @lichess-org/pgn-viewer.
 *
 * Covers every key the library calls `ctrl.translate(key, ...args)` with.
 * Keys enumerated from pgn-viewer v2.6.0 source: view/controls.ts,
 * menu.ts, side.ts, aria.ts, accessibleBoard.ts, glyph.ts, util.ts.
 *
 * The `translate` function receives a key and optional interpolation args;
 * for keys that embed dynamic values (e.g. move number, player name),
 * args are substituted in place of `$1`, `$2`, … markers.
 */

const FA = {
  // ── Controls ─────────────────────────────────────────────────────────────
  flipTheBoard:              "چرخش صفحه",
  menu:                      "منو",
  download:                  "دانلود",
  getPgn:                    "دریافت PGN",
  practiceWithComputer:      "تمرین با کامپیوتر",
  analysisBoard:             "تخته تحلیل",
  viewOnLichess:             "مشاهده در لیچس",
  viewOnSite:                "مشاهده در سایت",

  // ── SAN verbalisations (used by screen readers) ───────────────────────────
  "san.takes":               "گرفتن",
  "san.check":               "کیش",
  "san.checkmate":           "کیش‌مات",
  "san.shortCastling":       "قلعه کوتاه",
  "san.longCastling":        "قلعه بلند",
  "san.promotesTo":          "ترفیع به",
  "san.droppedOn":           "رها شد روی",

  // ── ARIA labels ───────────────────────────────────────────────────────────
  "aria.accessibleChessboard": "صفحه شطرنج قابل دسترسی",
  "aria.navigationControls": "کنترل‌های ناوبری",
  "aria.gameMoves":          "حرکات بازی",
  "aria.move":               "حرکت $1 $2: $3",      // move number, color, SAN
  "aria.variation":          "تنوع",
  "aria.white":              "سفید",
  "aria.black":              "سیاه",
  "aria.whiteWins":          "سفید برد",
  "aria.blackWins":          "سیاه برد",
  "aria.draw":               "مساوی",
  "aria.gameInProgress":     "بازی در جریان است",
  "aria.gameResult":         "نتیجه بازی",
  "aria.chessGameBetween":   "بازی شطرنج بین $1 و $2",
  "aria.unknownPlayer":      "بازیکن ناشناس",
  "aria.rated":              "رتبه‌بندی‌شده",
  "aria.remaining":          "باقی‌مانده",
  "aria.linkOpensInNewTab":  "لینک در تب جدید باز می‌شود",
  "aria.first":              "اول",
  "aria.prev":               "قبلی",
  "aria.next":               "بعدی",
  "aria.last":               "آخر",
  "aria.empty":              "خالی",
  "aria.piece.king":         "شاه",
  "aria.piece.queen":        "وزیر",
  "aria.piece.rook":         "رخ",
  "aria.piece.bishop":       "فیل",
  "aria.piece.knight":       "اسب",
};

/**
 * Translate a pgn-viewer UI key into Farsi.
 *
 * @param {string} key
 * @param {...string} args - Positional substitutions for `$1`, `$2`, …
 * @returns {string}
 */
export function translate(key, ...args) {
  let text = FA[key];
  if (text === undefined) {
    // Fallback: return the key itself so nothing is silently hidden.
    return key;
  }
  // Simple positional substitution: $1, $2, …
  args.forEach((arg, i) => {
    text = text.replace(`$${i + 1}`, arg);
  });
  return text;
}
