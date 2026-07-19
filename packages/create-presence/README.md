# create-presence

Scaffold a new [Presence](https://github.com/KobaKhit/presence) site.

## Usage

From a Presence checkout (full copy of the framework):

```bash
node packages/create-presence/bin/create-presence.js my-site
cd my-site
npm install
cp .env.example .env.local
npm run presence -- compile --no-llm
npm run dev
```

When published to npm:

```bash
npx create-presence my-site
```

If the scaffolder cannot find the template repo, it writes a minimal stub and points you at the full framework.
