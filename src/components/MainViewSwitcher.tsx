import { MAIN_VIEW_LABELS, type AppMainView } from "../types/mainView";

interface MainViewSwitcherProps {
  value: AppMainView;
  onChange: (view: AppMainView) => void;
}

const VIEWS: AppMainView[] = ["query", "diagram", "notebook", "repl"];

export function MainViewSwitcher({ value, onChange }: MainViewSwitcherProps) {
  return (
    <div className="main-view-switcher" role="tablist" aria-label="Main view">
      {VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          role="tab"
          aria-selected={value === view}
          className={value === view ? "active" : undefined}
          onClick={() => {
            if (value !== view) {
              onChange(view);
            }
          }}
        >
          {MAIN_VIEW_LABELS[view]}
        </button>
      ))}
    </div>
  );
}
