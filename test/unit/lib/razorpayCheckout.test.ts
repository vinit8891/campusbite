import { describe, it, expect, vi, beforeEach } from "vitest";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";

describe("openRazorpayCheckout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('script[data-campusbite-razorpay="1"]').forEach((el) => el.remove());
    delete (window as unknown as { Razorpay?: unknown }).Razorpay;
  });

  it("accepts live Razorpay keys (rzp_live_) and instantiates Razorpay instance", async () => {
    let capturedOptions: any = null;
    const mockOpen = vi.fn();
    const mockOn = vi.fn();

    class MockRazorpay {
      open = mockOpen;
      on = mockOn;
      constructor(options: any) {
        capturedOptions = options;
      }
    }

    (window as unknown as { Razorpay?: unknown }).Razorpay = MockRazorpay;

    const onSuccess = vi.fn();
    const onDismiss = vi.fn();

    await openRazorpayCheckout({
      keyId: "rzp_live_1234567890abcdef",
      payment: {
        order_id: "order_123",
        razorpay_order_id: "order_rzp_live_123",
        amount: 250,
        amount_paise: 25000,
        currency: "INR",
        payment_status: "pending",
      },
      customerName: "Rahul Sharma",
      customerEmail: "rahul@zeal.edu",
      customerPhone: "9876543210",
      onSuccess,
      onDismiss,
    });

    expect(capturedOptions).toEqual(
      expect.objectContaining({
        key: "rzp_live_1234567890abcdef",
        amount: 25000,
        currency: "INR",
        order_id: "order_rzp_live_123",
        name: "CampusBite",
        prefill: {
          name: "Rahul Sharma",
          email: "rahul@zeal.edu",
          contact: "9876543210",
        },
      })
    );
    expect(mockOpen).toHaveBeenCalled();
  });

  it("accepts test Razorpay keys (rzp_test_)", async () => {
    let capturedOptions: any = null;
    const mockOpen = vi.fn();
    const mockOn = vi.fn();

    class MockRazorpay {
      open = mockOpen;
      on = mockOn;
      constructor(options: any) {
        capturedOptions = options;
      }
    }

    (window as unknown as { Razorpay?: unknown }).Razorpay = MockRazorpay;

    await openRazorpayCheckout({
      keyId: "rzp_test_mock_12345",
      payment: {
        order_id: "order_test_123",
        razorpay_order_id: "order_rzp_test_123",
        amount: 150,
        amount_paise: 15000,
        currency: "INR",
        payment_status: "pending",
      },
      customerName: "Pooja Patil",
      onSuccess: vi.fn(),
      onDismiss: vi.fn(),
    });

    expect(capturedOptions).toEqual(
      expect.objectContaining({
        key: "rzp_test_mock_12345",
        amount: 15000,
      })
    );
    expect(mockOpen).toHaveBeenCalled();
  });

  it("throws error for keys not starting with rzp_live_ or rzp_test_", async () => {
    class MockRazorpay {
      open = vi.fn();
      on = vi.fn();
    }
    (window as unknown as { Razorpay?: unknown }).Razorpay = MockRazorpay;

    await expect(
      openRazorpayCheckout({
        keyId: "invalid_key_prefix_999",
        payment: {
          order_id: "order_bad_key",
          razorpay_order_id: "order_rzp_999",
          amount: 100,
          amount_paise: 10000,
          currency: "INR",
          payment_status: "pending",
        },
        customerName: "Tester",
        onSuccess: vi.fn(),
        onDismiss: vi.fn(),
      })
    ).rejects.toThrow("Invalid Razorpay key format. Key must start with rzp_live_ or rzp_test_.");
  });
});
