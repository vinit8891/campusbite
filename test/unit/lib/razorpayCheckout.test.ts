import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  openRazorpayCheckout,
  buildUpiIntentUrl,
  triggerUpiOrRazorpayCheckout,
  CAMPUSBITE_DEFAULT_UPI_ID,
} from "@/lib/razorpayCheckout";

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

  it("passes razorpayOrder.id, amount in paise, and key_id to Razorpay options and triggers onDismiss", async () => {
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

    const onDismiss = vi.fn();
    await openRazorpayCheckout({
      keyId: "rzp_test_sampleKey99",
      payment: {
        order_id: "cb_order_99",
        razorpayOrder: { id: "order_rzp_order_99" },
        amount_paise: 9900,
        currency: "INR",
        key_id: "rzp_test_sampleKey99",
      },
      customerName: "Vinit Patil",
      onSuccess: vi.fn(),
      onDismiss,
    });

    expect(capturedOptions.order_id).toBe("order_rzp_order_99");
    expect(capturedOptions.amount).toBe(9900);
    expect(capturedOptions.key).toBe("rzp_test_sampleKey99");
    expect(capturedOptions.key_id).toBe("rzp_test_sampleKey99");
    expect(mockOpen).toHaveBeenCalled();

    // Trigger ondismiss
    capturedOptions.modal.ondismiss();
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("buildUpiIntentUrl", () => {
  it("generates valid phonepe:// intent URL with correct VPA, amount, and note", () => {
    const url = buildUpiIntentUrl({
      amount: 146.5,
      orderId: "660c112233445566778899aa",
      app: "phonepe",
    });

    expect(url).toMatch(/^phonepe:\/\/pay\?/);
    expect(url).toContain(`pa=${CAMPUSBITE_DEFAULT_UPI_ID}`);
    expect(url).toContain("am=146.50");
    expect(url).toContain("cu=INR");
    expect(url).toContain("tn=CB-Order-8899AA");
  });

  it("generates generic upi:// intent URL by default", () => {
    const url = buildUpiIntentUrl({
      amount: 250,
      orderId: "order_abc123",
      vpa: "custom.merchant@okhdfcbank",
    });

    expect(url).toMatch(/^upi:\/\/pay\?/);
    expect(url).toContain("pa=custom.merchant@okhdfcbank");
    expect(url).toContain("am=250.00");
  });
});

describe("triggerUpiOrRazorpayCheckout (Mobile intent vs Desktop fallback)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { Razorpay?: unknown }).Razorpay;
  });

  const samplePayment = {
    order_id: "order_456",
    razorpay_order_id: "rzp_order_456",
    amount: 120.9,
    amount_paise: 12090,
    currency: "INR",
    payment_status: "pending",
  };

  it("on mobile devices: opens direct UPI app intent link", async () => {
    const mobileUserAgent =
      "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";

    const intentUrl = "phonepe://pay?pa=campusbite.ops@okaxis&am=120.90&cu=INR";
    const onSuccess = vi.fn();
    const onDismiss = vi.fn();

    const result = await triggerUpiOrRazorpayCheckout({
      keyId: "rzp_test_12345",
      payment: samplePayment,
      customerName: "Mobile User",
      upiIntentUrl: intentUrl,
      customUserAgent: mobileUserAgent,
      onSuccess,
      onDismiss,
    });

    expect(result.mode).toBe("mobile_intent");
    expect(result.intentUrl).toBe(intentUrl);
  });

  it("on desktop/PC browsers: avoids opening raw phonepe:// scheme and falls back to standard Razorpay modal", async () => {
    const desktopUserAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36";

    let capturedOptions: any = null;
    const mockOpen = vi.fn();
    class MockRazorpay {
      open = mockOpen;
      on = vi.fn();
      constructor(options: any) {
        capturedOptions = options;
      }
    }
    (window as unknown as { Razorpay?: unknown }).Razorpay = MockRazorpay;

    const intentUrl = "phonepe://pay?pa=campusbite.ops@okaxis&am=120.90&cu=INR";
    const onDismiss = vi.fn();

    const result = await triggerUpiOrRazorpayCheckout({
      keyId: "rzp_test_12345",
      payment: samplePayment,
      customerName: "Desktop User",
      upiIntentUrl: intentUrl,
      customUserAgent: desktopUserAgent,
      onSuccess: vi.fn(),
      onDismiss,
    });

    expect(result.mode).toBe("razorpay_modal");
    expect(mockOpen).toHaveBeenCalled();
    expect(capturedOptions.order_id).toBe("rzp_order_456");

    // Test dismissal invokes onDismiss callback cleanly
    capturedOptions.modal.ondismiss();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("on desktop/PC browsers: invokes onFallbackToDesktopModal when provided", async () => {
    const desktopUserAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36";

    const onFallbackToDesktopModal = vi.fn();
    const intentUrl = "phonepe://pay?pa=campusbite.ops@okaxis&am=120.90&cu=INR";

    const result = await triggerUpiOrRazorpayCheckout({
      keyId: "rzp_test_12345",
      payment: samplePayment,
      customerName: "Desktop Mac User",
      upiIntentUrl: intentUrl,
      customUserAgent: desktopUserAgent,
      onFallbackToDesktopModal,
      onSuccess: vi.fn(),
      onDismiss: vi.fn(),
    });

    expect(result.mode).toBe("desktop_qr_modal");
    expect(onFallbackToDesktopModal).toHaveBeenCalled();
  });
});

