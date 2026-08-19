type DeliveryOtpModalProps = {
  isOpen: boolean;
  otp: string;
  setOtp: (val: string) => void;
  verifying: boolean;
  otpError: string;
  onVerify: () => void;
  onClose: () => void;
};

export function DeliveryOtpModal({
  isOpen,
  otp,
  setOtp,
  verifying,
  otpError,
  onVerify,
  onClose,
}: DeliveryOtpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-2xl font-bold">
          🔐 Verify Delivery OTP
        </h2>

        <p className="mb-4 text-gray-600">
          Ask the customer for the 4-digit OTP.
        </p>

        <input
          type="text"
          maxLength={4}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full rounded-lg border p-3 text-center text-2xl tracking-widest"
          placeholder="1234"
        />

        {otpError && (
          <p className="mt-3 text-red-600">{otpError}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border py-3"
          >
            Cancel
          </button>

          <button
            onClick={onVerify}
            disabled={verifying || otp.length !== 4}
            className="flex-1 rounded-lg bg-green-600 py-3 text-white disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Verify OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}
