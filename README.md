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
```

## Quick Start with webframez-core

```ts
// server.ts
import { WebApplication, Route } from "@webtypen/webframez-core";
import { initWebframezReact } from "@webtypen/webframez-react/webframez-core";

initWebframezReact(Route);

Route.renderReact("/react", {
  distRootDir: `${process.cwd()}/dist`,
});

WebApplication.boot();
```

Notes:
- `"/react"` is automatically registered as a catch-all route (`/react/*`).
- `basePath`, `assetsPrefix`, `rscPath`, and `clientScriptUrl` are derived automatically from the mount path.

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
import { RouteChildren } from "webframez-react/router";

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

import type { PageProps } from "webframez-react/types";

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
import { mountWebframezClient } from "webframez-react/client";

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
import { Link, Redirect } from "webframez-react/navigation";

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
import { useCookie, useRouter } from "webframez-react/client";

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

- `webframez-react`
  - `createNodeRequestHandler`, `createFileRouter`, `createHTMLShell`, `sendRSC`, `createRSCHandler`
- `webframez-react/webframez-core`
  - `initWebframezReact`
- `webframez-react/router`
  - `RouteChildren`
- `webframez-react/client`
  - `mountWebframezClient`, `useRouter`, `useCookie`
- `webframez-react/navigation`
  - `Link`, `Redirect`
- `webframez-react/types`
  - all public types (`RouteContext`, `PageProps`, `ErrorPageProps`, ...)

## package.json Scripts

Example scripts for a `webframez-react` app:

```json
{
  "scripts": {
    "build:server": "tsc -p tsconfig.server.json",
    "build:client": "webpack --config webpack.client.cjs",
    "build": "npm run build:server && npm run build:client",
    "start": "node --conditions react-server start-server.cjs",
    "watch:server": "tsc -p tsconfig.server.json --watch --preserveWatchOutput",
    "watch:client": "webpack --config webpack.client.cjs --watch",
    "serve:watch": "node --watch --conditions react-server start-server.cjs",
    "dev": "sh -c 'npm run watch:server & npm run watch:client & npm run serve:watch & wait'"
  }
}
```

Notes:
- `build` compiles server output (`pages`, `server.ts`) and client output (`client.tsx` bundle + RSC manifests).
- `start` runs the built app in React Server mode.
- `dev` enables watch mode for TypeScript and webpack and restarts Node automatically on server output changes.

## Build

```bash
npm run build
```

Watch mode:

```bash
npm run build:watch
```
