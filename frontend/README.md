# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## SITE_ADMIN first-login policy

If both `VITE_SITE_ADMIN_EMAIL` and `VITE_SITE_ADMIN_INITIAL_PASSWORD` are set:

- When that email logs in with the initial password,
- the account is marked as `SITE_ADMIN (lvl 100)` and `mustChangePassword=true`,
- then the user is forced to `/settings` to change password.

- `VITE_SITE_ADMIN_EMAIL`
- `VITE_SITE_ADMIN_INITIAL_PASSWORD`

### 2) Manual promote script

Run manual promote after the target user has signed up:

```bash
npm run init:admin
```

Set these environment variables before running:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_SITE_ADMIN_EMAIL` (optional)
- `VITE_SITE_ADMIN_INITIAL_PASSWORD` (optional)
- `SITE_ADMIN_EMAIL`
