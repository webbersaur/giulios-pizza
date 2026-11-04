// Exercises api/contact.js without sending real mail.
process.env.RESEND_API_KEY = 'test-key';
const handler = require('../api/contact.js');

let lastSent = null;
global.fetch = async (url, opts) => {
  lastSent = JSON.parse(opts.body);
  return { ok: true, text: async () => '' };
};

function mockRes() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

const GOOD_ORIGIN = 'https://giuliospizza.com';
const LEGIT = {
  form: 'catering', name: 'Dave Kowalski', phone: '(203) 758-4410',
  email: 'dave@gmail.com', 'event-type': 'graduation', date: '2027-06-12', guests: '60',
  message: 'Graduation party in the backyard, need trays of baked ziti and chicken parm.',
  _elapsed: 45000,
};

// want: an HTTP code, or 'sent' (200 + mail went out) / 'drop' (fake 200, no mail)
const cases = [
  ['legit estimate',            GOOD_ORIGIN, LEGIT, 'sent'],
  ['no _elapsed (scripted post)', GOOD_ORIGIN, omit(LEGIT, '_elapsed'), 400],
  ['legit, phone with +1',      GOOD_ORIGIN, { ...LEGIT, phone: '+1 203-758-4410' }, 'sent'],
  ['legit, real 555 exchange',  GOOD_ORIGIN, { ...LEGIT, phone: '203-555-2368' }, 'sent'],
  ['legit, international',      GOOD_ORIGIN, { ...LEGIT, phone: '+44 20 7946 0958' }, 'sent'],
  ['555 area code',             GOOD_ORIGIN, { ...LEGIT, phone: '(555) 123-4567' }, 'drop'],
  ['555-01xx fictional',        GOOD_ORIGIN, { ...LEGIT, phone: '(203) 555-0123' }, 'drop'],
  ['all one digit',             GOOD_ORIGIN, { ...LEGIT, phone: '111-111-1111' }, 'drop'],
  ['area code starts with 1',   GOOD_ORIGIN, { ...LEGIT, phone: '(123) 456-7890' }, 400],
  ['exchange starts with 0',    GOOD_ORIGIN, { ...LEGIT, phone: '(203) 012-3456' }, 400],
  ['N11 area code',             GOOD_ORIGIN, { ...LEGIT, phone: '(911) 758-4410' }, 400],
  ['legit, www host',          'https://www.giuliospizza.com', LEGIT, 'sent'],
  ['legit, vercel preview',     'https://giulios-pizza-abc123.vercel.app', LEGIT, 'sent'],
  ['legit, localhost dev',      'http://localhost:8080', LEGIT, 'sent'],
  ['legit w/ one photo link',   GOOD_ORIGIN, { ...LEGIT, message: 'Photos here: https://photos.app/xyz thanks' }, 'sent'],
  ['legit w/ one .com link',   GOOD_ORIGIN, { ...LEGIT, message: 'Photos: https://drive.google.com/x thanks' }, 'sent'],
  ['accented name',             GOOD_ORIGIN, { ...LEGIT, name: 'José Müller' }, 'sent'],

  ['NO origin header',          null, LEGIT, 403],
  ['foreign origin',            'https://spammer.ru', LEGIT, 403],
  ['lookalike host',            'https://giuliospizza.com.evil.ru', LEGIT, 403],
  ['honeypot: website',         GOOD_ORIGIN, { ...LEGIT, website: 'http://x.ru' }, 'drop'],
  ['honeypot: legacy _honey',   GOOD_ORIGIN, { ...LEGIT, _honey: 'x' }, 'drop'],
  ['submitted in 900ms',        GOOD_ORIGIN, { ...LEGIT, _elapsed: 900 }, 'drop'],
  ['missing phone',             GOOD_ORIGIN, omit(LEGIT, 'phone'), 400],
  ['junk email',                GOOD_ORIGIN, { ...LEGIT, email: 'notanemail' }, 400],
  ['no name',                   GOOD_ORIGIN, omit(LEGIT, 'name'), 400],
  ['two links in message',      GOOD_ORIGIN, { ...LEGIT, message: 'visit http://a.xyz and http://b.top' }, 422],
  ['link in the name field',    GOOD_ORIGIN, { ...LEGIT, name: 'cheapseo.ru' }, 422],
  ['cyrillic body',             GOOD_ORIGIN, { ...LEGIT, message: 'Здравствуйте, предлагаем услуги' }, 422],
  ['SEO pitch, one link',       GOOD_ORIGIN, { ...LEGIT, message: 'We offer SEO and backlink packages, see agency.top' }, 422],
  ['anchor tag injection',      GOOD_ORIGIN, { ...LEGIT, message: 'Hi <a href="http://x.ru">click</a>' }, 422],
];

function omit(o, k) { const c = { ...o }; delete c[k]; return c; }

(async () => {
  let pass = 0, fail = 0;
  for (const [label, origin, body, want] of cases) {
    const req = { method: 'POST', headers: origin ? { origin } : {}, body };
    const res = mockRes();
    lastSent = null;
    await handler(req, res);
    const ok = want === 'sent' ? res.code === 200 && lastSent !== null
      : want === 'drop' ? res.code === 200 && lastSent === null
      : res.code === want;
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(res.code).padEnd(4)} (want ${want})  ${label}`);
    if (!ok) console.log(`        body: ${JSON.stringify(res.body)}`);
  }

  // subject must never come from the request
  lastSent = null;
  const res = mockRes();
  await handler({ method: 'POST', headers: { origin: GOOD_ORIGIN },
    body: { ...LEGIT, subject: 'BUY CHEAP PILLS NOW' } }, res);
  const clean = lastSent && lastSent.subject === "New Catering Inquiry - Giulio's Pizza";
  clean ? pass++ : fail++;
  console.log(`${clean ? 'PASS' : 'FAIL'}  subject injection ignored -> ${lastSent && lastSent.subject}`);

  // GET is still rejected
  const res2 = mockRes();
  await handler({ method: 'GET', headers: {} }, res2);
  res2.code === 405 ? pass++ : fail++;
  console.log(`${res2.code === 405 ? 'PASS' : 'FAIL'}  GET -> ${res2.code}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
