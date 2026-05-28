import { describe, it, expect } from "vitest";
import {
  cn,
  formatUSD,
  calcBuyerPrice,
  calcSellerPayout,
  formatDate,
  timeAgo,
  getStatusProgress,
  getAvatarUrl,
  getInitials,
} from "./utils";

// ─── cn ───
describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditionals", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
    expect(cn("base", true && "visible")).toBe("base visible");
  });

  it("resolves Tailwind conflicts", () => {
    expect(cn("p-4", "p-6")).toBe("p-6");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});

// ─── formatUSD ───
describe("formatUSD", () => {
  it("formats whole dollars", () => {
    expect(formatUSD(100)).toBe("$100.00");
  });

  it("formats cents", () => {
    expect(formatUSD(99.99)).toBe("$99.99");
  });

  it("formats zero", () => {
    expect(formatUSD(0)).toBe("$0.00");
  });

  it("formats large numbers with commas", () => {
    expect(formatUSD(1234567.89)).toBe("$1,234,567.89");
  });
});

// ─── calcBuyerPrice ───
describe("calcBuyerPrice", () => {
  it("adds 3% buyer fee", () => {
    expect(calcBuyerPrice(100)).toBe(103.0);
    expect(calcBuyerPrice(50)).toBe(51.5);
  });

  it("handles small amounts", () => {
    expect(calcBuyerPrice(1)).toBe(1.03);
  });

  it("rounds to 2 decimal places", () => {
    expect(calcBuyerPrice(33.33)).toBe(34.33); // 33.33 * 1.03 = 34.3299 → 34.33
  });
});

// ─── calcSellerPayout ───
describe("calcSellerPayout", () => {
  it("deducts 8% seller fee", () => {
    expect(calcSellerPayout(100)).toBe(92.0);
    expect(calcSellerPayout(50)).toBe(46.0);
  });

  it("rounds to 2 decimal places", () => {
    expect(calcSellerPayout(33.33)).toBe(30.66); // 33.33 * 0.92 = 30.6636 → 30.66
  });
});

// ─── formatDate ───
describe("formatDate", () => {
  it("formats a valid date string", () => {
    const result = formatDate("2026-05-28T12:00:00Z");
    expect(result).toContain("2026");
    expect(result).toContain("May");
  });

  it("handles edge dates", () => {
    const result = formatDate("2020-01-01T00:00:00Z");
    expect(result).toBeTruthy();
  });
});

// ─── timeAgo ───
describe("timeAgo", () => {
  it('returns "just now" for less than a minute', () => {
    const now = new Date();
    now.setSeconds(now.getSeconds() - 30);
    expect(timeAgo(now.toISOString())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 15);
    expect(timeAgo(now.toISOString())).toBe("15m ago");
  });

  it("returns hours ago", () => {
    const now = new Date();
    now.setHours(now.getHours() - 3);
    expect(timeAgo(now.toISOString())).toBe("3h ago");
  });

  it("returns days ago", () => {
    const now = new Date();
    now.setDate(now.getDate() - 5);
    expect(timeAgo(now.toISOString())).toBe("5d ago");
  });

  it("handles exactly 1 hour", () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 60);
    expect(timeAgo(now.toISOString())).toBe("1h ago");
  });

  it("handles exactly 24 hours", () => {
    const now = new Date();
    now.setHours(now.getHours() - 24);
    expect(timeAgo(now.toISOString())).toBe("1d ago");
  });
});

// ─── getStatusProgress ───
describe("getStatusProgress", () => {
  const flow = ["a", "b", "c", "d"];

  it("returns index of status in flow", () => {
    expect(getStatusProgress("a", flow)).toBe(0);
    expect(getStatusProgress("c", flow)).toBe(2);
  });

  it("returns 0 for unknown status", () => {
    expect(getStatusProgress("unknown", flow)).toBe(0);
  });

  it("handles empty flow", () => {
    expect(getStatusProgress("a", [])).toBe(0);
  });
});

// ─── getAvatarUrl ───
describe("getAvatarUrl", () => {
  it("returns stored URL when provided", () => {
    expect(getAvatarUrl("test@example.com", "https://img.com/avatar.png")).toBe(
      "https://img.com/avatar.png"
    );
  });

  it("generates avatar from email", () => {
    const url = getAvatarUrl("john@example.com");
    expect(url).toContain("ui-avatars.com");
    expect(url).toContain("name=john");
    expect(url).toContain("size=80");
  });

  it("handles null email", () => {
    const url = getAvatarUrl(null);
    expect(url).toContain("name=U");
  });

  it("respects custom size", () => {
    const url = getAvatarUrl("a@b.com", null, 200);
    expect(url).toContain("size=200");
  });

  it("handles undefined storedUrl", () => {
    const url = getAvatarUrl("test@example.com", undefined);
    expect(url).toContain("ui-avatars.com");
  });
});

// ─── getInitials ───
describe("getInitials", () => {
  it("extracts initials from simple email", () => {
    expect(getInitials("john@example.com")).toBe("JO");
  });

  it("handles dotted emails", () => {
    expect(getInitials("john.doe@example.com")).toBe("JD");
  });

  it("handles underscored emails", () => {
    expect(getInitials("john_doe@example.com")).toBe("JD");
  });

  it("handles single-word emails", () => {
    expect(getInitials("admin@example.com")).toBe("AD");
  });

  it("returns U for null email", () => {
    expect(getInitials(null)).toBe("U");
  });

  it("returns U for undefined email", () => {
    expect(getInitials(undefined)).toBe("U");
  });
});
