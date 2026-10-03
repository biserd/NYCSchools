import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { installExternalLinkPolicy } from './lib/external-links';

const disconnectExternalLinks = installExternalLinkPolicy(document.body);
if (import.meta.hot) import.meta.hot.dispose(disconnectExternalLinks);

const root = document.getElementById("root")!;
// Keep the fully rendered product page visible while its small interactive entry loads.
// Ordinary school/search routes retain their existing bootstrap behavior.
if (/^\/kinderlearner(?:\/(?:pre-k-learning-app|kindergarten-learning-app|privacy|terms|support|delete-data))?\/?$/.test(window.location.pathname)) {
  root.dataset.kinderlearnerStandalone = 'true';
  import('./pages/kinderlearner').then(({default: KinderLearnerPage}) => {
    if (root.dataset.serverRendered === 'true') hydrateRoot(root, <KinderLearnerPage />);
    else createRoot(root).render(<KinderLearnerPage />);
  });
} else {
  createRoot(root).render(<App />);
}
