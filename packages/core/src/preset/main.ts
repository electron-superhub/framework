import { startDefaultApp } from "../runtime";

startDefaultApp().catch((err) => console.error("start app failed:", err));
