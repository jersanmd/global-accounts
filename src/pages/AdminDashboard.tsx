import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, Transaction, Listing } from "@/lib/types";
import { formatUSD, formatDate } from "@/lib/utils";

export function AdminDashboard() {
  const [tab, setTab] = useState<"users" | "transactions" | "listings">("transactions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === "transactions") {
      supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setTransactions((data as Transaction[]) ?? []);
          setLoading(false);
        });
    } else if (tab === "users") {
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setUsers((data as Profile[]) ?? []);
          setLoading(false);
        });
    } else if (tab === "listings") {
      supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setListings((data as Listing[]) ?? []);
          setLoading(false);
        });
    }
  }, [tab]);

  const handleRefund = async (txId: string) => {
    // Calls Edge Function to issue Stripe refund
    const { error } = await supabase.functions.invoke("refund-transaction", {
      body: { transactionId: txId },
    });
    if (error) {
      alert("Refund failed: " + error.message);
    } else {
      alert("Refund initiated.");
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, status: "completed" } : t))
      );
    }
  };

  const handleKycApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: "approved" })
      .eq("id", userId);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, kyc_status: "approved" } : u))
      );
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      {/* Tab bar */}
      <div className="mb-6 flex gap-2 border-b pb-2">
        {(["transactions", "users", "listings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      )}

      {/* Transactions Tab */}
      {tab === "transactions" && !loading && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{tx.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatUSD(tx.amount_usd)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(tx.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {tx.status === "disputed" && (
                      <button
                        onClick={() => handleRefund(tx.id)}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && !loading && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">KYC</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.kyc_status === "approved"
                          ? "bg-green-100 text-green-800"
                          : u.kyc_status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {u.kyc_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.kyc_status === "pending" && (
                      <button
                        onClick={() => handleKycApprove(u.id)}
                        className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors"
                      >
                        Approve KYC
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Listings Tab */}
      {tab === "listings" && !loading && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Game</th>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{l.game}</td>
                  <td className="px-4 py-3">{formatUSD(l.price_usd)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.status === "active"
                          ? "bg-green-100 text-green-800"
                          : l.status === "sold"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(l.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
