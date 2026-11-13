# Requirements: planktonic

**Defined:** 2026-11-08
**Core Value:** The connected work scenario (discuss → task from message → take it → PR → review → notified) works end to end with no lost, duplicated or reordered messages and access checks on every path.

Source: the 191 spec items with stable IDs from `tz_requirements` in `.planning/research/slack-analog-roadmap.json` (spec: the organizer's spec, kept outside the repository by the lead; line numbers in brackets). The item text is an English translation of the organizer's Russian spec, and the IDs are shared with the tracker tickets (`tz_refs`). VOICE items are optional (★).

## v1 Requirements

### Workspaces and projects (WS)

- [ ] **TZ-WS-01**: Authentication and authorization. _(spec l.31)_
- [ ] **TZ-WS-02**: Landing page. _(spec l.32)_
- [ ] **TZ-WS-03**: Creating workspaces and inviting members. One user can belong to several workspaces. _(spec l.33)_
- [ ] **TZ-WS-04**: Roles and access rights. At minimum owner, administrator and member. _(spec l.34)_
- [ ] **TZ-WS-05**: Ability to remove a member from the workspace, change their role and revoke an invitation. _(spec l.35)_
- [ ] **TZ-WS-06**: Creating projects inside a workspace. For example, a team develops a website and a mobile app at the same time. _(spec l.36)_
- [ ] **TZ-WS-07**: A project must have a description, members, communication channels, tasks and a linked GitHub repository. _(spec l.37)_
- [ ] **TZ-WS-08**: Creating public and private channels. Public channels are available to project members; private ones require a separate invitation. _(spec l.38)_
- [ ] **TZ-WS-09**: Editing a channel's name and description, archiving channels. _(spec l.39)_
- [ ] **TZ-WS-10**: Think through who can create projects, invite members and manage channels. _(spec l.40)_

### Team chat (CHAT)

- [ ] **TZ-CHAT-01**: Direct messages between workspace members, group conversations and project channels. _(spec l.44)_
- [ ] **TZ-CHAT-02**: Sending and receiving messages in real time. _(spec l.45)_
- [ ] **TZ-CHAT-03**: Basic formatting: text emphasis, lists, links and code blocks. _(spec l.46)_
- [ ] **TZ-CHAT-04**: Editing and deleting your own messages. An edited message must carry a corresponding mark. _(spec l.47)_
- [ ] **TZ-CHAT-05**: Discussion threads under messages. Replies in a thread must be separate from the main conversation. _(spec l.48)_
- [ ] **TZ-CHAT-06**: Reactions to messages. _(spec l.49)_
- [ ] **TZ-CHAT-07**: User mentions with a notification. _(spec l.50)_
- [ ] **TZ-CHAT-08**: Pinned messages and saving messages to a personal favorites list. _(spec l.51)_
- [ ] **TZ-CHAT-09**: Sending images and files. Images need a preview. _(spec l.52)_
- [ ] **TZ-CHAT-10**: Message search + filters by project, channel, author and date. _(spec l.53)_
- [ ] **TZ-CHAT-11**: Paginated loading of message history when scrolling up. _(spec l.54)_
- [ ] **TZ-CHAT-12**: Unread message counters and a separate display of mentions. _(spec l.55)_
- [ ] **TZ-CHAT-13**: Ability to jump to the first unread message. _(spec l.56)_
- [ ] **TZ-CHAT-14**: Member presence statuses and a typing indicator. _(spec l.57)_
- [ ] **TZ-CHAT-15**: Connection recovery. If a user loses internet, they must receive the missed messages after reconnecting. _(spec l.58)_
- [ ] **TZ-CHAT-16**: Message sending state. If a message failed to send, the user must see an error and be able to retry. _(spec l.59)_

### Tasks from discussions (TASK)

- [ ] **TZ-TASK-01**: Ability to create a task from a message. For example, a bug is found in a discussion, so the message is turned into a task right away. _(spec l.65)_
- [ ] **TZ-TASK-02**: Ability to create a task on its own, without a source message. _(spec l.66)_
- [ ] **TZ-TASK-03**: A task must have an identifier, title, description, assignee, author, status, priority, due date and checklist. _(spec l.67)_
- [ ] **TZ-TASK-04**: When a task is created from a message, a link to the source discussion is saved. _(spec l.68)_
- [ ] **TZ-TASK-05**: A message shows that a task was created from it. You can go to the task and see its current status. _(spec l.69)_
- [ ] **TZ-TASK-06**: Ability to attach files and related messages to a task. _(spec l.70)_
- [ ] **TZ-TASK-07**: Task discussion in a separate thread. It must be accessible both from the task card and from the channel. _(spec l.71)_
- [ ] **TZ-TASK-08**: Ability to mention a task in a message and go to it. _(spec l.72)_
- [ ] **TZ-TASK-09**: Task change history: who changed the status, due date, description or assignee. _(spec l.73)_

### Project kanban (KANBAN)

- [ ] **TZ-KANBAN-01**: Every project has a Kanban board. _(spec l.79)_
- [ ] **TZ-KANBAN-02**: Base statuses: "To do", "In progress", "In review", "Done". _(spec l.80)_
- [ ] **TZ-KANBAN-03**: Ability to configure columns and move tasks between them. _(spec l.81)_
- [ ] **TZ-KANBAN-04**: Preserving the order of tasks within columns. _(spec l.82)_
- [ ] **TZ-KANBAN-05**: Filters by assignee, priority and due date. _(spec l.83)_
- [ ] **TZ-KANBAN-06**: All changes on the board are visible to members in real time. _(spec l.84)_
- [ ] **TZ-KANBAN-07**: Ability to mark a task as blocked and give a reason. For example, "waiting for the API from the backend". _(spec l.85)_
- [ ] **TZ-KANBAN-08**: When a task is assigned, its due date approaches or a blocker appears, the responsible people receive a notification. _(spec l.86)_
- [ ] **TZ-KANBAN-09**: A personal "My Work" section that gathers the user's tasks from all projects, review requests and mentions. _(spec l.87)_

### GitHub integration (GH)

- [ ] **TZ-GH-01**: Ability to connect a GitHub repository to a project and choose a channel for notifications. For the first version, one repository per project is enough. _(spec l.95)_
- [ ] **TZ-GH-02**: A repository must be connected by a user with the appropriate rights. Tokens and secrets must not end up in the frontend or in messages. _(spec l.96)_
- [ ] **TZ-GH-03**: Notifications about PR opened, review requested, CI result and merge. _(spec l.97)_
- [ ] **TZ-GH-04**: Ability to link a task to a PR. For example, by putting the task identifier in the PR description or attaching a link manually. _(spec l.98)_
- [ ] **TZ-GH-05**: The task card shows linked PRs and their state. _(spec l.99)_
- [ ] **TZ-GH-06**: A PR message shows the author, title, link and check results. _(spec l.100)_
- [ ] **TZ-GH-07**: Ability to configure simple rules: PR opened — the task moves to "In review", PR merged — "Done". _(spec l.101)_
- [ ] **TZ-GH-08**: Automatic transitions must be visible in the task history. Think through the behavior when several PRs are linked to a task. _(spec l.102)_
- [ ] **TZ-GH-09**: Redelivery of the same webhook must not create duplicate messages or repeat actions. _(spec l.103)_
- [ ] **TZ-GH-10**: Verifying the authenticity of incoming webhooks is mandatory. _(spec l.104)_
- [ ] **TZ-GH-11**: Information from a private repository must be available only to members who are allowed access to it. Connecting a repository must not automatically expose its contents to the whole workspace. _(spec l.105)_

### Async standups (STANDUP)

- [ ] **TZ-STANDUP-01**: The project administrator configures the schedule, time zone and standup questions. _(spec l.111)_
- [ ] **TZ-STANDUP-02**: For example: "What did you do?", "What are you planning?", "What is blocking you?". _(spec l.112)_
- [ ] **TZ-STANDUP-03**: At the scheduled time, members receive a reminder to fill in the report. _(spec l.113)_
- [ ] **TZ-STANDUP-04**: Links to tasks and PRs can be added to an answer. _(spec l.114)_
- [ ] **TZ-STANDUP-05**: Answers are collected in a single discussion per day. _(spec l.115)_
- [ ] **TZ-STANDUP-06**: It is visible who has already answered and who has not yet. _(spec l.116)_
- [ ] **TZ-STANDUP-07**: The report history is available to project members. _(spec l.117)_
- [ ] **TZ-STANDUP-08**: AI compiles a short summary: what has progressed, what blockers there are and who needs help. The summary must include links to members' answers. _(spec l.118)_

### Team decisions (DEC)

- [ ] **TZ-DEC-01**: Ability to save a message or thread as a team decision. _(spec l.124)_
- [ ] **TZ-DEC-02**: A decision has a title, description, author, date and a link to the source discussion. _(spec l.125)_
- [ ] **TZ-DEC-03**: Decisions are collected in a separate project tab. _(spec l.126)_
- [ ] **TZ-DEC-04**: Ability to replace a decision with a new one, preserving the history and an explanation of the changes. _(spec l.127)_
- [ ] **TZ-DEC-05**: A decision can be linked to tasks. _(spec l.128)_
- [ ] **TZ-DEC-06**: AI can suggest a draft decision based on a discussion. A member saves it after reviewing it. _(spec l.129)_

### AI assistant (AI)

- [ ] **TZ-AI-01**: A short recap of a discussion that was missed. _(spec l.135)_
- [ ] **TZ-AI-02**: Answers to questions based on the messages, tasks and decisions available to the user. For example: "Why did we decide to use this library?" or "What is blocking the release right now?". _(spec l.136)_
- [ ] **TZ-AI-03**: Answers with links to the source data. _(spec l.137)_
- [ ] **TZ-AI-04**: Suggesting tasks based on the outcome of a discussion. The user reviews titles, descriptions and assignees before creation. _(spec l.138)_
- [ ] **TZ-AI-05**: A project summary: completed tasks, open blockers and PRs waiting for review. _(spec l.139)_
- [ ] **TZ-AI-06**: Preparing a draft weekly report from standups, tasks and GitHub events. _(spec l.140)_
- [ ] **TZ-AI-07**: If there is not enough information, the AI must say so. _(spec l.141)_
- [ ] **TZ-AI-08**: Access rights are mandatory: it must not be possible to obtain the contents of a private channel, repository or someone else's project through the AI. _(spec l.142)_
- [ ] **TZ-AI-09**: Generation must have a clear state: in progress, completed or failed. _(spec l.143)_
- [ ] **TZ-AI-10**: AI output must not automatically change tasks, publish decisions or send messages on the user's behalf without their confirmation. _(spec l.144)_
- [ ] **TZ-AI-11**: Think separately about how to use AI inside the application. It must work with conversations and project data: helping to find information, understand context and collect the results of discussions. _(spec l.184)_

### Notifications and personal settings (NOTIF)

- [ ] **TZ-NOTIF-01**: Personal account and settings. _(spec l.148)_
- [ ] **TZ-NOTIF-02**: A unified notification center: mentions, assigned tasks, replies in discussions and review requests. _(spec l.149)_
- [ ] **TZ-NOTIF-03**: Ability to go from a notification to the specific message, task or PR. _(spec l.150)_
- [ ] **TZ-NOTIF-04**: Notification settings for individual channels and projects. _(spec l.151)_
- [ ] **TZ-NOTIF-05**: "Do not disturb" mode and working hours that take the time zone into account. _(spec l.152)_
- [ ] **TZ-NOTIF-06**: Telegram bot integration: reminders about standups, assigned tasks, mentions and review requests. _(spec l.153)_
- [ ] **TZ-NOTIF-07**: Reading a notification in one tab must update its state in the other tabs. _(spec l.154)_
- [ ] **TZ-NOTIF-08**: Think through which notifications to send immediately, which to defer, and how not to flood the user with identical messages. _(spec l.155)_

### Voice rooms ★ (optional) (VOICE)

- [ ] **TZ-VOICE-01**: Voice rooms inside channels. _(spec l.161) ★ optional_
- [ ] **TZ-VOICE-02**: Ability to join a conversation, mute the microphone and leave. _(spec l.162) ★ optional_
- [ ] **TZ-VOICE-03**: Showing the room's participants and who is speaking right now. _(spec l.163) ★ optional_
- [ ] **TZ-VOICE-04**: Screen sharing. _(spec l.164) ★ optional_
- [ ] **TZ-VOICE-05**: Access rights check on joining. Outsiders must not get into the room of a private channel. _(spec l.165) ★ optional_
- [ ] **TZ-VOICE-06**: Handling connection loss, denied microphone access and the end of screen sharing. _(spec l.166) ★ optional_
- [ ] **TZ-VOICE-07**: During a conversation, you can open a related task and discuss it together with the team. _(spec l.167) ★ optional_
- [ ] **TZ-VOICE-08**: Agreements reached at the end of a call can be written into a discussion and turned into tasks. _(spec l.168) ★ optional_

### Frontend stack and quality (FE)

- [x] **TZ-FE-01**: next js _(spec l.190)_
- [x] **TZ-FE-02**: typescript _(spec l.191)_
- [ ] **TZ-FE-03**: tanstack query _(spec l.192)_
- [ ] **TZ-FE-04**: zustand _(spec l.193)_
- [x] **TZ-FE-05**: shadcn + tailwind — for the UI kit _(spec l.194)_
- [ ] **TZ-FE-06**: react hook form + zod — for forms _(spec l.195)_
- [ ] **TZ-FE-07**: socket io — for realtime _(spec l.196)_
- [ ] **TZ-FE-08**: a drag and drop library for the Kanban board — your choice _(spec l.197)_
- [x] **TZ-FE-09**: Feature sliced design. _(spec l.201)_
- [x] **TZ-FE-10**: Eslint _(spec l.205)_
- [x] **TZ-FE-11**: prettier _(spec l.206)_
- [x] **TZ-FE-12**: husky _(spec l.207)_
- [ ] **TZ-FE-13**: sentry for logging, GlitchTip can be used as an alternative _(spec l.208)_
- [x] **TZ-FE-14**: vitest, RTL — tests _(spec l.209)_
- [x] **TZ-FE-15**: Storybook for UI components _(spec l.210)_
- [x] **TZ-FE-16**: pnpm _(spec l.211)_
- [ ] **TZ-FE-17**: Mandatory linting + a linter for FSD rule compliance. _(spec l.215)_
- [x] **TZ-FE-18**: Mandatory code review of every task. _(spec l.216)_
- [x] **TZ-FE-19**: Minimum of ad hoc custom styles; use the UI kit that was built. _(spec l.217)_
- [x] **TZ-FE-20**: A CI pipeline is mandatory. _(spec l.218)_
- [ ] **TZ-FE-21**: Watch the performance of long conversations. A channel with thousands of messages must not freeze when opened and scrolled. _(spec l.219)_
- [ ] **TZ-FE-22**: Think through scrolling behavior. A new message must not throw the user to the bottom if they are reading history. _(spec l.220)_
- [ ] **TZ-FE-23**: When sending a message or changing a task fails, the interface must show the actual state and allow retrying the action. _(spec l.221)_
- [ ] **TZ-FE-24**: Several members moving tasks at the same time must not lead to lost cards. _(spec l.222)_
- [ ] **TZ-FE-25**: UI state, server data and the websocket connection state must have clear areas of responsibility. _(spec l.223)_

### Backend stack and quality (BE)

- [x] **TZ-BE-01**: nest js _(spec l.229)_
- [x] **TZ-BE-02**: typescript _(spec l.230)_
- [ ] **TZ-BE-03**: socket io — realtime _(spec l.231)_
- [x] **TZ-BE-04**: postgresql _(spec l.232)_
- [x] **TZ-BE-05**: redis _(spec l.233)_
- [x] **TZ-BE-06**: prisma / typeorm _(spec l.234)_
- [ ] **TZ-BE-07**: bull mq _(spec l.235)_
- [ ] **TZ-BE-08**: swagger _(spec l.236)_
- [ ] **TZ-BE-09**: openai for working with AI — that is the name of the package _(spec l.237)_
- [x] **TZ-BE-10**: Eslint _(spec l.243)_
- [x] **TZ-BE-11**: prettier _(spec l.244)_
- [x] **TZ-BE-12**: husky _(spec l.245)_
- [x] **TZ-BE-13**: s3 for storing files and images. Any provider can be chosen. _(spec l.246)_
- [x] **TZ-BE-14**: Docker — mandatory for local development and production. _(spec l.247)_
- [x] **TZ-BE-15**: pnpm _(spec l.248)_
- [x] **TZ-BE-16**: Mandatory linting. _(spec l.264)_
- [x] **TZ-BE-17**: Mandatory code review of every task. _(spec l.265)_
- [x] **TZ-BE-18**: Adherence to a modular architecture + a layered project structure. _(spec l.266)_
- [x] **TZ-BE-19**: A CI pipeline is mandatory. _(spec l.267)_
- [ ] **TZ-BE-20**: Access rights are checked not only in HTTP requests but also in websocket events, search, file downloads and AI requests. _(spec l.268)_
- [ ] **TZ-BE-21**: After a member is removed from a private channel, they must not keep receiving its new messages over an already open connection. _(spec l.269)_
- [ ] **TZ-BE-22**: Resending the same message after a network error must not create duplicates. _(spec l.270)_
- [ ] **TZ-BE-23**: Message history must be stored in the DB. A websocket connection is not storage by itself. _(spec l.271)_
- [ ] **TZ-BE-24**: Handling of webhooks, reminders and automatic task transitions must account for being run again. _(spec l.272)_
- [ ] **TZ-BE-25**: Heavy operations, for example file processing, preparing data for search and AI generation, are run as background jobs. _(spec l.273)_
- [ ] **TZ-BE-26**: Think through limits on file size, message sending rate and AI requests. _(spec l.274)_
- [ ] **TZ-BE-27**: Logs must not contain integration tokens or the content of private conversations. _(spec l.275)_

### CI/CD and git process (CICD)

- [x] **TZ-CICD-01**: Be sure to write tests, at least for the core functionality. We are here to learn. _(spec l.176)_
- [x] **TZ-CICD-02**: On every pull request, always run linters, tests, the project build and typecheck via ts. _(spec l.281)_
- [x] **TZ-CICD-03**: Releases by cutting a branch + pressing the release button in GitHub. _(spec l.283)_
- [x] **TZ-CICD-04**: Pushing directly to dev/trunk/master is forbidden, only through a PR with code review. _(spec l.285)_
- [x] **TZ-CICD-05**: Working with git using the trunk-based approach. _(spec l.287)_
- [ ] **TZ-CICD-06**: Containerization is mandatory when deploying. _(spec l.289)_
- [ ] **TZ-CICD-07**: Cross code review is mandatory. Everyone looks at each other's code, not only the team lead. We learn from other people's code as from our own. _(spec l.348)_
- [ ] **TZ-CICD-08**: Every week, a report on the work done goes to the chat on Friday. We write the gap even if it is small. _(spec l.350)_

### Production and observability (PROD)

- [ ] **TZ-PROD-01**: Loki — logging _(spec l.252)_
- [ ] **TZ-PROD-02**: prometheus _(spec l.253)_
- [ ] **TZ-PROD-03**: promtail _(spec l.254)_
- [ ] **TZ-PROD-04**: grafana _(spec l.255)_
- [ ] **TZ-PROD-05**: node_exporter _(spec l.256)_
- [ ] **TZ-PROD-06**: cadvisor _(spec l.257)_
- [ ] **TZ-PROD-07**: Running in production in several instances. _(spec l.258)_
- [ ] **TZ-PROD-08**: Logging and metrics collection in production are mandatory! _(spec l.260)_
- [ ] **TZ-PROD-09**: Collecting logs and metrics in production is mandatory. _(spec l.293)_
- [x] **TZ-PROD-10**: Storing environment variables — .env for local development, GitHub secrets for CI/CD. We do not commit secrets to the repository. _(spec l.295)_
- [x] **TZ-PROD-11**: Maintaining documentation: how to run the project, variables, specifics, etc. _(spec l.297)_
- [ ] **TZ-PROD-12**: A release to production must be easy and convenient, with one button press in GitHub. _(spec l.299)_
- [ ] **TZ-PROD-13**: Be sure to check communication and collaboration between users connected to different backend instances. _(spec l.301)_

### Product requirements (PRODUCT)

- [ ] **TZ-PRODUCT-01**: The main task is to build a convenient space for team work. _(spec l.305)_
- [ ] **TZ-PRODUCT-02**: A user must be able to create a workspace, invite colleagues, set up a project and channels, discuss work, create tasks from conversations and see the result of development through the GitHub integration. _(spec l.307)_
- [ ] **TZ-PRODUCT-03**: It is important that the features are connected to each other. If chat, Kanban and PR notifications exist separately and do nothing to help the overall process, the project's main task is not solved. _(spec l.309)_
- [ ] **TZ-PRODUCT-04**: For example, a member writes in a channel about a bug. A task is created from the message and an assignee is appointed. The assignee opens a PR and links it to the task. The team receives a notification, does the review, and after the merge the task moves to the done state. From the task card you can return to the source discussion. _(spec l.311)_
- [ ] **TZ-PRODUCT-05**: At the same time, the core communication scenarios must work reliably. Messages must not disappear, be duplicated or unexpectedly change order. If sending fails, the user must understand what happened. _(spec l.313)_
- [ ] **TZ-PRODUCT-06**: Think separately about unread messages. If a person has read a channel on a computer, the counters must update correctly in another open tab too. Also, receiving a message and reading it are different events. _(spec l.315)_
- [ ] **TZ-PRODUCT-07**: The "online" status also needs attention. One user can open the application in several tabs. Closing one tab must not make them offline if another keeps working. _(spec l.317)_
- [ ] **TZ-PRODUCT-08**: Direct messages, private channels, tasks and files need clear access rules. A link to an attachment must not let just anyone download a private file. _(spec l.319)_
- [ ] **TZ-PRODUCT-09**: AI must help work with the accumulated information. The user must be able to verify an answer by opening the source messages, tasks or decisions. If data was changed or deleted, think through how that affects search and AI answers. _(spec l.321)_
- [ ] **TZ-PRODUCT-10**: Create a workspace → invite a second person → create a project and a channel → exchange messages → create a task from the discussion → bring it to the done state. _(spec l.327)_

### Team process and AI usage (PROCESS)

- [ ] **TZ-PROCESS-01**: Your task is to use AI to the maximum. Development, code review, writing tests, skills, agents, devops, etc., everything your imagination allows. _(spec l.180)_
- [ ] **TZ-PROCESS-02**: But do not even try to do everything from one or two prompts. Do not forget about code quality and areas of responsibility. In the early stages of a project, commits of 10k lines of code at a time may get by, but that is a road to nowhere. _(spec l.182)_
- [ ] **TZ-PROCESS-03**: Forming the team. _(spec l.337)_
- [ ] **TZ-PROCESS-04**: Assigning roles. _(spec l.338)_
- [ ] **TZ-PROCESS-05**: Hold the first team call. Get to know each other. _(spec l.339)_
- [x] **TZ-PROCESS-06**: Initialization and basic configuration of the projects. _(spec l.340)_
- [ ] **TZ-PROCESS-07**: Set up the basic processes. Decide on the team's internal calls and their times. _(spec l.341)_
- [ ] **TZ-PROCESS-08**: Creating boards for work; any can be chosen. _(spec l.342)_
- [ ] **TZ-PROCESS-09**: At a high level, the team decomposes the project into logical pieces and blocks that can be developed in parallel. _(spec l.343)_
- [ ] **TZ-PROCESS-10**: Before the main development starts, verify message sending between two clients and connection recovery on a small prototype. _(spec l.344)_
- [ ] **TZ-PROCESS-11**: Decide on the model of workspaces, projects, channels and access rights. _(spec l.345)_
- [ ] **TZ-PROCESS-12**: Get to work. _(spec l.346)_

## v2 Requirements

Deferred ideas live in the research backlog 999.x (`.planning/research/ROADMAP-RESEARCH.md` §8), not here:

- **999.1**: Meilisearch or Typesense for typo-tolerant search and ranking — A second datastore and syncing of edits, deletions and ACLs; Postgres FTS + pg_trgm covers the spec
- **999.2**: Socket.IO Connection State Recovery as a fast reconnect path — May replay messages of a closed channel to a removed member; backfill by seq is already correct
- **999.3**: Message edit history (viewing past versions) — The spec requires only an "edited" mark; privacy concern
- **999.4**: Web Push and email as additional notification channels — The spec requires a notification center and Telegram; another delivery channel is beyond scope
- **999.5**: Rich-text composer on Tiptap — A Markdown toolbar covers "basic formatting"
- **999.6**: Multiple repositories per project — Spec: one repository is enough for the first version
- **999.7**: Kanban column WIP limits in the product — The spec explicitly says not to replicate Jira
- **999.8**: Real-time streaming of AI answer tokens — The spec requires only a clear generation state; depends on the provider
- **999.9**: Bull Board — queue admin UI — Queue metrics are already in Grafana
- **999.10**: Per-workspace feature flags in the DB — Env flags are enough for trunk-based development
- **999.11**: One shared socket across all tabs via BroadcastChannel and leader election — The user room already syncs tabs; this is an optimization
- **999.12**: PWA and an offline message queue — Beyond the spec; a basic unsent-message queue in IndexedDB already exists
- **999.13**: Move the teams' dailies into the product's own standups (dogfooding) — Possible only after Phase 12; a process item, not a product item

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile/desktop apps | Web only per the spec; the plan is already over the 60% Must guideline |
| Second search datastore (Meilisearch/Typesense) | Postgres FTS + pg_trgm covers the spec (backlog 999.1) |
| MinIO | CE stopped shipping images in Oct 2025 — SeaweedFS or Garage |
| 13 informational spec paragraphs without an ID | Permissive/informational text, listed in research roadmap appendix A |

## Traceability

Each requirement has exactly one primary phase: Phase 1 owns the 21 items the lead's foundation delivers; every other item belongs to the first phase whose research tickets reference it. "Also" lists later phases whose tickets extend it.

| Requirement | Phase | Also | Status |
|-------------|-------|------|--------|
| TZ-WS-01 | Phase 3 | — | Pending |
| TZ-WS-02 | Phase 3 | — | Pending |
| TZ-WS-03 | Phase 3 | — | Pending |
| TZ-WS-04 | Phase 3 | — | Pending |
| TZ-WS-05 | Phase 3 | — | Pending |
| TZ-WS-06 | Phase 3 | — | Pending |
| TZ-WS-07 | Phase 3 | 5, 8, 10 | Pending |
| TZ-WS-08 | Phase 5 | — | Pending |
| TZ-WS-09 | Phase 5 | — | Pending |
| TZ-WS-10 | Phase 3 | — | Pending |
| TZ-CHAT-01 | Phase 5 | — | Pending |
| TZ-CHAT-02 | Phase 2 | 5 | Pending |
| TZ-CHAT-03 | Phase 5 | — | Pending |
| TZ-CHAT-04 | Phase 5 | — | Pending |
| TZ-CHAT-05 | Phase 6 | — | Pending |
| TZ-CHAT-06 | Phase 6 | — | Pending |
| TZ-CHAT-07 | Phase 6 | 11 | Pending |
| TZ-CHAT-08 | Phase 6 | — | Pending |
| TZ-CHAT-09 | Phase 7 | — | Pending |
| TZ-CHAT-10 | Phase 12 | — | Pending |
| TZ-CHAT-11 | Phase 5 | — | Pending |
| TZ-CHAT-12 | Phase 6 | — | Pending |
| TZ-CHAT-13 | Phase 6 | — | Pending |
| TZ-CHAT-14 | Phase 6 | — | Pending |
| TZ-CHAT-15 | Phase 2 | 5 | Pending |
| TZ-CHAT-16 | Phase 2 | 5 | Pending |
| TZ-TASK-01 | Phase 8 | — | Pending |
| TZ-TASK-02 | Phase 8 | — | Pending |
| TZ-TASK-03 | Phase 8 | — | Pending |
| TZ-TASK-04 | Phase 8 | — | Pending |
| TZ-TASK-05 | Phase 8 | — | Pending |
| TZ-TASK-06 | Phase 8 | — | Pending |
| TZ-TASK-07 | Phase 8 | — | Pending |
| TZ-TASK-08 | Phase 8 | — | Pending |
| TZ-TASK-09 | Phase 8 | — | Pending |
| TZ-KANBAN-01 | Phase 9 | — | Pending |
| TZ-KANBAN-02 | Phase 9 | — | Pending |
| TZ-KANBAN-03 | Phase 9 | — | Pending |
| TZ-KANBAN-04 | Phase 9 | — | Pending |
| TZ-KANBAN-05 | Phase 9 | — | Pending |
| TZ-KANBAN-06 | Phase 9 | — | Pending |
| TZ-KANBAN-07 | Phase 9 | — | Pending |
| TZ-KANBAN-08 | Phase 8 | 9, 11 | Pending |
| TZ-KANBAN-09 | Phase 9 | — | Pending |
| TZ-GH-01 | Phase 10 | — | Pending |
| TZ-GH-02 | Phase 10 | — | Pending |
| TZ-GH-03 | Phase 10 | — | Pending |
| TZ-GH-04 | Phase 10 | — | Pending |
| TZ-GH-05 | Phase 10 | — | Pending |
| TZ-GH-06 | Phase 10 | — | Pending |
| TZ-GH-07 | Phase 10 | — | Pending |
| TZ-GH-08 | Phase 10 | — | Pending |
| TZ-GH-09 | Phase 10 | — | Pending |
| TZ-GH-10 | Phase 10 | — | Pending |
| TZ-GH-11 | Phase 10 | — | Pending |
| TZ-STANDUP-01 | Phase 12 | — | Pending |
| TZ-STANDUP-02 | Phase 12 | — | Pending |
| TZ-STANDUP-03 | Phase 12 | — | Pending |
| TZ-STANDUP-04 | Phase 12 | — | Pending |
| TZ-STANDUP-05 | Phase 12 | — | Pending |
| TZ-STANDUP-06 | Phase 12 | — | Pending |
| TZ-STANDUP-07 | Phase 12 | — | Pending |
| TZ-STANDUP-08 | Phase 13 | — | Pending |
| TZ-DEC-01 | Phase 12 | — | Pending |
| TZ-DEC-02 | Phase 12 | — | Pending |
| TZ-DEC-03 | Phase 12 | — | Pending |
| TZ-DEC-04 | Phase 12 | — | Pending |
| TZ-DEC-05 | Phase 12 | — | Pending |
| TZ-DEC-06 | Phase 13 | — | Pending |
| TZ-AI-01 | Phase 13 | — | Pending |
| TZ-AI-02 | Phase 13 | — | Pending |
| TZ-AI-03 | Phase 13 | — | Pending |
| TZ-AI-04 | Phase 13 | — | Pending |
| TZ-AI-05 | Phase 13 | — | Pending |
| TZ-AI-06 | Phase 13 | — | Pending |
| TZ-AI-07 | Phase 13 | — | Pending |
| TZ-AI-08 | Phase 13 | — | Pending |
| TZ-AI-09 | Phase 13 | — | Pending |
| TZ-AI-10 | Phase 13 | — | Pending |
| TZ-AI-11 | Phase 13 | — | Pending |
| TZ-NOTIF-01 | Phase 3 | 11 | Pending |
| TZ-NOTIF-02 | Phase 11 | — | Pending |
| TZ-NOTIF-03 | Phase 11 | — | Pending |
| TZ-NOTIF-04 | Phase 11 | — | Pending |
| TZ-NOTIF-05 | Phase 11 | — | Pending |
| TZ-NOTIF-06 | Phase 11 | — | Pending |
| TZ-NOTIF-07 | Phase 11 | — | Pending |
| TZ-NOTIF-08 | Phase 11 | — | Pending |
| TZ-VOICE-01 | Phase 15 | — | Pending |
| TZ-VOICE-02 | Phase 15 | — | Pending |
| TZ-VOICE-03 | Phase 15 | — | Pending |
| TZ-VOICE-04 | Phase 15 | — | Pending |
| TZ-VOICE-05 | Phase 15 | — | Pending |
| TZ-VOICE-06 | Phase 15 | — | Pending |
| TZ-VOICE-07 | Phase 15 | — | Pending |
| TZ-VOICE-08 | Phase 15 | — | Pending |
| TZ-FE-01 | Phase 1.1 | — | Complete |
| TZ-FE-02 | Phase 1 | — | Complete |
| TZ-FE-03 | Phase 3 | 5 | Pending |
| TZ-FE-04 | Phase 5 | — | Pending |
| TZ-FE-05 | Phase 1.1 | — | Complete |
| TZ-FE-06 | Phase 3 | — | Pending |
| TZ-FE-07 | Phase 5 | — | Pending |
| TZ-FE-08 | Phase 9 | — | Pending |
| TZ-FE-09 | Phase 1.1 | — | Complete |
| TZ-FE-10 | Phase 1 | — | Complete |
| TZ-FE-11 | Phase 1 | — | Complete |
| TZ-FE-12 | Phase 1 | — | Complete |
| TZ-FE-13 | Phase 4 | — | Pending |
| TZ-FE-14 | Phase 1.1 | — | Complete |
| TZ-FE-15 | Phase 1.1 | — | Complete |
| TZ-FE-16 | Phase 1 | — | Complete |
| TZ-FE-17 | Phase 1.1 | 1 | Pending |
| TZ-FE-18 | Phase 1 | — | Complete |
| TZ-FE-19 | Phase 1.1 | — | Complete |
| TZ-FE-20 | Phase 1 | — | Complete |
| TZ-FE-21 | Phase 5 | 14 | Pending |
| TZ-FE-22 | Phase 5 | — | Pending |
| TZ-FE-23 | Phase 5 | 8, 9 | Pending |
| TZ-FE-24 | Phase 9 | — | Pending |
| TZ-FE-25 | Phase 5 | — | Pending |
| TZ-BE-01 | Phase 1.1 | — | Complete |
| TZ-BE-02 | Phase 1 | 1.1 | Complete |
| TZ-BE-03 | Phase 2 | — | Pending |
| TZ-BE-04 | Phase 1.1 | — | Complete |
| TZ-BE-05 | Phase 1.1 | 2 | Complete |
| TZ-BE-06 | Phase 1.1 | — | Complete |
| TZ-BE-07 | Phase 7 | — | Pending |
| TZ-BE-08 | Phase 3 | — | Pending |
| TZ-BE-09 | Phase 13 | — | Pending |
| TZ-BE-10 | Phase 1 | — | Complete |
| TZ-BE-11 | Phase 1 | — | Complete |
| TZ-BE-12 | Phase 1 | — | Complete |
| TZ-BE-13 | Phase 1.1 | 7 | Complete |
| TZ-BE-14 | Phase 1.1 | 4 | Complete |
| TZ-BE-15 | Phase 1 | — | Complete |
| TZ-BE-16 | Phase 1 | — | Complete |
| TZ-BE-17 | Phase 1 | — | Complete |
| TZ-BE-18 | Phase 1.1 | — | Complete |
| TZ-BE-19 | Phase 1 | — | Complete |
| TZ-BE-20 | Phase 3 | 5, 7, 12, 13, 14 | Pending |
| TZ-BE-21 | Phase 5 | — | Pending |
| TZ-BE-22 | Phase 2 | — | Pending |
| TZ-BE-23 | Phase 2 | — | Pending |
| TZ-BE-24 | Phase 10 | 11, 12 | Pending |
| TZ-BE-25 | Phase 7 | 13 | Pending |
| TZ-BE-26 | Phase 7 | 13, 14 | Pending |
| TZ-BE-27 | Phase 4 | — | Pending |
| TZ-PROD-01 | Phase 4 | — | Pending |
| TZ-PROD-02 | Phase 4 | — | Pending |
| TZ-PROD-03 | Phase 4 | — | Pending |
| TZ-PROD-04 | Phase 4 | — | Pending |
| TZ-PROD-05 | Phase 4 | — | Pending |
| TZ-PROD-06 | Phase 4 | — | Pending |
| TZ-PROD-07 | Phase 2 | 4 | Pending |
| TZ-PROD-08 | Phase 4 | — | Pending |
| TZ-PROD-09 | Phase 4 | — | Pending |
| TZ-PROD-10 | Phase 1 | 1.1, 4 | Complete |
| TZ-PROD-11 | Phase 1.1 | 14 | Complete |
| TZ-PROD-12 | Phase 4 | 1 | Pending |
| TZ-PROD-13 | Phase 2 | 5, 6 | Pending |
| TZ-CICD-01 | Phase 1.1 | 1 | Complete |
| TZ-CICD-02 | Phase 1 | — | Complete |
| TZ-CICD-03 | Phase 1 | 4 | Complete |
| TZ-CICD-04 | Phase 1 | — | Complete |
| TZ-CICD-05 | Phase 1 | — | Complete |
| TZ-CICD-06 | Phase 4 | 1 | Pending |
| TZ-CICD-07 | Phase 1.1 | 1 | Pending |
| TZ-CICD-08 | Phase 1.1 | 5 | Pending |
| TZ-PRODUCT-01 | Phase 10 | — | Pending |
| TZ-PRODUCT-02 | Phase 10 | — | Pending |
| TZ-PRODUCT-03 | Phase 10 | — | Pending |
| TZ-PRODUCT-04 | Phase 10 | — | Pending |
| TZ-PRODUCT-05 | Phase 2 | 5 | Pending |
| TZ-PRODUCT-06 | Phase 6 | — | Pending |
| TZ-PRODUCT-07 | Phase 6 | — | Pending |
| TZ-PRODUCT-08 | Phase 3 | 7 | Pending |
| TZ-PRODUCT-09 | Phase 12 | 13 | Pending |
| TZ-PRODUCT-10 | Phase 5 | 10 | Pending |
| TZ-PROCESS-01 | Phase 1.1 | 1 | Pending |
| TZ-PROCESS-02 | Phase 1.1 | 1 | Pending |
| TZ-PROCESS-03 | Phase 1.1 | — | Pending |
| TZ-PROCESS-04 | Phase 1.1 | — | Pending |
| TZ-PROCESS-05 | Phase 1.1 | — | Pending |
| TZ-PROCESS-06 | Phase 1 | — | Complete |
| TZ-PROCESS-07 | Phase 1.1 | — | Pending |
| TZ-PROCESS-08 | Phase 1.1 | — | Pending |
| TZ-PROCESS-09 | Phase 1.1 | — | Pending |
| TZ-PROCESS-10 | Phase 2 | — | Pending |
| TZ-PROCESS-11 | Phase 3 | — | Pending |
| TZ-PROCESS-12 | Phase 1.1 | — | Pending |

**Coverage:**
- v1 requirements: 191 total (183 mandatory + 8 optional ★)
- Mapped to phases: 191
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-08*
*Last updated: 2026-11-12 after Phase 1.1 verification (15 IDs proven by code; TZ-FE-17, TZ-CICD-07, TZ-CICD-08 and TZ-PROCESS-* stay Pending)*
