import { Buffer } from "buffer";
// Required by @solana/web3.js in browser (Vite doesn't polyfill Node.js globals by default)
window.Buffer = window.Buffer ?? Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

