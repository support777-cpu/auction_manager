import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("shared dependencies", () => {
  it("loads Zod schemas", () => {
    const schema = z.object({
      ok: z.literal(true)
    });

    expect(schema.parse({ ok: true })).toEqual({ ok: true });
  });
});
