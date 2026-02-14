"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Head = Head;
exports.default = AccountPage;
const jsx_runtime_1 = require("react/jsx-runtime");
function Head({ params }) {
    return {
        title: `Account ${params.username}`,
        description: `Profile page for ${params.username}.`,
    };
}
function AccountPage({ params, searchParams, abort, }) {
    if (params.username !== "jane123") {
        abort({
            status: 404,
            message: `Account "${params.username}" not found`,
            payload: { attemptedUsername: params.username },
        });
    }
    return ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h1", { style: { marginTop: 0 }, children: "Account" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Username: ", (0, jsx_runtime_1.jsx)("strong", { children: params.username })] }), (0, jsx_runtime_1.jsxs)("p", { children: ["Search Params: ", (0, jsx_runtime_1.jsx)("code", { children: JSON.stringify(searchParams) })] })] }));
}
