# Yuan Lab Website — Project Overview

**Yuan Lab** (袁富文课题组) at Shanghai University of Traditional Chinese Medicine (SHUTCM). A single-page application built with vanilla React 18, Babel standalone (in-browser JSX transpilation), and Supabase as the backend.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18.3.1 (UMD via CDN) |
| JSX Transpilation | Babel Standalone 7.29 (in-browser) |
| CSS | Single `styles.css` — custom properties (OKLCH color space) |
| Backend | Supabase (Postgres REST API + Storage) |
| Hosting | Vercel (static export) |
| Data | Seed data (`window.LAB_DATA`) → Supabase DB on mount (merge with seed) |
| State | React Context (`AppCtx`) + localStorage persistence |

---

## Project Structure

```
Yuanlab web/
├── index.html                         # Entry point — loads all assets via CDN
├── app.jsx                            # Root App component & ReactDOM.render
├── styles.css                         # Global styles, design tokens, utility classes
├── data.js                            # Supabase client, seed data, i18n strings, localStorage restore
├── vercel.json                        # Vercel static deployment config
├── project-overview.md                # This file
│
├── components/
│   ├── shared.jsx                     # Nav, Footer, LoginModal, Toast, AdminImage, Icons
│   ├── pages_basic.jsx                # HomePage, ResearchPage, JoinPage, ContactPage
│   ├── pages_people_pubs.jsx          # PeoplePage, PublicationsPage
│   ├── pages_calendar.jsx             # CalendarPage (month view + events)
│   └── pages_resources_admin.jsx      # ResourcesPage + AdminConsole (ALL admin tabs)
│
└── public/
    ├── members.txt                    # Member list reference
    └── publications.txt               # Full publication list with PMIDs
```

---

## Data Flow

1. **Seed data** defined in `data.js` via `window.LAB_DATA` — powers the site immediately on load.
2. On mount, `App.jsx` calls `window.SUPABASE.loadAll()` which queries 5 Supabase tables (`members`, `publications`, `news`, `projects`, `resources`) in parallel and merges results into `window.LAB_DATA`, overwriting seed values.
3. After seed data init, `data.js` runs **localStorage restore** code that reads saved content (`yuanlab.home`, `yuanlab.joinUs`, `yuanlab.events`) and merges back into `LAB_DATA` — this makes admin edits survive page refresh.
4. Components read from `window.LAB_DATA` and re-render when `labdata:updated` custom event fires.
5. **Session state** (route, language, user, admin panel state) is persisted to `localStorage`.

### Key: localStorage keys used

| Key | Content | Managed by |
|-----|---------|-----------|
| `yuanlab.state` | Route, lang, user, adminOpen | App.jsx (auto) |
| `yuanlab.home` | Hero text, join lead | AdminPages |
| `yuanlab.joinUs` | Position list (en/cn) | AdminJoinUs |
| `yuanlab.events` | Event list with repeat patterns | AdminCalendar |
| `yuanlab.messages` | Contact form submissions | ContactPage + AdminMessages |
| `yuanlab.comments` | Resource discussion comments | DiscussionSection |
| `yuanlab.images` | Uploaded images (data URLs) | AdminImage |
| `yuanlab.memberPhotos` | Member profile photos | PeoplePage |
| `yuanlab.pageContent` | Lab mission text | AdminPages |

### Supabase tables

| Table | Purpose |
|-------|---------|
| `members` | Lab members & alumni |
| `publications` | Publication records |
| `news` | News feed items |
| `projects` | Research projects |
| `resources` | Shared lab files |
| `messages` | Contact form submissions |
| `resource_comments` | Discussion comments (opt-in) |
| `events` | Calendar events (opt-in) |

All Supabase operations are **best-effort** — failures are silently caught, local data is used as fallback.

---

## State Management

No external state library — uses React Context (`AppCtx`) with `useState`-driven store at App level. Context includes:

- `route`, `setRoute` — SPA routing
- `lang`, `setLang` — EN/CN i18n toggle
- `user`, `signIn`, `signOut` — Auth (admin/member/guest)
- `adminOpen`, `openAdmin`, `closeAdmin` — Admin console
- `showLogin`, `openLogin`, `closeLogin` — Login modal
- `toasts`, `addToast` — Toast notifications
- `t` — Shortcut to `window.LAB_I18N[lang]`
- `dbReady` — Toggles when Supabase data finishes loading

---

## Pages & Routes

| Route | Component | File | Description |
|-------|-----------|------|-------------|
| `home` | `HomePage` | pages_basic.jsx | Hero + group photo + stats + this week + research + news + pubs |
| `people` | `PeoplePage` | pages_people_pubs.jsx | PI bio + member cards + alumni + photo upload |
| `research` | `ResearchPage` | pages_basic.jsx | 4 research direction cards |
| `publications` | `PublicationsPage` | pages_people_pubs.jsx | Filterable/searchable grouped by year |
| `resources` | `ResourcesPage` | pages_resources_admin.jsx | File repository with member gating |
| `calendar` | `CalendarPage` | pages_calendar.jsx | Month view calendar + events |
| `join` | `JoinPage` | pages_basic.jsx | Recruitment positions |
| `contact` | `ContactPage` | pages_basic.jsx | Contact info + form to Supabase |

---

## Features Detail

### Cross-cutting
- **i18n** — EN/CN toggle via `window.LAB_I18N`, all components use `t = LAB_I18N[lang]`
- **Auth** — Username/password login, 3 roles: `guest`, `member`, `admin`
- **Toast notifications** — Stack-based feedback for all actions
- **Admin image upload** — Client-side canvas resize + Supabase Storage + localStorage fallback
- **localStorage persistence** — All admin edits survive page refresh

### HomePage (`pages_basic.jsx`)
- Hero section with editable headline (via AdminPages)
- Lab group photo (admin-uploadable)
- Stats: members, publications, grants, lab age
- **This Week in the Lab** — 7-day agenda showing events from calendar with recurring expansion, birthdays
- Research directions + News feed + Featured publications

### CalendarPage (`pages_calendar.jsx`)

| Feature | Detail |
|---------|--------|
| Month grid | 7-column (Sun–Sat), prev/next/Today nav |
| Event dots | Colored dots by priority (🔴 High / 🟢 Medium / ⚪ Low) |
| Event highlighting | `inset box-shadow` — 3px bottom border by highest priority |
| Event count | "1 event" / "2 events" label below date |
| Holiday display | Chinese public holidays shown in red (e.g. 劳动节/Labor Day) |
| Solar terms | 24 节气 shown in green (e.g. 立夏/Start of Summer) |
| Day click | Shows event list with time, title, location, priority badge |
| Event detail modal | Date, time, location, people, priority, repeat, description |

**Recurring events** — Supported patterns:
| Repeat | Label | Expansion |
|--------|-------|-----------|
| `none` | None | Single occurrence |
| `daily` | Daily | Every day from start date |
| `weekly` | Weekly | Every 7 days |
| `biweekly` | Every 2 weeks | Every 14 days |
| `monthly` | Monthly | Same day each month |

**Birthday integration** — Member `birthday` field (MM-DD format) auto-generates 🎂 events on calendar.

### ResourcesPage (`pages_resources_admin.jsx`)
- Member-gated file repository
- Categories: Internal/External Protocols, Literature PPT, Duty Roster, Lab Meeting, Reagent Inventory, Reading Group
- File detail modal with meta info
- **Discussion section** per file — comments, replies, likes, admin delete
- Upload (drag-drop) + edit + delete

### Admin Console (`AdminPage`)

| Tab | Component | Features |
|-----|-----------|----------|
| Dashboard | `AdminDashboard` | Stats overview, top downloaded files |
| Publications | `AdminPubs` | CRUD for publications, featured toggle |
| Members | `AdminMembers` | CRUD for members, photo upload, alumni management |
| Files | `AdminResources` | Upload/edit/delete shared files |
| News | `AdminNews` | Post/delete news updates (EN + CN) |
| **Calendar** | `AdminCalendar` | CRUD for events with repeat pattern, priority |
| Pages | `AdminPages` | Edit hero headline, lab mission, join lead (EN + CN) |
| Join Us | `AdminJoinUs` | Manage recruitment positions (EN + CN) |
| Messages | `AdminMessages` | View contact form submissions |
| Users | `AdminUsers` | List user accounts |

---

## Design System

- **Color palette**: OKLCH warm academic — cream bg (`0.974 0.008 85`), ink-green accent, brick red for priority/delete
- **Typography**: Inter (sans), Source Serif 4 (serif), Noto Serif SC (Chinese), JetBrains Mono (mono)
- **Components**: Cards, chips/badges, modals, buttons (primary/ghost/text/danger), toast stack, tables, form inputs
- **Animations**: `page-fade` (fade+slide), `modalFade`/`modalSlide`, `toastIn`

---

## Conventions for future development

- **Add a new page**: Create component in new file → `Object.assign(window, { CompName })` → add route in `app.jsx` → add nav link in `shared.jsx` Nav items → add script ref in `index.html`
- **Add an admin tab**: Add `["tabKey", label]` to tabs array → add `{tab === "tabKey" && <AdminComp />}` → create component in `pages_resources_admin.jsx` → add to `Object.assign` export
- **Persist admin data**: Save to `window.LAB_DATA` + `localStorage.setItem("yuanlab.key", ...)`; restore in `data.js` after `LAB_DATA` definition
- **Cache busting**: Update `v=` params in `index.html` when modifying JS files
- **Data privacy**: Resources are member-gated; comments and admin panels are auth-protected

---

## Deployment

Static site on **Vercel** via `@vercel/static` build. No build step needed — everything runs client-side. The `index.html` loads React, Babel standalone, and all `.jsx` files from CDN or local scripts.
