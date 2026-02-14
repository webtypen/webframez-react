"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Head = Head;
exports.default = HomePage;
const jsx_runtime_1 = require("react/jsx-runtime");
function Head() {
    return {
        title: "Home",
        description: "Welcome to the RSC file router demo.",
    };
}
function HomePage({ searchParams }) {
    const showHint = searchParams.hint === "1";
    return ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h1", { style: { marginTop: 0 }, children: "Welcome" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "red" }, children: "bla bla bla 123" }), (0, jsx_runtime_1.jsxs)("p", { children: ["This route comes from ", (0, jsx_runtime_1.jsx)("code", { children: "pages/index.tsx" }), "."] }), showHint ? (0, jsx_runtime_1.jsx)("p", { children: "Hint query param is active." }) : null] }));
}
