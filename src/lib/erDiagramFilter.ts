const ENTITY_BLOCK_START = /^\s+([A-Za-z_][A-Za-z0-9_]*)\s+\{\s*$/u;
const ENTITY_BLOCK_END = /^\s+\}\s*$/u;
const RELATIONSHIP_LINE =
  /^\s+([A-Za-z_][A-Za-z0-9_]*)\s+(\S+)\s+([A-Za-z_][A-Za-z0-9_]*)\s+:\s+"(.*)"\s*$/u;

export interface ErDiagramFilterResult {
  content: string;
  entityCount: number;
  relationshipCount: number;
  focalLabel?: string;
}

function sanitizeEntityName(name: string): string {
  const sanitized = [...name]
    .map((character) => (/[A-Za-z0-9]/u.test(character) ? character : "_"))
    .join("");

  return sanitized || "Entity";
}

function resolveFocalLabel(entityLabels: string[], entityType: string): string | undefined {
  const sanitized = sanitizeEntityName(entityType);

  if (entityLabels.includes(sanitized)) {
    return sanitized;
  }

  const caseInsensitive = entityLabels.find(
    (label) => label.localeCompare(sanitized, undefined, { sensitivity: "accent" }) === 0,
  );

  if (caseInsensitive) {
    return caseInsensitive;
  }

  const prefixMatches = entityLabels.filter((label) =>
    label.toLowerCase().startsWith(entityType.toLowerCase()),
  );

  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  return entityLabels.find((label) => label.toLowerCase() === entityType.toLowerCase());
}

function parseErDiagram(content: string): {
  header: string;
  entityBlocks: Map<string, string[]>;
  relationships: Array<{ left: string; cardinality: string; right: string; label: string }>;
} {
  const lines = content.split(/\r?\n/u);
  const entityBlocks = new Map<string, string[]>();
  const relationships: Array<{ left: string; cardinality: string; right: string; label: string }> = [];
  let header = "erDiagram";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (index === 0 && trimmed.toLowerCase() === "erdiagram") {
      header = trimmed;
      continue;
    }

    const relationshipMatch = line.match(RELATIONSHIP_LINE);

    if (relationshipMatch) {
      relationships.push({
        left: relationshipMatch[1] ?? "",
        cardinality: relationshipMatch[2] ?? "",
        right: relationshipMatch[3] ?? "",
        label: relationshipMatch[4] ?? "",
      });
      continue;
    }

    const blockStart = line.match(ENTITY_BLOCK_START);

    if (!blockStart) {
      continue;
    }

    const label = blockStart[1] ?? "";
    const blockLines = [line];

    index += 1;

    while (index < lines.length) {
      const blockLine = lines[index] ?? "";
      blockLines.push(blockLine);

      if (ENTITY_BLOCK_END.test(blockLine)) {
        break;
      }

      index += 1;
    }

    entityBlocks.set(label, blockLines);
  }

  return { header, entityBlocks, relationships };
}

export function filterErDiagramByEntity(
  content: string,
  entityType: string,
): ErDiagramFilterResult {
  const parsed = parseErDiagram(content);
  const entityLabels = [...parsed.entityBlocks.keys()];
  const focalLabel = resolveFocalLabel(entityLabels, entityType);

  if (!focalLabel) {
    return {
      content,
      entityCount: entityLabels.length,
      relationshipCount: parsed.relationships.length,
    };
  }

  const included = new Set<string>([focalLabel]);

  for (const relationship of parsed.relationships) {
    if (included.has(relationship.left)) {
      included.add(relationship.right);
    }

    if (included.has(relationship.right)) {
      included.add(relationship.left);
    }
  }

  const filteredRelationships = parsed.relationships.filter(
    (relationship) => included.has(relationship.left) && included.has(relationship.right),
  );

  const filteredBlocks = entityLabels
    .filter((label) => included.has(label))
    .flatMap((label) => parsed.entityBlocks.get(label) ?? []);

  const filteredContent = [
    parsed.header,
    ...filteredBlocks,
    ...filteredRelationships.map(
      (relationship) =>
        `    ${relationship.left} ${relationship.cardinality} ${relationship.right} : "${relationship.label}"`,
    ),
  ].join("\n");

  return {
    content: filteredContent,
    entityCount: included.size,
    relationshipCount: filteredRelationships.length,
    focalLabel,
  };
}

export function countErDiagramEntities(content: string): number {
  return parseErDiagram(content).entityBlocks.size;
}
