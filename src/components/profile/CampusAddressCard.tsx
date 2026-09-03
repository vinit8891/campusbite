"use client";

import React, { useState } from "react";
import { MapPin, Edit3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HOSTEL_BLOCKS = [
  "Hostel Block A",
  "Hostel Block B",
  "Hostel Block C",
  "Girls Hostel",
  "PG Complex",
];

const QUICK_INSTRUCTIONS = [
  "Call when downstairs",
  "Leave at hostel security / reception",
  "Call from main gate",
];

type CampusAddressCardProps = {
  hostelBlock: string;
  room: string;
  instructions: string;
  loading?: boolean;
  onSave: (hostel: string, room: string, instructions: string) => Promise<void>;
};

export function CampusAddressCard({
  hostelBlock,
  room,
  instructions,
  loading = false,
  onSave,
}: CampusAddressCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState(hostelBlock || "Hostel Block A");
  const [roomValue, setRoomValue] = useState(room || "");
  const [instructionsValue, setInstructionsValue] = useState(instructions || "");

  async function handleSave() {
    await onSave(selectedHostel, roomValue.trim(), instructionsValue.trim());
    setIsEditing(false);
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-full bg-orange-100 p-2 text-orange-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Default Campus Delivery Location
            </h2>
            <p className="text-xs text-gray-500">
              Auto-fills at checkout for fast 1-click orders.
            </p>
          </div>
        </div>

        {!isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 gap-1.5 text-xs font-semibold text-gray-700"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={loading}
              className="h-8 text-xs text-gray-500"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="h-8 gap-1.5 bg-orange-600 text-xs font-semibold text-white hover:bg-orange-700"
            >
              <Check className="h-3.5 w-3.5" />
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-gray-400">Hostel / Complex:</span>
            <p className="font-semibold text-gray-900">{hostelBlock || "Not set"}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-gray-400">Room / Floor / Wing:</span>
            <p className="font-medium text-gray-800">{room || "Not set (e.g. Room 304, 3rd Floor)"}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-gray-400">Courier Instructions:</span>
            <p className="text-gray-600 italic">
              {instructions ? `"${instructions}"` : "None set"}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="campus-hostel-select" className="mb-1 block text-xs font-semibold uppercase text-gray-600">
              Select Hostel / Complex
            </label>
            <select
              id="campus-hostel-select"
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-orange-500"
            >
              {HOSTEL_BLOCKS.map((block) => (
                <option key={block} value={block}>
                  {block}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="campus-room-input" className="mb-1 block text-xs font-semibold uppercase text-gray-600">
              Room / Floor / Wing
            </label>
            <Input
              id="campus-room-input"
              value={roomValue}
              onChange={(e) => setRoomValue(e.target.value)}
              placeholder="e.g. Room 304, 3rd Floor, Wing B"
              className="h-10"
            />
          </div>

          <div>
            <label htmlFor="campus-instructions-input" className="mb-1 block text-xs font-semibold uppercase text-gray-600">
              Courier Delivery Notes
            </label>
            <Input
              id="campus-instructions-input"
              value={instructionsValue}
              onChange={(e) => setInstructionsValue(e.target.value)}
              placeholder="e.g. Call when downstairs, leave at reception..."
              className="h-10"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_INSTRUCTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setInstructionsValue((prev) =>
                      prev === chip ? "" : chip
                    )
                  }
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                    instructionsValue === chip
                      ? "border-orange-500 bg-orange-100 text-orange-900 font-semibold"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-300"
                  }`}
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default CampusAddressCard;
