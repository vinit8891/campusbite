"use client";

import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import restaurantIcon from "@/assets/maps/restaurant.png";
import bikeIcon from "@/assets/maps/bike.png";
import homeIcon from "@/assets/maps/home.png";

type Props = {
  partnerLat: number | null;
  partnerLng: number | null;

  customerLat: number | null;
  customerLng: number | null;

  restaurantLat: number | null;
  restaurantLng: number | null;
};

const containerStyle = {
  width: "100%",
  height: "500px",
};

export default function LiveTrackingMap({
  partnerLat,
  partnerLng,
  customerLat,
  customerLng,
  restaurantLat,
  restaurantLng,
}: Props) {
  const mapRef =
    useRef<google.maps.Map | null>(null);

  const animationRef =
    useRef<number | undefined>(undefined);

    const previousPosition =
    useRef({
      lat: partnerLat ?? customerLat ?? 0,
      lng: partnerLng ?? customerLng ?? 0,
    });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const prevAuthFailure = (window as any).gm_authFailure;
      (window as any).gm_authFailure = () => {
        console.warn(
          "Google Maps authentication error (e.g. RefererNotAllowedMapError). Falling back to static progress timeline."
        );
        setAuthError(true);
        if (typeof prevAuthFailure === "function") {
          try {
            prevAuthFailure();
          } catch {
            // ignore
          }
        }
      };
    }
  }, []);

  const [directions, setDirections] =
    useState<google.maps.DirectionsResult>();

  const [distance, setDistance] =
    useState("--");

  const [duration, setDuration] =
    useState("--");

    const [animatedPosition, setAnimatedPosition] =
    useState({
      lat: partnerLat ?? customerLat ?? 0,
      lng: partnerLng ?? customerLng ?? 0,
    });

  const [_heading, setHeading] = useState(0);

  // -----------------------------
  // Marker Icons
  // -----------------------------
  const restaurantMarker =
    isLoaded && window.google
      ? {
          url: restaurantIcon.src,
          scaledSize: new google.maps.Size(
            48,
            48
          ),
        }
      : undefined;

  const homeMarker =
    isLoaded && window.google
      ? {
          url: homeIcon.src,
          scaledSize: new google.maps.Size(
            48,
            48
          ),
        }
      : undefined;

  const bikeMarker =
    isLoaded && window.google
      ? {
          url: bikeIcon.src,
          scaledSize: new google.maps.Size(
            52,
            52
          ),
          anchor: new google.maps.Point(
            26,
            26
          ),
        }
      : undefined;

  // -----------------------------
  // Calculate Route
  // -----------------------------
  useEffect(() => {
    if (!isLoaded) return;

    if (
      partnerLat == null ||
      partnerLng == null ||
      customerLat == null ||
      customerLng == null ||
      Number.isNaN(partnerLat) ||
      Number.isNaN(partnerLng) ||
      Number.isNaN(customerLat) ||
      Number.isNaN(customerLng)
    ) {
      return;
    }

    const service =
      new google.maps.DirectionsService();

    service.route(
      {
        origin: {
          lat: partnerLat,
          lng: partnerLng,
        },
        destination: {
          lat: customerLat,
          lng: customerLng,
        },
        travelMode:
          google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (
          status ===
            google.maps.DirectionsStatus.OK &&
          result
        ) {
          setDirections(result);

          const leg =
            result.routes[0].legs[0];

          setDistance(
            leg.distance?.text || "--"
          );

          setDuration(
            leg.duration?.text || "--"
          );
        }
      }
    );
  }, [
    isLoaded,
    partnerLat,
    partnerLng,
    customerLat,
    customerLng,
  ]);

   // -----------------------------
  // Smooth Bike Animation
  // -----------------------------
  useEffect(() => {
    if (
      partnerLat == null ||
      partnerLng == null ||
      Number.isNaN(partnerLat) ||
      Number.isNaN(partnerLng)
    ) {
      return;
    }

    const start =
      previousPosition.current;

    const end = {
      lat: partnerLat,
      lng: partnerLng,
    };

    const angle =
      (Math.atan2(
        end.lng - start.lng,
        end.lat - start.lat
      ) *
        180) /
      Math.PI;

    setHeading(angle);

    let progress = 0;

    if (animationRef.current) {
      cancelAnimationFrame(
        animationRef.current
      );
    }

    function animate() {
      progress += 0.03;

      if (progress > 1)
        progress = 1;

      const next = {
        lat:
          start.lat +
          (end.lat - start.lat) *
            progress,

        lng:
          start.lng +
          (end.lng - start.lng) *
            progress,
      };

      setAnimatedPosition(next);

      mapRef.current?.panTo(next);

      if (progress < 1) {
        animationRef.current =
          requestAnimationFrame(
            animate
          );
      } else {
        previousPosition.current =
          end;
      }
    }

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [partnerLat, partnerLng]);

  if (loadError || authError || !apiKey) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 text-lg">
              🛵
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Live Delivery Progress</h3>
              <p className="text-xs text-stone-500">Real-time status updates from your courier</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            Active
          </span>
        </div>

        {/* Clean Static Stepper Timeline */}
        <div className="py-2">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                ✓
              </div>
              <span className="text-stone-900 font-bold text-[11px]">Order Placed</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                ✓
              </div>
              <span className="text-stone-900 font-bold text-[11px]">Preparing</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold shadow-2xs animate-pulse ring-4 ring-amber-100">
                ●
              </div>
              <span className="text-amber-700 font-extrabold text-[11px]">Out for Delivery</span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-400 text-xs font-medium border border-stone-200">
                ○
              </div>
              <span className="text-stone-400 font-medium text-[11px]">Delivered</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200/70 text-xs text-amber-900 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📍</span>
            <p className="leading-snug">
              Courier is heading towards your campus drop point. Have your phone ready for arrival call.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-500">
        Loading live map...
      </div>
    );
  }

  if (
    customerLat == null ||
    customerLng == null ||
    Number.isNaN(customerLat) ||
    Number.isNaN(customerLng)
  ) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-xs text-stone-500">
        Customer location coordinates not available.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-orange-100 p-5">
          <p className="text-sm text-gray-500">
            Remaining Distance
          </p>

          <h2 className="text-2xl font-bold text-orange-600">
            📍 {distance}
          </h2>
        </div>

        <div className="rounded-xl bg-green-100 p-5">
          <p className="text-sm text-gray-500">
            Estimated Arrival
          </p>

          <h2 className="text-2xl font-bold text-green-600">
            ⏱ {duration}
          </h2>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={
          containerStyle
        }
        center={
          partnerLat != null &&
          partnerLng != null
            ? {
                lat: partnerLat,
                lng: partnerLng,
              }
            : {
                lat: customerLat,
                lng: customerLng,
              }
        }
        zoom={15}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
        }}
      >
        {restaurantLat != null &&
          restaurantLng != null && (
            <Marker
              position={{
                lat: restaurantLat,
                lng: restaurantLng,
              }}
              icon={restaurantMarker}
            />
          )}

        <Marker
          position={animatedPosition}
          icon={bikeMarker}
        />

        <Marker
          position={{
            lat: customerLat,
            lng: customerLng,
          }}
          icon={homeMarker}
        />

        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor:
                  "#ff6b00",
                strokeOpacity: 0.9,
                strokeWeight: 6,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}