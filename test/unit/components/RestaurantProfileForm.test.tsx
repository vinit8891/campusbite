import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RestaurantProfileForm } from "@/components/restaurant/RestaurantProfileForm";
import type { BackendRestaurant } from "@/types";
import type { ProfileForm } from "@/hooks/restaurant/useRestaurantProfile";

const mockRestaurant: BackendRestaurant = {
  _id: "rest-1",
  slug: "campus-grill",
  name: "Campus Grill",
  email: "grill@campus.edu",
  cuisine: "North Indian",
  rating: 4.8,
  delivery_time: "20 min",
  distance: "1.2 km",
  image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
  description: "Authentic North Indian thalis and snacks",
  address: "Hostel Food Court Stall 2",
  phone: "9876543210",
  opening_hours: "09:00",
  closing_hours: "22:00",
};

const initialForm: ProfileForm = {
  name: "Campus Grill",
  description: "Authentic North Indian thalis and snacks",
  address: "Hostel Food Court Stall 2",
  phone: "9876543210",
  cuisine: "North Indian",
  opening_hours: "09:00",
  closing_hours: "22:00",
  image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
};

describe("RestaurantProfileForm & Dual-Mode Image Selector", () => {
  it("renders dual-mode selector buttons and allows switching between Upload and URL modes", async () => {
    const user = userEvent.setup();
    const setForm = vi.fn();
    const setImageError = vi.fn();
    const handleSubmit = vi.fn((e) => e.preventDefault());
    const handleCancel = vi.fn();

    render(
      <RestaurantProfileForm
        restaurant={mockRestaurant}
        form={initialForm}
        setForm={setForm}
        saving={false}
        error=""
        imageError={false}
        setImageError={setImageError}
        isDirty={true}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    );

    // Check mode buttons
    const uploadTab = screen.getByRole("button", { name: /upload file/i });
    const urlTab = screen.getByRole("button", { name: /image url/i });
    expect(uploadTab).toBeInTheDocument();
    expect(urlTab).toBeInTheDocument();

    // In URL mode initially because initialForm.image starts with http
    expect(
      screen.getByPlaceholderText("https://images.unsplash.com/photo-...")
    ).toBeInTheDocument();

    // Switch to upload mode
    await user.click(uploadTab);
    expect(
      screen.getByText(/click to upload or drag & drop banner image/i)
    ).toBeInTheDocument();
  });

  it("handles image URL input and updates form state", async () => {
    const user = userEvent.setup();
    let currentForm = { ...initialForm, image: "" };
    const setForm = vi.fn((updater) => {
      if (typeof updater === "function") {
        currentForm = updater(currentForm);
      } else {
        currentForm = updater;
      }
    });

    render(
      <RestaurantProfileForm
        restaurant={mockRestaurant}
        form={{ ...initialForm, image: "" }}
        setForm={setForm}
        saving={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Switch to URL mode
    const urlTab = screen.getByRole("button", { name: /image url/i });
    await user.click(urlTab);

    const input = screen.getByPlaceholderText("https://images.unsplash.com/photo-...");
    await user.type(input, "https://example.com/banner.jpg");

    expect(setForm).toHaveBeenCalled();
  });

  it("handles file drop upload and reads data URL", async () => {
    let currentForm = { ...initialForm };
    const setForm = vi.fn((updater) => {
      if (typeof updater === "function") {
        currentForm = updater(currentForm);
      }
    });

    render(
      <RestaurantProfileForm
        restaurant={mockRestaurant}
        form={initialForm}
        setForm={setForm}
        saving={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const uploadTab = screen.getByRole("button", { name: /upload file/i });
    fireEvent.click(uploadTab);

    const dropzone = screen.getByText(/click to upload or drag & drop banner image/i).parentElement;
    expect(dropzone).toBeInTheDocument();

    const file = new File(["dummy image content"], "banner.png", {
      type: "image/png",
    });

    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });
    }

    await waitFor(() => {
      expect(setForm).toHaveBeenCalled();
    });
  });

  it("allows removing the image and clearing input state", async () => {
    const user = userEvent.setup();
    const setForm = vi.fn();

    render(
      <RestaurantProfileForm
        restaurant={mockRestaurant}
        form={initialForm}
        setForm={setForm}
        saving={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByAltText("Restaurant banner preview")).toBeInTheDocument();
    const removeBtn = screen.getByRole("button", { name: /remove/i });
    await user.click(removeBtn);

    expect(setForm).toHaveBeenCalled();
  });

  it("renders compact mobile header, 2-column fields, and de-prioritized admin email notice", () => {
    render(
      <RestaurantProfileForm
        restaurant={mockRestaurant}
        form={initialForm}
        setForm={vi.fn()}
        saving={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Mobile Header
    expect(screen.getByText("Store Profile")).toBeInTheDocument();
    expect(screen.getByText("⚙️ Profile Details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();

    // 2-Column Fields
    expect(screen.getByLabelText("Contact Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Cuisine Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Opening Time")).toBeInTheDocument();
    expect(screen.getByLabelText("Closing Time")).toBeInTheDocument();

    // De-prioritized admin email notice
    expect(screen.getByText(/account email:/i)).toBeInTheDocument();
    expect(screen.getByText("grill@campus.edu")).toBeInTheDocument();
    expect(screen.getByText(/managed by admin/i)).toBeInTheDocument();
  });
});
