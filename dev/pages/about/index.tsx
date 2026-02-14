"use server";

import React from "react";
import type { HeadConfig } from "webframez-react/types";

export function Head(): HeadConfig {
  return {
    title: "About",
    description: "About page rendered via file-based routing.",
  };
}

export default function AboutPage() {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>About</h1>
      <p>This route is resolved from <code>pages/about/index.tsx</code>.</p>
    </section>
  );
}
