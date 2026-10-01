# Authentication in React components

Configure one model-backed Core auth instance for controllers and React routes:

```ts
import { ModelAuth, Route } from "@webtypen/webframez-core";

const auth = new ModelAuth({ model: User, origin: "https://site.example" });
Route.auth("/api/auth", { auth });
ReactRoute.renderReact("/", { distRootDir: "dist", pagesDir: "dist/app/Website", auth });
```

A lazy factory (`auth: () => auth`) is supported for configuration loaded at boot.
Authentication is optional for public React pages. It runs before page data,
React middleware, layouts and server components. Protected pages must redirect
or abort when auth is null. Core always verifies expiry, revocation and account
policy. It loads the actual User Model once during resolution and makes it
available on the same Core Request used by controllers.

```tsx
"use server";

import { getAuth } from "@webtypen/webframez-react/auth-server";
import type { PageProps } from "@webtypen/webframez-react/types";

export default function Page(context: PageProps) {
  const auth = getAuth<User>(context);
  // Equivalent: context.request.auth
  // Original Core Request: context.request.req
  if (!auth) return <p>Please log in.</p>;
  return <h1>{auth.user.firstname}</h1>;
}
```

`getAuth` is synchronous because the resolver has already loaded the session.
A model instance, its persistence methods and private fields remain on the server.
The original Request and its auth context are non-enumerable and are omitted from
transport serialization. Do not manually pass a full Model to a client component.

```tsx
"use client";

import { useAuth } from "@webtypen/webframez-react/client";

export default function AccountLabel() {
  const { user, session, isAuthenticated } = useAuth<{ firstname: string }>();
  return <span>{isAuthenticated ? user?.firstname : "Guest"}</span>;
}
```

The React route inserts an AuthProvider automatically, including SSR. The hook
receives a safe snapshot. Default public user fields are the primary key, email,
name, firstname, lastname and roles; `ModelAuth.publicUserFields` configures the
allowlist. The password field, internal Model metadata and `__hidden` fields are
excluded even if requested. Only public session metadata is sent; token secrets
and token hashes are never included. Snapshots refresh on navigation and router
refresh, including logout and revocation detected on the next request. They are
UI state; authorization remains on the server. There is no background polling.
For component tests or custom roots, `AuthProvider` and `useAuth` are also exported
from `@webtypen/webframez-react/auth`.

For controllers and Core middleware, load auth with `await auth.resolve(req)` or
register `auth.middleware({ required: true })` in the Kernel. Then use
`req.auth.user` and `req.auth.session` after checking auth is present. An optional
middleware (`auth.middleware()`) leaves anonymous requests with `req.auth = null`.
Mutation resolution always enforces CSRF. `resolveCookies(cookies)` exists for
trusted server render integrations; it performs a read-only authentication.
