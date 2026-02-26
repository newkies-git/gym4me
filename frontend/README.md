# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## SITE_ADMIN bootstrap

### 1) Automatic bootstrap on first signup (recommended)

If `VITE_SITE_ADMIN_EMAIL` is set, when that email signs up and no admin has been bootstrapped yet,
the account is created as `SITE_ADMIN (lvl 100)` once.

- `VITE_SITE_ADMIN_EMAIL`

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
- `VITE_SITE_ADMIN_EMAIL` (optional, for automatic bootstrap only)
- `SITE_ADMIN_EMAIL`
