import { describe, expect, it } from "vitest";
import { filterErDiagramByEntity } from "./erDiagramFilter";

const sampleDiagram = `erDiagram
    Product {
        int ProductId PK
        int ProductSubcategoryId FK
    }
    ProductSubcategory {
        int ProductSubcategoryId PK
        int ProductCategoryId FK
    }
    ProductCategory {
        int ProductCategoryId PK
    }
    Product ||--o{ ProductSubcategory : "ProductSubcategoryId"
    ProductSubcategory ||--|| ProductCategory : "ProductCategoryId"`;

describe("filterErDiagramByEntity", () => {
  it("keeps only first-level relationships for the focal entity", () => {
    const filtered = filterErDiagramByEntity(sampleDiagram, "Product");

    expect(filtered.focalLabel).toBe("Product");
    expect(filtered.entityCount).toBe(2);
    expect(filtered.relationshipCount).toBe(1);
    expect(filtered.content).toContain("Product ||--o{ ProductSubcategory");
    expect(filtered.content).not.toContain("ProductSubcategory ||--|| ProductCategory");
    expect(filtered.content).not.toContain("ProductCategory {");
  });

  it("includes direct neighbors without expanding their relationships", () => {
    const chainDiagram = `erDiagram
    A {
        int Id PK
    }
    B {
        int Id PK
    }
    C {
        int Id PK
    }
    A ||--|| B : "AtoB"
    B ||--|| C : "BtoC"`;

    const filtered = filterErDiagramByEntity(chainDiagram, "A");

    expect(filtered.entityCount).toBe(2);
    expect(filtered.relationshipCount).toBe(1);
    expect(filtered.content).toContain('A ||--|| B : "AtoB"');
    expect(filtered.content).not.toContain('B ||--|| C : "BtoC"');
    expect(filtered.content).not.toContain("C {");
  });

  it("returns the full diagram when the entity is not found", () => {
    const filtered = filterErDiagramByEntity(sampleDiagram, "Missing");

    expect(filtered.focalLabel).toBeUndefined();
    expect(filtered.content).toBe(sampleDiagram);
    expect(filtered.entityCount).toBe(3);
    expect(filtered.relationshipCount).toBe(2);
  });
});
