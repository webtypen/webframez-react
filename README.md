# webframez-react

React Server Components (RSC) extension for `@webtypen/webframez-core`.

`webframez-react` provides:

- seamless `webframez-core` integration via `initWebframezReact(Route)`
- file-based routing for `pages/**/index.tsx`
- layout/error handling with `RouteChildren`
- client-side navigation (`Link`, `Redirect`, `useRouter`) and cookies (`useCookie`)
- server-rendered initial HTML plus RSC streaming

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
// server.ts
import { BaseKernelWeb, Route, WebApplication } from "@webtypen/webframez-core";
import { initWebframezReact } from "@webtypen/webframez-react/webframez-core";

class Kernel extends BaseKernelWeb {
  static controller = {};
  static middleware = {};
}

initWebframezReact(Route);

const app = new WebApplication();
app.boot({
  kernel: Kernel,
  routesFunction: () => {
    Route.renderReact("/react", {
      distRootDir: `${process.cwd()}/dist`,
    });
  },
});
```

Notes:

- `"/react"` is automatically registered as a catch-all route (`/react/*`).
- `basePath`, `assetsPrefix`, `rscPath`, and `clientScriptUrl` are derived automatically from the mount path.

## Add to an Existing webframez-core Project

If you already have a running `@webtypen/webframez-core` app, this is the smallest setup to mount React and return a first JSX page.

1. Install dependencies:

```bash
npm i @webtypen/webframez-react react react-dom react-server-dom-webpack
npm i -D typescript webpack webpack-cli ts-loader
```

2. Extend `Route` and mount React inside your existing `routesFunction`:

```ts
// server.ts
import path from "node:path";
import { BaseKernelWeb, Route, WebApplication } from "@webtypen/webframez-core";
import { initWebframezReact } from "@webtypen/webframez-react/webframez-core";

class Kernel extends BaseKernelWeb {
  static controller = {};
  static middleware = {};
}

initWebframezReact(Route);

const app = new WebApplication();
app.boot({
  kernel: Kernel,
  port: 3000,
  routesFunction: () => {
    // Your existing core routes can stay here.
    Route.renderReact("/app", {
      distRootDir: path.resolve(process.cwd(), "dist"),
    });
  },
});
```

3. Create a minimal file-router page setup:

```tsx
// pages/layout.tsx
"use server";

import React from "react";
import { RouteChildren } from "@webtypen/webframez-react/router";

export default function Layout() {
  return (
    <main>
      <RouteChildren />
    </main>
  );
}
```

```tsx
// pages/index.tsx
"use server";

import React from "react";

export default function HomePage() {
  return <h1>Hello from webframez-react + JSX</h1>;
}
```

4. Create the client entry:

```tsx
// src/client.tsx
import { mountWebframezClient } from "@webtypen/webframez-react/client";

mountWebframezClient();
```

5. Add build scripts (with automatic config fallback):

```json
{
  "scripts": {
    "build:server": "webframez-react build:server",
    "build:client": "webframez-react build:client",
    "build": "npm run build:server && npm run build:client",
    "watch:server": "webframez-react watch:server",
    "watch:client": "webframez-react watch:client",
    "serve:watch": "node --watch --conditions react-server start-server.cjs",
    "watch": "sh -c 'npm run watch:server & npm run watch:client & npm run serve:watch & wait'",
    "dev": "sh -c 'npm run watch:server & npm run watch:client & npm run serve:watch & wait'"
  }
}
```

After build, your first page is available at `http://localhost:3000/app`.

## Page Structure (File-Based Routing)

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
- rendered through `pages/errors.tsx` (same behavior as unmatched routes)
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

Note:

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
  - `createNodeRequestHandler`, `createFileRouter`, `createHTMLShell`, `sendRSC`, `createRSCHandler`
- `@webtypen/webframez-react/webframez-core`
  - `initWebframezReact`
- `@webtypen/webframez-react/router`
  - `RouteChildren`
- `@webtypen/webframez-react/client`
  - `mountWebframezClient`, `useRouter`, `useCookie`
- `@webtypen/webframez-react/navigation`
  - `Link`, `Redirect`
- `@webtypen/webframez-react/types`
  - all public types (`RouteContext`, `PageProps`, `ErrorPageProps`, ...)

## package.json Scripts

Example scripts for a `webframez-react` app:

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

- `webframez-react` CLI first checks project overrides and falls back to package defaults:
  - `tsconfig.server.json`
  - `webpack.client.cjs`
  - `webpack.server.cjs`
- `webpack.server.cjs` is optional. Default flow compiles server with `tsc`. Use webpack-server only if you explicitly want a bundled server build:
  - `webframez-react build:server:webpack`
  - `webframez-react watch:server:webpack`
- `build` compiles server output (`pages`, `server.ts`) and client output (`client.tsx` bundle + RSC manifests).
- `start` runs the built app in React Server mode.
- `watch` and `dev` run the same full watch pipeline and restart Node automatically on server output changes.

## Build

```bash
npm run build
```

Watch mode:

```bash
npm run build:watch
```
