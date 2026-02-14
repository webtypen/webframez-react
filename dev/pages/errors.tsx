"use server";

import React from "react";
import type { ErrorPageProps, HeadConfig } from "webframez-react/types";

export function Head({ statusCode, message }: ErrorPageProps): HeadConfig {
  return {
    title: `${statusCode} - ${message}`,
    description: "An error happened while loading this route.",
    meta: [{ name: "robots", content: "noindex" }],
  };
}

export default function ErrorsPage({
  statusCode,
  message,
  pathname,
  payload,
}: ErrorPageProps) {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>{statusCode}</h1>
      <p style={{ color: "red" }}>{message}</p>
      <p>
        Path: <code>{pathname}</code>
      </p>
      {payload !== undefined ? (
        <p>
          Payload: <code>{JSON.stringify(payload)}</code>
        </p>
      ) : null}
    </section>
  );
}
