"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import {
  User,
  Shield,
  Bell,
  Trash2,
  Lock,
  Phone,
  Mail,
  ShoppingBag,
  Heart,
  Star,
  ExternalLink,
  Edit3,
  CheckCircle,
  AlertCircle,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/lib/routes";
import { clearAuthForRole } from "@/lib/authTokens";
import {
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  deleteCustomerAccount,
  UserProfile,
} from "@/services/userService";

import EditContactModal from "@/components/profile/EditContactModal";
import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";
import CampusAddressCard from "@/components/profile/CampusAddressCard";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoggedIn, login } = useAuth();

  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getCustomerProfile();
      setProfileData(data);
    } catch {
      // Fallback with current session user
      if (user) {
        setProfileData({
          id: "",
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          default_hostel_block: "Hostel Block A",
          default_room: "",
          default_instructions: "",
          notification_preferences: {
            whatsapp_updates: true,
            sms_alerts: true,
            promo_offers: false,
          },
          order_count: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace(ROUTES.LOGIN);
      return;
    }
    fetchProfile();
  }, [isLoggedIn, router, fetchProfile]);

  function showMessage(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }

  // Edit contact handler
  async function handleSaveContact(name: string, phone: string) {
    try {
      setActionLoading(true);
      await updateCustomerProfile({ name, phone });
      setProfileData((prev) => (prev ? { ...prev, name, phone } : prev));
      if (user) {
        const token = localStorage.getItem("token") || "";
        login({ ...user, name, phone }, token);
      }
      showMessage("success", "Contact details updated successfully!");
      setIsEditContactOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update contact";
      showMessage("error", message);
    } finally {
      setActionLoading(false);
    }
  }

  // Save campus address
  async function handleSaveCampusAddress(hostel: string, room: string, instructions: string) {
    try {
      setActionLoading(true);
      await updateCustomerProfile({
        default_hostel_block: hostel,
        default_room: room,
        default_instructions: instructions,
      });
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              default_hostel_block: hostel,
              default_room: room,
              default_instructions: instructions,
            }
          : prev
      );
      // Also update local checkout preferences cache
      try {
        const cachedCheckout = JSON.parse(localStorage.getItem("checkout") || "{}");
        cachedCheckout.hostel_block = hostel;
        cachedCheckout.address = room;
        cachedCheckout.delivery_instructions = instructions;
        localStorage.setItem("checkout", JSON.stringify(cachedCheckout));
      } catch {
        // ignore storage parse errors
      }
      showMessage("success", "Default campus address updated!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update campus address";
      showMessage("error", message);
    } finally {
      setActionLoading(false);
    }
  }

  // Toggle notification preference
  async function handleToggleNotification(key: "whatsapp_updates" | "sms_alerts" | "promo_offers") {
    if (!profileData?.notification_preferences) return;
    const currentPrefs = profileData.notification_preferences;
    const updatedPrefs = {
      ...currentPrefs,
      [key]: !currentPrefs[key],
    };

    setProfileData((prev) => (prev ? { ...prev, notification_preferences: updatedPrefs } : prev));
    try {
      await updateCustomerProfile({ notification_preferences: updatedPrefs });
      showMessage("success", "Notification preferences saved.");
    } catch {
      // Revert on error
      setProfileData((prev) => (prev ? { ...prev, notification_preferences: currentPrefs } : prev));
      showMessage("error", "Failed to update notification settings.");
    }
  }

  // Change password handler
  async function handleChangePassword(currentPass: string, newPass: string) {
    try {
      setActionLoading(true);
      await changeCustomerPassword({
        current_password: currentPass,
        new_password: newPass,
      });
      showMessage("success", "Password changed successfully!");
      setIsChangePasswordOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to change password";
      showMessage("error", message);
    } finally {
      setActionLoading(false);
    }
  }

  // Delete account handler
  async function handleDeleteAccount() {
    try {
      setActionLoading(true);
      await deleteCustomerAccount();
      clearAuthForRole("customer");
      localStorage.clear();
      window.location.href = "/";
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account. You may have active orders.";
      showMessage("error", message);
      setIsDeleteAccountOpen(false);
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-44 rounded-3xl bg-gray-200" />
          <div className="h-12 w-72 rounded-xl bg-gray-200" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-64 rounded-2xl bg-white shadow-sm" />
            <div className="h-64 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </main>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  const initials = (profileData?.name || user.name || "C").trim().charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-medium shadow-sm transition ${
              feedback.type === "success"
                ? "border border-green-200 bg-green-50 text-green-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <p className="flex-1">{feedback.message}</p>
          </div>
        )}

        {/* Hero Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-3xl font-extrabold shadow-inner">
                {initials}
              </div>
              <div>
                <span className="inline-flex rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wide uppercase">
                  Campus Customer
                </span>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {profileData?.name || user.name}
                </h1>
                <p className="mt-1 text-sm text-orange-100">{profileData?.email || user.email}</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                logout();
                router.replace(ROUTES.HOME);
              }}
              className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-orange-600 font-semibold gap-2 self-start sm:self-auto"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </section>

        {/* Tab Segmented Control */}
        <div className="flex rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
              activeTab === "profile"
                ? "bg-orange-500 text-white shadow"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <User className="h-4 w-4" />
            Profile & Delivery
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
              activeTab === "settings"
                ? "bg-orange-500 text-white shadow"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Shield className="h-4 w-4" />
            Settings & Security
          </button>
        </div>

        {/* TAB 1: Profile & Delivery */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Dynamic Stats Grid */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Total Orders</p>
                    <p className="text-2xl font-black text-gray-900">
                      {profileData?.order_count ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-50 p-2.5 text-red-500">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Favorites</p>
                    <p className="text-2xl font-black text-gray-900">4</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-500">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Reviews</p>
                    <p className="text-2xl font-black text-gray-900">2</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Campus Status</p>
                    <p className="text-lg font-bold text-gray-900">Active Member</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Information & Default Address Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Contact Card */}
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Contact Details</h2>
                        <p className="text-xs text-gray-500">Your profile contact info on CampusBite.</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditContactOpen(true)}
                      className="h-8 gap-1.5 text-xs font-semibold"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>

                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400">Full Name</p>
                        <p className="font-semibold text-gray-900">{profileData?.name || user.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400">Email Address</p>
                        <p className="font-semibold text-gray-900 break-all">
                          {profileData?.email || user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400">Mobile Phone</p>
                        <p className="font-semibold text-gray-900">
                          {profileData?.phone || user.phone || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs font-semibold text-gray-700"
                    onClick={() => router.push(ROUTES.MY_ORDERS)}
                  >
                    📦 View All Past Orders ({profileData?.order_count ?? 0})
                  </Button>
                </div>
              </section>

              {/* Default Campus Delivery Address */}
              <CampusAddressCard
                hostelBlock={profileData?.default_hostel_block || "Hostel Block A"}
                room={profileData?.default_room || ""}
                instructions={profileData?.default_instructions || ""}
                loading={actionLoading}
                onSave={handleSaveCampusAddress}
              />
            </div>

            {/* Quick Links Section */}
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Navigation</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  variant="outline"
                  className="h-12 justify-start gap-2 text-sm font-medium hover:border-orange-300 hover:bg-orange-50"
                  onClick={() => router.push(ROUTES.RESTAURANTS)}
                >
                  🍽 Explore Canteens
                </Button>
                <Button
                  variant="outline"
                  className="h-12 justify-start gap-2 text-sm font-medium hover:border-orange-300 hover:bg-orange-50"
                  onClick={() => router.push(ROUTES.MY_ORDERS)}
                >
                  📦 Track Orders
                </Button>
                <Button
                  variant="outline"
                  className="h-12 justify-start gap-2 text-sm font-medium hover:border-orange-300 hover:bg-orange-50"
                  onClick={() => router.push("/subscriptions")}
                >
                  🥗 Meal Subscriptions
                </Button>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: Settings & Security */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Account Security */}
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="rounded-full bg-slate-100 p-2 text-slate-700">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Account Security</h2>
                  <p className="text-xs text-gray-500">Manage password and credentials.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">Password</p>
                  <p className="text-xs text-gray-500">
                    Keep your account secure with a strong password.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="font-semibold text-xs h-9 gap-1.5 self-start sm:self-auto"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Change Password
                </Button>
              </div>
            </section>

            {/* Notification Preferences */}
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Order & Delivery Notifications</h2>
                  <p className="text-xs text-gray-500">Select which updates you want to receive.</p>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Order Status WhatsApp Updates</p>
                    <p className="text-xs text-gray-500">
                      Receive live order status and tracking receipts directly on WhatsApp.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Order Status WhatsApp Updates"
                    checked={profileData?.notification_preferences?.whatsapp_updates ?? true}
                    onChange={() => handleToggleNotification("whatsapp_updates")}
                    className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">SMS Delivery Alerts</p>
                    <p className="text-xs text-gray-500">
                      Get instant SMS notifications when your courier is arriving downstairs.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="SMS Delivery Alerts"
                    checked={profileData?.notification_preferences?.sms_alerts ?? true}
                    onChange={() => handleToggleNotification("sms_alerts")}
                    className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Promotional Offers & Discounts</p>
                    <p className="text-xs text-gray-500">
                      Be notified of student flash sales and campus festival deals.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Promotional Offers & Discounts"
                    checked={profileData?.notification_preferences?.promo_offers ?? false}
                    onChange={() => handleToggleNotification("promo_offers")}
                    className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </div>
              </div>
            </section>

            {/* Legal & Campus Support */}
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3">Legal & Support</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <a
                  href="/terms"
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:bg-orange-50/50"
                >
                  <span>Terms of Service</span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </a>
                <a
                  href="/privacy"
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:bg-orange-50/50"
                >
                  <span>Privacy Policy</span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </a>
                <a
                  href="mailto:support@campusbite.in"
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:bg-orange-50/50"
                >
                  <span>Campus Support Desk</span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </a>
              </div>
            </section>

            {/* Danger Zone: Account Deletion */}
            <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-900">Danger Zone</h2>
                  <p className="text-xs text-red-700">Irreversible actions on your account.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-red-200/70 pt-4">
                <div>
                  <p className="text-sm font-bold text-red-900">Delete Account</p>
                  <p className="text-xs text-red-700 max-w-lg">
                    Permanently delete your profile, saved addresses, and active order records.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => setIsDeleteAccountOpen(true)}
                  className="bg-red-600 text-white hover:bg-red-700 font-semibold text-xs h-9 gap-1.5 self-start sm:self-auto shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Account
                </Button>
              </div>
            </section>
          </div>
        )}

        {/* Modals */}
        <EditContactModal
          isOpen={isEditContactOpen}
          initialName={profileData?.name || user.name || ""}
          initialPhone={profileData?.phone || user.phone || ""}
          loading={actionLoading}
          onSave={handleSaveContact}
          onClose={() => setIsEditContactOpen(false)}
        />

        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          loading={actionLoading}
          onSave={handleChangePassword}
          onClose={() => setIsChangePasswordOpen(false)}
        />

        <DeleteAccountModal
          isOpen={isDeleteAccountOpen}
          userEmail={profileData?.email || user.email || ""}
          loading={actionLoading}
          onConfirm={handleDeleteAccount}
          onClose={() => setIsDeleteAccountOpen(false)}
        />
      </div>
    </main>
  );
}