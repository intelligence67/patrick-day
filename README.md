# Patricio Landing

`patricio.cuatrobet.com` keeps the original campaign design and adds the standard CuatroBet registration business logic underneath it.

## What stays unchanged

- the existing Patricio layout, hero, modal, and visual styling
- the current bonus selection UI
- the current phone-entry interaction and background assets

## What was added

- Vite build and local preview commands
- the CuatroBet registration payload contract
- MTFEF-aware marketing metadata collection
- shared main-repo export through `../../template/scripts/build-repo.mjs`
- integrated-repo compatibility via `auth-helper-v2.js` and `landing-welcome-adapter.js`

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Export into the main repo

```bash
npm run build:repo
```

That command:

1. builds the landing
2. resolves the target main repo
3. switches the target repo to `main`
4. pulls with `--ff-only`
5. creates or switches branch `patricio`
6. writes the integrated landing into `patricio/`
7. stages only the Patricio landing files

`landing.export.json` sets this landing to the standard Bono-style integrated shell, so the exported version includes:

- `marketing_lib_script.inc`
- `/common/css/landing-email-hint-fix.css`
- `/common/js/auth-helper-v2.js`
- `/common/js/landing-welcome-adapter.js`
- `window.nnbonus`
- `window.landing_type = "registration_on_landing"`

## Repo override

```bash
npm run build:repo -- --repo-dir /abs/path/to/inicio.cuatrobet.com
CUATRO_MAIN_REPO_DIR=/abs/path/to/inicio.cuatrobet.com npm run build:repo
```

## Integration notes

- In the raw repo, Patricio can submit directly to the registration API for local testing.
- In the integrated repo, Patricio detects `window.sendApiRequest` and uses the shared CuatroBet submit path instead.
- The visual DOM is Patricio-specific, so this landing ships its own bridge logic while still using the same backend/auth/MTFEF stack as Bono after export.
