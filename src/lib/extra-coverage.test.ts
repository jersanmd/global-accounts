import { describe, it, expect } from "vitest";
import {
  formatUSD,
  calcBuyerPrice,
  calcSellerPayout,
  timeAgo,
  getStatusProgress,
  getAvatarUrl,
  getInitials,
  cn,
} from "./utils";

// ─── Edge Cases ───
describe("utils edge cases", () => {
  // formatUSD
  it("handles negative amounts", () => {
    expect(formatUSD(-50)).toBe("-$50.00");
  });

  it("handles very large amounts", () => {
    expect(formatUSD(9999999.99)).toContain("9,999,999.99");
  });

  // calcBuyerPrice
  it("handles zero price", () => {
    expect(calcBuyerPrice(0)).toBe(0);
  });

  it("handles fractional cents correctly", () => {
    const result = calcBuyerPrice(1.111);
    expect(result).toBe(1.14); // 1.111 * 1.03 = 1.14433 → 1.14
  });

  // calcSellerPayout
  it("handles zero price", () => {
    expect(calcSellerPayout(0)).toBe(0);
  });

  it("fee is correctly calculated", () => {
    // $100 - 8% = $92
    const payout = calcSellerPayout(100);
    expect(payout).toBe(92);
  });

  // timeAgo
  it("handles invalid date gracefully", () => {
    // Invalid date string should produce some output
    const result = timeAgo("invalid-date");
    expect(typeof result).toBe("string");
  });

  it("handles very old dates", () => {
    const result = timeAgo("2020-01-01T00:00:00Z");
    expect(result).toContain("d ago");
  });

  // getStatusProgress
  it("returns last index for last status", () => {
    const flow = ["a", "b", "c"];
    expect(getStatusProgress("c", flow)).toBe(2);
  });

  it("handles duplicate statuses (first match)", () => {
    const flow = ["a", "b", "a"];
    expect(getStatusProgress("a", flow)).toBe(0);
  });

  // getAvatarUrl
  it("URL-encodes special characters in email", () => {
    const url = getAvatarUrl("test+user@example.com");
    expect(url).toContain("test%2Buser");
  });

  it("falls back to generated URL when storedUrl is empty string", () => {
    // Empty string is falsy, so function falls through to generate URL
    const url = getAvatarUrl("a@b.com", "");
    expect(url).toContain("ui-avatars.com");
  });

  // getInitials
  it("handles email with hyphens", () => {
    expect(getInitials("john-doe@example.com")).toBe("JD");
  });

  it("handles email with numbers", () => {
    expect(getInitials("user123@example.com")).toBe("US");
  });

  it("handles short email", () => {
    expect(getInitials("a@b.com")).toBe("A");
  });

  // cn
  it("handles arrays of classes", () => {
    expect(cn(["a", "b"])).toBe("a b");
  });

  it("handles nested arrays", () => {
    expect(cn("base", ["inner", "classes"])).toBe("base inner classes");
  });

  it("handles objects", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  // calcBuyerPrice + calcSellerPayout consistency
  it("buyer price + seller payout > original (platform profit)", () => {
    const original = 100;
    const buyerPays = calcBuyerPrice(original);
    const sellerGets = calcSellerPayout(original);
    // Platform revenue = buyer pays - seller gets
    expect(buyerPays - sellerGets).toBeGreaterThan(0);
  });
});

// ─── TRANSACTION_STATUS_FLOW order validation ───
import { TRANSACTION_STATUS_FLOW } from "./constants";

describe("transaction flow order", () => {
  it("all statuses are unique", () => {
    const unique = new Set(TRANSACTION_STATUS_FLOW);
    expect(unique.size).toBe(TRANSACTION_STATUS_FLOW.length);
  });

  it("payment comes before middleman", () => {
    const paidIdx = TRANSACTION_STATUS_FLOW.indexOf("paid");
    const mmIdx = TRANSACTION_STATUS_FLOW.indexOf("mm_assigned");
    expect(paidIdx).toBeLessThan(mmIdx);
  });

  it("transfer witnessed comes before funds released", () => {
    const twIdx = TRANSACTION_STATUS_FLOW.indexOf("transfer_witnessed");
    const frIdx = TRANSACTION_STATUS_FLOW.indexOf("funds_released");
    expect(twIdx).toBeLessThan(frIdx);
  });

  it("funds released comes before completed", () => {
    const frIdx = TRANSACTION_STATUS_FLOW.indexOf("funds_released");
    const compIdx = TRANSACTION_STATUS_FLOW.indexOf("completed");
    expect(frIdx).toBeLessThan(compIdx);
  });
});
