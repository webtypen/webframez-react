# Authentication in React components

Configure named Core scopes through the application's auth configuration:

```ts
import { Auth, Config, Route } from "@webtypen/webframez-core";

Config.register("auth", { scopes: { main: { model: User, origin: "https://site.example" } } });
Route.auth("/api/auth", { auth: "main" });
ReactRoute.renderReact("/", { distRootDir: "dist", pagesDir: "dist/app/Website", auth: "main" });
```

Both routes resolve the same `Auth.scope("main")` object. No application singleton
or resolver factory is needed. Existing explicit scope objects and lazy factories
remain supported by React for compatibility.
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
name, firstname, lastname and roles; `AuthScope` option `publicUserFields` configures the
allowlist. The password field, internal Model metadata and `__hidden` fields are
excluded even if requested. Only public session metadata is sent; token secrets
and token hashes are never included. Snapshots refresh on navigation and router
refresh, including logout and revocation detected on the next request. They are
UI state; authorization remains on the server. There is no background polling.
For component tests or custom roots, `AuthProvider` and `useAuth` are also exported
from `@webtypen/webframez-react/auth`.

For controllers and Core middleware, load auth with `await Auth.scope().resolve(req)` or
register `Auth.scope().middleware({ required: true })` in the Kernel. Then use
`req.auth.user` and `req.auth.session` after checking auth is present. An optional
middleware (`Auth.scope().middleware()`) leaves anonymous requests with `req.auth = null`.
Mutation resolution always enforces CSRF. `resolveCookies(cookies)` exists for
trusted server render integrations; it performs a read-only authentication.

## Automatic cookie renewal and browser auth

With `auth: "main"` (or another registered scope), the HTTP handler loads the real
user model and resumes expired access cookies on GET/HEAD before rendering SSR or
RSC. Resumption requires a current refresh secret and its matching session-bound
CSRF cookie; expired, revoked or inactive sessions remain anonymous. Read resumption
renews only access; explicit POST refresh rotates access and refresh secrets.

The handler publishes browser-safe endpoint and CSRF-cookie settings in the head.
`mountWebframezClient()` automatically installs Core's CSRF/form/refresh adapter
once when these settings are present. No Auth polling component is required.
API auth failures trigger one shared refresh and one request retry; login and
permission failures are not retried. Named scopes and basenames use their registered
endpoint and cookie names. Access and refresh cookies remain HttpOnly.

Override browser routing with `mountWebframezClient({ auth: { loginPaths: [...] } })`,
or disable installation explicitly with `auth: false`. Projects with custom fetch
behavior should install their wrapper before mounting so it remains in the fetch chain.
