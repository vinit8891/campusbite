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
      className="space-y-6 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs sm:p-8"
    >
      {error && (
        <p className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      {/* Basic Eatery Details */}
      <div>
        <label className="mb-2 block text-sm font-bold text-stone-900">
          Restaurant Email
        </label>
        <Input
          value={restaurant.email}
          disabled
          className="h-11 rounded-2xl bg-stone-50 border-stone-200 text-stone-500 font-medium"
        />
        <p className="mt-1 text-xs text-stone-400">
          Account email is managed by your administrator and cannot be edited.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-stone-900">
          Restaurant Name
        </label>
        <Input
          className="h-11 rounded-2xl border-stone-200"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))
          }
          placeholder="e.g. Campus Corner Grill"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-stone-900">
          Description
        </label>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20"
          value={form.description}
          onChange={(e) =>
            setForm((prev) =>
              prev ? { ...prev, description: e.target.value } : prev
            )
          }
          placeholder="Tell campus students about your specialties, meal combos, and fresh ingredients…"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-stone-900">
          Campus Address / Stall Location
        </label>
        <Input
          className="h-11 rounded-2xl border-stone-200"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-stone-900">
            Contact Phone
          </label>
          <Input
            className="h-11 rounded-2xl border-stone-200"
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
          <label className="mb-2 block text-sm font-bold text-stone-900">
            Cuisine Type
          </label>
          <Input
            className="h-11 rounded-2xl border-stone-200"
            value={form.cuisine}
            onChange={(e) =>
              setForm((prev) =>
                prev ? { ...prev, cuisine: e.target.value } : prev
              )
            }
            placeholder="e.g. North Indian, Snacks & Shakes"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-stone-900">
            Opening Hours (24h)
          </label>
          <Input
            className="h-11 rounded-2xl border-stone-200"
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
          <label className="mb-2 block text-sm font-bold text-stone-900">
            Closing Hours (24h)
          </label>
          <Input
            className="h-11 rounded-2xl border-stone-200"
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

      {/* Dual-Mode Restaurant Banner Section */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm font-bold text-stone-900">
            Restaurant Banner Image
          </label>

          {/* Segmented Control / Tab Switcher */}
          <div className="flex rounded-xl border border-stone-200 bg-stone-100/80 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setImageInputMode("upload")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
                imageInputMode === "upload"
                  ? "bg-white text-orange-600 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>📁 Upload File</span>
            </button>
            <button
              type="button"
              onClick={() => setImageInputMode("url")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
                imageInputMode === "url"
                  ? "bg-white text-orange-600 shadow-xs"
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
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 transition-transform group-hover:scale-110 shadow-xs">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-2.5 text-sm font-bold text-stone-800">
              Click to upload or drag &amp; drop banner image
            </p>
            <p className="mt-1 text-xs text-stone-500">
              PNG, JPG, WebP, or AVIF (max 5MB)
            </p>
          </div>
        ) : (
          /* URL Input Mode */
          <Input
            className="h-11 rounded-2xl border-stone-200"
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
              className="max-h-52 w-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute right-3 top-3 flex items-center gap-2">
              <span className="rounded-lg bg-stone-900/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                {form.image.startsWith("data:") ? "📁 File Upload" : "🔗 Web URL"}
              </span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 px-2.5 py-1 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
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

      {/* Form Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-3 border-t border-stone-100">
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
          className="inline-flex h-11 items-center rounded-xl border border-stone-200 px-4 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </form>
  );
}

