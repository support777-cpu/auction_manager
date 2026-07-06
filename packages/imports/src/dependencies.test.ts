import { parse } from "csv-parse/sync";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("import dependencies", () => {
  it("parses CSV input", () => {
    const rows = parse("Name,Role\nAsha,Ace\n", {
      columns: true,
      skip_empty_lines: true
    }) as Array<{ Name: string; Role: string }>;

    expect(rows).toEqual([{ Name: "Asha", Role: "Ace" }]);
  });

  it("normalizes an image buffer", async () => {
    const svg = Buffer.from(
      '<svg width="8" height="8" xmlns="http://www.w3.org/2000/svg"><rect width="8" height="8" fill="red"/></svg>'
    );

    const png = await sharp(svg).png().toBuffer();
    const metadata = await sharp(png).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(8);
    expect(metadata.height).toBe(8);
  });
});
