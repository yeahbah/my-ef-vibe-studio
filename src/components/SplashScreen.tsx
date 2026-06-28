import "./SplashScreen.css";

interface SplashScreenProps {
  message?: string;
  exiting?: boolean;
}

const CODE_LINES = [
  { kind: "linq", text: "db.Products.Where(x => x.ListPrice > 10).Take(5)" },
  { kind: "sql", text: "SELECT p.Name, p.ListPrice FROM Products AS p" },
  { kind: "linq", text: "db.Orders.Include(o => o.Customer).ToList()" },
  { kind: "sql", text: "SELECT COUNT(*) FROM Orders WHERE Status = @status" },
];

export function SplashScreen({ message = "Starting up…", exiting = false }: SplashScreenProps) {
  return (
    <div
      className={`splash-screen${exiting ? " splash-screen-exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
    >
      <div className="splash-backdrop" aria-hidden="true">
        <div className="splash-orb splash-orb-a" />
        <div className="splash-orb splash-orb-b" />
        <div className="splash-grid" />
        <div className="splash-code-rain">
          {CODE_LINES.map((line, index) => (
            <div
              key={line.text}
              className={`splash-code-line splash-code-line-${line.kind}`}
              style={{ animationDelay: `${index * 0.35}s` }}
            >
              <span className="splash-code-prompt">{line.kind === "linq" ? "›" : "⌁"}</span>
              {line.text}
            </div>
          ))}
        </div>
      </div>

      <div className="splash-panel">
        <div className="splash-icon-wrap">
          <div className="splash-icon-ring" aria-hidden="true" />
          <img src="/icon.png" alt="" className="splash-icon" width={88} height={88} />
        </div>

        <h1 className="splash-title">
          MyEFvibe <span className="splash-title-accent">Studio</span>
        </h1>
        <p className="splash-tagline">LINQ scratchpad · SQL · Entity Framework</p>

        <div className="splash-pills" aria-hidden="true">
          <span className="splash-pill">DbContext</span>
          <span className="splash-pill">Roslyn</span>
          <span className="splash-pill">Live SQL</span>
        </div>

        <p className="splash-status">{message}</p>
        <div className="splash-progress" aria-hidden="true">
          <div className="splash-progress-bar" />
        </div>
      </div>
    </div>
  );
}
