import { describe, expect, it } from "vitest";
import { fenceComplete } from "./fenceStatus";

describe("fenceComplete", () => {
  it("follows BB's status prop", () => {
    expect(fenceComplete({ status: "streaming" })).toBe(false);
    expect(fenceComplete({ status: "closed" })).toBe(true);
    expect(fenceComplete({ status: "unclosed" })).toBe(true);
  });
  it("falls back to the legacy complete flag when BB sends no status", () => {
    expect(fenceComplete({ complete: true })).toBe(true);
    expect(fenceComplete({ complete: false })).toBe(false);
    expect(fenceComplete({})).toBe(false);
  });
});
