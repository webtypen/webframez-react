"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Calendar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function Calendar() {
    const [selected, setSelected] = (0, react_1.useState)(null);
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }, children: [days.map((day) => ((0, jsx_runtime_1.jsx)("div", { style: { textAlign: "center", fontWeight: 600 }, children: day }, day))), Array.from({ length: 28 }, (_, index) => {
                        const day = index + 1;
                        const isSelected = selected === day;
                        return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setSelected(day), style: {
                                padding: "6px 0",
                                borderRadius: 8,
                                border: "1px solid #ccc",
                                background: isSelected ? "#111" : "#fff",
                                color: isSelected ? "#fff" : "#111",
                            }, children: day }, day));
                    })] }), selected && (0, jsx_runtime_1.jsxs)("p", { style: { marginTop: 12 }, children: ["Selected: ", selected] })] }));
}
