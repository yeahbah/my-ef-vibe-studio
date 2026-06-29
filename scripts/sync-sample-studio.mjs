import {
  SAMPLE_CONNECTION_ID,
  SAMPLE_QUERIES,
  SAMPLE_NOTEBOOK,
  SAMPLE_SCRIPT_FILES,
  buildSampleWorkspaceJson,
} from "../src/lib/sampleWorkspace/content.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = "src-tauri/resources/sample-studio";

mkdirSync(join(root, "scripts"), { recursive: true });
mkdirSync(join(root, "queries"), { recursive: true });
mkdirSync(join(root, "notebooks"), { recursive: true });

for (const script of SAMPLE_SCRIPT_FILES) {
  const content = script.content.endsWith("\n") ? script.content : `${script.content}\n`;
  writeFileSync(join(root, "scripts", script.fileName), content);
}

for (const sample of SAMPLE_QUERIES) {
  const payload = {
    version: 1,
    name: sample.name,
    connectionId: SAMPLE_CONNECTION_ID,
    expression: sample.expression,
  };
  writeFileSync(join(root, "queries", sample.fileName), `${JSON.stringify(payload, null, 2)}\n`);
}

writeFileSync(
  join(root, "notebooks", SAMPLE_NOTEBOOK.fileName),
  `${JSON.stringify(
    {
      version: 1,
      name: SAMPLE_NOTEBOOK.name,
      connectionId: SAMPLE_CONNECTION_ID,
      cells: SAMPLE_NOTEBOOK.cells,
    },
    null,
    2,
  )}\n`,
);

writeFileSync(join(root, "adventureworks.efvibe-workspace"), buildSampleWorkspaceJson(SAMPLE_CONNECTION_ID));

console.log(`Synced ${SAMPLE_QUERIES.length} queries into ${root}`);
