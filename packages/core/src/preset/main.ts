import { startDefaultApp } from "@esho/core/runtime/main";

startDefaultApp().catch((err) => console.error("start app failed:", err));
