import React from "react";
import AdminMissionControl from "@/components/admin/AdminMissionControl";

export const metadata = {
  title: "Mission Control | CampusBite Admin",
  description: "Platform operational toggles, emergency kill-switch, and verification queue.",
};

export default function MissionControlPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <AdminMissionControl />
    </div>
  );
}
