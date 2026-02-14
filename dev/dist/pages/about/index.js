"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Head = Head;
exports.default = AboutPage;
const jsx_runtime_1 = require("react/jsx-runtime");
function Head() {
    return {
        title: "About",
        description: "About page rendered via file-based routing.",
    };
}
function AboutPage() {
    return ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h1", { style: { marginTop: 0 }, children: "About" }), (0, jsx_runtime_1.jsxs)("p", { children: ["This route is resolved from ", (0, jsx_runtime_1.jsx)("code", { children: "pages/about/index.tsx" }), "."] })] }));
}
