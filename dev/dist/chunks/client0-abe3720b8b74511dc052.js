"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunkwebframez_react_dev"] = self["webpackChunkwebframez_react_dev"] || []).push([["client0"],{

/***/ "./dist/src/components/Calendar.js"
/*!*****************************************!*\
  !*** ./dist/src/components/Calendar.js ***!
  \*****************************************/
(__unused_webpack_module, exports, __webpack_require__) {

eval("{\n\"use client\";\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports[\"default\"] = Calendar;\nconst jsx_runtime_1 = __webpack_require__(/*! react/jsx-runtime */ \"./node_modules/react/jsx-runtime.js\");\nconst react_1 = __webpack_require__(/*! react */ \"./node_modules/react/index.js\");\nconst days = [\"Mon\", \"Tue\", \"Wed\", \"Thu\", \"Fri\", \"Sat\", \"Sun\"];\nfunction Calendar() {\n    const [selected, setSelected] = (0, react_1.useState)(null);\n    return ((0, jsx_runtime_1.jsxs)(\"div\", { children: [(0, jsx_runtime_1.jsxs)(\"div\", { style: { display: \"grid\", gridTemplateColumns: \"repeat(7, 1fr)\", gap: 8 }, children: [days.map((day) => ((0, jsx_runtime_1.jsx)(\"div\", { style: { textAlign: \"center\", fontWeight: 600 }, children: day }, day))), Array.from({ length: 28 }, (_, index) => {\n                        const day = index + 1;\n                        const isSelected = selected === day;\n                        return ((0, jsx_runtime_1.jsx)(\"button\", { type: \"button\", onClick: () => setSelected(day), style: {\n                                padding: \"6px 0\",\n                                borderRadius: 8,\n                                border: \"1px solid #ccc\",\n                                background: isSelected ? \"#111\" : \"#fff\",\n                                color: isSelected ? \"#fff\" : \"#111\",\n                            }, children: day }, day));\n                    })] }), selected && (0, jsx_runtime_1.jsxs)(\"p\", { style: { marginTop: 12 }, children: [\"Selected: \", selected] })] }));\n}\n\n\n//# sourceURL=webpack://webframez-react-dev/./dist/src/components/Calendar.js?\n}");

/***/ }

}]);