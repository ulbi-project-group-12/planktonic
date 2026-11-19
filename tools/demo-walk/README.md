# Demo walk: recorded click-throughs of the running app

A scripted walk drives real Chrome through the app on the local compose stand and records it. One
run gives a 1920×1080, 30 fps video with on-screen captions and a matching `.srt`; a second run
with `--stills` gives a still per step and before every click, and `guide.mjs` turns those into a
click-through HTML page. UL-135 made it for the phase 2 realtime prototype; later phases add their
own scenario and script and reuse the recorder, the assembly and the guide builder.

| File                | What it does                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `stand.sh`          | Starts the realtime stack under its own compose project and ports, seeds, resets, tears down    |
| `compose.demo.yaml` | Compose override: Traefik only routes to containers of this compose project                     |
| `beats.mjs`         | The script: beats in order, the on-screen captions (Russian), the click-through steps           |
| `walk.mjs`          | The walk: two browser windows, the scenario, recording, cutting the waits, assembly with ffmpeg |
| `guide.mjs`         | The click-through page from the stills                                                          |
| `cdp.mjs`           | A minimal Chrome DevTools Protocol client on Node's built-in WebSocket                          |

There is no npm dependency: Chrome is driven over the DevTools protocol directly, so the walk adds
nothing to the lockfile. It needs Google Chrome (`CHROME_PATH` to point at another Chrome or
Chromium), ffmpeg on `PATH` and Docker.

## Run it

```bash
tools/demo-walk/stand.sh up                     # build, start, migrate, seed (prints the stand URL)
tools/demo-walk/stand.sh reset                  # empty the test channel (before every walk)
DEMO_OUT=<out> tools/demo-walk/stand.sh test-log   # optional: the phase 2 exit test for the closing card
pnpm demo:walk --out <out> --base http://127.0.0.1:58290 --test-log <out>/test-run.log
tools/demo-walk/stand.sh reset
pnpm demo:walk --out <out> --base http://127.0.0.1:58290 --test-log <out>/test-run.log --stills
node tools/demo-walk/guide.mjs --out <out>      # <out>/index.html next to <out>/stills/
tools/demo-walk/stand.sh down                   # containers, volumes and the stand's images
```

Put `<out>` outside the repository (or use the git-ignored `tools/demo-walk/out/`): videos and
stills never go into git. A run writes `recording.mp4`, `captions.srt`, `poster.png`,
`timeline.json` (beat and caption times on the video's clock, the two instance ids) and
`walk.log`; the stills run writes `stills/`, `stills.json` and `walk-stills.log`. After a change to
the assembly only, `pnpm demo:walk --out <out> --assemble` rebuilds the video from the last walk's
frames. The raw frames go to a fresh private temp directory per walk (`DEMO_WALK_FRAMES` to choose
one); `<out>/.frames` remembers it for `--assemble`, and the next walk into the same `<out>`
removes it.

`stand.sh` defaults to the compose project `demo-walk` with Postgres `55190`, Redis `56190`, S3
`58190` and Traefik `58290`; `DEMO_PROJECT`, `DEMO_PG_PORT`, `DEMO_REDIS_PORT`, `DEMO_S3_PORT` and
`DEMO_TRAEFIK_PORT` override them. `up` stops if another compose Traefik is running: the plain
`compose.yaml` Traefik reads every container on the Docker host, so two stacks route to each
other's api replicas (found in UL-131). `compose.demo.yaml` limits this stand's Traefik to its own
project.

## How it works

- **Two windows, two replicas.** Window A and window B are two browser contexts in one headless
  Chrome, so each has its own cookie jar and its own `io_srv` sticky cookie. If both land on one
  api replica, the walk clears B's cookies and reloads B (up to 8 times) and stops if they still
  match. The frame shows A and B side by side under labels, with the caption band below.
- **Only the app is recorded.** Chrome runs headless with a throwaway profile, and the frames come
  from Chrome's own screencast of the two app pages (`Page.startScreencast`), never from the screen.
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
- **Beats.** `walk.mjs` marks every beat of `beats.mjs` in order and stops if it reaches a different
  one. Each beat holds for its `hold` seconds so the caption can be read.
- **The walk checks what the captions claim.** Different instance ids; after the catch-up both feeds
  are exactly `#1`…`#7` in order; after Retry both feeds have exactly one `#8`. Any mismatch stops
  the walk, so a broken build cannot be recorded as a working one.
- **Clean channel.** The walk stops if the test channel already has messages; `stand.sh reset` empties
  it.
- **`syncing` must show.** The walk stops if B never shows `syncing` on its way back online.
- **Chrome is always closed.** `cdp.mjs` kills the Chrome it launched and removes its profile in a
  `finally`, and on Ctrl-C.

## Before sharing a video

Look at it frame by frame (for example `ffmpeg -i recording.mp4 -vf "fps=1,scale=640:-1,tile=3x3"
sheet%02d.png`) and at every still: no `.env`, tokens, cookies, personal notifications or anything
outside the app. The closing card prints the test log with the checkout path replaced by `.`.

## A walk for another phase

Write the phase's script in a `beats-<phase>.mjs` (beats, captions, guide steps) and its scenario as a
function like `scenario()` in `walk.mjs`, then pick them with a flag. Keep to the rules above: only
seeded test data on screen, offline by page emulation, every claim in a caption checked by the walk.
