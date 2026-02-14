"use strict";
"use server";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Head = Head;
exports.default = LoginPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const navigation_1 = require("webframez-react/navigation");
const LoginForm_1 = __importDefault(require("../../src/components/LoginForm"));
function Head() {
    return {
        title: "Login",
        description: "Login page with client component state.",
    };
}
function LoginPage(context) {
    if (context.cookies.logged_in === "1") {
        return (0, jsx_runtime_1.jsx)(navigation_1.Redirect, { to: "/" });
    }
    return ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h1", { style: { marginTop: 0 }, children: "Login" }), (0, jsx_runtime_1.jsx)(LoginForm_1.default, {})] }));
}
