/* Globals shim — runs FIRST (static import in main.jsx).
   The prototype modules read `React` / `ReactDOM` from the global
   scope (the in-browser build used UMD <script> tags). We preserve
   that contract so those modules run unchanged under Vite, then
   Phase-1 refactors them to idiomatic imports incrementally. */
import React from "react";
import * as ReactDOMClient from "react-dom/client";

window.React = React;
window.ReactDOM = ReactDOMClient; // exposes createRoot()
