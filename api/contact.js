// Serverless function (Vercel) - receives catering inquiry posts and sends
// them via Resend (https://resend.com) to Sal. Ported from martins-website.
//
// Required env var:  RESEND_API_KEY   - your Resend API key
// Optional env vars:
//   CONTACT_TO    - recipient (default sal@giuliospizza.com)
//   RESEND_FROM   - verified sender (default noreply@webbersaurus.com - the
//                   webbersaurus.com domain is already verified in the shared
//                   Resend account, so no per-site DNS setup is needed).
//
// CommonJS + global fetch (Node 18+) so it runs with zero dependencies - no
// package.json / npm install needed.
//
// SPAM DEFENSES (added 2026-08-09, in the order they run):
//   1. Origin/Referer allowlist - blocks bots that POST here without ever
//      loading a page. This is the big one; a scanned endpoint with no origin
//      check defeats every other measure below.
//   2. Honeypots - `website` (the bait bots fill) and legacy `_honey`.
//   3. Time-to-submit - the client sends `_elapsed` ms since form render;
//      under MIN_ELAPSED_MS means nobody typed it. REQUIRED since 2026-10-20:
//      both forms always send it, so a post without it is a script that faked
//      the Origin header. A missing value gets a "please call us" error rather
//      than a fake 200, so a rare no-JS visitor is not silently lost.
//   4. Field validation - required fields per form type, real email shape, and
//      a phone that is a plausible real US number (2026-10-20: bots were
//      sending roof-estimate leads with 555 area codes, which passed a plain
//      digit count). Fictional 555 numbers are dropped with a fake 200.
//   5. Content scoring - links, non-Latin script, markup, and spam phrases.
// Honeypot and timing rejections return a fake 200 so bots learn nothing.
// Validation and content rejections return an error so a false-positive human
// sees "please call us" instead of believing the message was delivered.

// --- tuning knobs -----------------------------------------------------------
const ALLOWED_HOSTS = [
  'giuliospizza.com',
  'www.giuliospizza.com',
];
const MIN_ELAPSED_MS = 3000;   // faster than this = not a human typing
const SPAM_SCORE_LIMIT = 2;    // reject at or above this score
const MAX_FIELD_LEN = 5000;

// Subjects are chosen HERE, never taken from the request - a posted `subject`
// used to land straight in the shop's inbox subject line.
const SUBJECTS = {
  catering: "New Catering Inquiry - Giulio's Pizza",
};

const SPAM_PHRASES = [
  'seo', 'backlink', 'link building', 'guest post', 'search engine optim',
  'digital marketing', 'web design', 'website design', 'web development',
  'crypto', 'bitcoin', 'forex', 'casino', 'viagra', 'cialis', 'escort',
  'loan offer', 'investment opportunity', 'business proposal',
  'increase your traffic', 'increase your sales', 'rank higher',
  'first page of google', 'top of google', 'unsubscribe',
  'dear sir', 'dear owner', 'dear webmaster', 'telegram', 'whatsapp',
];

// Cyrillic, Armenian/Hebrew, Arabic, CJK, kana, Hangul. Accented Latin (José,
// Müller) is deliberately NOT here - those are real Connecticut customers.
const NON_LATIN = /[Ѐ-ӿ԰-׿؀-ۿ一-鿿぀-ヿ가-힯]/;
// Whole URLs are consumed first, so one https://x.com link counts once, not twice.
const URL_RE = /(https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(?:com|net|org|ru|cn|xyz|top|info|biz|online|site|shop)\b)/gi;
const MARKUP_RE = /(<a\s|<\/a>|\[url|\[link|<script)/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Origin check - must have come from one of our own pages.
  if (!hostAllowed(requestHost(req))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});

  // 2. Honeypots - a real user never fills these. Pretend success.
  if (str(body.website) || str(body._honey)) {
    return res.status(200).json({ ok: true });
  }

  // 3. Time-to-submit. Only enforced when the client sent it, so a no-JS
  //    native form POST still works.
  const elapsed = Number(body._elapsed);
  if (str(body._elapsed) === '' || !isFinite(elapsed)) {
    return res.status(400).json({
      error: 'Your message could not be sent. Please call us at (203) 239-3515.',
    });
  }
  if (elapsed >= 0 && elapsed < MIN_ELAPSED_MS) {
    return res.status(200).json({ ok: true });
  }

  const name = str(body.name);
  const phone = str(body.phone);
  const email = str(body.email);
  const service = str(body['event-type']);
  const eventDate = str(body.date);
  const guests = str(body.guests);
  const town = '';
  const message = str(body.message);

  // Fictional 555 numbers: no real customer has one. Pretend success.
  if (phone && phoneVerdict(phone) === 'fake') {
    return res.status(200).json({ ok: true });
  }

  const formType = SUBJECTS[str(body.form)] ? str(body.form) : 'catering';
  const subject = SUBJECTS[formType];

  // 4. Required fields + real shapes. The catering form requires name, phone
  //    and email.
  const problem = validate(formType, { name, phone, email, message });
  if (problem) return res.status(400).json({ error: problem });

  // 5. Content scoring.
  if (spamScore({ name, phone, email, service, town, message }) >= SPAM_SCORE_LIMIT) {
    return res.status(422).json({
      error: 'Your message could not be sent. Please call us at (203) 239-3515.',
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  const to = process.env.CONTACT_TO || 'sal@giuliospizza.com';
  const from = process.env.RESEND_FROM || "Giulio's Pizza Website <noreply@webbersaurus.com>";

  const rows = [
    ['Name', name],
    ['Phone', phone],
    ['Email', email],
    ['Event type', service],
    ['Event date', eventDate],
    ['Guests', guests],
    ['Message', message],
  ].filter(function (r) { return r[1]; });

  const html =
    '<h2 style="font-family:Arial,sans-serif">' + esc(subject) + '</h2>' +
    '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:15px">' +
    rows.map(function (r) {
      return '<tr>' +
        '<td style="font-weight:bold;vertical-align:top;color:#8B0000">' + esc(r[0]) + '</td>' +
        '<td>' + esc(r[1]).replace(/\n/g, '<br>') + '</td>' +
      '</tr>';
    }).join('') +
    '</table>';

  const text = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');

  const payload = {
    from: from,
    to: [to],
    subject: subject,
    html: html,
    text: text,
  };
  if (email) payload.reply_to = email;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error('Resend error', r.status, detail);
      return res.status(502).json({ error: 'Could not send your message. Please call us.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact handler error', err);
    return res.status(500).json({ error: 'Could not send your message. Please call us.' });
  }
};

// --- origin ----------------------------------------------------------------

function requestHost(req) {
  // Origin is sent on same-origin POSTs (fetch and native form submits alike);
  // Referer is the fallback for the rare browser that omits it.
  const src = str(req.headers.origin) || str(req.headers.referer);
  if (!src) return '';
  try { return new URL(src).host.toLowerCase(); } catch (e) { return ''; }
}

function hostAllowed(host) {
  if (!host) return false;
  if (ALLOWED_HOSTS.indexOf(host) !== -1) return true;
  // Vercel preview + the project's own *.vercel.app URL
  if (/^giulios-pizza[a-z0-9-]*\.vercel\.app$/.test(host)) return true;
  // Local dev (python3 -m http.server / vercel dev)
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return true;
  return false;
}

// --- validation ------------------------------------------------------------

function validate(formType, f) {
  if (!f.name) return 'Please tell us your name.';
  if (f.name.length > 100) return 'Please shorten your name.';

  if (!validPhone(f.phone)) return 'Please enter a phone number we can reach you at.';
  if (!validEmail(f.email)) return 'Please enter a valid email address.';
  return '';
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) && v.length <= 254;
}

function validPhone(v) {
  return phoneVerdict(v) === 'ok';
}

// 'ok' | 'fake' (fictional 555 numbers, one repeated digit) | 'invalid'.
// 10 digits (or 11 with a leading 1) are checked against North American
// numbering rules; 12-15 digits are let through as international.
function phoneVerdict(v) {
  let d = v.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  if (d.length > 10 && d.length <= 15) return 'ok';
  if (d.length !== 10) return 'invalid';
  if (/^(\d)\1+$/.test(d)) return 'fake';
  const area = d.slice(0, 3), exch = d.slice(3, 6), line = d.slice(6);
  if (area === '555') return 'fake';
  if (exch === '555' && /^01\d\d$/.test(line)) return 'fake';
  if (/^[01]/.test(area) || /^[01]/.test(exch)) return 'invalid';
  if (/^[2-9]11$/.test(area) || /^[2-9]11$/.test(exch)) return 'invalid';
  return 'ok';
}

// --- content scoring -------------------------------------------------------

function spamScore(f) {
  let score = 0;

  // Links anywhere in a short identity field are a near-certain tell. One link
  // in the message body is not - customers do paste photo album URLs.
  const identity = [f.name, f.phone, f.email.replace(/@.*/, ''), f.service, f.town].join(' ');
  if (countUrls(identity) > 0) score += 3;

  const urls = countUrls(f.message);
  if (urls >= 2) score += 2;
  else if (urls === 1) score += 1;

  const all = [f.name, f.service, f.town, f.message].join(' ');
  if (NON_LATIN.test(all)) score += 3;
  if (MARKUP_RE.test(all)) score += 2;

  let phraseHits = 0;
  const hay = all.toLowerCase();
  for (const p of SPAM_PHRASES) {
    if (new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(hay)) {
      phraseHits++;
      if (phraseHits >= 3) break;
    }
  }
  score += phraseHits;

  return score;
}

function countUrls(s) {
  const m = String(s).match(URL_RE);
  return m ? m.length : 0;
}

// --- misc ------------------------------------------------------------------

function str(v) { return (v == null ? '' : String(v)).trim().slice(0, MAX_FIELD_LEN); }
function safeParse(s) { try { return JSON.parse(s); } catch (e) { return {}; } }
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
