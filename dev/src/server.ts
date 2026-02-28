import path from "node:path";
import {
  BaseKernelWeb,
  Request,
  Response,
  Route,
  WebApplication,
} from "@webtypen/webframez-core";
import { initWebframezReact } from "@webtypen/webframez-react";

const distRootDir = path.resolve(__dirname, "..");

class Kernel extends BaseKernelWeb {
  static controller: { [key: string]: any } = {};
  static middleware: { [key: string]: any } = {};
}

const port = 3000;
const ReactRoute = initWebframezReact(Route);

const app = new WebApplication();
app.boot({
  kernel: Kernel,
  port,
  routesFunction: () => {
    Route.get("/status", (_req: Request, res: Response) => {
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
