import { describe, it, expect, vi } from "vitest";
import { isUserOnline } from "./useOnlineStatus";

describe("isUserOnline", () => {
  it("returns false for null", () => {
    expect(isUserOnline(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isUserOnline(undefined)).toBe(false);
  });

  it("returns true for recent timestamp (within 2 minutes)", () => {
    const now = new Date();
    now.setSeconds(now.getSeconds() - 30);
    expect(isUserOnline(now.toISOString())).toBe(true);
  });

  it("returns true for exactly 1 minute ago", () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);
    expect(isUserOnline(now.toISOString())).toBe(true);
  });

  it("returns false for 3 minutes ago", () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 3);
    expect(isUserOnline(now.toISOString())).toBe(false);
  });

  it("returns false for 1 hour ago", () => {
    const now = new Date();
    now.setHours(now.getHours() - 1);
    expect(isUserOnline(now.toISOString())).toBe(false);
  });

  it("returns true for future timestamps (negative diff < 2 min)", () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    // diff is negative, which is < 2 * 60 * 1000, so it returns true
    expect(isUserOnline(now.toISOString())).toBe(true);
  });
});
