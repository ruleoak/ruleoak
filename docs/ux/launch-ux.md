# Launch UX

RuleOak Core includes a guided first-run experience.

## Main commands

```bash
npm run launch
npm run demo
npm run onboard
npm run report:html
npm run report:view
```

## What `npm run launch` does

The launch command runs the complete first-user path:

1. lists available examples;
2. runs the Technical Consultant demo;
3. runs the Research Brief demo;
4. runs the sandbox demo;
5. generates one-page HTML reports;
6. shows next-step commands.

## What `npm run onboard` does

The onboarding command lets a user choose a first workflow:

```text
Technical Consultant
Research Brief
Sandbox Demo
All
```

## Local report viewer

```bash
npm run report:view
```

Then open `http://127.0.0.1:8787/`.

The report viewer is local-only. It does not upload reports to a hosted service.
