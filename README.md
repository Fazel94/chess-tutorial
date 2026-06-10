# Chess Opening Tutorial (آموزش گشایش شطرنج)

دوره‌ی تعاملی گشایش شطرنج به زبان فارسی — چهار اصل گشایش را بخوانید، آن‌ها را در
بازی‌های شرح‌داده‌شده ببینید، سپس خط‌های واقعی گشایش را حرکت‌به‌حرکت در برابر
پاسخ خودکار کتاب و موتور
Stockfish
تمرین کنید. نسخه‌ی زنده:
<https://chess.nlogn.ir>.

## معماری

 سایت
static
، نرم افزار
[MkDocs Material](https://squidfunk.github.io/mkdocs-material/)
محتوای فارسی راست‌به‌چپ را در زمان ساخت به
HTML
تبدیل می‌کند. هر ماکروی
`{{ board(...) }}` / `{{ viewer(...) }}` / `{{ practice_opening(...) }}`
در
`course/macros.py`
یک
placeholder
به‌شکل
`<div class="chess-widget" data-mode="...">`
تولید می‌کند. سپس باندل ساخته‌شده با
Vite
از
`src-widgets/`
در سمت کاربر این
placeholderها را به صفحه‌های تعاملی تبدیل می‌کند؛ با
[chessground](https://github.com/lichess-org/chessground)،
[chess.js](https://github.com/jhlywa/chess.js)
و
Stockfish 16
(NNUE، WASM،
تک
thread
در
Web Worker).
آدرس‌ها فایل‌های واقعی‌اند — دکمه‌های بازگشت/جلو،
لینک مستقیم و سئو همگی بدون نیاز به وضعیت سمت کلاینت کار می‌کنند.

## ساخت
باید 
MkDocs
 پیش از
Vite
اجرا شود.

```sh
python -m venv course/.venv
course/.venv/bin/pip install -r course/requirements.txt
npm install
make build      # MkDocs ← Vite
make serve      # ساخت کامل ← http://localhost:8000
```

## تست

```sh
npx vitest run
```

## مجوز

GPL-3.0 — chessground
تحت
GPL
است، بنابراین کل اثر ترکیبی هم
GPL
است
(فایل
[`LICENSE`](LICENSE)
را ببینید). دارایی‌های صوتی مجوز جداگانه دارند؛
به
[`SOUNDS-LICENSE.md`](SOUNDS-LICENSE.md)
مراجعه کنید.

## سپاس‌گزاری

خط‌های بازی‌های شرح‌داده‌شده — تنها از نظر ایده، با شرح فارسی اصیل — از کتاب
*Opening Compass*
اثر استاد بزرگ میخایلو اولکسیینکو اقتباس شده‌اند. ساخته‌شده با
[lichess-org/chessground](https://github.com/lichess-org/chessground)،
[chess.js](https://github.com/jhlywa/chess.js)
و
[Stockfish](https://stockfishchess.org/).
