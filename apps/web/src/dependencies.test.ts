import { CircleIcon } from "lucide-react";
import { createElement, isValidElement } from "react";
import { describe, expect, it } from "vitest";

describe("web dependencies", () => {
  it("creates React elements with Lucide icons", () => {
    const element = createElement(CircleIcon, { "aria-label": "status" });

    expect(isValidElement(element)).toBe(true);
  });
});
