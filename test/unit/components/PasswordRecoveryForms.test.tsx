import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import * as authService from "@/services/authService";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Password Recovery Forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe("ForgotPasswordForm", () => {
    it("renders role selector and email input with proper accessible labels", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByRole("heading", { name: /Reset Password/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Customer" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Restaurant" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delivery" })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Send Reset Link/i })).toBeInTheDocument();
    });

    it("preselects role based on query parameter", () => {
      mockSearchParams = new URLSearchParams("role=restaurant_owner");
      render(<ForgotPasswordForm />);

      const restaurantBtn = screen.getByRole("button", { name: "Restaurant" });
      expect(restaurantBtn.className).toContain("text-orange-600");
    });

    it("displays error on invalid email address", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.type(emailInput, "not-an-email");

      const submitBtn = screen.getByRole("button", { name: /Send Reset Link/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/Please enter a valid email address/i);
      });
    });

    it("submits request successfully and shows confirmation UI", async () => {
      const user = userEvent.setup();
      vi.spyOn(authService, "requestPasswordReset").mockResolvedValueOnce({
        message: "If an account exists with this email, a password reset link has been sent.",
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.type(emailInput, "validuser@example.com");

      const submitBtn = screen.getByRole("button", { name: /Send Reset Link/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Check Your Email/i })).toBeInTheDocument();
        expect(screen.getByText(/validuser@example.com/i)).toBeInTheDocument();
      });
    });
  });

  describe("ResetPasswordForm", () => {
    it("displays invalid link state when token is missing", () => {
      mockSearchParams = new URLSearchParams();
      render(<ResetPasswordForm />);

      expect(screen.getByRole("heading", { name: /Invalid Reset Link/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Request New Link/i })).toBeInTheDocument();
    });

    it("renders password inputs when token is provided", () => {
      mockSearchParams = new URLSearchParams("token=valid-jwt-token&role=customer");
      render(<ResetPasswordForm />);

      expect(screen.getByRole("heading", { name: /New Password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Update Password/i })).toBeInTheDocument();
    });

    it("validates password length and mismatch", async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams("token=valid-jwt-token&role=customer");
      render(<ResetPasswordForm />);

      const newPassInput = screen.getByLabelText(/^New Password$/i);
      const confirmPassInput = screen.getByLabelText(/Confirm New Password/i);
      const submitBtn = screen.getByRole("button", { name: /Update Password/i });

      // Test short password
      await user.type(newPassInput, "short");
      await user.type(confirmPassInput, "short");
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/at least 8 characters/i);
      });

      // Test mismatch
      await user.clear(newPassInput);
      await user.clear(confirmPassInput);
      await user.type(newPassInput, "ValidPassword123!");
      await user.type(confirmPassInput, "DifferentPass123!");
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/Passwords do not match/i);
      });
    });

    it("submits password reset and renders success feedback", async () => {
      const user = userEvent.setup();
      vi.spyOn(authService, "resetPassword").mockResolvedValueOnce({
        message: "Password reset successfully. You can now log in with your new password.",
      });

      mockSearchParams = new URLSearchParams("token=valid-jwt-token&role=restaurant_owner");
      render(<ResetPasswordForm />);

      const newPassInput = screen.getByLabelText(/^New Password$/i);
      const confirmPassInput = screen.getByLabelText(/Confirm New Password/i);
      const submitBtn = screen.getByRole("button", { name: /Update Password/i });

      await user.type(newPassInput, "NewSecurePassword123!");
      await user.type(confirmPassInput, "NewSecurePassword123!");
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Password Reset Complete/i })).toBeInTheDocument();
      });
    });
  });
});
