import { describe, it, expect } from "vitest";
import {
  SELLER_FEE_PERCENT,
  BUYER_FEE_PERCENT,
  TRANSACTION_STATUS_FLOW,
  STATUS_LABELS,
  RISK_LABELS,
  RISK_COLORS,
  SUPPORTED_GAMES,
  SUPPORTED_PLATFORMS,
  MAX_SCREENSHOTS,
  MAX_SCREENSHOT_SIZE_MB,
  SUPPORT_EMAIL,
  PRIVACY_EMAIL,
} from "./constants";

describe("constants", () => {
  // ─── Fees ───
  it("has valid fee percentages", () => {
    expect(SELLER_FEE_PERCENT).toBeGreaterThan(0);
    expect(BUYER_FEE_PERCENT).toBeGreaterThan(0);
    expect(SELLER_FEE_PERCENT).toBeLessThan(100);
    expect(BUYER_FEE_PERCENT).toBeLessThan(100);
  });

  // ─── Transaction Flow ───
  it("has correct transaction status flow length", () => {
    expect(TRANSACTION_STATUS_FLOW).toHaveLength(7);
  });

  it("transaction flow starts with paid", () => {
    expect(TRANSACTION_STATUS_FLOW[0]).toBe("paid");
  });

  it("transaction flow ends with completed", () => {
    expect(TRANSACTION_STATUS_FLOW[TRANSACTION_STATUS_FLOW.length - 1]).toBe("completed");
  });

  // ─── Status Labels ───
  it("has labels for all flow statuses", () => {
    TRANSACTION_STATUS_FLOW.forEach((status) => {
      expect(STATUS_LABELS[status]).toBeTruthy();
    });
  });

  it("has disputed label", () => {
    expect(STATUS_LABELS["disputed"]).toBe("Disputed");
  });

  // ─── Risk Labels ───
  it("has all risk levels", () => {
    expect(RISK_LABELS.low).toBeTruthy();
    expect(RISK_LABELS.medium).toBeTruthy();
    expect(RISK_LABELS.high).toBeTruthy();
    expect(RISK_LABELS.critical).toBeTruthy();
  });

  it("has all risk colors", () => {
    expect(RISK_COLORS.low).toBeTruthy();
    expect(RISK_COLORS.medium).toBeTruthy();
    expect(RISK_COLORS.high).toBeTruthy();
    expect(RISK_COLORS.critical).toBeTruthy();
  });

  // ─── Games ───
  it("has supported games", () => {
    expect(SUPPORTED_GAMES.length).toBeGreaterThan(0);
    expect(SUPPORTED_GAMES).toContain("Genshin Impact");
  });

  // ─── Platforms ───
  it("has supported platforms", () => {
    expect(SUPPORTED_PLATFORMS.length).toBeGreaterThan(0);
    expect(SUPPORTED_PLATFORMS).toContain("PC");
  });

  // ─── Storage ───
  it("has valid storage limits", () => {
    expect(MAX_SCREENSHOTS).toBeGreaterThan(0);
    expect(MAX_SCREENSHOT_SIZE_MB).toBeGreaterThan(0);
  });

  // ─── Contact ───
  it("has contact emails defined", () => {
    expect(SUPPORT_EMAIL).toContain("@");
    expect(PRIVACY_EMAIL).toContain("@");
  });
});
