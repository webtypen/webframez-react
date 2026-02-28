"use server";

import React from "react";
import type { HeadConfig, PageProps } from "@webtypen/webframez-react/types";

export function Head(): HeadConfig {
  return {
    title: "Home",
    description: "Welcome to the RSC file router demo.",
  };
}

export default function HomePage({ searchParams }: PageProps) {
  const showHint = searchParams.hint === "1";

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Welcome</h1>
      <p style={{ color: "red" }}>bla bla bla 123</p>
      <p>
        This route comes from <code>pages/index.tsx</code>.
      </p>
      {showHint ? <p>Hint query param is active.</p> : null}
    </section>
  );
}
