"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Head = Head;
exports.default = ErrorsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
function Head({ statusCode, message }) {
    return {
        title: `${statusCode} - ${message}`,
        description: "An error happened while loading this route.",
        meta: [{ name: "robots", content: "noindex" }],
    };
}
function ErrorsPage({ statusCode, message, pathname, payload, }) {
    return ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h1", { style: { marginTop: 0 }, children: statusCode }), (0, jsx_runtime_1.jsx)("p", { style: { color: "red" }, children: message }), (0, jsx_runtime_1.jsxs)("p", { children: ["Path: ", (0, jsx_runtime_1.jsx)("code", { children: pathname })] }), payload !== undefined ? ((0, jsx_runtime_1.jsxs)("p", { children: ["Payload: ", (0, jsx_runtime_1.jsx)("code", { children: JSON.stringify(payload) })] })) : null] }));
}
