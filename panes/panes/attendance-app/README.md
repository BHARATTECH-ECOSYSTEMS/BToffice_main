# Attendance App

A self-contained full-stack punch in / punch out system with login.

## Features

- Login required before recording attendance
- Punch in and punch out for the current day
- Daily status tracking and total worked hours
- Session-based authentication with HTTP-only cookie
- JSON file persistence for users and attendance logs

## Run

```bash
cd attendance-app
npm start
```

Open `http://127.0.0.1:3001`.

## Default Login

- Email: `admin@company.com`
- Password: `admin123`

Override the seeded account before first run with:

```bash
ATTENDANCE_DEFAULT_EMAIL=manager@company.com
ATTENDANCE_DEFAULT_PASSWORD=strongpassword
npm start
```

## Data Files

- `data/users.json`
- `data/punches.json`
