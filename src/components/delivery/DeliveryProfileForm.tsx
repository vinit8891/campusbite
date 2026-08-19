import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileForm } from "@/hooks/delivery/useDeliveryProfile";
import type { DeliveryPartnerProfile } from "@/services/deliveryPartnerService";

type DeliveryProfileFormProps = {
  profile: DeliveryPartnerProfile;
  form: ProfileForm;
  setForm: React.Dispatch<React.SetStateAction<ProfileForm | null>>;
  saving: boolean;
  toggling: boolean;
  error: string;
  imageError: boolean;
  setImageError: (val: boolean) => void;
  isDirty: boolean;
  onToggleOnline: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function DeliveryProfileForm({
  profile,
  form,
  setForm,
  saving,
  toggling,
  error,
  imageError,
  setImageError,
  isDirty,
  onToggleOnline,
  onCancel,
  onSubmit,
}: DeliveryProfileFormProps) {
  const previewSrc = form.profile_image.trim();

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-3xl border bg-white p-8 shadow"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-orange-100">
          {previewSrc && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="Profile"
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-4xl font-bold text-orange-600">
              {(form.name || "D").charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-2 text-center sm:text-left">
          <h2 className="text-2xl font-bold">{form.name || "Delivery Partner"}</h2>
          <p className="text-gray-500">{profile.email}</p>
          <p className="text-sm text-gray-500">
            Phone is linked to your account and cannot be changed here.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange-50 px-5 py-4">
        <div>
          <p className="font-semibold text-gray-800">Availability</p>
          <p className="text-sm text-gray-500">
            {form.online
              ? "You are online and can receive deliveries."
              : "You are offline."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={toggling}
          onClick={onToggleOnline}
          className={
            form.online
              ? "border-green-600 text-green-700"
              : "border-red-500 text-red-600"
          }
        >
          {toggling
            ? "Updating..."
            : form.online
              ? "Online"
              : "Offline"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-gray-700">Name</span>
          <Input
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            placeholder="Your full name"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-gray-700">Phone</span>
          <Input value={profile.phone} disabled readOnly />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-gray-700">Email</span>
          <Input value={profile.email} disabled readOnly />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-gray-700">Vehicle Type</span>
          <Input
            value={form.vehicle_type}
            onChange={(e) =>
              setForm({ ...form, vehicle_type: e.target.value })
            }
            placeholder="Bike, Scooter, etc."
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-gray-700">Vehicle Number</span>
          <Input
            value={form.vehicle_number}
            onChange={(e) =>
              setForm({ ...form, vehicle_number: e.target.value })
            }
            placeholder="MH12AB1234"
          />
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-gray-700">
            Profile Image URL (optional)
          </span>
          <Input
            value={form.profile_image}
            onChange={(e) => {
              setImageError(false);
              setForm({ ...form, profile_image: e.target.value });
            }}
            placeholder="https://… or /images/…"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!isDirty || saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
