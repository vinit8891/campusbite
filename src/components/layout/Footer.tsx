import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <h2 className="text-xl font-bold text-orange-600">
              CampusBite
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              CampusBite connects students with nearby restaurants through
              food ordering, subscriptions, secure payments and fast
              delivery.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-3">Quick Links</h3>

            <div className="flex flex-col gap-2 text-sm">
              <Link href={ROUTES.ABOUT}>About Us</Link>
              <Link href={ROUTES.CONTACT}>Contact Us</Link>
              <Link href={ROUTES.PRIVACY_POLICY}>Privacy Policy</Link>
              <Link href={ROUTES.TERMS}>Terms & Conditions</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-3">Contact</h3>

            <div className="space-y-2 text-sm text-gray-600">
              <p>support@campusbite.in</p>
              <p>+91 XXXXX XXXXX</p>
              <p>India</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-5 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} CampusBite. All rights reserved.
        </div>
      </div>
    </footer>
  );
}