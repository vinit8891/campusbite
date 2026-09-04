import Link from "next/link";
import { useRef, useState } from "react";
import { UploadCloud, Link as LinkIcon, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import type { ProfileForm } from "@/hooks/restaurant/useRestaurantProfile";
import type { BackendRestaurant } from "@/types";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/jpg",
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">(
    form.image?.startsWith("http") ? "url" : "upload"
  );
  const [isDragging, setIsDragging] = useState(false);

  function processImageFile(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const msg = "Invalid file format. Please upload a PNG, JPEG, WebP, or AVIF image.";
      toast.error(msg);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = "Image file is too large. Maximum allowed size is 5MB.";
      toast.error(msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageError(false);
        setForm((prev) => (prev ? { ...prev, image: reader.result as string } : prev));
        toast.success("Restaurant banner loaded successfully");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file. Please try another image.");
    };
    reader.readAsDataURL(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleRemoveImage() {
    setForm((prev) => (prev ? { ...prev, image: "" } : prev));
    setImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-8 shadow-xs relative"
    >
      {/* Mobile Sticky Header (< md) */}
      <div className="md:hidden sticky top-0 z-20 -mx-4 -mt-4 mb-5 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-stone-200/70 rounded-t-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base" role="img" aria-label="Settings">
            ⚙️
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-stone-900 truncate">
              Store Profile
            </h2>
            <p className="text-[10px] font-semibold text-stone-500 truncate">
              ⚙️ Profile Details
            </p>
          </div>
        </div>
        <Button
          type="submit"
          disabled={saving || !isDirty}
          className="h-8 px-3.5 text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {error && (
        <p className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 sm:p-4 text-xs sm:text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      {/* 1. Restaurant Name */}
      <div className="pt-1">
        <label
          htmlFor="restaurant-name"
          className="mb-1.5 block text-xs sm:text-sm font-bold text-stone-900"
        >
          Restaurant Name
        </label>
        <Input
          id="restaurant-name"
          className="h-10 sm:h-11 rounded-xl sm:rounded-2xl border-stone-200 text-sm"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))
          }
          placeholder="e.g. Campus Corner Grill"
          required
        />
      </div>

      {/* 2. Description (2-row textarea) */}
      <div>
        <label
          htmlFor="restaurant-description"
          className="mb-1.5 block text-xs sm:text-sm font-bold text-stone-900"
        >
          Description
        </label>
        <textarea
          id="restaurant-description"
          rows={2}
          className="min-h-16 sm:min-h-20 w-full rounded-xl sm:rounded-2xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20"
          value={form.description}
          onChange={(e) =>
            setForm((prev) =>
              prev ? { ...prev, description: e.target.value } : prev
            )
          }
          placeholder="Tell campus students about your specialties, meal combos, and fresh ingredients…"
        />
      </div>

      {/* 3. Campus Address / Stall Location */}
      <div>
        <label
          htmlFor="restaurant-address"
          className="mb-1.5 block text-xs sm:text-sm font-bold text-stone-900"
        >
          Campus Address / Stall Location
        </label>
        <Input
          id="restaurant-address"
          className="h-10 sm:h-11 rounded-xl sm:rounded-2xl border-stone-200 text-sm"
          value={form.address}
          onChange={(e) =>
            setForm((prev) =>
              prev ? { ...prev, address: e.target.value } : prev
            )
          }
          placeholder="e.g. Food Court Stall 4, Near Academic Block 2"
          required
        />
      </div>

      {/* 4. Contact & Cuisine Row (2-column responsive grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="restaurant-phone"
            className="mb-1.5 block text-xs sm:text-sm font-bold text-stone-900"
          >
            Contact Phone
          </label>
          <Input
            id="restaurant-phone"
            type="tel"
            className="h-10 sm:h-11 rounded-xl sm:rounded-2xl border-stone-200 text-sm"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) =>
                prev ? { ...prev, phone: e.target.value } : prev
              )
            }
            placeholder="10-digit mobile number"
            required
          />
        </div>
        <div>
          <label
            htmlFor="restaurant-cuisine"
            className="mb-1.5 block text-xs sm:text-sm font-bold text-stone-900"
          >
            Cuisine Type
          </label>
          <Input
            id="restaurant-cuisine"
            className="h-10 sm:h-11 rounded-xl sm:rounded-2xl border-stone-200 text-sm"
            value={form.cuisine}
            onChange={(e) =>
              setForm((prev) =>
                prev ? { ...prev, cuisine: e.target.value } : prev
              )
            }
            placeholder="e.g. North Indian • Thali"
            required
          />
        </div>
      </div>

      {/* 5. Operating Hours Row (2-column responsive grid) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="restaurant-opening-hours"
            className="mb-1.5 block text-xs sm:text-sm font-bold text-stone-900 truncate"
          >
            Opening Time
          </label>
          <Input
            id="restaurant-opening-hours"
            className="h-10 sm:h-11 rounded-xl sm:rounded-2xl border-stone-200 text-sm"
            value={form.opening_hours}
            onChange={(e) =>
              setForm((prev) =>
                prev ? { ...prev, opening_hours: e.target.value } : prev
              )
            }
            placeholder="09:00"
            required
          />
        </div>
        <div>
          <label
            htmlFor="restaurant-closing-hours"
            className="mb-1.5 block text-xs sm:text-sm font-bold text-stone-900 truncate"
          >
            Closing Time
          </label>
          <Input
            id="restaurant-closing-hours"
            className="h-10 sm:h-11 rounded-xl sm:rounded-2xl border-stone-200 text-sm"
            value={form.closing_hours}
            onChange={(e) =>
              setForm((prev) =>
                prev ? { ...prev, closing_hours: e.target.value } : prev
              )
            }
            placeholder="22:00"
            required
          />
        </div>
      </div>

      {/* 6. Dual-Mode Restaurant Banner Section */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs sm:text-sm font-bold text-stone-900">
            Restaurant Banner Image
          </label>

          {/* Segmented Control / Tab Switcher */}
          <div className="flex rounded-xl border border-stone-200 bg-stone-100/80 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setImageInputMode("upload")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs transition-all cursor-pointer ${
                imageInputMode === "upload"
                  ? "bg-white text-orange-600 shadow-xs font-extrabold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>📁 Upload File</span>
            </button>
            <button
              type="button"
              onClick={() => setImageInputMode("url")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs transition-all cursor-pointer ${
                imageInputMode === "url"
                  ? "bg-white text-orange-600 shadow-xs font-extrabold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>🔗 Image URL</span>
            </button>
          </div>
        </div>

        {/* Upload Mode Dropzone */}
        {imageInputMode === "upload" ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 sm:p-6 text-center transition-all ${
              isDragging
                ? "border-orange-500 bg-orange-50/80"
                : "border-stone-300 bg-stone-50/50 hover:border-orange-400 hover:bg-orange-50/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/jpg,image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-orange-100 text-orange-600 transition-transform group-hover:scale-110 shadow-xs">
              <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <p className="mt-2 text-xs sm:text-sm font-bold text-stone-800">
              Click to upload or drag &amp; drop banner image
            </p>
            <p className="mt-0.5 text-[11px] text-stone-500">
              PNG, JPG, WebP, or AVIF (max 5MB)
            </p>
          </div>
        ) : (
          /* URL Input Mode */
          <Input
            className="h-10 sm:h-11 rounded-xl sm:rounded-2xl border-stone-200 text-sm"
            placeholder="https://images.unsplash.com/photo-..."
            value={form.image}
            onChange={(e) => {
              setImageError(false);
              setForm((prev) =>
                prev ? { ...prev, image: e.target.value } : prev
              );
            }}
          />
        )}

        {/* Live Banner Preview & Quick Controls */}
        {form.image.trim() && !imageError && (
          <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 shadow-sm bg-stone-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.image}
              alt="Restaurant banner preview"
              className="h-36 sm:h-48 w-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 sm:gap-2">
              <span className="rounded-lg bg-stone-900/75 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white backdrop-blur-md">
                {form.image.startsWith("data:") ? "📁 File Upload" : "🔗 Web URL"}
              </span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        )}

        {imageError && form.image.trim() && (
          <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
            ⚠️ Preview unavailable — please verify the image file or URL.
          </p>
        )}
      </div>

      {/* 7. De-prioritized Admin Email & Account Details Card */}
      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3.5 sm:p-4 text-xs text-stone-600 flex items-start gap-2.5">
        <span className="text-base shrink-0" role="img" aria-label="Locked account">
          🔒
        </span>
        <div className="min-w-0">
          <p className="font-bold text-stone-800 truncate">
            Account email: <span className="font-medium text-stone-600">{restaurant.email}</span>
          </p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Managed by admin. Contact campus administration to update registered email address.
          </p>
        </div>
      </div>

      {/* Form Action Buttons (Desktop & Backup) */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-100">
        <Button
          type="submit"
          disabled={saving || !isDirty}
          className="h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-6 shadow-xs cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving Changes…" : "Save Profile Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || !isDirty}
          onClick={onCancel}
          className="h-11 rounded-xl border-stone-200 hover:bg-stone-50 font-bold px-5"
        >
          Cancel
        </Button>
        <Link
          href={ROUTES.RESTAURANT_DASHBOARD}
          className="inline-flex h-11 items-center rounded-xl border border-stone-200 px-4 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors ml-auto sm:ml-0"
        >
          Back to Dashboard
        </Link>
      </div>
    </form>
  );
}

