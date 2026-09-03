import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import ProfilePage from "@/app/profile/page";
import * as userService from "@/services/userService";

const mockUser = {
  name: "Arjun Verma",
  email: "arjun@campus.in",
  phone: "9876543210",
};

const mockLogout = vi.fn();
const mockLogin = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoggedIn: true,
    logout: mockLogout,
    login: mockLogin,
  }),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

describe("ProfilePage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(userService, "getCustomerProfile").mockResolvedValue({
      id: "u123",
      name: "Arjun Verma",
      email: "arjun@campus.in",
      phone: "9876543210",
      default_hostel_block: "Hostel Block B",
      default_room: "Room 302, 3rd Floor",
      default_instructions: "Call when downstairs",
      notification_preferences: {
        whatsapp_updates: true,
        sms_alerts: true,
        promo_offers: false,
      },
      order_count: 8,
    });

    vi.spyOn(userService, "updateCustomerProfile").mockResolvedValue({
      success: true,
      message: "Updated successfully",
    });

    vi.spyOn(userService, "deleteCustomerAccount").mockResolvedValue({
      success: true,
      message: "Account deleted",
    });
  });

  it("renders user information, dynamic order count, and campus delivery card", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Arjun Verma" })).toBeInTheDocument();
      expect(screen.getAllByText("arjun@campus.in")[0]).toBeInTheDocument();
    });

    // Dynamic order counter
    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    // Campus Delivery card
    expect(screen.getByText("Default Campus Delivery Location")).toBeInTheDocument();
    expect(screen.getByText("Hostel Block B")).toBeInTheDocument();
    expect(screen.getByText("Room 302, 3rd Floor")).toBeInTheDocument();
    expect(screen.getByText('"Call when downstairs"')).toBeInTheDocument();
  });

  it("switches to Settings & Security tab and renders notification preferences and Danger Zone", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Arjun Verma" })).toBeInTheDocument();
    });

    const settingsTabBtn = screen.getByRole("button", { name: /settings & security/i });
    fireEvent.click(settingsTabBtn);

    expect(screen.getByText("Account Security")).toBeInTheDocument();
    expect(screen.getByText("Order & Delivery Notifications")).toBeInTheDocument();
    expect(screen.getByText("Legal & Support")).toBeInTheDocument();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
  });

  it("toggles notification preference and calls update service", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Arjun Verma" })).toBeInTheDocument();
    });

    const settingsTabBtn = screen.getByRole("button", { name: /settings & security/i });
    fireEvent.click(settingsTabBtn);

    const whatsappCheckbox = screen.getByLabelText("Order Status WhatsApp Updates") as HTMLInputElement;
    expect(whatsappCheckbox.checked).toBe(true);

    fireEvent.click(whatsappCheckbox);
    await waitFor(() => {
      expect(userService.updateCustomerProfile).toHaveBeenCalledWith({
        notification_preferences: {
          whatsapp_updates: false,
          sms_alerts: true,
          promo_offers: false,
        },
      });
    });
  });

  it("opens delete account modal when clicking Delete Account button", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Arjun Verma" })).toBeInTheDocument();
    });

    const settingsTabBtn = screen.getByRole("button", { name: /settings & security/i });
    fireEvent.click(settingsTabBtn);

    const deleteBtn = screen.getByRole("button", { name: /delete account/i });
    fireEvent.click(deleteBtn);

    expect(
      screen.getByText(/are you sure you want to permanently delete your account/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, delete my account/i })).toBeInTheDocument();
  });
});
