import React from "react";
import { createRoot } from "react-dom/client";
import { installStorage } from "./storage.js";
import { installAnthropic } from "./anthropic.js";
import App from "./App.jsx";

installStorage();
installAnthropic();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
