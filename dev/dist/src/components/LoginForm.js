"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginForm;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const client_1 = require("@webtypen/webframez-react/client");
function LoginForm() {
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [error, setError] = (0, react_1.useState)("");
    const cookie = (0, client_1.useCookie)();
    const router = (0, client_1.useRouter)();
    const submit = (event) => {
        event.preventDefault();
        setError("");
        if (email === "test@test.de" && password === "test123") {
            cookie.set("logged_in", "1", {
                path: "/react",
                sameSite: "Lax",
                maxAge: 60 * 60 * 24 * 7,
            });
            router.refresh();
            return;
        }
        setError("Ungueltige Zugangsdaten");
    };
    return ((0, jsx_runtime_1.jsxs)("form", { style: { display: "grid", gap: 12, maxWidth: 320 }, onSubmit: submit, children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: "grid", gap: 4 }, children: [(0, jsx_runtime_1.jsx)("span", { children: "Email" }), (0, jsx_runtime_1.jsx)("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), placeholder: "you@example.com" })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: "grid", gap: 4 }, children: [(0, jsx_runtime_1.jsx)("span", { children: "Password" }), (0, jsx_runtime_1.jsx)("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), error ? (0, jsx_runtime_1.jsx)("p", { style: { color: "red", margin: 0 }, children: error }) : null, (0, jsx_runtime_1.jsx)("button", { type: "submit", children: "Sign in" })] }));
}
