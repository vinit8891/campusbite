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

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

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

  const [heading, setHeading] =
    useState(0);

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

  if (!isLoaded) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-xl border">
        Loading Google Maps...
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
      <div className="flex h-[500px] items-center justify-center rounded-xl border">
        Customer location unavailable.
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