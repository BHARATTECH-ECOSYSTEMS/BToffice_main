# Bharattech Origin — full stack

One repository for the public website + employee portal and the company backend, with the history of both kept.
Everything is in `bharattech/`.

| Folder | What it is | Came from |
|---|---|---|
| `bharattech/frontend/` | Public website and the employee portal (`/#/portal`): React + Vite + three.js | `pk-redesign-thread-story`, branch `backend/signin-profile-people` |
| `bharattech/backend/` | Company backend and the apps the portal connects to | `BToffice_main-main`, branch `feature/profile-people-invites` |

Inside `bharattech/backend/Bharattech/`:

- `Integrated/Integrated/Learning-Management-System/Backend` — the portal's API (Express + MongoDB, sign-in through Keycloak)
- `Integrated/Integrated/MERN_LMS-main` — Learning (courses), `client` and `server`
- `Integrated/Integrated/huly/huly-selfhost` — Workspace / e-Office (Huly), run with Docker
- `openinterviewer` — AI interviews

The company's other folders (`bharattech/backend/panes`, the two Cinematic Landing Page folders) came with the backend unchanged.

## Running it locally

| Service | Port | Start |
|---|---|---|
| Keycloak 26.7.0, realm `bharattech`, client `lms-client` | 4000 | `kc.bat start-dev` with `KC_HTTP_PORT=4000` |
| Portal API | 5000 | `npm start` in `Learning-Management-System/Backend` |
| Learning server | 5176 | `npm start` in `MERN_LMS-main/server` (`PORT=5176` in its `.env`) |
| Learning website | 5175 | `npm run dev` in `MERN_LMS-main/client` |
| Website + portal | 4182 | `npm run build`, then `npm run preview -- --port 4182` in `bharattech/frontend` |

Every service reads its settings from its own `.env`, which is never committed; the website's are listed in
`bharattech/frontend/.env.example`. The website needs `VITE_API_BASE_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM` and `VITE_KEYCLOAK_CLIENT_ID`. In Keycloak,
`lms-client` must allow `http://localhost:5175/*` as a redirect address for Learning's sign-in.
