import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { installExternalLinkPolicy } from './lib/external-links';

const disconnectExternalLinks = installExternalLinkPolicy(document.body);
if (import.meta.hot) import.meta.hot.dispose(disconnectExternalLinks);

createRoot(document.getElementById("root")!).render(<App />);
