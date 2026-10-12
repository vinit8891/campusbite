import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentSection, { handleOnlinePayment } from "@/components/checkout/PaymentSection";
import * as loadRazorpayModule from "@/lib/loadRazorpay";
import { api } from "@/lib/api";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PaymentSection and handleOnlinePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles online payment initiation and opens Razorpay modal", async () => {
    const mockOpen = vi.fn();
    let capturedOptions: any = null;

    // Mock Razorpay on window
    (window as any).Razorpay = class {
      constructor(options: any) {
        capturedOptions = options;
      }
      open = mockOpen;
    };

    vi.spyOn(loadRazorpayModule, "loadRazorpayScript").mockResolvedValue(true);
    const postSpy = vi.spyOn(api, "post");

    const pushMock = vi.fn();

    await handleOnlinePayment({
      createdOrderId: "660c112233445566778899aa",
      totalAmount: 250,
      user: {
        name: "Rahul Verma",
        email: "rahul@campus.edu",
        phone: "9876543210",
      },
      router: { push: pushMock },
    });

    // Check backend order creation was requested
    expect(postSpy).toHaveBeenCalledWith("/payments/create-order", {
      order_id: "660c112233445566778899aa",
      amount: 250,
    });

    // Check Razorpay modal opened
    expect(mockOpen).toHaveBeenCalled();
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions.order_id).toBe("order_rzp_123");
    expect(capturedOptions.amount).toBe(25000);
    expect(capturedOptions.theme.color).toBe("#f97316");
    expect(capturedOptions.prefill.name).toBe("Rahul Verma");

    // Trigger success handler callback
    await capturedOptions.handler({
      razorpay_order_id: "order_rzp_123",
      razorpay_payment_id: "pay_xyz_999",
      razorpay_signature: "sig_abc_123",
    });

    // Verify verification call
    expect(postSpy).toHaveBeenCalledWith("/payments/verify", {
      razorpay_order_id: "order_rzp_123",
      razorpay_payment_id: "pay_xyz_999",
      razorpay_signature: "sig_abc_123",
      order_id: "660c112233445566778899aa",
    });

    expect(toast.success).toHaveBeenCalledWith("Payment successful!");
    expect(pushMock).toHaveBeenCalledWith("/orders/660c112233445566778899aa/track");
  });

  it("shows error toast when Razorpay SDK fails to load", async () => {
    vi.spyOn(loadRazorpayModule, "loadRazorpayScript").mockResolvedValue(false);

    await handleOnlinePayment({
      createdOrderId: "order-fail",
      totalAmount: 150,
      router: { push: vi.fn() },
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Failed to load Razorpay SDK. Please check your internet connection."
    );
  });

  it("renders PaymentSection UI and triggers pay button", async () => {
    const mockOpen = vi.fn();
    (window as any).Razorpay = class {
      open = mockOpen;
    };
    vi.spyOn(loadRazorpayModule, "loadRazorpayScript").mockResolvedValue(true);

    render(
      <PaymentSection
        orderId="ord-123456"
        totalAmount={320}
        user={{ name: "Priya", email: "priya@campus.edu", phone: "9876543210" }}
      />
    );

    expect(screen.getByText("Online Payment")).toBeInTheDocument();
    const payBtn = screen.getByRole("button", { name: /Pay ₹320.00 via Razorpay/i });
    expect(payBtn).toBeInTheDocument();

    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
    });
  });
});
