import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const careseekerIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "careseeker-marker",
});

function LeafletMap({ caregivers, careseekerLocation }) {
  const fallbackCenter = [6.9271, 79.8612];
  const center = careseekerLocation
    ? [careseekerLocation.lat, careseekerLocation.lng]
    : caregivers[0]
      ? [caregivers[0].lat, caregivers[0].lng]
      : fallbackCenter;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {careseekerLocation && (
        <Marker
          position={[careseekerLocation.lat, careseekerLocation.lng]}
          icon={careseekerIcon}
        >
          <Popup>Your current location</Popup>
        </Marker>
      )}

      {caregivers.map((caregiver) => (
        <Marker
          key={caregiver._id}
          position={[caregiver.lat, caregiver.lng]}
        >
          <Popup>
            <div>
              <strong>{caregiver.name}</strong>
              {caregiver.distanceKm !== undefined && caregiver.distanceKm !== null && (
                <div>{caregiver.distanceKm} km away</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default LeafletMap;
