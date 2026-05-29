import { describe, it, expect, vi } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const mockFrom = vi.fn().mockReturnValue({ select: vi.fn(), eq: vi.fn(), single: vi.fn() });
const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: Any[]) => mockFrom(...args),
    rpc: (...args: Any[]) => ({ data: null, error: null }),
    auth: { getUser: vi.fn() },
  },
}));

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useWallet", () => {
  it("returns zero balance when userId is undefined", async () => {
    const { result } = renderHook(() => useWallet(undefined), { wrapper });
    expect(result.current.balance).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns zero balance when wallet not found", async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ select: selectMock });

    const { result } = renderHook(() => useWallet("user-1"), { wrapper });
    
    await waitFor(() => {
      expect(result.current.balance).toBe(0);
    });
  });

  it("returns withdrawable as empty array when no userId", () => {
    const { result } = renderHook(() => useWallet(undefined), { wrapper });
    expect(result.current.withdrawable).toEqual([]);
    expect(result.current.withdrawn).toEqual([]);
  });

  it("exposes withdraw mutation", () => {
    const { result } = renderHook(() => useWallet(undefined), { wrapper });
    expect(typeof result.current.withdraw.mutateAsync).toBe("function");
  });
});
