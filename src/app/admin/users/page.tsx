"use client";

import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import DeleteUserModal from "@/components/admin/DeleteUserModal";
import PaginationControls from "@/components/ui/PaginationControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAdminDate } from "@/lib/adminFormat";
import {
  AuthHttpError,
  deleteUser,
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
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [owners, setOwners] = useState<AdminRestaurantOwner[]>([]);
  const [partners, setPartners] = useState<AdminDeliveryPartner[]>([]);

  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    name: string;
    email: string;
    role: UserTab;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadUsers(
    activeTab: UserTab,
    search: string,
    nextPage = 1
  ) {
    setLoading(true);
    setError("");

    try {
      if (activeTab === "customers") {
        const data = await getAdminCustomers(search, nextPage, 20);
        setCustomers(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
      } else if (activeTab === "restaurant-owners") {
        const data = await getAdminRestaurantOwners(search, nextPage, 20);
        setOwners(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
      } else {
        const data = await getAdminDeliveryPartners(search, nextPage, 20);
        setPartners(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
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
    void loadUsers("customers", "", 1);
  }, []);

  function handleTabChange(next: UserTab) {
    setTab(next);
    setPage(1);
    void loadUsers(next, q, 1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void loadUsers(tab, q, 1);
  }

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteUser(userToDelete.id, userToDelete.role);
      toast.success("User deleted successfully");
      if (userToDelete.role === "customers") {
        setCustomers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      } else if (userToDelete.role === "restaurant-owners") {
        setOwners((prev) => prev.filter((u) => u.id !== userToDelete.id));
      } else {
        setPartners((prev) => prev.filter((u) => u.id !== userToDelete.id));
      }
      setTotal((prev) => Math.max(0, prev - 1));
      setUserToDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete user"
      );
    } finally {
      setDeleteLoading(false);
    }
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
        description="Manage customers, restaurant owners, and delivery partners"
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
        <AdminTableSkeleton rows={6} columns={5} />
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
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">
                      {user.name || "—"}
                    </td>
                    <td className="px-4 py-3">{user.email || "—"}</td>
                    <td className="px-4 py-3">{user.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatAdminDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setUserToDelete({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: "customers",
                          })
                        }
                        className="h-8 px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${user.name || user.email || "user"}`}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
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
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id} className="border-t hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">
                      {owner.name || "—"}
                    </td>
                    <td className="px-4 py-3">{owner.email || "—"}</td>
                    <td className="px-4 py-3">
                      {owner.restaurant || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setUserToDelete({
                            id: owner.id,
                            name: owner.name,
                            email: owner.email,
                            role: "restaurant-owners",
                          })
                        }
                        className="h-8 px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${owner.name || owner.email || "owner"}`}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
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
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
                  <tr key={partner.id} className="border-t hover:bg-gray-50/50">
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
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setUserToDelete({
                            id: partner.id,
                            name: partner.name,
                            email: partner.email,
                            role: "delivery-partners",
                          })
                        }
                        className="h-8 px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${partner.name || partner.email || "partner"}`}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <PaginationControls
        page={page}
        pages={pages}
        total={total}
        disabled={loading}
        onPageChange={(next) => {
          setPage(next);
          void loadUsers(tab, q, next);
        }}
      />

      <DeleteUserModal
        isOpen={Boolean(userToDelete)}
        userName={userToDelete?.name || ""}
        userEmail={userToDelete?.email || ""}
        loading={deleteLoading}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
