"use server";

import React from "react";
import { Redirect } from "webframez-react/navigation";
import type { HeadConfig } from "webframez-react/types";
import LoginForm from "../../src/components/LoginForm";
import type { PageProps } from "webframez-react/types";

export function Head(): HeadConfig {
  return {
    title: "Login",
    description: "Login page with client component state.",
  };
}

export default function LoginPage(context: PageProps) {
  if (context.cookies.logged_in === "1") {
    return <Redirect to="/" />;
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Login</h1>
      <LoginForm />
    </section>
  );
}
