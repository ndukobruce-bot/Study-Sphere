# StudySphere Closed Testing Guide

## Tester Scope

Recommended closed testing group: 20 or more university students using Android 13, Android 14, and Android 15 devices where possible.

## Smoke Test Flow

1. Install the app from the closed testing link.
2. Open StudySphere.
3. Create a student login and give consent.
4. Confirm the dashboard opens.
5. Add a task.
6. Add an exam countdown.
7. Create a planner schedule.
8. Start and stop a focus timer.
9. Open notes, flashcards, games, and weekly report.
10. Close and reopen the app; confirm login is remembered.
11. Confirm no paid-access or payment links appear in navigation or feature flows.
12. Open Privacy Policy from the app/home page.

## Regression Checks

- Navigation links do not dead-end.
- Student data persists after app restart.
- Logout returns to login.
- Admin access is disabled in the Android build.
- Offline pages still load after first launch.
- Text remains readable on small screens.

## Tester Feedback Questions

- Did the app open without crashing?
- Was login clear?
- Did the dashboard make sense?
- Which feature felt most useful?
- Which page felt confusing?
- Did any button fail?
- Did the app feel too slow or visually cluttered?
