import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import type { ProfileForm } from "@/hooks/restaurant/useRestaurantProfile";
import type { BackendRestaurant } from "@/types";

type RestaurantProfileFormProps = {
  restaurant: BackendRestaurant;
  form: ProfileForm;
  setForm: React.Dispatch<React.SetStateAction<ProfileForm | null>>;
  saving: boolean;
  error: string;
  imageError: boolean;
  setImageError: (val: boolean) => void;
  isDirty: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export function RestaurantProfileForm({
  restaurant,
  form,
  setForm,
  saving,
  error,
  imageError,
  setImageError,
  isDirty,
  onSubmit,
  onCancel,
}: RestaurantProfileFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
    >
      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Restaurant Email
        </label>
        <Input
          value={restaurant.email}
          disabled
          className="h-11 bg-gray-50"
        />
        <p className="mt-1 text-xs text-gray-500">
          Email cannot be changed.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Restaurant Name
        </label>
        <Input
          className="h-11"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Description
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
          placeholder="Tell customers about your restaurant"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Address</label>
        <Input
          className="h-11"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">Phone</label>
          <Input
            className="h-11"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="10-digit mobile"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">Cuisine</label>
          <Input
            className="h-11"
            value={form.cuisine}
            onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Opening Hours
          </label>
          <Input
            className="h-11"
            value={form.opening_hours}
            onChange={(e) =>
              setForm({ ...form, opening_hours: e.target.value })
            }
            placeholder="09:00"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Closing Hours
          </label>
          <Input
            className="h-11"
            value={form.closing_hours}
            onChange={(e) =>
              setForm({ ...form, closing_hours: e.target.value })
            }
            placeholder="22:00"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Restaurant Image URL
        </label>
        <Input
          className="h-11"
          value={form.image}
          onChange={(e) => {
            setImageError(false);
            setForm({ ...form, image: e.target.value });
          }}
          required
        />
      </div>

      {form.image.trim() && !imageError && (
        <div className="overflow-hidden rounded-xl border bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.image}
            alt="Restaurant preview"
            className="h-48 w-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {imageError && form.image.trim() && (
        <p className="text-sm text-amber-700">
          Preview unavailable — check the image URL.
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving || !isDirty}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || !isDirty}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Link
          href={ROUTES.RESTAURANT_DASHBOARD}
          className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </form>
  );
}
