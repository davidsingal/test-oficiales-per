import { describe, expect, it } from "vitest";
import { truncate } from "./seo";

describe("truncate", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(truncate("  Marca   cardinal\nnorte ", 40)).toBe("Marca cardinal norte");
  });

  it("cuts at a word boundary and drops trailing punctuation", () => {
    expect(truncate("Una marca cardinal, de balizamiento", 22)).toBe("Una marca cardinal…");
  });

  it("cuts inside a word when there is no space", () => {
    expect(truncate("Balizamiento", 5)).toBe("Baliz…");
  });
});
