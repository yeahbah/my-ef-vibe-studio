export interface ResultTreeNode {
  key: string;
  value: string;
  children: ResultTreeNode[];
}

export function buildResultTree(value: string): ResultTreeNode[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return parseCollection(trimmed);
  }

  const objectNode = parseObject(trimmed);
  return objectNode ? [objectNode] : [{ key: "value", value: trimmed, children: [] }];
}

function parseCollection(text: string): ResultTreeNode[] {
  const inner = text.slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  const items = splitTopLevel(inner);
  return items.map((item, index) => {
    const objectNode = parseObject(item.trim());
    if (objectNode) {
      return { ...objectNode, key: `[${index}]` };
    }

    return { key: `[${index}]`, value: item.trim(), children: [] };
  });
}

function parseObject(text: string): ResultTreeNode | undefined {
  const typeMatch = /^([^{]+)\s*\{([\s\S]*)\}\s*$/u.exec(text);
  if (!typeMatch) {
    return undefined;
  }

  const typeName = typeMatch[1].trim();
  const body = typeMatch[2].trim();
  const children = body
    ? splitTopLevel(body).map((part) => parseProperty(part.trim())).filter((node): node is ResultTreeNode => Boolean(node))
    : [];

  return {
    key: typeName,
    value: children.length === 0 ? "{ }" : "",
    children,
  };
}

function parseProperty(part: string): ResultTreeNode | undefined {
  const equalsIndex = findTopLevelEquals(part);
  if (equalsIndex < 0) {
    return { key: part, value: "", children: [] };
  }

  const key = part.slice(0, equalsIndex).trim();
  const rawValue = part.slice(equalsIndex + 1).trim();
  const nestedObject = parseObject(rawValue);
  if (nestedObject) {
    return { key, value: "", children: nestedObject.children, };
  }

  if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
    return { key, value: "", children: parseCollection(rawValue) };
  }

  return { key, value: rawValue, children: [] };
}

function findTopLevelEquals(text: string): number {
  let depth = 0;
  let inString = false;
  let quote = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (char === quote && text[index - 1] !== "\\") {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "{" || char === "[" || char === "(") {
      depth += 1;
      continue;
    }

    if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
      continue;
    }

    if (char === "=" && depth === 0) {
      return index;
    }
  }

  return -1;
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let quote = "";
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (char === quote && text[index - 1] !== "\\") {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "{" || char === "[" || char === "(") {
      depth += 1;
      continue;
    }

    if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
      continue;
    }

    if (char === "," && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(text.slice(start));
  return parts.filter((part) => part.trim().length > 0);
}
