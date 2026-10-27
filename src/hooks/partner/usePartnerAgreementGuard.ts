"use client";

import { useEffect, useState, useCallback } from "react";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { authJson, publicJson } from "@/services/authFetch";
import { getRestaurantByEmail } from "@/services/restaurantService";

export interface AgreementGuardState {
  isChecking: boolean;
  isAgreementSigned: boolean;
  showModal: boolean;
  canteenId: string;
  canteenName: string;
  initialFssai: string;
  initialPhone: string;
  initialSignatory: string;
  checkAgreementStatus: () => Promise<void>;
  handleAgreementSuccess: () => void;
}

export function usePartnerAgreementGuard(): AgreementGuardState {
  const [isChecking, setIsChecking] = useState(true);
  const [isAgreementSigned, setIsAgreementSigned] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [canteenId, setCanteenId] = useState("");
  const [canteenName, setCanteenName] = useState("");
  const [initialFssai, setInitialFssai] = useState("");
  const [initialPhone, setInitialPhone] = useState("");
  const [initialSignatory, setInitialSignatory] = useState("");

  const checkAgreementStatus = useCallback(async () => {
    setIsChecking(true);
    const email = getRestaurantOwnerEmail();
    if (!email) {
      setIsChecking(false);
      return;
    }

    try {
      // 1. First attempt dedicated agreement status API
      const statusData = await authJson<{
        agreement_signed: boolean;
        canteen_id?: string;
        canteen_name?: string;
        fssai_number?: string;
      }>("/api/partner/agreement-status", {
        role: "restaurant_owner",
        cache: "no-store",
      }).catch(async () => {
        // Fallback to alias route
        return await publicJson<{
          agreement_signed: boolean;
          canteen_id?: string;
          canteen_name?: string;
          fssai_number?: string;
        }>(`/partner/agreement-status?canteen_id=${encodeURIComponent(email)}`, {
          cache: "no-store",
        });
      });

      if (statusData && typeof statusData.agreement_signed === "boolean") {
        const signed = statusData.agreement_signed;
        setIsAgreementSigned(signed);
        setShowModal(!signed);
        if (statusData.canteen_id) setCanteenId(statusData.canteen_id);
        if (statusData.canteen_name) setCanteenName(statusData.canteen_name);
        if (statusData.fssai_number) setInitialFssai(statusData.fssai_number);
      } else {
        // Fallback to restaurant profile inspection
        const rest = await getRestaurantByEmail(email);
        if (rest) {
          const signed = Boolean(rest.agreement_signed);
          setIsAgreementSigned(signed);
          setShowModal(!signed);
          setCanteenId(rest._id || rest.email || email);
          setCanteenName(rest.name || "Canteen Partner");
          if (rest.phone) setInitialPhone(rest.phone);
          if (rest.fssai_number) setInitialFssai(rest.fssai_number);
          const ownerName = (rest as { owner_name?: string }).owner_name;
          if (ownerName) setInitialSignatory(ownerName);
        }
      }
    } catch {
      // Profile fallback
      try {
        const rest = await getRestaurantByEmail(email);
        if (rest) {
          const signed = Boolean(rest.agreement_signed);
          setIsAgreementSigned(signed);
          setShowModal(!signed);
          setCanteenId(rest._id || rest.email || email);
          setCanteenName(rest.name || "Canteen Partner");
          if (rest.phone) setInitialPhone(rest.phone);
          const ownerName = (rest as { owner_name?: string }).owner_name;
          if (ownerName) setInitialSignatory(ownerName);
        }
      } catch {
        // Fail-safe default
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAgreementStatus();
  }, [checkAgreementStatus]);

  const handleAgreementSuccess = useCallback(() => {
    setIsAgreementSigned(true);
    setShowModal(false);
  }, []);

  return {
    isChecking,
    isAgreementSigned,
    showModal,
    canteenId,
    canteenName,
    initialFssai,
    initialPhone,
    initialSignatory,
    checkAgreementStatus,
    handleAgreementSuccess,
  };
}
