import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-50">
      <h1 className="text-2xl font-semibold">Auction Manager</h1>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found.");
}

createRoot(root).render(<App />);
