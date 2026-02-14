"use client";

import React, { useState } from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {days.map((day) => (
          <div key={day} style={{ textAlign: "center", fontWeight: 600 }}>
            {day}
          </div>
        ))}
        {Array.from({ length: 28 }, (_, index) => {
          const day = index + 1;
          const isSelected = selected === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelected(day)}
              style={{
                padding: "6px 0",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: isSelected ? "#111" : "#fff",
                color: isSelected ? "#fff" : "#111",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
      {selected && <p style={{ marginTop: 12 }}>Selected: {selected}</p>}
    </div>
  );
}
