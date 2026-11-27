// The script of the onboarding video: from the landing page to a workspace with two members, on
// the real api (no mocks). Same shape as beats.mjs; scenario-onboarding.mjs plays it.
//
//   pnpm demo:walk --walk onboarding --out <dir> --base http://127.0.0.1:58290

/** The people on screen. Fictional, and the addresses end in .invalid, so nothing can be sent. */
export const PEOPLE = {
  owner: { name: 'Вера Тест', renamed: 'Вера Владелец', email: 'vera@demo.invalid' },
  guest: { name: 'Глеб Гость', email: 'gleb@demo.invalid' },
};
export const WORKSPACE = { name: 'Демо-команда', slug: 'demo-komanda' };
/** The zone the owner picks in the profile; Chrome itself runs in UTC (scenario `chromeEnv`). */
export const TIME_ZONE = { search: 'Berlin', value: 'Europe/Berlin' };

/** The labels over the windows. */
export const LABELS = {
  a: `Окно A — ${PEOPLE.owner.name.split(' ')[0]}, владелец`,
  b: `Окно B — ${PEOPLE.guest.name.split(' ')[0]}, гость`,
};

/** On-screen captions (short, Russian). A caption shows from its first beat to the next one's. */
export const CAPTIONS = {
  landing: 'Главная страница: лендинг и кнопка «Зарегистрироваться»',
  register: 'Регистрация: пароль из утечек не проходит, нужен свой, от 15 символов',
  login: 'Вход. Пространств ещё нет — сразу открывается мастер создания',
  workspace: 'Мастер пространства: название и адрес, затем ссылка-приглашение',
  invite: 'Владелец приглашает из пространства: роль и одноразовая ссылка',
  guest: 'Гость открывает ссылку: регистрация, вход — и он снова на приглашении',
  joined: 'Гость присоединился. По API в пространстве двое: владелец и участник',
  usedLink: 'Та же ссылка второй раз: после входа — «Ссылка уже использована»',
  profile: 'Профиль: имя и часовой пояс сохраняются на сервере, имя в шапке обновляется',
  next: 'Что уже готово, но пока без экрана',
};

/** The beats, in order. `hold` is how long (s) the beat sits on screen before the next action. */
export const BEATS = [
  { id: 'landing', caption: 'landing', hold: 3.5 },
  { id: 'register', caption: 'register', hold: 1.5 },
  { id: 'weak-password', hold: 4 },
  { id: 'login', caption: 'login', hold: 1.5 },
  { id: 'workspace-create', caption: 'workspace', hold: 2 },
  { id: 'workspace-invite-step', hold: 4 },
  { id: 'dashboard', caption: 'invite', hold: 2.5 },
  { id: 'link-copied', hold: 3.5 },
  { id: 'guest-opens', caption: 'guest', hold: 3 },
  { id: 'guest-register', hold: 1 },
  { id: 'guest-login', hold: 1 },
  { id: 'guest-invite', hold: 4 },
  { id: 'joined', caption: 'joined', hold: 5.5 },
  { id: 'used-link', caption: 'usedLink', hold: 1.5 },
  { id: 'used-link-message', hold: 4.5 },
  { id: 'profile', caption: 'profile', hold: 2 },
  { id: 'profile-saved', hold: 5.5 },
  { id: 'next', caption: 'next', hold: 9 },
];

/** The poster is cut one second into this beat. */
export const POSTER = 'guest-invite';

/**
 * The closing card. Plain text, not a recording: work that is merged but has no screen to show
 * (or a screen whose api is not merged yet). The walk never fakes a screen for these.
 */
export const CARD = {
  beat: 'next',
  caption: 'next',
  title: 'Готово, но в видео не показано',
  groups: [
    {
      title: 'Работает в API, экрана ещё нет',
      items: [
        'Проекты пространства: список, создание, один проект — /api/workspaces/:slug/projects',
        'Участники пространства и смена ролей — /api/workspaces/:slug/members',
      ],
    },
    {
      title: 'Готовый компонент, пока не на страницах',
      items: ['Markdown: безопасный рендер текста сообщений (есть в Storybook)'],
    },
    {
      title: 'Экран есть, API ещё нет',
      items: [
        'Устройства и сеансы',
        'Восстановление сессии после перезагрузки страницы (refresh-токен)',
      ],
    },
  ],
  note: 'В видео — только то, что работает на main с настоящим API, без моков.',
};

/** The click-through demo: one step per still (`<beat>:<tag>`, see beats.mjs). */
export const GUIDE = {
  title: 'От лендинга до пространства с двумя участниками',
  lede: 'Живой стенд: web и две копии api за Traefik, Postgres и Redis, без моков. Окно A — владелец, окно B — гость; это разные профили браузера. Люди и адреса почты выдуманные.',
  steps: [
    {
      still: 'landing:open',
      text: 'Главная страница — лендинг. Кнопка «Зарегистрироваться» ведёт гостя на регистрацию.',
    },
    {
      still: 'register:before-click#5',
      text: 'Регистрация: имя, почта, пароль дважды и согласие с условиями.',
    },
    {
      still: 'weak-password:open',
      text: 'Пароль из известных утечек сервер не принимает и говорит об этом у поля.',
    },
    {
      still: 'weak-password:before-click#3',
      text: 'Свой пароль от 15 символов — аккаунт создаётся.',
    },
    { still: 'login:before-click#3', text: 'Вход с той же почтой и паролем.' },
    {
      still: 'workspace-create:before-click#2',
      text: 'Пространств ещё нет, поэтому сразу открылся мастер. Адрес подставился из названия.',
    },
    {
      still: 'workspace-invite-step:open',
      text: 'Шаг 2: пространство создано, готова одноразовая ссылка-приглашение.',
    },
    {
      still: 'dashboard:open',
      text: 'Страница пространства пока заглушка, но приглашать из неё уже можно.',
    },
    {
      still: 'link-copied:open',
      text: 'Окно «Пригласить»: роль участника и ссылка. Ссылка скопирована.',
    },
    {
      still: 'guest-opens:open',
      text: 'Гость открывает ссылку в своём браузере. Он не вошёл — его просят войти.',
    },
    {
      still: 'guest-register:before-click#5',
      text: 'Аккаунта у гостя нет: он регистрируется. Адрес приглашения не теряется.',
    },
    { still: 'guest-login:before-click#3', text: 'Гость входит.' },
    {
      still: 'guest-invite:open',
      text: 'После входа он снова на приглашении: пространство и роль, с которой его зовут.',
    },
    {
      still: 'joined:open',
      text: 'Гость в пространстве. Прогон проверил по API: участников двое, владелец и участник.',
    },
    {
      still: 'used-link-message:open',
      text: 'Ту же ссылку открыли второй раз: «Ссылка уже использована».',
    },
    {
      still: 'profile:before-click#4',
      text: 'Владелец меняет имя в настройках профиля.',
    },
    {
      still: 'profile:before-click#5',
      text: 'И выбирает часовой пояс: список с поиском.',
    },
    {
      still: 'profile-saved:open',
      text: 'Сохранено на сервере: «Профиль обновлён», в шапке уже новое имя.',
    },
    {
      still: 'next:open',
      text: 'Что ещё готово, но пока без экрана, — и что наоборот.',
    },
  ],
};
