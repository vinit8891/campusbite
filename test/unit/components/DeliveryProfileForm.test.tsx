import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeliveryProfileForm } from "@/components/delivery/DeliveryProfileForm";
import type { DeliveryPartnerProfile } from "@/services/deliveryPartnerService";
import type { ProfileForm } from "@/hooks/delivery/useDeliveryProfile";

const mockProfile: DeliveryPartnerProfile = {
  id: "partner-123",
  name: "Ramesh Rider",
  email: "ramesh@campus.edu",
  phone: "9876543210",
  vehicle: "Bike",
  vehicle_type: "Bike",
  vehicle_number: "MH12AB1234",
  profile_image: "",
  online: true,
};

const mockForm: ProfileForm = {
  name: "Ramesh Rider",
  vehicle_type: "Bike",
  vehicle_number: "MH12AB1234",
  profile_image: "",
  online: true,
};

describe("DeliveryProfileForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders partner details, letter avatar 'R', and Profile Photo file upload UI", () => {
    const setForm = vi.fn();
    const setImageError = vi.fn();
    const onToggleOnline = vi.fn();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    render(
      <DeliveryProfileForm
        profile={mockProfile}
        form={mockForm}
        setForm={setForm}
        saving={false}
        toggling={false}
        error=""
        imageError={false}
        setImageError={setImageError}
        isDirty={false}
        onToggleOnline={onToggleOnline}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText("Ramesh Rider")).toBeInTheDocument();
    expect(screen.getByText("ramesh@campus.edu")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9876543210")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MH12AB1234")).toBeInTheDocument();

    // Fallback letter avatar
    expect(screen.getByText("R")).toBeInTheDocument();

    // Profile photo upload section
    expect(screen.getByText("Profile Photo")).toBeInTheDocument();
    expect(screen.getByText("Upload a profile photo")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /upload photo/i })
    ).toBeInTheDocument();
  });

  it("renders image inside circular avatar when profile_image is provided", () => {
    const customForm: ProfileForm = {
      ...mockForm,
      profile_image: "https://example.com/avatar.jpg",
    };

    render(
      <DeliveryProfileForm
        profile={mockProfile}
        form={customForm}
        setForm={vi.fn()}
        saving={false}
        toggling={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={false}
        onToggleOnline={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const avatarImg = screen.getByAltText("Ramesh Rider");
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(screen.getByRole("button", { name: /change photo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove photo/i })).toBeInTheDocument();
  });

  it("handles photo file selection and converts to base64 data URL", async () => {
    let currentForm: ProfileForm | null = { ...mockForm };
    const setForm = vi.fn((updater) => {
      if (typeof updater === "function") {
        currentForm = updater(currentForm);
      } else {
        currentForm = updater;
      }
    });

    render(
      <DeliveryProfileForm
        profile={mockProfile}
        form={currentForm!}
        setForm={setForm}
        saving={false}
        toggling={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={false}
        onToggleOnline={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const file = new File(["dummy avatar content"], "rider.png", {
      type: "image/png",
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(setForm).toHaveBeenCalled();
      expect(currentForm?.profile_image).toMatch(/^data:image\/png;base64,/);
    });
  });

  it("rejects files larger than 2MB with user-friendly error", () => {
    render(
      <DeliveryProfileForm
        profile={mockProfile}
        form={mockForm}
        setForm={vi.fn()}
        saving={false}
        toggling={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={false}
        onToggleOnline={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const largeBlob = new Blob([new Uint8Array(3 * 1024 * 1024)], {
      type: "image/jpeg",
    });
    const largeFile = new File([largeBlob], "huge.jpg", {
      type: "image/jpeg",
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(
      screen.getByText(/Image file is too large\. Maximum allowed size is 2MB/i)
    ).toBeInTheDocument();
  });

  it("rejects unsupported file types", () => {
    render(
      <DeliveryProfileForm
        profile={mockProfile}
        form={mockForm}
        setForm={vi.fn()}
        saving={false}
        toggling={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={false}
        onToggleOnline={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const docFile = new File(["not an image"], "license.pdf", {
      type: "application/pdf",
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [docFile] } });

    expect(
      screen.getByText(/Invalid file format\. Please upload a JPEG, PNG, or WebP image/i)
    ).toBeInTheDocument();
  });

  it("clears image when Remove Photo button is clicked", async () => {
    const user = userEvent.setup();
    let currentForm: ProfileForm | null = {
      ...mockForm,
      profile_image: "https://example.com/avatar.jpg",
    };
    const setForm = vi.fn((updater) => {
      if (typeof updater === "function") {
        currentForm = updater(currentForm);
      } else {
        currentForm = updater;
      }
    });

    render(
      <DeliveryProfileForm
        profile={mockProfile}
        form={currentForm!}
        setForm={setForm}
        saving={false}
        toggling={false}
        error=""
        imageError={false}
        setImageError={vi.fn()}
        isDirty={true}
        onToggleOnline={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const removeBtn = screen.getByRole("button", { name: /remove photo/i });
    await user.click(removeBtn);

    expect(setForm).toHaveBeenCalled();
    expect(currentForm?.profile_image).toBe("");
  });
});
