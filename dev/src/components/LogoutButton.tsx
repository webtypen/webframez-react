"use client";

import React from "react";
import { useCookie, useRouter } from "webframez-react/client";

export default function LogoutButton() {
  const cookie = useCookie();
  const router = useRouter();

  return (
    <button
      type="button"
      style={{
        all: "unset",
        cursor: "pointer",
        color: "#1d4ed8",
        textDecoration: "underline",
      }}
      onClick={() => {
        cookie.remove("logged_in", {
          path: "/react",
          sameSite: "Lax",
        });
        router.refresh();
      }}
    >
      Logout
    </button>
  );
}
