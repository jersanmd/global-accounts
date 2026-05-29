import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BrowseListings } from "@/pages/BrowseListings";
import { ListingDetail } from "@/pages/ListingDetail";
import { CreateListing } from "@/pages/CreateListing";
import { TransactionView } from "@/pages/TransactionView";
import { Dashboard } from "@/pages/Dashboard";
import { MyListingsView } from "@/pages/MyListingsView";
import { MiddlemanDashboard } from "@/pages/MiddlemanDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { Login } from "@/pages/Login";
import { SetupProfile } from "@/pages/SetupProfile";
import { Profile } from "@/pages/Profile";
import { TermsOfService } from "@/pages/TermsOfService";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<BrowseListings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/setup-profile" element={<SetupProfile />} />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* Protected: any authenticated user */}
        <Route
          element={
            <ProtectedRoute
              requiredRole={["buyer", "seller", "middleman", "admin"]}
            />
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions/:id" element={<TransactionView />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
        </Route>

        {/* Protected: seller */}
        <Route element={<ProtectedRoute requiredRole={["seller", "admin"]} />}>
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/my-listings" element={<MyListingsView />} />
        </Route>

        {/* Protected: middleman */}
        <Route
          element={<ProtectedRoute requiredRole={["middleman", "admin"]} />}
        >
          <Route path="/middleman" element={<MiddlemanDashboard />} />
        </Route>

        {/* Protected: admin */}
        <Route element={<ProtectedRoute requiredRole={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Route>
    </Routes>
  );
}
