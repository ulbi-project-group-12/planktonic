// The onboarding walk: a visitor registers from the landing page, signs in, creates a workspace and
// invites a guest by link; the guest registers, comes back to the invite and joins; the used link
// then says so; the owner renames themself in the profile. Everything goes through the real api
// of the stand. walk.mjs records it: `pnpm demo:walk --walk onboarding`.
//
// What this walk holds to, on top of walk.mjs's rules:
// - NO FULL RELOAD OF A SIGNED-IN WINDOW. The access token lives in the page's memory and the api
//   has no refresh endpoint yet, so a reload signs the user out. Window A moves by clicks only.
//   Window B does reload when it opens the invite link, exactly like a person following a link:
//   that is why the guest is asked to sign in.
// - THE PASSWORD NEVER LEAVES THIS PROCESS. It is random per run, typed into password fields
//   (shown as dots) and never logged or written to a file.
// - EVERY CAPTION IS CHECKED, in the page and, where the page cannot show it, through the api.
import { randomBytes } from 'node:crypto';
import { PEOPLE, TIME_ZONE, WORKSPACE } from './beats-onboarding.mjs';

export const layout = 'solo';
/** Chrome in UTC, so the profile's default time zone is not this machine's. */
export const chromeEnv = { TZ: 'UTC' };

/** In the api's built-in list of breached passwords, so the answer needs no outside service. */
const BREACHED_PASSWORD = 'correcthorsebatterystaple';
const PASSWORD = `${randomBytes(15).toString('base64url')}aZ7`;

const js = (v) => JSON.stringify(v);
/** The n-th visible button or link with exactly this text. */
const button = (text, nth = 0) =>
  `[...document.querySelectorAll('button, a')].filter((el) => el.innerText.trim() === ${js(text)} && el.getBoundingClientRect().width)[${nth}]`;
const field = (label) =>
  `[...document.querySelectorAll('label')].find((l) => l.innerText.trim().replace(/\\*$/, '') === ${js(label)})?.control`;
const TERMS = `document.querySelector('button[role="checkbox"]')`;
const LOGIN_PASSWORD = `document.querySelector('input[autocomplete="current-password"]')`;
const INVITE_LINK = `document.querySelector('input[aria-label="Invite-ссылка"]')`;
const USER_MENU = `document.querySelector('button[aria-label^="Меню пользователя"]')`;
const menuItem = (text) =>
  `[...document.querySelectorAll('[role="menuitem"]')].find((el) => el.innerText.includes(${js(text)}))`;
const TZ_SELECT = `document.querySelector('button[aria-label="Часовой пояс"]')`;
const TZ_SEARCH = `document.querySelector('[data-slot="select-search"] input')`;
const tzOption = (value) => `document.querySelector('[role="option"][data-value=${js(value)}]')`;
const atPath = (path) => `location.pathname === ${js(path)}`;
/** A DOM node cannot be returned to this process: wait for its presence instead. */
const has = (selector) => `!!(${selector})`;
const shows = (text) => `document.body.innerText.includes(${js(text)})`;

export async function prepare({ cdp, a, base }) {
  // "Копировать" writes to the clipboard; headless Chrome asks nobody, so the walk allows it.
  await cdp.send('Browser.grantPermissions', {
    browserContextId: a.contextId,
    origin: base,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  const zone = await a.eval('Intl.DateTimeFormat().resolvedOptions().timeZone');
  if (zone !== 'UTC') throw new Error(`Chrome runs in ${zone}, not UTC`);
  // The landing page is loaded before the recording starts, so the video opens on it.
  await a.goto('/');
  return {};
}

/** A request to the stand's api from this process, as one of the walk's users. */
async function api(base, person, path) {
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: person.email, password: PASSWORD }),
  });
  if (!login.ok) throw new Error(`api login as ${person.email}: ${login.status}`);
  const { accessToken } = await login.json();
  const response = await fetch(`${base}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`GET ${path}: ${response.status}`);
  return response.json();
}

async function fill(w, win, selector, text, delay = 30) {
  await w.click(win, selector, 150);
  await w.type(win, text, delay);
}

async function fillRegistration(w, win, person, password) {
  await fill(w, win, field('Имя'), person.name);
  await fill(w, win, field('Email'), person.email);
  await fill(w, win, field('Пароль'), password, 16);
  await fill(w, win, field('Повторите пароль'), password, 16);
  await w.click(win, TERMS, 250);
}

async function signIn(w, win, person) {
  await fill(w, win, field('Email'), person.email);
  await fill(w, win, LOGIN_PASSWORD, PASSWORD, 16);
  await w.click(win, button('Войти'), 300);
}

export async function scenario(w) {
  const { a, b, sleep, log } = w;
  const { owner, guest } = PEOPLE;

  /* ── the landing page and its button ─────────────────────────────────────────────────────── */
  await a.waitFor(has(button('Зарегистрироваться', 1)), 'the landing page');
  await sleep(700);
  await w.beat('landing');
  await w.hold();
  await a.eval(`window.scrollTo({ top: 620, behavior: 'smooth' })`);
  await sleep(2200);
  await a.eval(`window.scrollTo({ top: 0, behavior: 'smooth' })`);
  await sleep(1100);
  // The button in the hero; the session check behind it sends a guest to the registration.
  await w.click(a, button('Зарегистрироваться', 1), 300);
  await a.waitFor(atPath('/register'), 'the registration page');
  await a.waitFor(has(field('Имя')), 'the registration form');

  /* ── registration: a breached password is refused, a new one is accepted ─────────────────── */
  await w.beat('register');
  await w.hold();
  await fillRegistration(w, a, owner, BREACHED_PASSWORD);
  await w.click(a, button('Создать аккаунт'), 300);
  await a.waitFor(shows('встречался в утечках'), 'the breached-password message');
  await w.beat('weak-password');
  await w.hold();
  for (const label of ['Пароль', 'Повторите пароль']) {
    await w.click(a, field(label), 150);
    await a.eval('document.activeElement.select()');
    await w.type(a, PASSWORD, 16);
  }
  await w.click(a, button('Создать аккаунт'), 300);
  const registered = await a.waitFor(
    `${atPath('/login')} ? 'ok' : ${shows('уже зарегистрирован')} ? 'taken' : null`,
    'the account to be created',
  );
  if (registered === 'taken')
    throw new Error(`${owner.email} already exists: run stand.sh reset first`);
  await a.waitFor(has(LOGIN_PASSWORD), 'the login form');

  /* ── login: no workspaces yet, so the wizard opens ───────────────────────────────────────── */
  await w.beat('login');
  await w.hold();
  await signIn(w, a, owner);
  await a.waitFor(atPath('/workspaces/create'), 'the create-workspace wizard');
  await a.waitFor(has(field('Название')), 'the wizard form');
  await sleep(500);

  /* ── the wizard: name and address, then the invite link ──────────────────────────────────── */
  await w.beat('workspace-create');
  await fill(w, a, field('Название'), WORKSPACE.name, 45);
  await a.waitFor(`(${field('Адрес')}).value === ${js(WORKSPACE.slug)}`, 'the suggested address');
  await w.hold();
  await w.click(a, button('Продолжить'), 300);
  await a.waitFor(shows('Пригласите участников'), 'step 2');
  await a.waitFor(`!!(${INVITE_LINK})?.value`, 'the invite link of step 2');
  await w.beat('workspace-invite-step');
  await w.hold();
  await w.click(a, button('Открыть пространство'), 300);
  await a.waitFor(atPath(`/workspaces/${WORKSPACE.slug}`), 'the workspace page');
  await a.waitFor(has(button('Пригласить')), 'the invite button');
  await sleep(400);

  /* ── the workspace: the invite dialog, the link is copied ────────────────────────────────── */
  await w.beat('dashboard');
  await w.hold();
  await w.click(a, button('Пригласить'), 300);
  await a.waitFor(`!!(${INVITE_LINK})?.value`, 'the invite link');
  await sleep(1200);
  await w.click(a, button('Копировать'), 300);
  await a.waitFor(has(button('Скопировано')), 'the copied state');
  const link = await a.eval(`(${INVITE_LINK}).value`);
  if ((await a.eval('navigator.clipboard.readText()')) !== link)
    throw new Error('the clipboard does not hold the invite link');
  const invitePath = new URL(link).pathname;
  if (new URL(link).origin !== w.base || !/^\/invite\/[\w-]{20,}$/.test(invitePath))
    throw new Error('the invite link is not an invite address of this stand');
  log('invite: the link on screen is in the clipboard');
  await w.beat('link-copied');
  await w.hold();
  // The dialog is closed before the frame narrows: in a narrow window it is a bottom sheet wide
  // enough to show the whole link, and a video should not carry an invite token.
  await w.press(a, 'Escape', 27);
  await a.waitFor(`!document.querySelector('[role="dialog"]')`, 'the dialog to close');
  await sleep(600);

  /* ── the guest: link → login → registration → login → the invite again ───────────────────── */
  await w.setLayout('pair');
  await b.goto(invitePath);
  await b.waitFor(`${atPath('/login')} && location.search.includes('next=')`, 'the login screen');
  await b.waitFor(has(LOGIN_PASSWORD), 'the login form');
  await sleep(500);
  await w.beat('guest-opens');
  await w.hold();
  await w.click(b, button('Зарегистрироваться'), 300);
  await b.waitFor(`${atPath('/register')} && location.search.includes('next=')`, 'registration');
  await b.waitFor(has(field('Имя')), 'the registration form');
  await w.beat('guest-register');
  await w.hold();
  await fillRegistration(w, b, guest, PASSWORD);
  await w.click(b, button('Создать аккаунт'), 300);
  await b.waitFor(`${atPath('/login')} && location.search.includes('next=')`, 'the login screen');
  await b.waitFor(has(LOGIN_PASSWORD), 'the login form');
  await w.beat('guest-login');
  await w.hold();
  await signIn(w, b, guest);
  await b.waitFor(atPath(invitePath), 'the invite page');
  await b.waitFor(has(button('Присоединиться')), 'the invite');
  const invite = await b.eval(`document.querySelector('main, body').innerText`);
  if (!invite.includes(WORKSPACE.name) || !invite.includes('Ваша роль: Участник'))
    throw new Error(`the invite page says: ${invite.replace(/\s+/g, ' ').slice(0, 200)}`);
  await w.beat('guest-invite');
  await w.hold();
  await w.click(b, button('Присоединиться'), 300);
  await b.waitFor(atPath(`/workspaces/${WORKSPACE.slug}`), 'the workspace page in B');
  await b.waitFor(shows(`workspaceSlug = ${WORKSPACE.slug}`), 'the workspace page');
  await sleep(500);

  /* ── joined: the members list has no screen yet, so the api is asked ─────────────────────── */
  const members = await api(w.base, owner, `/api/workspaces/${WORKSPACE.slug}/members`);
  const got = members.map((m) => `${m.name}:${m.role}`).sort();
  const want = [`${owner.name}:OWNER`, `${guest.name}:MEMBER`].sort();
  if (js(got) !== js(want)) throw new Error(`members are ${js(got)}, not ${js(want)}`);
  log(`members: ${got.join(', ')}`);
  await w.beat('joined');
  await w.hold();

  /* ── the same link again: sign-in, then the message about a used link ────────────────────── */
  await b.goto(invitePath);
  await b.waitFor(`${atPath('/login')} && location.search.includes('next=')`, 'the login screen');
  await b.waitFor(has(LOGIN_PASSWORD), 'the login form');
  await sleep(400);
  await w.beat('used-link');
  await w.hold();
  await signIn(w, b, guest);
  await b.waitFor(atPath(invitePath), 'the invite page');
  await b.waitFor(shows('Ссылка уже использована'), 'the used-link message');
  if (await b.eval(`!!(${button('Присоединиться')})`))
    throw new Error('a used link still offers to join');
  await w.beat('used-link-message');
  await w.hold();

  /* ── the profile: a new name and a time zone ─────────────────────────────────────────────── */
  await w.setLayout('solo');
  await a.waitFor(
    `(${USER_MENU})?.innerText.includes(${js(owner.name)})`,
    'the name in the header',
  );
  await w.beat('profile');
  await w.click(a, USER_MENU, 400);
  await w.click(a, menuItem('Настройки профиля'), 300);
  await a.waitFor(atPath('/settings/profile'), 'the profile page');
  await a.waitFor(`(${field('Имя')})?.value === ${js(owner.name)}`, 'the profile form');
  await w.hold();
  await w.click(a, field('Имя'), 150);
  await a.eval('document.activeElement.select()');
  await w.type(a, owner.renamed, 55);
  await w.click(a, TZ_SELECT, 400);
  await a.waitFor(has(TZ_SEARCH), 'the time zone list');
  await w.type(a, TIME_ZONE.search, 70);
  await sleep(500);
  await w.click(a, tzOption(TIME_ZONE.value), 400);
  await a.waitFor(`(${TZ_SELECT}).innerText.includes(${js(TIME_ZONE.value)})`, 'the chosen zone');
  await w.click(a, button('Сохранить'), 300);
  await a.waitFor(shows('Профиль обновлён'), 'the saved toast');
  await a.waitFor(
    `(${USER_MENU}).getAttribute('aria-label') === ${js(`Меню пользователя ${owner.renamed}`)} && (${USER_MENU}).innerText.includes(${js(owner.renamed)})`,
    'the new name in the header',
  );
  const me = await api(w.base, owner, '/api/auth/me');
  if (me.name !== owner.renamed || me.tz !== TIME_ZONE.value)
    throw new Error(`the api has ${js({ name: me.name, tz: me.tz })}`);
  log(`profile: the api has ${me.name}, ${me.tz}`);
  await w.beat('profile-saved');
  await w.hold();
}
