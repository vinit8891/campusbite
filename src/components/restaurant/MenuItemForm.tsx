"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Image as ImageIcon, Link as LinkIcon, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import { addMenuItem, updateMenuItem } from "@/services/menuService";
import { ROUTES } from "@/lib/routes";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export type MenuFormValues = {
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  available: boolean;
};

type Props = {
  mode: "add" | "edit";
  initialValues?: MenuFormValues;
  itemId?: string;
};

const EMPTY: MenuFormValues = {
  name: "",
  description: "",
  price: "",
  category: "",
  image: "",
  available: true,
};

export default function MenuItemForm({
  mode,
  initialValues,
  itemId,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<MenuFormValues>(
    initialValues || EMPTY
  );
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">(
    initialValues?.image?.startsWith("http") ? "url" : "upload"
  );
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);

  function processImageFile(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const msg = "Invalid file format. Please upload a JPEG, PNG, or WebP image.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = "Image file is too large. Maximum allowed size is 2MB.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageError(false);
        setError("");
        setForm((prev) => ({ ...prev, image: reader.result as string }));
        toast.success("Image loaded successfully");
      }
    };
    reader.onerror = () => {
      const msg = "Failed to read image file. Please try another image.";
      setError(msg);
      toast.error(msg);
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
    setForm((prev) => ({ ...prev, image: "" }));
    setImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Name is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.category.trim()) return "Category is required.";
    if (!form.image.trim()) {
      return "Dish image is required. Please upload a file or enter an image URL.";
    }

    const price = Number(form.price);
    if (!form.price.trim() || Number.isNaN(price) || price <= 0) {
      return "Enter a valid price greater than 0.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    const email = getRestaurantOwnerEmail();
    if (!email) {
      toast.error("Please log in again.");
      router.replace(ROUTES.RESTAURANT_LOGIN);
      return;
    }

    setLoading(true);

    const payload = {
      restaurant_email: email,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category.trim(),
      image: form.image.trim(),
      available: form.available,
    };

    try {
      if (mode === "edit") {
        if (!itemId) throw new Error("Missing menu item id.");
        await updateMenuItem(itemId, payload);
        toast.success("Food updated successfully");
      } else {
        await addMenuItem({ ...payload, available: true });
        toast.success("Food added successfully");
      }

      router.push(ROUTES.RESTAURANT_MENU);
      router.refresh();
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      const message =
        err instanceof Error ? err.message : "Unable to save menu item.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
    >
      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold">Food Name</label>
        <Input
          className="h-11"
          placeholder="Food Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Description</label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">Price (₹)</label>
          <Input
            type="number"
            min="1"
            step="0.01"
            className="h-11"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Category</label>
          <Input
            className="h-11"
            placeholder="Pizza, Burger, etc."
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Dish Image Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold">Dish Image</label>
          {/* Mode Switcher */}
          <div className="flex rounded-lg border bg-gray-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setImageInputMode("upload")}
              className={`flex items-center gap-1 rounded-md px-3 py-1 transition ${
                imageInputMode === "upload"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setImageInputMode("url")}
              className={`flex items-center gap-1 rounded-md px-3 py-1 transition ${
                imageInputMode === "url"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Image URL
            </button>
          </div>
        </div>

        {/* Upload Mode */}
        {imageInputMode === "upload" ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
              isDragging
                ? "border-orange-500 bg-orange-50"
                : "border-gray-300 bg-gray-50/50 hover:border-orange-400 hover:bg-orange-50/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 transition group-hover:scale-110">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-800">
              Click to upload or drag &amp; drop
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG, or WebP (max 2MB)
            </p>
          </div>
        ) : (
          /* URL Mode */
          <Input
            className="h-11"
            placeholder="https://images.example.com/dish.jpg"
            value={form.image}
            onChange={(e) => {
              setImageError(false);
              setForm({ ...form, image: e.target.value });
            }}
          />
        )}

        {/* Image Preview */}
        {form.image.trim() && !imageError && (
          <div className="relative overflow-hidden rounded-xl border bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.image}
              alt="Menu item preview"
              className="h-48 w-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute right-3 top-3 flex items-center gap-2">
              <span className="rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                {form.image.startsWith("data:") ? "File Upload" : "Web URL"}
              </span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white shadow transition hover:bg-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        )}

        {imageError && form.image.trim() && (
          <p className="text-sm text-amber-700">
            Preview unavailable — please verify the image file or URL.
          </p>
        )}
      </div>

      {mode === "edit" && (
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) =>
              setForm({ ...form, available: e.target.checked })
            }
            className="size-4"
          />
          Available
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {loading
            ? mode === "edit"
              ? "Updating..."
              : "Saving..."
            : mode === "edit"
              ? "Update Food"
              : "Save Food"}
        </Button>

        <Link
          href={ROUTES.RESTAURANT_MENU}
          className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

