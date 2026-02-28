"use server";
import React from "react";
import type { HeadConfig, PageProps } from "@webtypen/webframez-react/types";

export async function Data() {
  return {
    random: Math.random(),
  };
}

export function Head({ data }: PageProps<typeof Data>): HeadConfig {
  return {
    title: data?.random + " - About",
    description: "About page rendered via file-based routing.",
  };
}

export default function AboutPage({ data }: PageProps<typeof Data>) {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>About</h1>
      <p>
        This route is resolved from <code>pages/about/index.tsx</code>.
      </p>
      <p>Random-Wert: {data?.random}</p>
    </section>
  );
}
