"use client";

import React from "react";

type BasenameOption = {
  basename?: string;
};

type RouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

function getDefaultBasename() {
  const globalValue = (globalThis as { __RSC_BASENAME?: string }).__RSC_BASENAME;
  if (globalValue && globalValue !== "/") {
    return globalValue;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const value = (window as Window & { __RSC_BASENAME?: string }).__RSC_BASENAME;
  return value && value !== "/" ? value : "";
}

function getClientRouter(): RouterLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = (window as Window & { __WEBFRAMEZ_ROUTER__?: RouterLike }).__WEBFRAMEZ_ROUTER__;
  return value ?? null;
}

function withLeadingSlash(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}

function normalizeBase(base?: string) {
  if (!base || base.trim() === "" || base === "/") {
    return "";
  }

  const withSlash = withLeadingSlash(base.trim());
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

function isExternal(href: string) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href) || href.startsWith("//");
}

function resolveHref(to: string, basename?: string) {
  if (!to || to.trim() === "") {
    return "/";
  }

  const trimmed = to.trim();
  if (isExternal(trimmed) || trimmed.startsWith("#")) {
    return trimmed;
  }

  const [pathPart, hashPart] = trimmed.split("#", 2);
  const [pathnamePart, queryPart] = pathPart.split("?", 2);
  const pathname = withLeadingSlash(pathnamePart || "/");
  const base = normalizeBase(basename);

  let resolvedPath = pathname;
  if (base && pathname !== "/" && !pathname.startsWith(`${base}/`) && pathname !== base) {
    resolvedPath = `${base}${pathname}`;
  } else if (base && pathname === "/") {
    resolvedPath = base;
  }

  const query = queryPart ? `?${queryPart}` : "";
  const hash = hashPart ? `#${hashPart}` : "";
  return `${resolvedPath}${query}${hash}`;
}

export type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  basename?: string;
};

export function Link({ to, basename, onClick, ...rest }: LinkProps) {
  const resolvedHref = resolveHref(to, basename ?? getDefaultBasename());

  return (
    <a
      {...rest}
      href={resolvedHref}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (rest.target && rest.target !== "_self") {
          return;
        }
        if (isExternal(resolvedHref)) {
          return;
        }

        const router = getClientRouter();
        if (!router) {
          return;
        }

        event.preventDefault();
        router.push(resolvedHref);
      }}
    />
  );
}

export type RedirectProps = BasenameOption & {
  to: string;
  replace?: boolean;
};

export function Redirect({ to, basename, replace = true }: RedirectProps) {
  const resolvedHref = resolveHref(to, basename ?? getDefaultBasename());

  if (typeof window !== "undefined") {
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (resolvedHref !== currentHref) {
      setTimeout(() => {
        if (isExternal(resolvedHref)) {
          if (replace) {
            window.location.replace(resolvedHref);
          } else {
            window.location.assign(resolvedHref);
          }
          return;
        }

        const router = getClientRouter();
        if (router) {
          if (replace) {
            router.replace(resolvedHref);
          } else {
            router.push(resolvedHref);
          }
          return;
        }

        if (replace) {
          window.location.replace(resolvedHref);
        } else {
          window.location.assign(resolvedHref);
        }
      }, 0);
    }
  }

  return null;
}
