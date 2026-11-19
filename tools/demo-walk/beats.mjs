// The script of the phase 2 prototype video (UL-135): what the viewer reads, in the order the walk
// shows it. Every other file reads this one: walk.mjs marks the beats in this order and stops if it
// reaches a different one, the assembly turns the captions into the on-screen band and the .srt,
// and guide.mjs builds the click-through page from the stills named in GUIDE.
//
// A later phase writes its own script next to this one (beats-<phase>.mjs) and its own scenario in
// walk.mjs; the recorder, the assembly and the guide builder stay as they are.

/** On-screen captions (3–4, short, Russian). A caption shows from its first beat to the next one's. */
export const CAPTIONS = {
  instances: 'Два окна — две копии api за Traefik: у каждого свой instanceId',
  offline: 'Окно B без сети. A отправляет пять сообщений',
  catchUp: 'B снова в сети: syncing — догрузка, все пять по порядку и без дублей',
  retry: 'Отправка без сети → failed → Retry → одно сообщение в обоих окнах',
  tests: 'То же самое проверяет интеграционный тест фазы 2 (UL-133)',
};

/**
 * The beats, in order. `caption` switches the band; `hold` is how long (s) the walk lets the beat
 * sit on screen before the next action, so the viewer can read it.
 */
export const BEATS = [
  { id: 'two-windows', caption: 'instances', hold: 5 },
  { id: 'exchange', hold: 2.5 },
  { id: 'b-offline', caption: 'offline', hold: 3 },
  { id: 'a-sends-five', hold: 3 },
  { id: 'b-online', caption: 'catchUp' }, // no hold: the catch-up plays out on its own
  { id: 'b-caught-up', hold: 4.5 },
  { id: 'b-sends-offline', caption: 'retry', hold: 3 },
  { id: 'b-back-online', hold: 1.5 },
  { id: 'retried', hold: 5 },
  { id: 'test-run', caption: 'tests', hold: 6, optional: true },
];

/**
 * The click-through demo: one step per still. `still` is `<beat>:<tag>`, the tag being `open` (the
 * beat as it opens, settled), `done` (the beat's end) or `before-click` (`#n` for the n-th click of
 * that beat). `text` is the step's caption on the page.
 */
export const GUIDE = {
  title: 'Прототип фазы 2: два окна, обрыв сети, догрузка и повтор',
  lede: 'Живой стенд: две копии api за Traefik, Redis Streams и web. Окна A и B открыты в разных профилях браузера, cookie io_srv привязывает каждое к своей копии api.',
  steps: [
    {
      still: 'two-windows:open',
      text: 'Два окна рядом. У A и B разные Instance: каждое окно подключено к своей копии api, и обе в состоянии connected.',
    },
    { still: 'exchange:before-click#2', text: 'A пишет сообщение и отправляет его.' },
    {
      still: 'exchange:done',
      text: 'Сообщения A и B видны в обоих окнах: они прошли между копиями api через Redis Streams.',
    },
    {
      still: 'b-offline:open',
      text: 'У окна B выключена сеть (как DevTools → Network → Offline, только для этой вкладки). Индикатор B — offline.',
    },
    { still: 'a-sends-five:done', text: 'A отправляет пять сообщений. У B их пока нет.' },
    {
      still: 'b-online:syncing',
      text: 'Сеть B вернулась: B переподключается и догружает пропущенное (syncing).',
    },
    {
      still: 'b-caught-up:open',
      text: 'В B все пять сообщений, #3–#7 по порядку, без дублей. Индикатор снова connected.',
    },
    {
      still: 'b-sends-offline:open',
      text: 'B снова без сети и отправляет сообщение: строка «Not sent» с кнопкой Retry.',
    },
    {
      still: 'b-back-online:before-click',
      text: 'Сеть вернулась, B нажимает Retry. Повтор идёт с тем же clientMsgId.',
    },
    {
      still: 'retried:open',
      text: 'Сообщение одно и в A, и в B: сервер идемпотентен по clientMsgId.',
    },
    {
      still: 'test-run:open',
      text: 'Тот же сценарий в CI и локально проверяет интеграционный тест фазы 2 (UL-133).',
      optional: true,
    },
  ],
};
