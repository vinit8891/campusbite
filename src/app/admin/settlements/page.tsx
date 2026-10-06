"use client";

import AdminSettlementsTable from "@/components/admin/AdminSettlementsTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default function AdminSettlementsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title="Canteen Payouts & Settlements"
        description="Manage daily 9:00 PM automated UPI settlements and multi-canteen transfers"
      />
      <AdminSettlementsTable />
    </div>
  );
}
