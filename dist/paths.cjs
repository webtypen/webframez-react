var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../webframez-core/dist/routing.js
var require_routing = __commonJS({
  "../webframez-core/dist/routing.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.appRelativePath = exports2.appPath = exports2.getBasename = exports2.normalizeBasename = void 0;
    function normalizeBasename2(value) {
      if (value == null || value === "" || value === "/")
        return "";
      if (typeof value !== "string")
        throw new Error("Router basename must be a string.");
      const base = value.trim().replace(/\/+$/, "");
      if (!base && value.trim().length <= 1)
        return "";
      if (!/^\/(?:[A-Za-z0-9_~-]+(?:\.[A-Za-z0-9_~-]+)*)(?:\/[A-Za-z0-9_~-]+(?:\.[A-Za-z0-9_~-]+)*)*$/.test(base)) {
        throw new Error("Router basename must be empty or an absolute path such as /my-app.");
      }
      return base;
    }
    exports2.normalizeBasename = normalizeBasename2;
    function getBasename2() {
      var _a, _b, _c, _d;
      const runtime = globalThis;
      return (_d = (_c = (_b = (_a = runtime.__WEBFRAMEZ_ROUTING_CONTEXT__) === null || _a === void 0 ? void 0 : _a.getStore()) !== null && _b !== void 0 ? _b : runtime.__RSC_BASENAME) !== null && _c !== void 0 ? _c : runtime.__WEBFRAMEZ_ROUTER_BASENAME__) !== null && _d !== void 0 ? _d : "";
    }
    exports2.getBasename = getBasename2;
    function appPath2(value, basename = getBasename2()) {
      const base = normalizeBasename2(basename);
      if (!base || !value.startsWith("/") || value.startsWith("//") || hasBasename(value, base))
        return value;
      return base + value;
    }
    exports2.appPath = appPath2;
    function appRelativePath2(value, basename = getBasename2()) {
      const base = normalizeBasename2(basename);
      if (!base || !hasBasename(value, base))
        return value;
      const relative = value.slice(base.length);
      return !relative || relative.startsWith("?") || relative.startsWith("#") ? "/" + relative : relative;
    }
    exports2.appRelativePath = appRelativePath2;
    function hasBasename(value, base) {
      return value === base || value.startsWith(base + "/") || value.startsWith(base + "?") || value.startsWith(base + "#");
    }
  }
});

// ../webframez-core/routing.js
var require_routing2 = __commonJS({
  "../webframez-core/routing.js"(exports2, module2) {
    "use strict";
    module2.exports = require_routing();
  }
});

// src/paths.ts
var paths_exports = {};
__export(paths_exports, {
  appPath: () => import_routing.appPath,
  appRelativePath: () => import_routing.appRelativePath,
  getBasename: () => import_routing.getBasename,
  normalizeBasename: () => import_routing.normalizeBasename
});
module.exports = __toCommonJS(paths_exports);
var import_routing = __toESM(require_routing2(), 1);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appPath,
  appRelativePath,
  getBasename,
  normalizeBasename
});
