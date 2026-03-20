"use client"

import { useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { UnifiedHotelResult } from "@/types/travel"

// Fix Leaflet default marker icons in Next.js bundling
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface HotelMapViewProps {
  hotels: UnifiedHotelResult[]
}

export function HotelMapView({ hotels }: HotelMapViewProps) {
  const mappable = useMemo(
    () => hotels.filter((h) => h.latitude != null && h.longitude != null),
    [hotels],
  )

  const bounds = useMemo(() => {
    if (mappable.length === 0) return null
    return L.latLngBounds(
      mappable.map((h) => [h.latitude!, h.longitude!] as [number, number]),
    )
  }, [mappable])

  if (mappable.length === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="material-symbols-rounded text-foreground-muted/30 mb-2 block" style={{ fontSize: 36 }}>
          map
        </span>
        <p className="text-sm text-foreground-muted">No hotels have location data for the map view.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-card-border" style={{ height: 500 }}>
      <MapContainer
        bounds={bounds!}
        boundsOptions={{ padding: [40, 40] }}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappable.map((hotel) => (
          <Marker
            key={hotel.id}
            position={[hotel.latitude!, hotel.longitude!]}
            icon={defaultIcon}
          >
            <Popup>
              <MarkerPopup hotel={hotel} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

function MarkerPopup({ hotel }: { hotel: UnifiedHotelResult }) {
  const hasCash = hotel.cashPerNight != null && hotel.cashPerNight > 0
  const hasPoints = hotel.pointsPerNight != null && hotel.pointsPerNight > 0
  const bookingLink = hotel.bookingLinks[0]

  return (
    <div className="min-w-[180px] text-xs">
      <p className="font-bold text-sm mb-1">{hotel.name}</p>
      {hotel.overallRating > 0 && (
        <p className="text-foreground-muted mb-1">
          {hotel.overallRating.toFixed(1)} rating
          {hotel.reviews > 0 && ` (${hotel.reviews.toLocaleString()} reviews)`}
        </p>
      )}
      {hasCash && (
        <p className="font-semibold">${hotel.cashPerNight!.toLocaleString()}/night</p>
      )}
      {hasPoints && (
        <p className="text-amber-600 font-semibold">
          {hotel.pointsPerNight!.toLocaleString()} pts/night
        </p>
      )}
      {bookingLink && (
        <a
          href={bookingLink.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline mt-1 inline-block"
        >
          Book on {bookingLink.source}
        </a>
      )}
    </div>
  )
}
