import { Suspense } from "react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-orange-50 px-6 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl text-center">
            <p className="text-gray-500">Loading recovery form...</p>
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
