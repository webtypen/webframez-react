"use client";
import React, { useState } from "react";
import { useCookie, useRouter } from "@webtypen/webframez-react/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const cookie = useCookie();
  const router = useRouter();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (email === "test@test.de" && password === "test123") {
      cookie.set("logged_in", "1", {
        path: "/react",
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      router.refresh();
      return;
    }

    setError("Ungueltige Zugangsdaten");
  };

  return (
    <form style={{ display: "grid", gap: 12, maxWidth: 320 }} onSubmit={submit}>
      <label style={{ display: "grid", gap: 4 }}>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </label>
      {error ? <p style={{ color: "red", margin: 0 }}>{error}</p> : null}
      <button type="submit">Sign in</button>
    </form>
  );
}
