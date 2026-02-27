# @webtypen/webframez-react

React Server Components (RSC) extension for `@webtypen/webframez-core`.

`@webtypen/webframez-react` provides:
- seamless `webframez-core` integration via `initWebframezReact(Route)`
- file-based routing for `pages/**/index.tsx`
- layout/error handling with `RouteChildren`
- client-side navigation (`Link`, `Redirect`, `useRouter`) and cookies (`useCookie`)
- server-rendered initial HTML plus RSC streaming
- a small CLI for the standard server/client build pipeline

## Requirements

- Node.js `>= 20`
- `@webtypen/webframez-core`
- React Experimental (matching the package peer dependencies)

## Installation

```bash
npm i @webtypen/webframez-react @webtypen/webframez-core react react-dom react-server-dom-webpack
npm i -D typescript webpack webpack-cli ts-loader
```

## Quick Start with webframez-core

```ts
// src/server.ts
import path from "node:path";
import { BaseKernelWeb, Route, WebApplication } from "@webtypen/webframez-core";
import { initWebframezReact } from "@webtypen/webframez-react";

class Kernel extends BaseKernelWeb {
  static controller = {};
  static middleware = {};
}

const ReactRoute = initWebframezReact(Route);

const app = new WebApplication();
app.boot({
  kernel: Kernel,
  routesFunction: () => {
    ReactRoute.renderReact("/react", {
      distRootDir: path.resolve(process.cwd(), "dist"),
    });
  },
});
```

Notes:
- `"/react"` is automatically registered as a catch-all route (`/react/*`).
- `basePath`, `assetsPrefix`, `rscPath`, and `clientScriptUrl` are derived automatically from the mount path unless you override them.
- `initWebframezReact(Route)` returns the extended route facade, which gives you reliable editor autocompletion for `renderReact(...)` even in monorepos or symlinked development setups.
- The package also ships module augmentation for `Route.renderReact(...)`, but using the returned `ReactRoute` variable is the most robust TypeScript setup.

## `Route.renderReact()`

Signature:

```ts
Route.renderReact(path, options)
```

Example:

```ts
Route.renderReact("/app", {
  distRootDir: path.resolve(process.cwd(), "dist"),
  method: "GET",
  routeOptions: {
    middleware: ["auth"],
  },
});
```

### Options

`distRootDir`
- Required.
- Directory containing the built client assets and generated manifests.

`pagesDir`
- Optional.
- Directory containing the compiled `pages/**` output.
- Default: `${distRootDir}/pages`

`manifestPath`
- Optional.
- Path to the React client manifest.
- Default: `${distRootDir}/react-client-manifest.json`

`assetsPrefix`
- Optional.
- Public URL prefix used to serve built client assets.
- Auto-derived from `path`.
- Example for `"/react"`: `/react/assets/`

`rscPath`
- Optional.
- Public URL for the RSC endpoint.
- Auto-derived from `path`.
- Example for `"/react"`: `/react/rsc`

`clientScriptUrl`
- Optional.
- Public URL of the browser client entry bundle.
- Auto-derived from `path`.
- Example for `"/react"`: `/react/assets/client.js`

`basePath`
- Optional.
- Basename mounted in front of all file-router paths.
- Auto-derived from `path` when `path !== "/"`.

`liveReloadPath`
- Optional.
- Enables dev live reload on a custom path or disables it explicitly with `false`.
- Automatically disabled in production mode.

`method`
- Optional.
- HTTP method or methods used to register the route.
- Supported values: `"GET" | "POST" | "PUT" | "DELETE"`
- Default: `"GET"`

`routeOptions`
- Optional.
- Additional route options forwarded to `webframez-core`.
- Typical use case: middleware.

## Recommended Project Structure

```txt
pages/
  layout.tsx
  errors.tsx
  index.tsx
  about/index.tsx
src/
  server.ts
  client.tsx
  components/
dist/
```

## `tsconfig.server.json`

Compared to a standard `@webtypen/webframez-core` project, the server TypeScript config usually needs a few changes:

- enable JSX via `"jsx": "react-jsx"`
- include `pages/**/*.tsx`
- include `src/components/**/*.tsx`
- include your server entry (`src/server.ts` or `src/server.tsx`)
- exclude the browser client entry (`src/client.tsx` by default)
- add `paths` mappings for the `@webtypen/webframez-react` package and its subpaths

When you use the CLI (`webframez-react build:server` / `watch:server`), it generates a temporary `.webframez-react.tsconfig.server.json` that extends your project `tsconfig.server.json`. That means:

- your own `tsconfig.server.json` stays the source of truth
- the CLI only injects the resolved server entry and the standard RSC include/exclude rules
- you only need to customize the base config when your project structure differs from the defaults

A good starting point is the shipped default config:

- `@webtypen/webframez-react/defaults/tsconfig.server`
- `@webtypen/webframez-react/defaults/tsconfig.server.example`

Example:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "baseUrl": ".",
    "paths": {
      "@webtypen/webframez-react": [
        "./node_modules/@webtypen/webframez-react/dist/index.d.ts"
      ],
      "@webtypen/webframez-react/types": [
        "./node_modules/@webtypen/webframez-react/dist/types.d.ts"
      ],
      "@webtypen/webframez-react/router": [
        "./node_modules/@webtypen/webframez-react/dist/router.d.ts"
      ],
      "@webtypen/webframez-react/client": [
        "./node_modules/@webtypen/webframez-react/dist/client.d.ts"
      ],
      "@webtypen/webframez-react/navigation": [
        "./node_modules/@webtypen/webframez-react/dist/navigation.d.ts"
      ],
      "@webtypen/webframez-react/webframez-core": [
        "./node_modules/@webtypen/webframez-react/dist/webframez-core.d.ts"
      ]
    },
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": [
    "src/server.ts",
    "src/server.tsx",
    "src/components/**/*.tsx",
    "pages/**/*.tsx",
    "src/types.d.ts"
  ],
  "exclude": [
    "src/client.tsx",
    "dist",
    "node_modules"
  ]
}
```

## `package.json` Scripts

Recommended scripts:

```json
{
  "scripts": {
    "build:server": "webframez-react build:server",
    "build:client": "webframez-react build:client",
    "build": "npm run build:server && npm run build:client",
    "start": "node --conditions react-server start-server.cjs",
    "watch:server": "webframez-react watch:server",
    "watch:client": "webframez-react watch:client",
    "serve:watch": "node --watch --conditions react-server start-server.cjs",
    "watch": "sh -c 'npm run watch:server & npm run watch:client & npm run serve:watch & wait'",
    "dev": "sh -c 'npm run watch:server & npm run watch:client & npm run serve:watch & wait'"
  }
}
```

Notes:
- `build` compiles the server output (`pages`, `server.ts`) and the browser client bundle (`client.tsx` + RSC manifests).
- `start` runs the built app in React Server mode.
- `watch` / `dev` keep TypeScript and webpack in watch mode and restart Node automatically when server output changes.

## CLI Config and Custom Entry Paths

The CLI first checks project override files and then falls back to the package defaults:

- `tsconfig.server.json`
- `webpack.client.cjs`
- `webpack.server.cjs`

If you do not want to create your own webpack config just to move `client.tsx` or `server.ts`, you can use a small project config file:

```js
// webframez-react.config.mjs
export default {
  clientEntryPath: "src/app/client.tsx",
  serverEntryPath: "src/app/server.tsx",
};
```

Supported file names:
- `webframez-react.config.mjs`
- `webframez-react.config.cjs`
- `webframez-react.config.js`
- `webframez-react.config.json`

You can also override the entry paths per command:

```bash
webframez-react build:client --client-entry=src/app/client.tsx
webframez-react build:server --server-entry=src/app/server.tsx
webframez-react watch:client --client-entry=src/app/client.tsx
webframez-react watch:server --server-entry=src/app/server.tsx
```

Notes:
- The default client entry is `src/client.tsx`.
- The default server entry is `src/server.ts`, with automatic fallback to `src/server.tsx` if present.
- `build:server:webpack` and `watch:server:webpack` also respect `serverEntryPath`.
- `build:server` and `watch:server` generate a temporary `.webframez-react.tsconfig.server.json` so custom server entry paths also work with the TypeScript compiler.

## File-Based Routing

Example:

```txt
pages/
  layout.tsx
  errors.tsx
  index.tsx
  about/index.tsx
  accounts/[username]/index.tsx
```

`pages/layout.tsx`:

```tsx
"use server";

import React from "react";
import { RouteChildren } from "@webtypen/webframez-react/router";

export default function Layout() {
  return (
    <main>
      <nav>...</nav>
      <RouteChildren />
    </main>
  );
}
```

`RouteChildren` marks where the currently resolved page should be rendered.

## Error Handling with `abort()`

Every server page gets `abort()` via `RouteContext`.

```tsx
"use server";

import type { PageProps } from "@webtypen/webframez-react/types";

export default function AccountPage({ params, abort }: PageProps) {
  if (params.username !== "jane") {
    abort({
      status: 404,
      message: `Account \"${params.username}\" not found`,
      payload: { attemptedUsername: params.username },
    });
  }

  return <section>...</section>;
}
```

Behavior:
- default without options: `404` + `"Page not found"`
- rendered through `pages/errors.tsx`
- `pathname` is provided automatically by context
- optional `payload` is forwarded to `errors.tsx`

## Client Entry

```tsx
// src/client.tsx
import { mountWebframezClient } from "@webtypen/webframez-react/client";

mountWebframezClient();
```

Optional:

```tsx
mountWebframezClient({
  rootId: "root",
  rscEndpoint: "/react/rsc",
});
```

## Navigation

```tsx
"use client";

import React from "react";
import { Link, Redirect } from "@webtypen/webframez-react/navigation";

export function Nav() {
  return (
    <>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
    </>
  );
}

export function Guard({ loggedIn }: { loggedIn: boolean }) {
  if (!loggedIn) {
    return <Redirect to="/login" replace />;
  }

  return null;
}
```

Notes:
- `Link` and `Redirect` automatically use the basename from `Route.renderReact()`.
- You can override it per usage via `basename`.

## Router and Cookies in Client Components

```tsx
"use client";

import React from "react";
import { useCookie, useRouter } from "@webtypen/webframez-react/client";

export default function LoginAction() {
  const cookie = useCookie();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        cookie.set("logged_in", "1", { path: "/react", sameSite: "Lax" });
        router.refresh();
      }}
    >
      Login
    </button>
  );
}
```

## Public Entrypoints

- `@webtypen/webframez-react`
  - `initWebframezReact`
  - `createNodeRequestHandler`
  - `createFileRouter`
  - `createHTMLShell`
  - `sendRSC`
  - `createRSCHandler`
- `@webtypen/webframez-react/webframez-core`
  - `initWebframezReact`
- `@webtypen/webframez-react/router`
  - `RouteChildren`
- `@webtypen/webframez-react/client`
  - `mountWebframezClient`, `useRouter`, `useCookie`
- `@webtypen/webframez-react/navigation`
  - `Link`, `Redirect`
- `@webtypen/webframez-react/types`
  - `RouteContext`, `PageProps`, `ErrorPageProps`, `AbortRouteOptions`, ...

## Package Build

Build the package itself:

```bash
npm run build
```

Watch mode for package development:

```bash
npm run build:watch
```
