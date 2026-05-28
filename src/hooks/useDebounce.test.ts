import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("does not update before delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } }
    );

    rerender({ value: "world", delay: 500 });
    // Value should still be "hello" before timer fires
    expect(result.current).toBe("hello");
  });

  it("updates after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } }
    );

    rerender({ value: "world", delay: 500 });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("world");
  });

  it("resets timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } }
    );

    rerender({ value: "ab", delay: 300 });
    act(() => vi.advanceTimersByTime(150));
    rerender({ value: "abc", delay: 300 });
    act(() => vi.advanceTimersByTime(150));
    // Still "a" because timer was reset
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe("abc");
  });

  it("handles empty string", () => {
    const { result } = renderHook(() => useDebounce("", 300));
    expect(result.current).toBe("");
  });
});
