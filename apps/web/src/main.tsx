import { createRoot } from "react-dom/client";
import { CheckCircle2, Circle, MonitorDot, PlayCircle } from "lucide-react";
import "./styles.css";

const phases = [
  "Setup",
  "Initial Auction",
  "Unsold Bidding",
  "Manual Assignment",
  "Closed"
];

function App() {
  return (
    <main className="app-shell" data-testid="app-shell">
      <header className="app-header" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Local event console</p>
          <h1 id="app-title">Auction Manager</h1>
        </div>
        <div className="runtime-pill" aria-label="Runtime mode">
          <MonitorDot aria-hidden="true" size={18} />
          <span>Runs locally on this event PC</span>
        </div>
      </header>

      <section className="status-grid" aria-label="Setup status">
        <article>
          <span className="status-label">Current phase</span>
          <strong>Setup</strong>
          <span>Ready to prepare event inputs.</span>
        </article>
        <article>
          <span className="status-label">Auction state</span>
          <strong>No active auction</strong>
          <span>Nothing is started, sold, assigned, or persisted yet.</span>
        </article>
        <article>
          <span className="status-label">Server target</span>
          <strong>127.0.0.1</strong>
          <span>Same-machine operation with no cloud service required.</span>
        </article>
      </section>

      <section
        className="phase-strip"
        data-testid="phase-indicator"
        aria-label="Auction phases"
      >
        {phases.map((phase, index) => {
          const isActive = index === 0;
          return (
            <div
              className={isActive ? "phase-step phase-step-active" : "phase-step"}
              key={phase}
              aria-current={isActive ? "step" : undefined}
            >
              {isActive ? (
                <CheckCircle2 aria-hidden="true" size={18} />
              ) : (
                <Circle aria-hidden="true" size={18} />
              )}
              <span>{phase}</span>
            </div>
          );
        })}
      </section>

      <section className="setup-panel" data-testid="setup-empty-state">
        <div className="setup-copy">
          <p className="eyebrow">Setup empty state</p>
          <h2>No auction is loaded</h2>
          <p>
            Start setup when the event PC is ready. This shell is prepared for
            local files and future resume checks without creating auction state
            in the browser.
          </p>
        </div>
        <div className="setup-actions" aria-label="Setup actions">
          <button className="primary-action" data-testid="setup-start" type="button">
            <PlayCircle aria-hidden="true" size={20} />
            <span>Start setup</span>
          </button>
          <p>Resume-ready framing is visible before any import, bidding, or persistence work.</p>
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found.");
}

createRoot(root).render(<App />);
