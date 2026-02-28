"use server";

import React from "react";
import { Link } from "@webtypen/webframez-react/navigation";
import { RouteChildren } from "@webtypen/webframez-react/router";
import type { HeadConfig, RouteContext } from "@webtypen/webframez-react/types";
import LogoutButton from "../src/components/LogoutButton";

export function Head(): HeadConfig {
  return {
    title: "Webframez RSC",
    description: "File-based routing demo with React Server Components",
    favicon: "/assets/favicon.ico",
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
  };
}

export default function Layout(context: RouteContext) {
  const loggedIn = context.cookies.logged_in === "1";

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <nav
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        {loggedIn ? <LogoutButton /> : <Link to="/login">Login</Link>}
        <Link to="/accounts/jane">Account: jane</Link>
      </nav>
      <RouteChildren />
    </main>
  );
}
