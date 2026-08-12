"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAdminDate } from "@/lib/adminFormat";
import {
  AuthHttpError,
  getAdminCustomers,
  getAdminDeliveryPartners,
  getAdminRestaurantOwners,
  type AdminCustomer,
  type AdminDeliveryPartner,
  type AdminRestaurantOwner,
} from "@/services/adminService";

type UserTab = "customers" | "restaurant-owners" | "delivery-partners";

const TABS: { id: UserTab; label: string }[] = [
  { id: "customers", label: "Customers" },
  { id: "restaurant-owners", label: "Restaurant Owners" },
  { id: "delivery-partners", label: "Delivery Partners" },
];

export default function AdminUsersPage() {
  const [tab, setTab] = useState<UserTab>("customers");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [owners, setOwners] = useState<AdminRestaurantOwner[]>([]);
  const [partners, setPartners] = useState<AdminDeliveryPartner[]>([]);

  async function loadUsers(activeTab: UserTab, search: string) {
    setLoading(true);
    setError("");

    try {
      if (activeTab === "customers") {
        setCustomers(await getAdminCustomers(search));
      } else if (activeTab === "restaurant-owners") {
        setOwners(await getAdminRestaurantOwners(search));
      } else {
        setPartners(await getAdminDeliveryPartners(search));
      }
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Unable to load users"
      );
      if (activeTab === "customers") setCustomers([]);
      if (activeTab === "restaurant-owners") setOwners([]);
      if (activeTab === "delivery-partners") setPartners([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await getAdminCustomers();
        if (cancelled) return;
        setCustomers(data);
        setError("");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Unable to load users"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleTabChange(next: UserTab) {
    setTab(next);
    void loadUsers(next, q);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadUsers(tab, q);
  }

  const empty =
    !loading &&
    ((tab === "customers" && customers.length === 0) ||
      (tab === "restaurant-owners" && owners.length === 0) ||
      (tab === "delivery-partners" && partners.length === 0));

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <AdminPageHeader
        title="Users"
        description="Read-only directory of customers, owners, and delivery partners"
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTabChange(item.id)}
            className={`h-10 rounded-lg px-4 text-sm font-medium transition ${
              tab === item.id
                ? "bg-slate-900 text-white"
                : "border bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row"
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="h-10 pl-9"
          />
        </div>
        <Button type="submit" className="h-10 bg-slate-900 hover:bg-slate-800">
          Search
        </Button>
      </form>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <AdminTableSkeleton rows={6} columns={4} />
      ) : empty ? (
        <AdminEmptyState
          title="No users found"
          description="Try a different search term or switch tabs."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          {tab === "customers" && (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {user.name || "—"}
                    </td>
                    <td className="px-4 py-3">{user.email || "—"}</td>
                    <td className="px-4 py-3">{user.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatAdminDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "restaurant-owners" && (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Restaurant</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {owner.name || "—"}
                    </td>
                    <td className="px-4 py-3">{owner.email || "—"}</td>
                    <td className="px-4 py-3">
                      {owner.restaurant || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "delivery-partners" && (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
                  <tr key={partner.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {partner.name || "—"}
                    </td>
                    <td className="px-4 py-3">{partner.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          partner.status === "Online"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {partner.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
