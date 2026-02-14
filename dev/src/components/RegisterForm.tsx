"use client";

import React, { useState } from "react";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <form style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ada Lovelace"
        />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <button type="button">Create account</button>
    </form>
  );
}
