"use strict";
"use server";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Head = Head;
exports.default = Layout;
const jsx_runtime_1 = require("react/jsx-runtime");
const navigation_1 = require("webframez-react/navigation");
const router_1 = require("webframez-react/router");
const LogoutButton_1 = __importDefault(require("../src/components/LogoutButton"));
function Head() {
    return {
        title: "Webframez RSC",
        description: "File-based routing demo with React Server Components",
        favicon: "/assets/favicon.ico",
        meta: [
            { name: "viewport", content: "width=device-width, initial-scale=1" },
        ],
    };
}
function Layout(context) {
    const loggedIn = context.cookies.logged_in === "1";
    return ((0, jsx_runtime_1.jsxs)("main", { style: { fontFamily: "system-ui, sans-serif", padding: 24 }, children: [(0, jsx_runtime_1.jsxs)("nav", { style: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }, children: [(0, jsx_runtime_1.jsx)(navigation_1.Link, { to: "/", children: "Home" }), (0, jsx_runtime_1.jsx)(navigation_1.Link, { to: "/about", children: "About" }), loggedIn ? (0, jsx_runtime_1.jsx)(LogoutButton_1.default, {}) : (0, jsx_runtime_1.jsx)(navigation_1.Link, { to: "/login", children: "Login" }), (0, jsx_runtime_1.jsx)(navigation_1.Link, { to: "/accounts/jane", children: "Account: jane" })] }), (0, jsx_runtime_1.jsx)(router_1.RouteChildren, {})] }));
}
