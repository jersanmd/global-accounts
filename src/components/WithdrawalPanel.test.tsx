import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Must be at top level for vitest hoisting
const mockWithdrawMutate = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@test.com" },
    profile: { role: "seller", kyc_status: "approved" },
  }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    balance: 1056.57,
    isLoading: false,
    withdrawable: [
      { ledger_id: "l1", amount: 41.20, date: "2026-05-28", game: "Lordnine", title: "5 USD / 1,000 DIAS", platform: "PC" },
      { ledger_id: "l2", amount: 824.00, date: "2026-05-27", game: "Throne and Liberty", title: "WTS 1 MAIN LIBERATOR", platform: "PC" },
      { ledger_id: "l3", amount: 150.00, date: "2026-05-26", game: "Lordnine", title: "Crossbow lvl 91", platform: "PC" },
    ],
    withdrawn: [],
    withdraw: { mutateAsync: mockWithdrawMutate, isPending: false },
  }),
}));

// Need to import after mocks
import { WithdrawalPanel } from "./WithdrawalPanel";

describe("WithdrawalPanel", () => {
  beforeEach(() => {
    mockWithdrawMutate.mockReset();
  });

  it("renders balance", () => {
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    expect(screen.getByText("$1,056.57")).toBeTruthy();
  });

  it("shows withdrawable sales count", () => {
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    expect(screen.getByText("Withdrawable Sales (3)")).toBeTruthy();
  });

  it("shows 'Select sales to withdraw' when nothing selected", () => {
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    expect(screen.getByText("Select sales to withdraw")).toBeTruthy();
  });

  it("updates button text when items selected", () => {
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    // Click first entry (5 USD / 1,000 DIAS)
    const entry = screen.getByText("5 USD / 1,000 DIAS");
    fireEvent.click(entry.closest("button")!);
    expect(screen.getByText("Withdraw $41.20")).toBeTruthy();
  });

  it("calculates correct total with multiple selections", () => {
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    
    const entry1 = screen.getByText("5 USD / 1,000 DIAS").closest("button")!;
    const entry2 = screen.getByText("WTS 1 MAIN LIBERATOR").closest("button")!;
    
    fireEvent.click(entry1);
    fireEvent.click(entry2);
    
    expect(screen.getByText("Withdraw $865.20")).toBeTruthy();
  });

  it("shows method selector with GCash default", () => {
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    expect(screen.getByText("GCash")).toBeTruthy();
    expect(screen.getByText("Maya")).toBeTruthy();
    expect(screen.getByText("Bank Transfer")).toBeTruthy();
  });

  it("opens confirmation modal on withdraw click", () => {
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    
    // Select an item first
    const entry = screen.getByText("5 USD / 1,000 DIAS").closest("button")!;
    fireEvent.click(entry);
    
    // Click withdraw button
    fireEvent.click(screen.getByText("Withdraw $41.20"));
    
    expect(screen.getByText("Confirm Withdrawal")).toBeTruthy();
  });

  it("calls withdraw mutation on confirm", async () => {
    mockWithdrawMutate.mockResolvedValueOnce(41.20);
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    
    const entry = screen.getByText("5 USD / 1,000 DIAS").closest("button")!;
    fireEvent.click(entry);
    fireEvent.click(screen.getByText("Withdraw $41.20"));
    fireEvent.click(screen.getByText("Confirm"));
    
    await waitFor(() => {
      expect(mockWithdrawMutate).toHaveBeenCalledWith({
        ledgerIds: ["l1"],
        method: "gcash",
      });
    });
  });

  it("shows error message on withdrawal failure", async () => {
    mockWithdrawMutate.mockRejectedValueOnce(new Error("Insufficient balance"));
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    
    const entry = screen.getByText("5 USD / 1,000 DIAS").closest("button")!;
    fireEvent.click(entry);
    fireEvent.click(screen.getByText("Withdraw $41.20"));
    fireEvent.click(screen.getByText("Confirm"));
    
    expect(await screen.findByText("Insufficient balance")).toBeTruthy();
  });

  it("cancel button closes confirmation modal", () => {
    render(<MemoryRouter><WithdrawalPanel /></MemoryRouter>);
    
    const entry = screen.getByText("5 USD / 1,000 DIAS").closest("button")!;
    fireEvent.click(entry);
    fireEvent.click(screen.getByText("Withdraw $41.20"));
    
    // Modal is open
    expect(screen.getByText("Confirm Withdrawal")).toBeTruthy();
    
    // Click Cancel
    fireEvent.click(screen.getByText("Cancel"));
    
    // Modal should be gone
    expect(screen.queryByText("Confirm Withdrawal")).toBeNull();
  });
});
