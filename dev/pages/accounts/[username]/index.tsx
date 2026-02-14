"use server";

import React from "react";
import type { HeadConfig, PageProps } from "webframez-react/types";

export function Head({ params }: PageProps): HeadConfig {
  return {
    title: `Account ${params.username}`,
    description: `Profile page for ${params.username}.`,
  };
}

export default function AccountPage({
  params,
  searchParams,
  abort,
}: PageProps) {
  if (params.username !== "jane123") {
    abort({
      status: 404,
      message: `Account "${params.username}" not found`,
      payload: { attemptedUsername: params.username },
    });
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Account</h1>
      <p>
        Username: <strong>{params.username}</strong>
      </p>
      <p>
        Search Params: <code>{JSON.stringify(searchParams)}</code>
      </p>
    </section>
  );
}
