import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DesktopUpiQrModal from "@/components/checkout/DesktopUpiQrModal";

describe("DesktopUpiQrModal Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <DesktopUpiQrModal
        isOpen={false}
        amount={150}
        orderId="ord_123456"
        onDismiss={vi.fn()}
      />
    );
    expect(screen.queryByText(/Scan UPI QR Code to Pay/i)).not.toBeInTheDocument();
  });

  it("renders QR code, amount, and official VPA when isOpen is true", () => {
    render(
      <DesktopUpiQrModal
        isOpen={true}
        amount={180.5}
        orderId="ord_789012"
        onDismiss={vi.fn()}
        onOpenRazorpayModal={vi.fn()}
      />
    );

    expect(screen.getByText("Scan UPI QR Code to Pay")).toBeInTheDocument();
    expect(screen.getByText("₹180.50")).toBeInTheDocument();
    expect(screen.getByText("campusbite.ops@okaxis")).toBeInTheDocument();

    const qrImg = screen.getByRole("img", { name: /UPI QR code for order ord_789012/i });
    expect(qrImg).toBeInTheDocument();
    expect(qrImg).toHaveAttribute("src", expect.stringContaining("api.qrserver.com"));
  });

  it("copies VPA to clipboard and updates button text to Copied", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    render(
      <DesktopUpiQrModal
        isOpen={true}
        amount={120}
        orderId="ord_999999"
        onDismiss={vi.fn()}
      />
    );

    const copyBtn = screen.getByRole("button", { name: /Copy/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("campusbite.ops@okaxis");
    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });

  it("calls onOpenRazorpayModal when standard Razorpay button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenRazorpay = vi.fn();

    render(
      <DesktopUpiQrModal
        isOpen={true}
        amount={200}
        orderId="ord_555"
        onDismiss={vi.fn()}
        onOpenRazorpayModal={onOpenRazorpay}
      />
    );

    const razorpayBtn = screen.getByRole("button", {
      name: /Pay via Cards, NetBanking or Razorpay Modal/i,
    });
    await user.click(razorpayBtn);

    expect(onOpenRazorpay).toHaveBeenCalled();
  });

  it("calls onDismiss when close button or cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <DesktopUpiQrModal
        isOpen={true}
        amount={200}
        orderId="ord_555"
        onDismiss={onDismiss}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel & Close/i });
    await user.click(cancelBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole("button", { name: /Close UPI QR modal/i });
    await user.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("calls onDismiss when Escape key is pressed", () => {
    const onDismiss = vi.fn();

    render(
      <DesktopUpiQrModal
        isOpen={true}
        amount={200}
        orderId="ord_555"
        onDismiss={onDismiss}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalled();
  });
});
