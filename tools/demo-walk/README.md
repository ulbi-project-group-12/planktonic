# Demo walk: recorded click-throughs of the running app

A scripted walk drives real Chrome through the app on the local compose stand and records it. One
run gives a 1920×1080, 30 fps video with on-screen captions and a matching `.srt`; a second run
with `--stills` gives a still per step and before every click, and `guide.mjs` turns those into a
click-through HTML page. UL-135 made it for the phase 2 realtime prototype; later walks add their
own scenario and script and reuse the recorder, the assembly and the guide builder.

| Walk (`--walk`)       | What it shows                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prototype` (default) | UL-135: `/prototype` in two windows on two api replicas, offline, catch-up, Retry                                                                  |
| `onboarding`          | Landing → registration → login → create a workspace → invite by link → the guest registers and joins → the used link → profile. Real api, no mocks |

| File                      | What it does                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `stand.sh`                | Starts the stack (web, two api replicas, Traefik) under its own compose project and ports, seeds, resets, tears down   |
| `compose.demo.yaml`       | Compose override: Traefik only routes to this project; the api makes no outside calls                                  |
| `walk.mjs`                | The recorder: the browser windows, layouts, recording, cutting the waits, assembly with ffmpeg; the prototype scenario |
| `beats.mjs`               | The prototype's script: beats in order, the on-screen captions (Russian), the click-through steps                      |
| `beats-onboarding.mjs`    | The onboarding script: beats, captions, the people on screen, the closing card, the click-through steps                |
| `scenario-onboarding.mjs` | The onboarding scenario: what is clicked and typed, and the checks behind every caption                                |
| `guide.mjs`               | The click-through page from the stills                                                                                 |
| `cdp.mjs`                 | A minimal Chrome DevTools Protocol client on Node's built-in WebSocket                                                 |

There is no npm dependency: Chrome is driven over the DevTools protocol directly, so the walk adds
nothing to the lockfile. It needs Google Chrome (`CHROME_PATH` to point at another Chrome or
Chromium), ffmpeg on `PATH` and Docker.

## Run it

```bash
tools/demo-walk/stand.sh up                     # build, start, migrate, seed (prints the stand URL)
tools/demo-walk/stand.sh reset                  # empty the test channel, remove walk accounts (before every walk)
pnpm demo:walk --walk onboarding --out <out> --base http://127.0.0.1:58290
tools/demo-walk/stand.sh reset
pnpm demo:walk --walk onboarding --out <out> --base http://127.0.0.1:58290 --stills
node tools/demo-walk/guide.mjs --out <out>      # <out>/index.html next to <out>/stills/
tools/demo-walk/stand.sh down                   # containers, volumes and the stand's images
```

The prototype walk is the same without `--walk`, plus its optional closing card:
`DEMO_OUT=<out> tools/demo-walk/stand.sh test-log` and `--test-log <out>/test-run.log` on both runs.
On `main` after UL-140 it stops at its first exchange: the messages api now answers 401 to a visitor
who is not signed in, and `/prototype` has no sign-in. It runs again once that page is behind the
login or is replaced by the real channel screen.

Put `<out>` outside the repository (or use the git-ignored `tools/demo-walk/out/`): videos and
stills never go into git. A run writes `recording.mp4`, `captions.srt`, `poster.png`,
`timeline.json` (beat, caption and scene times on the video's clock; for the prototype also the two
instance ids) and
`walk.log`; the stills run writes `stills/`, `stills.json` and `walk-stills.log`. After a change to
the assembly only, `pnpm demo:walk --out <out> --assemble` rebuilds the video from the last walk's
frames. The raw frames go to a fresh private temp directory per walk (`DEMO_WALK_FRAMES` to choose
one); `<out>/.frames.json` remembers it for `--assemble`, and the next walk into the same `<out>`
removes it. A `DEMO_WALK_FRAMES` directory is never removed.

`stand.sh` defaults to the compose project `demo-walk` with Postgres `55190`, Redis `56190`, S3
`58190` and Traefik `58290`; `DEMO_PROJECT`, `DEMO_PG_PORT`, `DEMO_REDIS_PORT`, `DEMO_S3_PORT` and
`DEMO_TRAEFIK_PORT` override them. `up` stops if another compose Traefik is running: the plain
`compose.yaml` Traefik reads every container on the Docker host, so two stacks route to each
other's api replicas (found in UL-131). `compose.demo.yaml` limits this stand's Traefik to its own
project.

## How it works

- **Two windows, two visitors.** Window A and window B are two browser contexts in one headless
  Chrome, so each has its own cookie jar. In the prototype walk each also has its own `io_srv`
  sticky cookie: if both land on one api replica, the walk clears B's cookies and reloads B (up to
  8 times) and stops if they still match.
- **Two layouts.** `pair` shows A and B side by side under labels; `solo` shows A alone, wide enough
  for the app's desktop layout. The caption band is below in both. A scenario switches with
  `w.setLayout(...)`: A's window is resized in place (no reload), the switch starts a new scene, and
  the scenes are assembled one by one and joined. The prototype walk is `pair` throughout.
- **Only the app is recorded.** Chrome runs headless with a throwaway profile, and the frames come
  from Chrome's own screencast of the app pages (`Page.startScreencast`), never from the screen.
  No browser UI, DevTools panel, other tab, notification or desktop can get into a frame. The
  walk refuses a non-loopback `--base`.
- **Pointer and captions.** A pointer and a click ripple are drawn into the pages; the window labels
  and captions are rendered by Chrome as images and laid under the windows by ffmpeg, so ffmpeg
  needs no `drawtext` or font setup.
- **Offline is per page.** B goes offline with `Network.emulateNetworkConditions` on B's page only,
  which is what DevTools → Network → Offline does. A is never touched. B comes back with 700 ms of
  added latency for the catch-up, so the short `syncing` state stays on screen long enough to read;
  the latency is removed once B is caught up.
- **Waits are cut.** The ping timeout before `offline` shows, and the
  reconnect back-off, are marked as skips: their time is cut from the video, keeping the last frame
  of each wait. The catch-up itself is never cut.
- **Beats.** `walk.mjs` marks every beat of the script in order and stops if it reaches a different
  one. Each beat holds for its `hold` seconds so the caption can be read.
- **The walk checks what the captions claim.** Prototype: different instance ids; after the catch-up
  both feeds are exactly `#1`…`#7` in order; after Retry both feeds have exactly one `#8`.
  Onboarding: the breached-password message, the link in the clipboard, the invite's workspace and
  role, the members through the api (owner and member), the used-link message with no join button,
  the new name in the header and the name and time zone through the api. Any mismatch stops the
  walk, so a broken build cannot be recorded as a working one.
- **Clean stand.** The prototype walk stops if the test channel already has messages, the onboarding
  walk if its first account already exists; `stand.sh reset` empties the channel and removes the
  accounts and workspaces a walk made.
- **One video format.** Every part (the scenes and the closing card) is encoded limited-range
  yuv420p with the same tags, so the joined file does not change colour range at the card.
- **`syncing` must show.** The walk stops if B never shows `syncing` on its way back online.
- **Chrome is always closed.** `cdp.mjs` kills the Chrome it launched and removes its profile in a
  `finally`, and on Ctrl-C.

## The onboarding walk

- **Fictional people.** `beats-onboarding.mjs` names them; the addresses end in `.invalid`. The
  password is random per run, typed only into password fields and never logged.
- **No reload of a signed-in window.** The access token lives in the page's memory and the api has
  no refresh endpoint yet, so a reload signs the user out. Window A moves by clicks only. Window B
  reloads when it opens the invite link, as a person following a link does, which is why the guest
  is asked to sign in.
- **The invite token stays off screen.** In the wide window the link field shows the address and a
  few characters; the dialog is closed before the frame narrows, where it would show the whole link.
- **No outside calls.** Registration looks a password up in a breach database; on the stand that
  host resolves to a closed local port (`compose.demo.yaml`), and the service falls back to its
  built-in list, as it does on any network error. The walk's refused password is on that list.
- **The closing card is text.** `CARD` in the script lists what is merged but has no screen (or a
  screen with no api yet). The walk never fakes a screen for these.
- **Chrome in UTC** (`chromeEnv`), so nothing on a page comes from this machine's time zone.

## Before sharing a video

Look at it frame by frame (for example `ffmpeg -i recording.mp4 -vf
"fps=1,scale=640:-1,tpad=stop_mode=clone:stop_duration=9,tile=3x3" sheet%02d.png`; `tile` drops an
incomplete last sheet, the `tpad` fills it) and at every still: no `.env`, tokens, cookies, personal
notifications or anything outside the app. The prototype's closing card prints the test log with
the checkout path replaced by `.`. `walk.log` has the output path in it: cut it before sharing the
folder.

## Another walk

Write its script in a `beats-<name>.mjs` (`BEATS`, `CAPTIONS`, `GUIDE`, and optionally `LABELS` for
the window labels, `POSTER` for the poster's beat, `CARD` for a closing text card) and its scenario
in a `scenario-<name>.mjs` that exports `scenario(w)` and optionally `layout` (the first layout),
`chromeEnv` and `prepare({ cdp, a, b, base, log })`, which runs before the recording starts. Then
`--walk <name>` plays it. Keep to the rules above: only test data on screen, offline by page
emulation, every claim in a caption checked by the walk.
