"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const webframez_core_1 = require("@webtypen/webframez-core");
const webframez_react_1 = require("@webtypen/webframez-react");
const distRootDir = node_path_1.default.resolve(__dirname, "..");
class Kernel extends webframez_core_1.BaseKernelWeb {
}
Kernel.controller = {};
Kernel.middleware = {};
const port = 3000;
const ReactRoute = (0, webframez_react_1.initWebframezReact)(webframez_core_1.Route);
const app = new webframez_core_1.WebApplication();
app.boot({
    kernel: Kernel,
    port,
    routesFunction: () => {
        webframez_core_1.Route.get("/status", (_req, res) => {
            res.send({
                status: "ok",
                framework: "webframez-core",
                renderer: "react",
            });
        });
        ReactRoute.renderReact("/react", {
            distRootDir,
        });
    },
    onBoot: () => {
        console.log(`RSC dev server running on http://localhost:${port}`);
    },
});
