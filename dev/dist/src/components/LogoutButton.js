"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LogoutButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const client_1 = require("webframez-react/client");
function LogoutButton() {
    const cookie = (0, client_1.useCookie)();
    const router = (0, client_1.useRouter)();
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", style: {
            all: "unset",
            cursor: "pointer",
            color: "#1d4ed8",
            textDecoration: "underline",
        }, onClick: () => {
            cookie.remove("logged_in", {
                path: "/react",
                sameSite: "Lax",
            });
            router.refresh();
        }, children: "Logout" }));
}
