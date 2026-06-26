import { pickCsprojFile, pickFolder } from "../lib/pickPath";

type PathInputKind = "folder" | "csproj";

interface PathInputProps {
  value: string;
  onChange: (value: string) => void;
  kind: PathInputKind;
  placeholder?: string;
}

export function PathInput({ value, onChange, kind, placeholder }: PathInputProps) {
  async function browse() {
    const selected =
      kind === "folder" ? await pickFolder(value) : await pickCsprojFile(value);

    if (selected) {
      onChange(selected);
    }
  }

  return (
    <div className="path-input-row">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <button type="button" className="path-input-browse" onClick={() => void browse()}>
        Browse…
      </button>
    </div>
  );
}
