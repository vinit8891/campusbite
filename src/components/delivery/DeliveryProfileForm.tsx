import { useRef, useState } from "react";
import { Camera, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileForm } from "@/hooks/delivery/useDeliveryProfile";
import type { DeliveryPartnerProfile } from "@/services/deliveryPartnerService";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function processFile(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const msg = "Invalid file format. Please upload a JPEG, PNG, or WebP image.";
      setFileError(msg);
      toast.error(msg);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = "Image file is too large. Maximum allowed size is 2MB.";
      setFileError(msg);
      toast.error(msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFileError("");
        setImageError(false);
        setForm((prev) => (prev ? { ...prev, profile_image: reader.result as string } : null));
        toast.success("Photo uploaded successfully");
      }
    };
    reader.onerror = () => {
      const msg = "Failed to read image file. Please try another image.";
      setFileError(msg);
      toast.error(msg);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
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

  function handleRemovePhoto() {
    setForm((prev) => (prev ? { ...prev, profile_image: "" } : null));
    setImageError(false);
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-3xl border bg-white p-8 shadow"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-orange-100 shadow-md">
          {previewSrc && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={form.name || "Delivery Partner"}
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
              setForm((prev) => (prev ? { ...prev, name: e.target.value } : null))
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
              setForm((prev) => (prev ? { ...prev, vehicle_type: e.target.value } : null))
            }
            placeholder="Bike, Scooter, etc."
          />
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-gray-700">Vehicle Number</span>
          <Input
            value={form.vehicle_number}
            onChange={(e) =>
              setForm((prev) => (prev ? { ...prev, vehicle_number: e.target.value } : null))
            }
            placeholder="MH12AB1234"
          />
        </label>

        {/* Profile Photo Uploader */}
        <div className="space-y-2 md:col-span-2">
          <span className="block text-sm font-medium text-gray-700">
            Profile Photo
          </span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
            id="profile-photo-upload"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-dashed p-4 transition sm:flex-row ${
              isDragging
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-gray-50/50 hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <Camera className="h-6 w-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold text-gray-800">
                  {previewSrc && !imageError
                    ? "Custom photo uploaded"
                    : "Upload a profile photo"}
                </p>
                <p className="text-xs text-gray-500">
                  Max 2MB: JPG, PNG, WebP
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm"
              >
                <UploadCloud className="h-4 w-4" />
                {previewSrc && !imageError ? "Change Photo" : "Upload Photo"}
              </Button>

              {previewSrc ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-1.5 border-red-200 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Photo
                </Button>
              ) : null}
            </div>
          </div>

          {fileError ? (
            <p className="text-xs text-red-600">{fileError}</p>
          ) : null}
        </div>
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

