/**
 * سامانه بازرسی گروه پرس
 * - ورود با کد پرسنلی و رمز عبور (کاربران از برگه «کاربران» گوگل‌شیت خوانده می‌شوند)
 * - ثبت هر بازرسی در دیتابیس و هم‌زمان در برگه «بازرسی‌ها» گوگل‌شیت
 * - نقش‌ها: مدیر / اپراتور
 */

const CHECK_ITEMS = 14;

const DEFAULT_GUIDES = {
  forklift: 'کاربرد: جابه‌جایی و بارگیری پالت و کالا در انبار و محوطه.\n'
    + 'تجهیزات موردنیاز: کلاه ایمنی، جلیقه شبرنگ، کفش ایمنی، دستکش؛ چراغ گردان و بوق دنده عقب سالم باشد.\n'
    + 'پیش از شروع: مسیر حرکت و موانع را بررسی کنید، ظرفیت بار روی پلاک دستگاه را رعایت کنید، بار را متعادل و کوتاه نگه دارید و دوشاخه را در حرکت پایین نگه دارید.\n'
    + 'ممنوع: سوار کردن نفر دوم، بلند کردن بار با دوشاخه خمیده، پارک در مسیر عبور و شارژ باتری در محل غیرمجاز.',
  reachstacker: 'کاربرد: برداشتن، جابه‌جایی و چیدن کانتینر در ردیف‌های انبار و بارگیری روی تریلی.\n'
    + 'تجهیزات موردنیاز: کلاه ایمنی، جلیقه شبرنگ، کفش ایمنی، دستکش ضدبرش؛ دسترسی ایمن به کابین و روشنایی محوطه.\n'
    + 'پیش از شروع: قفل‌های twistlock و اسپردر را بازرسی کنید، وزن و مرکز ثقل کانتینر را بسنجید و شعاع چرخش و ارتفاع سیم‌های برق را در نظر بگیرید.\n'
    + 'ممنوع: بلند کردن کانتینر با قفل نیمه‌درگیر، حرکت با بوم بالا، توقف زیر بار معلق و کار در باد شدید.',
  transtainer: 'کاربرد: تخلیه و بارگیری کانتینر روی ریل و محوطه راه‌آهن.\n'
    + 'تجهیزات موردنیاز: کلاه ایمنی، جلیقه شبرنگ، کفش ایمنی، دستکش؛ هماهنگی با راهبر و علامت‌دهنده، و روشنایی محوطه ریل.\n'
    + 'پیش از شروع: مسیر ریل و محدوده ایمن را کنترل کنید، از توقف کامل قطار مطمئن شوید و قفل‌های اسپردر را بررسی کنید.\n'
    + 'ممنوع: عبور از زیر بوم، کار روی ریل بدون هماهنگی، حرکت همزمان با قطار و بارگیری در محدوده سیم برق.',
};

const DEFAULT_CHECKLIST = [
  'ترمز پا، ترمز دستی و عملکرد توقف',
  'فرمان، بوق و سیستم هیدرولیک',
  'نشتی روغن یا مایع هیدرولیک در زیر تجهیز',
  'چراغ‌های هشدار، چراغ گردان و بوق دنده عقب',
  'کمربند ایمنی، صندلی و حفاظ اپراتور',
  'سطح روغن موتور / شارژ باتری (در تجهیز برقی)',
  'لاستیک‌ها، چرخ‌ها و پیچ‌های محور',
  'دوشاخه (فورک)، زنجیر بالابر و کشش زنجیر',
  'دکل، ریل‌ها، غلطک‌ها و مهارهای جانبی',
  'سیستم روشنایی، آینه‌ها و دید راننده',
  'کپسول آتش‌نشانی و تجهیزات ایمنی همراه',
  'برچسب ظرفیت مجاز و پلاک شناسایی تجهیز',
  'کنتور ساعت‌کار و کارکرد سالم آن',
  'نظافت عمومی، کابین و نبود اشیای شل',
];

const MAX_INSPECTIONS = 1000;
const SESSION_COOKIE = 'pers_sid';
const SESSION_TTL = 8 * 60 * 60 * 1000;

/* ---------------- ناوگان شرکت ---------------- */
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const faNum = (n) => String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
const pad2 = (n) => String(n).padStart(2, '0');

const FLEET = (() => {
  const list = [];
  for (let i = 1; i <= 3; i++) {
    list.push({
      id: 'p_tt' + i, code: 'TT-' + pad2(i),
      name: 'ترانستینر شماره ' + faNum(i), type: 'transtainer',
      model: '', capacity: '40 ton', site: 'TCT', period: 90,
    });
  }
  for (let i = 1; i <= 10; i++) {
    list.push({
      id: 'p_rs' + i, code: 'RS-' + pad2(i),
      name: 'ریچ استاکر شماره ' + faNum(i), type: 'reachstacker',
      model: '', capacity: '45 ton', site: i <= 5 ? 'TCT' : 'Conship', period: 90,
    });
  }
  for (let i = 1; i <= 60; i++) {
    list.push({
      id: 'p_fl' + i, code: 'FL-' + pad2(i),
      name: 'لیفتراک شماره ' + faNum(i), type: 'forklift',
      model: '', capacity: '', site: i <= 30 ? 'TCT' : 'Conship', period: 30,
    });
  }
  return list;
})();

/* ---------------- آزمون ارزیابی اپراتور (۱۵ سوال) ---------------- */
const TEST_MIN_SCORE = 60;
const TEST_VALID_HOURS = 12;

const TEST_CATS = {
  technical: 'تخصصی',
  safety: 'ایمنی و عمومی',
  psych: 'رفتاری و روان‌شناختی',
};

const QUESTIONS = [
  { id: 'q1', cat: 'technical', text: 'پیش از روشن کردن لیفتراک، اولین کار درست کدام است؟',
    options: ['روشن کردن و حرکت سریع برای گرم شدن', 'بازدید چشمی و کنترل ترمز، فرمان و نشتی', 'بوق زدن و حرکت', 'پر کردن مخزن بنزین'], answer: 1 },
  { id: 'q2', cat: 'technical', text: 'بار مجاز هر لیفتراک از کجا مشخص می‌شود؟',
    options: ['از تجربه اپراتور', 'از دستور شفاهی سرشیفت', 'از پلاک ظرفیت روی بدنه دستگاه', 'از اندازه پالت'], answer: 2 },
  { id: 'q3', cat: 'technical', text: 'بار سنگین باید در چه ارتفاعی حرکت داده شود؟',
    options: ['بالا برای دید بهتر', 'پایین و نزدیک به زمین، با دکل مایل به عقب', 'هر ارتفاعی که راحت‌تر است', 'کاملاً بالا'], answer: 1 },
  { id: 'q4', cat: 'technical', text: 'نشتی روغن هیدرولیک زیر دستگاه مشاهده کردید. اقدام صحیح؟',
    options: ['ادامه کار و اطلاع در پایان شیفت', 'تمیز کردن محل و ادامه کار', 'توقف کار، پارک در محل امن و ثبت ایراد', 'افزودن روغن و ادامه کار'], answer: 2 },
  { id: 'q5', cat: 'technical', text: 'هنگام باربرداری با ریچ استاکر، پایداری دستگاه بیشتر تحت تأثیر چیست؟',
    options: ['رنگ بدنه', 'فاصله بار از مرکز ثقل و ارتفاع بالابر', 'فشار باد چرخ‌ها تنها', 'سرعت حرکت'], answer: 1 },
  { id: 'q6', cat: 'safety', text: 'هنگام حرکت با بار در مسیر مشترک با عابر پیاده چه می‌کنید؟',
    options: ['با سرعت معمول حرکت می‌کنم', 'بوق می‌زنم، سرعت را کم می‌کنم و تا اطمینان از عبور عابر صبر می‌کنم', 'عابر باید خودش کنار برود', 'چراغ‌ها را خاموش می‌کنم'], answer: 1 },
  { id: 'q7', cat: 'safety', text: 'استفاده از کمربند ایمنی در لیفتراک چگونه است؟',
    options: ['اختیاری است', 'فقط در جاده لازم است', 'همیشه و در هر حرکت الزامی است', 'فقط در شیفت شب'], answer: 2 },
  { id: 'q8', cat: 'safety', text: 'کپسول آتش‌نشانی دستگاه باید چه وضعیتی داشته باشد؟',
    options: ['در انبار بماند', 'شارژ معتبر، در جای خود و قابل دسترس', 'فقط در دستگاه‌های نو', 'مهم نیست'], answer: 1 },
  { id: 'q9', cat: 'safety', text: 'سرعت مجاز حرکت در محوطه بندری و انبار چگونه تعیین می‌شود؟',
    options: ['با سلیقه اپراتور', 'با تابلوی سرعت مجاز محل و دستورالعمل ایمنی', 'همان سرعت جاده', 'حداکثر سرعت دستگاه'], answer: 1 },
  { id: 'q10', cat: 'safety', text: 'اگر ایراد خطرناکی در دستگاه دیدید که رفع نشده است، چه می‌کنید؟',
    options: ['با احتیاط کار می‌کنم', 'دستگاه را از سرویس خارج و به سرپرست اطلاع می‌دهم', 'به همکار شیفت بعد می‌گویم', 'مشکلی نیست'], answer: 1 },
  { id: 'q11', cat: 'psych', text: 'سرپرست شما را برای سرعت بیشتر زیر فشار می‌گذارد، اما رعایت ایمنی کندتر است. چه می‌کنید؟',
    options: ['برای جلب رضایت سریع‌تر کار می‌کنم', 'ایمنی را رعایت می‌کنم و دلیلش را توضیح می‌دهم', 'کار را متوقف و بی‌اطلاع سالن را ترک می‌کنم', 'بی‌توجهی می‌کنم'], answer: 1 },
  { id: 'q12', cat: 'psych', text: 'اشتباهی مرتکب شدید که کسی متوجه نشده است.',
    options: ['سکوت می‌کنم', 'خودم گزارش می‌دهم تا از تکرار جلوگیری شود', 'به همکار می‌گویم ولی به سرپرست نه', 'فراموش می‌کنم'], answer: 1 },
  { id: 'q13', cat: 'psych', text: 'در شیفت شب احساس خستگی شدید دارید. بهترین رفتار؟',
    options: ['با کافئین بیشتر ادامه می‌دهم', 'به سرپرست اطلاع می‌دهم و استراحت کوتاه می‌گیرم', 'سرعت را بیشتر می‌کنم تا زودتر تمام شود', 'به کار ادامه می‌دهم و به کسی نمی‌گویم'], answer: 1 },
  { id: 'q14', cat: 'psych', text: 'همکاری را می‌بینید که بدون تجهیزات ایمنی وارد محوطه می‌شود.',
    options: ['به من مربوط نیست', 'به او تذکر می‌دهم و در صورت لزوم به ناظر اطلاع می‌دهم', 'فیلم می‌گیرم', 'با صدای بلند مسخره می‌کنم'], answer: 1 },
  { id: 'q15', cat: 'psych', text: 'دستور کاری مبهم دریافت کرده‌اید که ممکن است خطرناک باشد.',
    options: ['حدس می‌زنم و انجام می‌دهم', 'تا رفع ابهام کار را شروع نمی‌کنم و سؤال می‌پرسم', 'به همکار می‌گویم انجام دهد', 'بی‌توجهی می‌کنم'], answer: 1 },
];

const publicQuestions = () =>
  QUESTIONS.map((q) => ({ id: q.id, cat: q.cat, catLabel: TEST_CATS[q.cat], text: q.text, options: q.options }));

function gradeTest(answers) {
  let correct = 0;
  const cats = { technical: [0, 0], safety: [0, 0], psych: [0, 0] };
  QUESTIONS.forEach((q, i) => {
    const ok = Number(answers[i]) === q.answer;
    if (ok) correct++;
    cats[q.cat][1]++;
    if (ok) cats[q.cat][0]++;
  });
  const total = QUESTIONS.length;
  const score = Math.round((correct / total) * 100);
  const band = score >= 80 ? 'قبول' : score >= TEST_MIN_SCORE ? 'مشروط' : 'رد';
  return { correct, total, score, band, cats };
}

/* ---------------- ابزارها ---------------- */
const json = (data, status = 200, headers) =>
  new Response(JSON.stringify(data), {
    status,
    headers: Object.assign(
      { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' },
      headers || {}
    ),
  });

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

const toHex = (buf) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(digest);
}

async function hmacHex(key, message) {
  const k = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message));
  return toHex(sig);
}

function safeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  const bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

function sameOrigin(request, fallbackOrigin) {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (site && (site === 'same-origin' || site === 'none')) return true;
  if (!origin) return true; // درخواست‌های غیرمرورگری (مثل curl) از همین Origin داخلی هستند
  return origin === fallbackOrigin;
}

function normalizeRole(value) {
  const v = String(value || '').trim();
  if (/مدیر|مدير|manager|admin/i.test(v)) return 'manager';
  return 'operator';
}

function isActiveFlag(value) {
  const v = String(value === undefined || value === null ? '' : value).trim().toLowerCase();
  if (!v) return true;
  return !['خیر', 'نه', 'no', 'false', '0', 'غیرفعال', 'inactive'].includes(v);
}

/* ---------------- تلاش‌های ورود ---------------- */
const attempts = new Map();
function allowAttempt(ip) {
  const rec = attempts.get(ip);
  if (!rec) return true;
  if (Date.now() > rec.reset) {
    attempts.delete(ip);
    return true;
  }
  return rec.count < 8;
}
function registerFail(ip) {
  const rec = attempts.get(ip);
  if (!rec || Date.now() > rec.reset) attempts.set(ip, { count: 1, reset: Date.now() + 10 * 60000 });
  else rec.count += 1;
}
function clearAttempts(ip) {
  attempts.delete(ip);
}

/* ---------------- تنظیمات ---------------- */
let sessionSecretCache = null;

async function getSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

async function setSetting(env, key, value) {
  await env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
    .bind(key, value)
    .run();
}

let cfgCache = { at: 0, data: null };

async function getSheetsConfig(env) {
  const now = Date.now();
  if (cfgCache.data && now - cfgCache.at < 30000) return cfgCache.data;
  const rows = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key IN ('sheets_url','sheets_token')"
  ).all();
  const map = {};
  for (const r of rows.results || []) map[r.key] = r.value;
  const cfg = map.sheets_url && map.sheets_token ? { url: map.sheets_url, token: map.sheets_token } : null;
  cfgCache = cfg ? { at: now, data: cfg } : { at: 0, data: null };
  return cfg;
}

async function getSessionSecret(env) {
  if (sessionSecretCache) return sessionSecretCache;
  let secret = await getSetting(env, 'session_key');
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = toHex(bytes);
    await setSetting(env, 'session_key', secret);
  }
  sessionSecretCache = secret;
  return secret;
}

async function signSession(payload, secret) {
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = await hmacHex(secret, body);
  return body + '.' + sig;
}

async function currentUser(request, env) {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const secret = await getSessionSecret(env);
  const expected = await hmacHex(secret, body);
  if (!safeEqual(sig, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(body));
  } catch {
    return null;
  }
  if (!payload || !payload.exp || Number(payload.exp) < Date.now()) return null;
  const base = {
    code: String(payload.c || ''),
    name: String(payload.n || payload.c || ''),
    role: payload.r === 'manager' ? 'manager' : 'operator',
  };
  // نقش را از کش زنده‌ی کاربران بازخوانی می‌کنیم تا تغییرات نقش (ارتقا/تنزل)
  // بلافاصله و بدون نیاز به خروج و ورود مجدد کاربر اثر بگذارد.
  try {
    const row = await env.DB.prepare(
      'SELECT role, name, active FROM users_cache WHERE code = ?'
    ).bind(base.code).first();
    if (row) {
      base.role = normalizeRole(row.role);
      if (row.name) base.name = String(row.name);
    }
  } catch (_) { /* در صورت نبود کش، همان نقش ثبت‌شده در نشست معتبر است */ }
  return base;
}

/* ---------------- گوگل‌شیت ---------------- */
const SHEET_TIMEOUT_MS = 9000;

/** تماس با گوگل‌شیت با مهلت زمانی؛ اگر گوگل کند پاسخ دهد، درخواست کاربر معطل نمی‌ماند */
function sheetFetch(url, init) {
  const opts = Object.assign({ redirect: 'follow' }, init || {});
  try {
    opts.signal = AbortSignal.timeout(SHEET_TIMEOUT_MS);
  } catch {
    /* محیط بدون AbortSignal.timeout */
  }
  return fetch(url, opts);
}

async function sheetsGet(cfg, params) {
  const url = new URL(cfg.url);
  url.searchParams.set('token', cfg.token);
  Object.keys(params || {}).forEach((k) => url.searchParams.set(k, params[k]));
  let res;
  try {
    res = await sheetFetch(url.toString(), { method: 'GET' });
  } catch (err) {
    throw new Error('ارتباط با گوگل‌شیت برقرار نشد.');
  }
  if (!res.ok) throw new Error('پاسخ گوگل‌شیت نامعتبر بود (' + res.status + ').');
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('پاسخ گوگل‌شیت قابل خواندن نبود.');
  }
  if (!data || data.ok !== true) throw new Error((data && data.error) || 'خطای گوگل‌شیت.');
  return data;
}

/*
 * فهرست کاربران یک بار از گوگل‌شیت خوانده و در دیتابیس خودمان نگه داشته می‌شود؛
 * بنابراین ورود به سامانه هیچ‌وقت منتظر پاسخ (کند) گوگل نمی‌ماند.
 * گوگل‌شیت فقط در پس‌زمینه (هر ۱۰ دقیقه) تازه‌سازی می‌شود.
 */
let usersCache = { at: 0, data: null };
const USERS_MEM_TTL = 60 * 1000;
const USERS_REFRESH_MS = 10 * 60 * 1000;

async function readUsersCache(env) {
  try {
    const res = await env.DB.prepare(
      'SELECT code, name, role, active, password, updated_at FROM users_cache ORDER BY code'
    ).all();
    const rows = res.results || [];
    if (!rows.length) return null;
    let newest = 0;
    const users = rows.map((r) => {
      newest = Math.max(newest, Number(r.updated_at) || 0);
      return {
        code: r.code,
        name: r.name || '',
        role: r.role || '',
        active: r.active,
        password: r.password || '',
      };
    });
    return { users, at: newest };
  } catch (err) {
    console.error('users cache read failed', err && err.message);
    return null;
  }
}

async function writeUsersCache(env, users) {
  const now = Date.now();
  const stmts = [env.DB.prepare('DELETE FROM users_cache')];
  for (const u of users) {
    stmts.push(
      env.DB.prepare(
        'INSERT OR REPLACE INTO users_cache (code, name, role, active, password, updated_at) VALUES (?,?,?,?,?,?)'
      ).bind(
        String(u.code || ''),
        String(u.name || ''),
        String(u.role || ''),
        String(u.active === undefined || u.active === null ? '' : u.active),
        String(u.password || ''),
        now
      )
    );
  }
  await env.DB.batch(stmts);
  usersCache = { at: now, data: users };
}

async function upsertUsersCache(env, users) {
  const now = Date.now();
  await env.DB.batch(
    users.map((u) =>
      env.DB.prepare(
        'INSERT OR REPLACE INTO users_cache (code, name, role, active, password, updated_at) VALUES (?,?,?,?,?,?)'
      ).bind(
        String(u.code || ''),
        String(u.name || ''),
        String(u.role || ''),
        String(u.active === undefined || u.active === null ? '' : u.active),
        String(u.password || ''),
        now
      )
    )
  );
  usersCache = { at: 0, data: null };
}

async function refreshUsers(env, cfg) {
  const data = await sheetsGet(cfg, { action: 'users' });
  const users = Array.isArray(data.users) ? data.users : [];
  if (users.length) {
    try {
      await writeUsersCache(env, users);
    } catch (err) {
      console.error('users cache write failed', err && err.message);
    }
    usersCache = { at: Date.now(), data: users };
  }
  return users;
}

async function loadUsers(env, cfg, ctx) {
  const now = Date.now();
  if (usersCache.data && now - usersCache.at < USERS_MEM_TTL) return usersCache.data;

  const cached = await readUsersCache(env);
  if (cached) {
    usersCache = { at: now, data: cached.users };
    if (now - cached.at > USERS_REFRESH_MS) {
      const job = refreshUsers(env, cfg).catch((err) =>
        console.error('users refresh failed', err && err.message)
      );
      if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(job);
    }
    return cached.users;
  }

  return refreshUsers(env, cfg);
}

async function appendInspectionRow(cfg, row) {
  let res;
  try {
    res = await sheetFetch(cfg.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: cfg.token, action: 'appendInspection', row }),
    });
  } catch {
    throw new Error('ارتباط با گوگل‌شیت برقرار نشد.');
  }
  if (!res.ok) throw new Error('پاسخ گوگل‌شیت نامعتبر بود (' + res.status + ').');
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('پاسخ گوگل‌شیت قابل خواندن نبود.');
  }
  if (!data || data.ok !== true) throw new Error((data && data.error) || 'خطای گوگل‌شیت.');
  return data;
}

/* ---------------- بانک سوالات (گوگل‌شیت) ---------------- */
let qCache = { at: 0, data: null };

function hashStr(s) {
  let h = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function catKey(label) {
  const v = String(label || '');
  if (/تخصص/.test(v)) return 'technical';
  if (/ایمن|عمومی|safety/i.test(v)) return 'safety';
  if (/رفتار|روان|psych/i.test(v)) return 'psych';
  return 'safety';
}

const QUESTION_MEM_TTL = 10 * 60 * 1000;

async function loadSheetQuestions(cfg) {
  if (qCache.data && Date.now() - qCache.at < QUESTION_MEM_TTL) return qCache.data;
  const data = await sheetsGet(cfg, { action: 'questions' });
  const rows = Array.isArray(data.questions) ? data.questions : [];
  const list = [];
  for (const r of rows) {
    const options = Array.isArray(r.options) ? r.options.map((o) => String(o || '').trim()) : [];
    const answer = Number(r.answer);
    const text = String(r.text || '').trim();
    if (!text || options.length !== 4 || options.some((o) => !o)) continue;
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) continue;
    const catLabel = String(r.cat || 'عمومی').trim();
    list.push({
      id: String(r.id || text).slice(0, 40),
      text,
      options,
      answer,
      cat: catKey(catLabel),
      catLabel,
      month: String(r.month || '').trim(),
    });
  }
  qCache = { at: Date.now(), data: list };
  return list;
}

const builtInQuestions = () =>
  QUESTIONS.map((q) => ({
    id: q.id, text: q.text, options: q.options, answer: q.answer,
    cat: q.cat, catLabel: TEST_CATS[q.cat], month: '',
  }));

/** انتخاب ۱۵ سوال برای ماه جاری؛ با بزرگ‌تر شدن بانک، هر ماه ترکیب عوض می‌شود */
function pickSet(pool, jm, jy) {
  let list = pool;
  const month = Number(jm) || 0;
  if (month) {
    const forMonth = pool.filter((q) => !q.month || String(q.month) === String(month));
    if (forMonth.length >= 5) list = forMonth;
  }
  const seed = String((Number(jy) || 0) * 12 + month);
  return [...list].sort((a, b) => hashStr(a.id + seed) - hashStr(b.id + seed)).slice(0, 15);
}

async function currentQuestionSet(cfg, jm, jy) {
  let pool = [];
  if (cfg) {
    try {
      pool = await loadSheetQuestions(cfg);
    } catch (err) {
      console.error('sheet questions failed', err && err.message);
    }
  }
  if (pool.length < 5) pool = builtInQuestions();
  return pickSet(pool, jm, jy);
}

/** برای بارگذاری صفحه: از بانک سوال موجود استفاده می‌کند و در صورت نبودن، گوگل‌شیت را در پس‌زمینه تازه می‌کند */
async function currentQuestionSetFast(cfg, jm, jy, ctx) {
  let pool = qCache.data || null;
  const stale = !pool || Date.now() - qCache.at > QUESTION_MEM_TTL;
  if (stale && cfg) {
    const job = loadSheetQuestions(cfg).catch((err) => {
      console.error('sheet questions failed', err && err.message);
      return null;
    });
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(job);
    else await job;
    pool = qCache.data || pool;
  }
  if (!pool || pool.length < 5) pool = builtInQuestions();
  return pickSet(pool, jm, jy);
}

const toPublic = (q) => ({
  id: q.id,
  cat: q.cat,
  catLabel: q.catLabel || TEST_CATS[q.cat] || '',
  text: q.text,
  options: q.options,
});

function gradeSet(set, chosen) {
  let correct = 0;
  const cats = { technical: [0, 0], safety: [0, 0], psych: [0, 0] };
  set.forEach((q) => {
    const c = cats[q.cat] || (cats[q.cat] = [0, 0]);
    c[1]++;
    if (Number(chosen.get(q.id)) === q.answer) {
      correct++;
      c[0]++;
    }
  });
  const total = set.length || 1;
  const score = Math.round((correct / total) * 100);
  const band = score >= 80 ? 'قبول' : score >= TEST_MIN_SCORE ? 'مشروط' : 'رد';
  return { correct, total: set.length, score, band, cats };
}

async function sheetsPost(cfg, payload) {
  let res;
  try {
    res = await sheetFetch(cfg.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.assign({ token: cfg.token }, payload)),
    });
  } catch {
    throw new Error('ارتباط با گوگل‌شیت برقرار نشد.');
  }
  if (!res.ok) throw new Error('پاسخ گوگل‌شیت نامعتبر بود (' + res.status + ').');
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('پاسخ گوگل‌شیت قابل خواندن نبود.');
  }
  if (!data || data.ok !== true) throw new Error((data && data.error) || 'خطای گوگل‌شیت.');
  usersCache = { at: 0, data: null };
  return data;
}

async function touchPresence(env, me) {
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO presence (user_code, user_name, role, first_at, last_seen, views) VALUES (?,?,?,?,?,1) ' +
      'ON CONFLICT(user_code) DO UPDATE SET user_name = excluded.user_name, role = excluded.role, last_seen = excluded.last_seen, views = presence.views + 1'
  )
    .bind(me.code, me.name, me.role, now, now)
    .run();
}

async function verifyPassword(input, stored) {
  const s = String(stored || '').trim();
  if (!s) return false;
  if (s.toLowerCase().startsWith('sha256:')) {
    return safeEqual(await sha256Hex(input), s.slice(7).toLowerCase());
  }
  return safeEqual(String(input), s);
}

function rowToTest(r) {
  return {
    id: r.id,
    userCode: r.user_code,
    userName: r.user_name || '',
    at: Number(r.at),
    correct: Number(r.correct),
    total: Number(r.total),
    score: Number(r.score),
    band: r.band,
    cats: JSON.parse(r.cats || '{}'),
  };
}

function testIsValid(row) {
  if (!row) return false;
  return Number(row.score) >= TEST_MIN_SCORE && Date.now() - Number(row.at) < TEST_VALID_HOURS * 3600000;
}

/* ---------------- تبدیل ردیف‌ها ---------------- */
function cleanGuide(v) {
  return String(v == null ? '' : v).replace(/\r\n/g, '\n').slice(0, 3000).trim();
}

function rowToEquipment(r) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    model: r.model || '',
    capacity: r.capacity || '',
    site: r.site || '',
    period: Number(r.period) || 30,
    active: Number(r.active) !== 0,
    guide: r.guide || '',
  };
}

function rowToInspection(r) {
  return {
    id: r.id,
    eqId: r.eq_id,
    eqCode: r.eq_code,
    at: Number(r.at),
    operator: r.operator,
    shift: r.shift || '',
    hours: r.hours == null ? null : Number(r.hours),
    answers: JSON.parse(r.answers || '[]'),
    items: r.items ? JSON.parse(r.items) : null,
    fails: JSON.parse(r.fails || '[]'),
    result: r.result,
    notes: r.notes || '',
    by: r.user_name || '',
    userCode: r.user_id || '',
    sheetSynced: Number(r.sheet_synced || 0) === 1,
  };
}

/* ---------------- ساخت جداول + داده اولیه ---------------- */
const SEED_EQUIPMENT = [
  ['eq1', 'FL-101', 'لیفتراک تویوتا ۲.۵ تن', 'forklift', 'Toyota 8FG25', '۲۵۰۰ kg', 'انبار مرکزی', 30],
];
const SEED_INSPECTIONS = [
  ['si1', 'eq1', 'FL-101', 2, 'مهدی رضایی', 'صبح', 2140, []],
];

let schemaPromise = null;

function ensureSchema(env) {
  schemaPromise ??= (async () => {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS equipment (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        model TEXT,
        capacity TEXT,
        site TEXT,
        period INTEGER NOT NULL DEFAULT 30,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        eq_id TEXT NOT NULL,
        eq_code TEXT NOT NULL,
        at INTEGER NOT NULL,
        operator TEXT NOT NULL,
        shift TEXT,
        hours INTEGER,
        answers TEXT NOT NULL,
        fails TEXT NOT NULL,
        result TEXT NOT NULL,
        notes TEXT,
        user_id TEXT NOT NULL,
        user_name TEXT
      )`),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_insp_at ON inspections(at DESC)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_insp_eq ON inspections(eq_id)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_eq_code ON equipment(code)'),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS checklist (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        position INTEGER NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS tests (
        id TEXT PRIMARY KEY,
        user_code TEXT NOT NULL,
        user_name TEXT,
        at INTEGER NOT NULL,
        answers TEXT NOT NULL,
        correct INTEGER NOT NULL,
        total INTEGER NOT NULL,
        score INTEGER NOT NULL,
        band TEXT NOT NULL,
        cats TEXT NOT NULL
      )`),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_test_user ON tests(user_code, at DESC)'),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS logins (
        id TEXT PRIMARY KEY,
        user_code TEXT NOT NULL,
        user_name TEXT,
        at INTEGER NOT NULL
      )`),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_login_at ON logins(at DESC)'),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS users_cache (
        code TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        active TEXT,
        password TEXT,
        updated_at INTEGER NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS presence (
        user_code TEXT PRIMARY KEY,
        user_name TEXT,
        role TEXT,
        first_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        views INTEGER NOT NULL DEFAULT 0
      )`),
    ]);

    // ستون‌های تازه‌تر
    const inspCols = await env.DB.prepare('PRAGMA table_info(inspections)').all();
    const inspNames = (inspCols.results || []).map((c) => c.name);
    if (!inspNames.includes('items')) {
      await env.DB.prepare('ALTER TABLE inspections ADD COLUMN items TEXT').run();
    }
    if (!inspNames.includes('sheet_synced')) {
      await env.DB.prepare('ALTER TABLE inspections ADD COLUMN sheet_synced INTEGER NOT NULL DEFAULT 0').run();
    }

    const eqCols = await env.DB.prepare('PRAGMA table_info(equipment)').all();
    const eqNames = (eqCols.results || []).map((c) => c.name);
    if (!eqNames.includes('guide')) {
      await env.DB.prepare("ALTER TABLE equipment ADD COLUMN guide TEXT NOT NULL DEFAULT ''").run();
    }

    // چک‌لیست پیش‌فرض
    const chk = await env.DB.prepare('SELECT COUNT(*) AS n FROM checklist').first();
    if (Number(chk?.n || 0) === 0) {
      await env.DB.batch(
        DEFAULT_CHECKLIST.map((label, i) =>
          env.DB.prepare('INSERT OR IGNORE INTO checklist (id, label, position) VALUES (?,?,?)')
            .bind('ck' + (i + 1), label, i + 1)
        )
      );
    }

    // آموزش پیش‌فرض هر نوع دستگاه
    for (const [type, text] of Object.entries(DEFAULT_GUIDES)) {
      const key = 'guide_' + type;
      if (!(await getSetting(env, key))) await setSetting(env, key, text);
    }

    // داده نمونه قدیمی فقط اگر بازرسی واقعی نداشته باشد
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM inspections WHERE user_id = 'seed' AND eq_id NOT IN (SELECT eq_id FROM inspections WHERE user_id != 'seed')"
      ),
      env.DB.prepare(
        "DELETE FROM equipment WHERE id IN ('eq1','eq2','eq3','eq4','eq5','eq6') AND id NOT IN (SELECT eq_id FROM inspections WHERE user_id != 'seed')"
      ),
    ]);

    // ناوگان شرکت
    const hasFleet = await env.DB.prepare("SELECT id FROM equipment WHERE id = 'p_tt1'").first();
    if (!hasFleet) {
      await env.DB.batch(
        FLEET.map((e) =>
          env.DB.prepare(
            'INSERT OR IGNORE INTO equipment (id, code, name, type, model, capacity, site, period, active, created_at) VALUES (?,?,?,?,?,?,?,?,1,?)'
          ).bind(e.id, e.code, e.name, e.type, e.model, e.capacity, e.site, e.period, Date.now())
        )
      );
    }
  })().catch((err) => {
    schemaPromise = null;
    throw err;
  });
  return schemaPromise;
}

/* ---------------- مسیریابی ---------------- */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) {
        await ensureSchema(env);
        return await apiRoute(request, env, url, ctx);
      }
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error('request failed', err && err.name, err && err.message);
      return json({ error: 'خطای داخلی سرور. لطفاً دوباره تلاش کنید.' }, 500);
    }
  },
};

async function apiRoute(request, env, url, ctx) {
  const origin = env.APP_ORIGIN || url.origin;
  const method = request.method;

  if (method !== 'GET' && !sameOrigin(request, origin)) {
    return json({ error: 'درخواست نامعتبر است.' }, 403);
  }

  /* ---- وضعیت تنظیمات ---- */
  if (url.pathname === '/api/config' && method === 'GET') {
    const cfg = await getSheetsConfig(env);
    return json({ configured: !!cfg, origin });
  }

  /* ---- راه‌اندازی اولیه اتصال ---- */
  if (url.pathname === '/api/setup' && method === 'POST') {
    const existing = await getSheetsConfig(env);
    if (existing) {
      const me = await currentUser(request, env);
      if (!me) return json({ error: 'برای تغییر تنظیمات باید وارد شوید.' }, 401);
      if (me.role !== 'manager') return json({ error: 'فقط مدیر می‌تواند تنظیمات را تغییر دهد.' }, 403);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const sheetUrl = clean(body.url, 500);
    const token = clean(body.token, 200);
    if (!/^https:\/\/script\.google\.com\//.test(sheetUrl)) {
      return json({ error: 'آدرس باید آدرس Web app اسکریپت گوگل باشد (با https://script.google.com/ شروع شود).' }, 400);
    }
    if (!token) return json({ error: 'رمز اتصال را وارد کنید.' }, 400);

    try {
      const ping = await sheetsGet({ url: sheetUrl, token }, { action: 'ping' });
      await setSetting(env, 'sheets_url', sheetUrl);
      await setSetting(env, 'sheets_token', token);
      usersCache = { at: 0, data: null };
      cfgCache = { at: 0, data: null };
      return json({ ok: true, users: Number(ping.users || 0), inspections: Number(ping.inspections || 0) });
    } catch (err) {
      return json({ error: 'اتصال به گوگل‌شیت برقرار نشد: ' + err.message }, 502);
    }
  }

  /* ---- ورود ---- */
  if (url.pathname === '/api/login' && method === 'POST') {
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    if (!allowAttempt(ip)) {
      return json({ error: 'تعداد تلاش‌های ناموفق زیاد است. ۱۰ دقیقه بعد دوباره تلاش کنید.' }, 429);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const code = clean(body.personnelCode, 40);
    const password = String(body.password || '');
    if (!code || !password) return json({ error: 'کد پرسنلی و رمز عبور را وارد کنید.' }, 400);

    const cfg = await getSheetsConfig(env);
    if (!cfg) return json({ error: 'اتصال به گوگل‌شیت هنوز تنظیم نشده است.' }, 503);

    let users;
    try {
      users = await loadUsers(env, cfg, ctx);
    } catch (err) {
      return json({ error: 'خواندن فهرست کاربران از گوگل‌شیت ممکن نشد. ' + err.message }, 502);
    }
    if (!users.length) {
      return json({ error: 'هنوز کاربری در برگه «کاربران» شیت تعریف نشده است.' }, 503);
    }

    const user = users.find((u) => String(u.code || '').trim().toLowerCase() === code.toLowerCase());
    const passOk = user ? await verifyPassword(password, user.password) : false;
    if (!user || !passOk || !isActiveFlag(user.active)) {
      registerFail(ip);
      return json({ error: 'کد پرسنلی یا رمز عبور درست نیست.' }, 401);
    }

    clearAttempts(ip);
    const role = normalizeRole(user.role);
    const name = user.name || user.code;
    await env.DB.prepare('INSERT INTO logins (id, user_code, user_name, at) VALUES (?,?,?,?)')
      .bind('lg_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), user.code, name, Date.now())
      .run();
    const token = await signSession(
      { c: user.code, n: name, r: role, exp: Date.now() + SESSION_TTL },
      await getSessionSecret(env)
    );
    return json(
      { ok: true, user: { code: user.code, name, role } },
      200,
      { 'set-cookie': SESSION_COOKIE + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800' }
    );
  }

  /* ---- خروج ---- */
  if (url.pathname === '/api/logout' && method === 'POST') {
    return json({ ok: true }, 200, {
      'set-cookie': SESSION_COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    });
  }

  /* ---- از این‌جا به بعد نیاز به ورود ---- */
  const me = await currentUser(request, env);
  if (!me) return json({ error: 'برای ادامه باید وارد شوید.' }, 401);
  const isManager = me.role === 'manager';
  const requireManager = () =>
    isManager ? null : json({ error: 'این بخش فقط برای مدیر است.' }, 403);

  if (url.pathname === '/api/bootstrap' && method === 'GET') {
    const jm = Number(url.searchParams.get('jm')) || 0;
    const jy = Number(url.searchParams.get('jy')) || 0;
    const idle = isManager ? Promise.resolve(null) : null;
    const cfg = await getSheetsConfig(env);

    const [eq, chkAll, ins, cnt, lastTestRow, tRows, logo, guideRows, myLoginRow, lg, on, sheetUsers, jset] =
      await Promise.all([
        env.DB.prepare('SELECT * FROM equipment ORDER BY code').all(),
        env.DB.prepare('SELECT id, label FROM checklist ORDER BY position, rowid').all(),
        env.DB.prepare('SELECT * FROM inspections ORDER BY at DESC LIMIT ?')
          .bind(isManager ? MAX_INSPECTIONS : 600)
          .all(),
        isManager
          ? env.DB.prepare('SELECT COUNT(*) AS n FROM inspections WHERE sheet_synced = 0').first()
          : idle,
        env.DB.prepare('SELECT * FROM tests WHERE user_code = ? ORDER BY at DESC LIMIT 1')
          .bind(me.code)
          .first(),
        isManager ? env.DB.prepare('SELECT * FROM tests ORDER BY at DESC LIMIT 200').all() : idle,
        getSetting(env, 'logo'),
        env.DB.prepare(
          "SELECT key, value FROM settings WHERE key IN ('guide_forklift','guide_reachstacker','guide_transtainer')"
        ).all(),
        env.DB.prepare('SELECT at FROM logins WHERE user_code = ? ORDER BY at DESC LIMIT 1')
          .bind(me.code)
          .first(),
        isManager ? env.DB.prepare('SELECT * FROM logins ORDER BY at DESC LIMIT 100').all() : idle,
        isManager
          ? env.DB.prepare('SELECT * FROM presence WHERE last_seen > ? ORDER BY last_seen DESC')
              .bind(Date.now() - 5 * 60000)
              .all()
          : idle,
        (async () => {
          if (!isManager || !cfg) return [];
          try {
            return await loadUsers(env, cfg, ctx);
          } catch (err) {
            console.error('sheet users failed', err && err.message);
            return [];
          }
        })(),
        currentQuestionSetFast(cfg, jm, jy, ctx),
        touchPresence(env, me).catch(() => {}),
      ]);

    const checklist = (chkAll.results || []).map((c) => ({ id: c.id, label: c.label }));
    const inspections = (ins.results || []).map(rowToInspection);
    const unsynced = isManager ? Number(cnt?.n || 0) : 0;
    const tests = isManager ? (tRows.results || []).map(rowToTest) : [];

    const guideMap = {};
    for (const r of guideRows.results || []) guideMap[r.key] = r.value;
    const guides = {
      forklift: guideMap.guide_forklift || '',
      reachstacker: guideMap.guide_reachstacker || '',
      transtainer: guideMap.guide_transtainer || '',
    };
    const myLoginAt = myLoginRow ? Number(myLoginRow.at) : null;

    const logins = isManager
      ? (lg.results || []).map((r) => ({ code: r.user_code, name: r.user_name || '', at: Number(r.at) }))
      : [];
    const online = isManager
      ? (on.results || []).map((r) => ({
          code: r.user_code,
          name: r.user_name || '',
          role: r.role === 'manager' ? 'manager' : 'operator',
          lastSeen: Number(r.last_seen),
          firstAt: Number(r.first_at),
          views: Number(r.views || 0),
        }))
      : [];
    const users = isManager
      ? sheetUsers.map((u) => ({
          code: u.code,
          name: u.name || '',
          role: normalizeRole(u.role),
          active: isActiveFlag(u.active),
          hasPassword: !!u.password,
        }))
      : [];

    return json({
      user: { code: me.code, name: me.name, role: me.role },
      canManage: isManager,
      sheetsConfigured: !!cfg,
      unsynced,
      checklist,
      equipment: (eq.results || []).map(rowToEquipment),
      inspections,
      tests,
      test: {
        questions: jset.map(toPublic),
        minScore: TEST_MIN_SCORE,
        validHours: TEST_VALID_HOURS,
        last: lastTestRow ? rowToTest(lastTestRow) : null,
        valid: testIsValid(lastTestRow),
      },
      logo,
      guides,
      myLoginAt,
      logins,
      online,
      users,
    });
  }

  /* ---- آزمون ارزیابی ---- */
  if (url.pathname === '/api/test' && method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const raw = Array.isArray(body.answers) ? body.answers : [];
    const chosen = new Map();
    for (const a of raw) {
      if (!a || a.id === undefined) continue;
      const v = Number(a.choice);
      if (!Number.isInteger(v) || v < 0 || v > 3) continue;
      chosen.set(String(a.id), v);
    }
    const cfg = await getSheetsConfig(env);
    const covers = (list) =>
      list.length > 0 && chosen.size >= list.length && list.every((q) => chosen.has(q.id));
    let graded = null;
    const set = await currentQuestionSet(cfg, body.jm, body.jy);
    if (covers(set)) graded = gradeSet(set, chosen);
    else {
      // اگر صفحه با بانک سوال پیش‌فرض باز شده باشد، همان مجموعه پذیرفته می‌شود
      const fb = pickSet(builtInQuestions(), body.jm, body.jy);
      if (covers(fb)) graded = gradeSet(fb, chosen);
    }
    if (!graded) {
      return json(
        { error: 'همه‌ی سوالات باید پاسخ داده شوند. صفحه را بازخوانی کنید و دوباره تلاش کنید.' },
        400
      );
    }
    const row = {
      id: 'tst_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18),
      userCode: me.code,
      userName: me.name,
      at: Date.now(),
      correct: graded.correct,
      total: graded.total,
      score: graded.score,
      band: graded.band,
      cats: graded.cats,
    };
    await env.DB.prepare(
      'INSERT INTO tests (id, user_code, user_name, at, answers, correct, total, score, band, cats) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).bind(row.id, row.userCode, row.userName, row.at, JSON.stringify(raw), row.correct, row.total, row.score, row.band, JSON.stringify(row.cats)).run();

    return json({ ok: true, result: row, valid: row.score >= TEST_MIN_SCORE });
  }

  /* ---- تنظیمات شیت ---- */
  if (url.pathname === '/api/sheet/test' && method === 'GET') {
    const deny = requireManager();
    if (deny) return deny;
    const cfg = await getSheetsConfig(env);
    if (!cfg) return json({ error: 'اتصال شیت تنظیم نشده است.' }, 503);
    try {
      const ping = await sheetsGet(cfg, { action: 'ping' });
      let userCount = 0;
      try {
        userCount = (await loadUsers(env, cfg, ctx)).length;
      } catch {
        userCount = 0;
      }
      return json({ ok: true, users: userCount, inspections: Number(ping.inspections || 0) });
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  }

  if (url.pathname === '/api/sheet/sync' && method === 'POST') {
    const deny = requireManager();
    if (deny) return deny;
    const cfg = await getSheetsConfig(env);
    if (!cfg) return json({ error: 'اتصال شیت تنظیم نشده است.' }, 503);

    const rows = await env.DB.prepare(
      'SELECT * FROM inspections WHERE sheet_synced = 0 ORDER BY at LIMIT 100'
    ).all();
    const list = (rows.results || []).map(rowToInspection);
    let sent = 0;
    const errors = [];
    for (const rec of list) {
      const eq = await env.DB.prepare('SELECT * FROM equipment WHERE id = ?').bind(rec.eqId).first();
      const labels = rec.items && rec.items.length ? rec.items : DEFAULT_CHECKLIST;
      try {
        await appendInspectionRow(cfg, {
          date: rec.dateFa || jDateOnly(rec.at),
          time: rec.timeFa || '',
          eqCode: rec.eqCode,
          eqName: eq ? eq.name : '',
          type: eq ? eq.type : '',
          site: eq ? eq.site : '',
          operator: rec.operator,
          shift: rec.shift,
          hours: rec.hours,
          result: rec.result === 'pass' ? 'سالم' : 'نیازمند تعمیر',
          failCount: rec.fails.length,
          fails: rec.fails.map((i) => labels[i]).filter(Boolean).join('؛ '),
          notes: rec.notes,
          userCode: rec.userCode,
          userName: rec.by,
          iso: new Date(rec.at).toISOString(),
        });
        await env.DB.prepare('UPDATE inspections SET sheet_synced = 1 WHERE id = ?').bind(rec.id).run();
        sent++;
      } catch (err) {
        errors.push(err.message);
        break;
      }
    }
    return json({ ok: true, sent, remaining: list.length - sent, error: errors[0] || null });
  }

  /* ---- ضربان حضور (برای نمایش کاربران آنلاین) ---- */
  if (url.pathname === '/api/ping' && method === 'POST') {
    await env.DB.prepare(
      'INSERT INTO presence (user_code, user_name, role, first_at, last_seen, views) VALUES (?,?,?,?,?,0) ' +
        'ON CONFLICT(user_code) DO UPDATE SET user_name = excluded.user_name, role = excluded.role, last_seen = excluded.last_seen'
    )
      .bind(me.code, me.name, me.role, Date.now(), Date.now())
      .run();
    return json({ ok: true });
  }

  /* ---- مدیریت کاربران (گوگل‌شیت) ---- */
  if (url.pathname === '/api/users' && method === 'POST') {
    const deny = requireManager();
    if (deny) return deny;
    const cfg = await getSheetsConfig(env);
    if (!cfg) return json({ error: 'اتصال شیت تنظیم نشده است.' }, 503);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const code = clean(body.code, 40);
    const name = clean(body.name, 80);
    const password = String(body.password || '');
    if (!code || !name) return json({ error: 'کد پرسنلی و نام الزامی است.' }, 400);
    if (password.length < 4) return json({ error: 'رمز عبور باید حداقل ۴ نویسه باشد.' }, 400);

    try {
      const existing = await loadUsers(env, cfg, ctx);
      if (existing.some((u) => String(u.code).toLowerCase() === code.toLowerCase())) {
        return json({ error: 'کاربری با این کد پرسنلی وجود دارد.' }, 409);
      }
      const user = {
        code,
        name,
        password: 'sha256:' + (await sha256Hex(password)),
        role: body.role === 'manager' ? 'مدیر' : 'اپراتور',
        active: true,
      };
      await sheetsPost(cfg, { action: 'addUser', user });
      // کاربر تازه بلافاصله (بدون معطل شدن برای گوگل) می‌تواند وارد شود
      await upsertUsersCache(env, [user]).catch((err) =>
        console.error('users cache upsert failed', err && err.message)
      );
      return json({ ok: true });
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([A-Za-z0-9_-]{1,40})$/);
  if (userMatch && method === 'PATCH') {
    const deny = requireManager();
    if (deny) return deny;
    const cfg = await getSheetsConfig(env);
    if (!cfg) return json({ error: 'اتصال شیت تنظیم نشده است.' }, 503);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const code = userMatch[1];
    if (code === me.code && (body.active === false || body.role === 'operator')) {
      return json({ error: 'نمی‌توانید دسترسی حساب خودتان را محدود کنید.' }, 400);
    }

    const patch = { code };
    if (body.role !== undefined) patch.role = body.role === 'manager' ? 'manager' : 'operator';
    if (body.active !== undefined) patch.active = !!body.active;
    if (body.name !== undefined) patch.name = clean(body.name, 80);
    if (body.password !== undefined) {
      const p = String(body.password || '');
      if (p.length < 4) return json({ error: 'رمز عبور باید حداقل ۴ نویسه باشد.' }, 400);
      patch.password = 'sha256:' + (await sha256Hex(p));
    }

    try {
      await sheetsPost(cfg, { action: 'updateUser', user: patch });
      // همان تغییر را در کش محلی هم اعمال می‌کنیم تا کنار گذاشتن کاربر یا تغییر رمز فوری اثر کند
      try {
        const row = await env.DB.prepare(
          'SELECT code, name, role, active, password FROM users_cache WHERE code = ?'
        ).bind(code).first();
        if (row) {
          await upsertUsersCache(env, [
            {
              code: row.code,
              name: patch.name !== undefined ? patch.name : row.name,
              role: patch.role !== undefined ? patch.role : row.role,
              active: patch.active !== undefined ? String(patch.active) : row.active,
              password: patch.password !== undefined ? patch.password : row.password,
            },
          ]);
        }
      } catch (err) {
        console.error('users cache patch failed', err && err.message);
      }
      return json({ ok: true });
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  }

  /* ---- لوگوی شرکت ---- */
  if (url.pathname === '/api/logo' && method === 'POST') {
    const deny = requireManager();
    if (deny) return deny;
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const dataUrl = String(body.dataUrl || '');
    if (!dataUrl) {
      await setSetting(env, 'logo', '');
      return json({ ok: true, logo: '' });
    }
    if (!/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/.test(dataUrl)) {
      return json({ error: 'فقط فایل تصویری (PNG، JPG، WebP یا SVG) مجاز است.' }, 400);
    }
    if (dataUrl.length > 300000) {
      return json({ error: 'حجم تصویر زیاد است؛ لوگوی کمتر از ۲۰۰ کیلوبایت انتخاب کنید.' }, 400);
    }
    await setSetting(env, 'logo', dataUrl);
    return json({ ok: true, logo: dataUrl });
  }

  /* ---- بازرسی ---- */
  if (url.pathname === '/api/inspections' && method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }

    const eqId = clean(body.eqId, 40);
    const eq = await env.DB.prepare('SELECT * FROM equipment WHERE id = ?').bind(eqId).first();
    if (!eq) return json({ error: 'تجهیز یافت نشد.' }, 404);

    if (me.role !== 'manager') {
      const lastTest = await env.DB.prepare(
        'SELECT * FROM tests WHERE user_code = ? ORDER BY at DESC LIMIT 1'
      ).bind(me.code).first();
      if (!testIsValid(lastTest)) {
        return json(
          {
            error: 'پیش از ثبت بازرسی، آزمون ارزیابی ۱۵ سوالی را با موفقیت انجام دهید.',
            code: 'TEST_REQUIRED',
          },
          409
        );
      }
    }

    const operator = clean(body.operator, 80);
    if (!operator) return json({ error: 'نام اپراتور الزامی است.' }, 400);

    const chkRows = await env.DB.prepare(
      'SELECT id, label FROM checklist ORDER BY position, rowid'
    ).all();
    const items = (chkRows.results || []).map((c) => c.label);
    if (!items.length) {
      return json({ error: 'چک‌لیست بازرسی خالی است؛ ابتدا آیتم اضافه کنید.' }, 400);
    }

    const raw = Array.isArray(body.answers) ? body.answers : [];
    const answers = [];
    for (const a of raw) {
      const i = Number(a && a.i);
      const v = a && a.v;
      if (!Number.isInteger(i) || i < 0 || i >= items.length) continue;
      if (!['ok', 'fail', 'na'].includes(v)) continue;
      answers.push({ i, v });
    }
    if (answers.length !== items.length) {
      return json({ error: 'چک‌لیست باید کامل پاسخ داده شود.' }, 400);
    }

    let hours = body.hours;
    hours = hours === null || hours === '' || hours === undefined ? null : Number(hours);
    if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 10000000)) {
      return json({ error: 'کنتور ساعت‌کار نامعتبر است.' }, 400);
    }

    const fails = answers.filter((a) => a.v === 'fail').map((a) => a.i).sort((x, y) => x - y);
    const record = {
      id: 'insp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20),
      eqId: eq.id,
      eqCode: eq.code,
      at: Date.now(),
      operator,
      shift: clean(body.shift, 20) || 'صبح',
      hours,
      answers,
      items,
      fails,
      result: fails.length ? 'fail' : 'pass',
      notes: clean(body.notes, 500),
      by: me.name,
      userCode: me.code,
      sheetSynced: false,
    };

    await env.DB.prepare(
      'INSERT INTO inspections (id, eq_id, eq_code, at, operator, shift, hours, answers, fails, result, notes, user_id, user_name, items, sheet_synced) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)'
    ).bind(
      record.id, record.eqId, record.eqCode, record.at, record.operator, record.shift,
      record.hours, JSON.stringify(record.answers), JSON.stringify(record.fails),
      record.result, record.notes, record.userCode, record.by, JSON.stringify(items)
    ).run();

    // ثبت در گوگل‌شیت
    const cfg = await getSheetsConfig(env);
    if (cfg) {
      try {
        await appendInspectionRow(cfg, {
          date: clean(body.dateFa, 60),
          time: clean(body.timeFa, 20),
          eqCode: eq.code,
          eqName: eq.name,
          type: eq.type,
          site: eq.site,
          operator: record.operator,
          shift: record.shift,
          hours: record.hours,
          result: record.result === 'pass' ? 'سالم' : 'نیازمند تعمیر',
          failCount: fails.length,
          fails: fails.map((i) => items[i]).filter(Boolean).join('؛ '),
          notes: record.notes,
          userCode: me.code,
          userName: me.name,
          iso: new Date(record.at).toISOString(),
        });
        await env.DB.prepare('UPDATE inspections SET sheet_synced = 1 WHERE id = ?').bind(record.id).run();
        record.sheetSynced = true;
      } catch (err) {
        console.error('sheet append failed', err && err.message);
      }
    }

    return json({ ok: true, inspection: record, sheetSynced: record.sheetSynced });
  }

  /* ---- حذف موارد از داشبورد ---- */
  const testDel = url.pathname.match(/^\/api\/tests\/([A-Za-z0-9_]{1,80})$/);
  if (testDel && method === 'DELETE') {
    const deny = requireManager();
    if (deny) return deny;
    await env.DB.prepare('DELETE FROM tests WHERE id = ?').bind(testDel[1]).run();
    return json({ ok: true });
  }

  const inspDel = url.pathname.match(/^\/api\/inspections\/([A-Za-z0-9_]{1,80})$/);
  if (inspDel && method === 'DELETE') {
    const deny = requireManager();
    if (deny) return deny;
    await env.DB.prepare('DELETE FROM inspections WHERE id = ?').bind(inspDel[1]).run();
    return json({ ok: true });
  }

  if (url.pathname === '/api/operators' && method === 'DELETE') {
    const deny = requireManager();
    if (deny) return deny;
    const name = clean(url.searchParams.get('name'), 120);
    if (!name) return json({ error: 'نام اپراتور مشخص نیست.' }, 400);
    const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM inspections WHERE operator = ?').bind(name).first();
    await env.DB.prepare('DELETE FROM inspections WHERE operator = ?').bind(name).run();
    return json({ ok: true, removed: Number(cnt?.n || 0) });
  }

  if (url.pathname === '/api/visits' && method === 'DELETE') {
    const deny = requireManager();
    if (deny) return deny;
    const code = clean(url.searchParams.get('code'), 40);
    if (!code) return json({ error: 'کد پرسنلی مشخص نیست.' }, 400);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM logins WHERE user_code = ?').bind(code),
      env.DB.prepare('DELETE FROM presence WHERE user_code = ?').bind(code),
    ]);
    return json({ ok: true });
  }

  /* ---- آموزش پیش‌فرض هر نوع دستگاه ---- */
  if (url.pathname === '/api/guides' && method === 'POST') {
    const deny = requireManager();
    if (deny) return deny;
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const saved = {};
    for (const type of ['forklift', 'reachstacker', 'transtainer']) {
      if (body[type] === undefined) continue;
      saved[type] = cleanGuide(body[type]);
      await setSetting(env, 'guide_' + type, saved[type]);
    }
    return json({ ok: true, guides: saved });
  }

  /* ---- تجهیزات ---- */
  if (url.pathname === '/api/equipment' && method === 'POST') {
    const deny = requireManager();
    if (deny) return deny;
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const code = clean(body.code, 30).toUpperCase();
    const name = clean(body.name, 80);
    if (!code || !name) return json({ error: 'کد و نام تجهیز الزامی است.' }, 400);
    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) {
      return json({ error: 'کد تجهیز فقط می‌تواند حروف انگلیسی، رقم، خط تیره و زیرخط باشد.' }, 400);
    }
    const exists = await env.DB.prepare('SELECT id FROM equipment WHERE code = ?').bind(code).first();
    if (exists) return json({ error: 'این کد تجهیز قبلاً ثبت شده است.' }, 409);

    const type = ['forklift', 'reachstacker', 'transtainer'].includes(body.type)
      ? body.type
      : 'forklift';
    const periodRaw = Number(body.period);
    const period = Number.isInteger(periodRaw) && periodRaw >= 1 && periodRaw <= 365 ? periodRaw : 30;

    const row = {
      id: 'eq_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16),
      code,
      name,
      type,
      model: clean(body.model, 60),
      capacity: clean(body.capacity, 40),
      site: clean(body.site, 60),
      period,
      active: true,
    };

    await env.DB.prepare(
      'INSERT INTO equipment (id, code, name, type, model, capacity, site, period, active, created_at) VALUES (?,?,?,?,?,?,?,?,1,?)'
    ).bind(row.id, row.code, row.name, row.type, row.model, row.capacity, row.site, row.period, Date.now()).run();

    return json({ ok: true, equipment: row });
  }

  const eqMatch = url.pathname.match(/^\/api\/equipment\/([A-Za-z0-9_]{1,40})$/);

  if (eqMatch && method === 'PATCH') {
    const deny = requireManager();
    if (deny) return deny;
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const eq = await env.DB.prepare('SELECT id, site, period, guide FROM equipment WHERE id = ?').bind(eqMatch[1]).first();
    if (!eq) return json({ error: 'تجهیز یافت نشد.' }, 404);

    let period = Number(eq.period) || 30;
    if (body.period !== undefined) {
      const p = Number(body.period);
      if (!Number.isInteger(p) || p < 1 || p > 365) {
        return json({ error: 'دوره بازرسی باید عددی بین ۱ تا ۳۶۵ روز باشد.' }, 400);
      }
      period = p;
    }
    const site = body.site === undefined ? eq.site || '' : clean(body.site, 60);
    const guide = body.guide === undefined ? (eq.guide || '') : cleanGuide(body.guide);

    await env.DB.prepare('UPDATE equipment SET period = ?, site = ?, guide = ? WHERE id = ?')
      .bind(period, site, guide, eqMatch[1])
      .run();
    return json({ ok: true, period, site, guide });
  }

  if (eqMatch && method === 'DELETE') {
    const deny = requireManager();
    if (deny) return deny;
    const eq = await env.DB.prepare('SELECT id FROM equipment WHERE id = ?').bind(eqMatch[1]).first();
    if (!eq) return json({ error: 'تجهیز یافت نشد.' }, 404);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM inspections WHERE eq_id = ?').bind(eqMatch[1]),
      env.DB.prepare('DELETE FROM equipment WHERE id = ?').bind(eqMatch[1]),
    ]);
    return json({ ok: true });
  }

  /* ---- چک‌لیست ---- */
  if (url.pathname === '/api/checklist' && method === 'POST') {
    const deny = requireManager();
    if (deny) return deny;
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'داده ارسالی نامعتبر است.' }, 400);
    }
    const label = clean(body.label, 160);
    if (label.length < 3) return json({ error: 'متن آیتم باید حداقل ۳ نویسه باشد.' }, 400);
    const all = await env.DB.prepare('SELECT id FROM checklist ORDER BY position, rowid').all();
    const rows = all.results || [];
    if (rows.length >= 40) return json({ error: 'حداکثر ۴۰ آیتم مجاز است.' }, 400);
    const id = 'ck_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    await env.DB.prepare('INSERT INTO checklist (id, label, position) VALUES (?,?,?)')
      .bind(id, label, rows.length + 1)
      .run();
    return json({ ok: true, item: { id, label } });
  }

  const chkMatch = url.pathname.match(/^\/api\/checklist\/([A-Za-z0-9_]{1,40})$/);
  if (chkMatch && method === 'DELETE') {
    const deny = requireManager();
    if (deny) return deny;
    const left = await env.DB.prepare('SELECT COUNT(*) AS n FROM checklist').first();
    if (Number(left?.n || 0) <= 1) {
      return json({ error: 'حداقل یک آیتم باید در چک‌لیست باقی بماند.' }, 400);
    }
    await env.DB.prepare('DELETE FROM checklist WHERE id = ?').bind(chkMatch[1]).run();
    return json({ ok: true });
  }

  return json({ error: 'مسیر یافت نشد.' }, 404);
}

/** تاریخ میلادی کوتاه برای مواردی که تاریخ شمسی از مرورگر نرسیده باشد */
function jDateOnly(at) {
  const d = new Date(at + 3.5 * 3600 * 1000);
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}
