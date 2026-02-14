"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RegisterForm;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function RegisterForm() {
    const [name, setName] = (0, react_1.useState)("");
    const [email, setEmail] = (0, react_1.useState)("");
    return ((0, jsx_runtime_1.jsxs)("form", { style: { display: "grid", gap: 12, maxWidth: 360 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: "grid", gap: 4 }, children: [(0, jsx_runtime_1.jsx)("span", { children: "Name" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: name, onChange: (event) => setName(event.target.value), placeholder: "Ada Lovelace" })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: "grid", gap: 4 }, children: [(0, jsx_runtime_1.jsx)("span", { children: "Email" }), (0, jsx_runtime_1.jsx)("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), placeholder: "you@example.com" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", children: "Create account" })] }));
}
