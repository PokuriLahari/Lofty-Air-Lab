/// <reference types="google.maps" />
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  RenderingType,
  useMap,
  useMapsLibrary,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Wind,
  X,
} from 'lucide-react';
import type {
  AlertChannel,
  LatLngPoint,
  LocalAirReading,
  SmogAlertSubscription,
} from '../types/air';
import { shouldTriggerSmogAlert, validateAlertSubscriptionInput } from '../utils/alertLogic';
import { resolveNearestKnownCity } from '../utils/verdictRules';

interface SmogAlertModalProps {
  open: boolean;
  mapsApiKey: string;
  mapsConfigured: boolean;
  existingSubscription: SmogAlertSubscription | null;
  defaultLocationQuery: string;
  onClose: () => void;
  onSaveSubscription: (subscription: SmogAlertSubscription, triggerBanner: boolean) => void;
  onDisableSubscription: () => void;
  onTestAlert: (subscription: SmogAlertSubscription, reading: LocalAirReading | null) => void;
}

const DEFAULT_INDIA_CENTER: LatLngPoint = { lat: 28.5355, lng: 77.251 };

function dispatchQuotaExceededIfNeeded(status: number, dataOrErr: unknown): boolean {
  if (status === 429) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  if (
    dataOrErr &&
    typeof dataOrErr === 'object' &&
    (dataOrErr as { quotaExceeded?: unknown }).quotaExceeded === true
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  const text =
    typeof dataOrErr === 'string'
      ? dataOrErr
      : dataOrErr instanceof Error
        ? dataOrErr.message
        : typeof (dataOrErr as { error?: unknown } | null)?.error === 'string'
          ? String((dataOrErr as { error: string }).error)
          : '';
  if (/RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|QuotaExceededError|OverQuotaMapError/i.test(text)) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

interface PlacesSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSelectResolvedPlace: (place: {
    locationLabel: string;
    placeId?: string;
    lat: number;
    lng: number;
  }) => void;
  onGeocodeFallback: (address: string) => void;
  isBusy: boolean;
}

function PlacesSearchBar({
  query,
  onQueryChange,
  onSelectResolvedPlace,
  onGeocodeFallback,
  isBusy,
}: PlacesSearchBarProps) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setDropdownOpen(false);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!placesLib || trimmed.length < 3 || !dropdownOpen) {
      if (trimmed.length < 3) setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        setIsSearching(true);
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['in'],
        });
        setSuggestions(res?.suggestions ?? []);
      } catch (err) {
        dispatchQuotaExceededIfNeeded(0, err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, [placesLib, query, dropdownOpen]);

  const handlePickSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      const loc = place.location;
      const lat = typeof loc?.lat === 'function' ? loc.lat() : Number(loc?.lat);
      const lng = typeof loc?.lng === 'function' ? loc.lng() : Number(loc?.lng);
      const label =
        place.formattedAddress ||
        place.displayName ||
        suggestion.placePrediction.text.text ||
        query.trim();

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        onQueryChange(label);
        onSelectResolvedPlace({
          locationLabel: label,
          placeId: place.id,
          lat,
          lng,
        });
      }
      resetSession();
    } catch (err) {
      dispatchQuotaExceededIfNeeded(0, err);
      onGeocodeFallback(suggestion.placePrediction.text.text || query);
      resetSession();
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setDropdownOpen(false);
    onGeocodeFallback(query.trim());
  };

  return (
    <form onSubmit={handleSearchSubmit} className="relative">
      <label
        htmlFor="smog-alert-location-search"
        className="mb-1.5 block text-xs font-extrabold tracking-wide text-[#111111] uppercase"
      >
        Search Your Society, Sector, or City
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#444444]"
            aria-hidden="true"
          />
          <input
            id="smog-alert-location-search"
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              if (query.trim().length >= 3) setDropdownOpen(true);
            }}
            placeholder="e.g., Sector 56 Gurugram, Powai Mumbai, Noida 62"
            autoComplete="off"
            className="w-full rounded-xl border-2 border-[#111111] bg-white py-2.5 pr-4 pl-10 text-sm font-semibold text-[#111111] outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isBusy || query.trim().length < 2}
          className="shrink-0 rounded-xl border-2 border-[#111111] bg-[#FFE14D] px-4 py-2.5 text-xs font-extrabold text-[#111111] transition-colors hover:bg-[#C8F542] disabled:opacity-50"
        >
          {isSearching || isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <span>Find Pin</span>
          )}
        </button>
      </div>

      {dropdownOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Matching places"
          className="absolute right-0 left-0 z-30 mt-1.5 max-h-48 overflow-y-auto rounded-2xl border-2 border-[#111111] bg-white p-1.5 shadow-[5px_5px_0px_#111111]"
        >
          {suggestions.map((suggestion, idx) => {
            const label = suggestion.placePrediction?.text.text ?? '';
            if (!label) return null;
            return (
              <li key={suggestion.placePrediction?.placeId || idx}>
                <button
                  type="button"
                  onClick={() => void handlePickSuggestion(suggestion)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-[#111111] transition-colors hover:bg-[#FFE14D]"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#3B66FF]" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}

function MapCameraSync({ center }: { center: LatLngPoint }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo(center);
  }, [map, center.lat, center.lng]);
  return null;
}

export function SmogAlertModal({
  open,
  mapsApiKey,
  mapsConfigured,
  existingSubscription,
  defaultLocationQuery,
  onClose,
  onSaveSubscription,
  onDisableSubscription,
  onTestAlert,
}: SmogAlertModalProps) {
  const [searchQuery, setSearchQuery] = useState(
    existingSubscription?.locationLabel || defaultLocationQuery || 'Gurugram, Haryana'
  );
  const [selectedLabel, setSelectedLabel] = useState(
    existingSubscription?.locationLabel || defaultLocationQuery || 'Gurugram / Delhi NCR'
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(
    existingSubscription?.placeId
  );
  const [pinPos, setPinPos] = useState<LatLngPoint>(
    existingSubscription
      ? { lat: existingSubscription.lat, lng: existingSubscription.lng }
      : DEFAULT_INDIA_CENTER
  );
  const [thresholdAqi, setThresholdAqi] = useState<number>(
    existingSubscription?.thresholdAqi || 151
  );
  const [channel, setChannel] = useState<AlertChannel>(
    existingSubscription?.channel || 'browser_push'
  );
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  const [reading, setReading] = useState<LocalAirReading | null>(
    existingSubscription?.lastReading ?? null
  );
  const [isCheckingAqi, setIsCheckingAqi] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const fetchAirQualityForCoords = useCallback(
    async (lat: number, lng: number, labelHint?: string) => {
      setIsCheckingAqi(true);
      setErrorMessage(null);
      try {
        const response = await fetch('/api/air-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, locationLabel: labelHint || selectedLabel }),
        });
        const data = await response.json();
        if (!response.ok) {
          dispatchQuotaExceededIfNeeded(response.status, data);
          setErrorMessage(data.error || 'Could not fetch live air reading for this pin.');
          return null;
        }
        const nextReading = data as LocalAirReading;
        setReading(nextReading);
        return nextReading;
      } catch (err) {
        dispatchQuotaExceededIfNeeded(0, err);
        setErrorMessage('Could not check live local air right now.');
        return null;
      } finally {
        setIsCheckingAqi(false);
      }
    },
    [selectedLabel]
  );

  const geocodeAddress = useCallback(
    async (address: string) => {
      if (address.trim().length < 2) return;
      setIsLocating(true);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        if (!res.ok) {
          dispatchQuotaExceededIfNeeded(res.status, data);
          setErrorMessage(data.error || 'Could not locate that area on the map.');
          return;
        }
        const nextPin = { lat: data.lat, lng: data.lng };
        const resolvedLabel = data.formattedAddress || address;
        setPinPos(nextPin);
        setSelectedLabel(resolvedLabel);
        setSearchQuery(resolvedLabel);
        setSelectedPlaceId(data.placeId || undefined);
        await fetchAirQualityForCoords(nextPin.lat, nextPin.lng, resolvedLabel);
      } catch (err) {
        dispatchQuotaExceededIfNeeded(0, err);
        setErrorMessage('Location lookup failed. Please try another sector or city.');
      } finally {
        setIsLocating(false);
      }
    },
    [fetchAirQualityForCoords]
  );

  // Sync fresh props & run initial live air lookup when modal opens
  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    setStatusNote(null);
    setPushStatus(
      typeof window !== 'undefined' && 'Notification' in window
        ? window.Notification.permission
        : 'unsupported'
    );
    window.setTimeout(() => closeBtnRef.current?.focus(), 60);

    if (mapsConfigured) {
      if (existingSubscription) {
        setPinPos({ lat: existingSubscription.lat, lng: existingSubscription.lng });
        setSelectedLabel(existingSubscription.locationLabel);
        setSearchQuery(existingSubscription.locationLabel);
        void fetchAirQualityForCoords(existingSubscription.lat, existingSubscription.lng);
      } else {
        void geocodeAddress(defaultLocationQuery || 'Gurugram, Haryana');
      }
    }
  }, [open, mapsConfigured]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleUseMyLocation = () => {
    setErrorMessage(null);
    setStatusNote(null);
    if (!navigator.geolocation) {
      setErrorMessage('Location detection is not supported in this browser. Please search above.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPinPos({ lat, lng });

        try {
          const res = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
          });
          const data = await res.json();
          if (res.ok && data.formattedAddress) {
            setSelectedLabel(data.formattedAddress);
            setSearchQuery(data.formattedAddress);
            setSelectedPlaceId(data.placeId || undefined);
          } else {
            dispatchQuotaExceededIfNeeded(res.status, data);
            setSelectedLabel(resolveNearestKnownCity(lat, lng));
          }
        } catch {
          setSelectedLabel(resolveNearestKnownCity(lat, lng));
        }

        await fetchAirQualityForCoords(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage(
            'GPS permission was declined. Type your sector or click directly on the map instead.'
          );
        } else {
          setErrorMessage('Could not detect GPS location right now. Type your sector or click the map.');
        }
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const handleMapClick = async (ev: MapMouseEvent) => {
    const latLng = ev.detail.latLng;
    if (!latLng) return;
    const nextPin = { lat: latLng.lat, lng: latLng.lng };
    setPinPos(nextPin);
    setErrorMessage(null);

    setIsLocating(true);
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPin),
      });
      const data = await res.json();
      if (res.ok && data.formattedAddress) {
        setSelectedLabel(data.formattedAddress);
        setSearchQuery(data.formattedAddress);
        setSelectedPlaceId(data.placeId || undefined);
      } else {
        dispatchQuotaExceededIfNeeded(res.status, data);
        setSelectedLabel(resolveNearestKnownCity(nextPin.lat, nextPin.lng));
      }
    } catch {
      setSelectedLabel(resolveNearestKnownCity(nextPin.lat, nextPin.lng));
    }
    await fetchAirQualityForCoords(nextPin.lat, nextPin.lng);
    setIsLocating(false);
  };

  const handleRequestBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushStatus('unsupported');
      setStatusNote('Browser notifications are unavailable here—In-App Alerts will still warn you.');
      return 'unsupported' as const;
    }

    try {
      const perm = await window.Notification.requestPermission();
      setPushStatus(perm);
      if (perm === 'granted') {
        setStatusNote('Browser alerts allowed! We will warn you immediately on heavy smog days.');
      } else if (perm === 'denied') {
        setStatusNote('Browser push is blocked in settings—we will show urgent in-app alerts instead.');
      }
      return perm;
    } catch {
      setStatusNote('Could not open browser notification prompt—In-App Alert stays active.');
      return pushStatus;
    }
  };

  const buildSubscriptionObject = (
    perm: NotificationPermission | 'unsupported',
    latestReading: LocalAirReading | null
  ): SmogAlertSubscription => ({
    id: existingSubscription?.id || `sub-${Date.now()}`,
    locationLabel: selectedLabel.trim() || searchQuery.trim() || 'My Society Area',
    placeId: selectedPlaceId,
    lat: pinPos.lat,
    lng: pinPos.lng,
    thresholdAqi,
    channel,
    pushPermission: perm,
    enabled: true,
    updatedAt: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
    lastReading: latestReading ?? undefined,
  });

  const handleSaveAlert = async () => {
    setErrorMessage(null);
    const labelToSave = selectedLabel.trim() || searchQuery.trim();
    const validation = validateAlertSubscriptionInput({
      locationLabel: labelToSave,
      lat: pinPos.lat,
      lng: pinPos.lng,
      thresholdAqi,
      channel,
    });
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Please pick a valid neighborhood first.');
      return;
    }

    setIsSaving(true);
    let perm = pushStatus;
    if (channel === 'browser_push' && perm === 'default') {
      perm = await handleRequestBrowserPush();
    }

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: existingSubscription?.id,
          locationLabel: labelToSave,
          placeId: selectedPlaceId,
          lat: pinPos.lat,
          lng: pinPos.lng,
          thresholdAqi,
          channel,
          pushPermission: perm,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not save alert settings.');
      }
      if (data.quotaExceeded) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      const saved = (data.subscription as SmogAlertSubscription) ?? buildSubscriptionObject(perm, reading);
      if (saved.lastReading) setReading(saved.lastReading);
      const crossed = Boolean(data.shouldAlertNow) || shouldTriggerSmogAlert(saved.lastReading, thresholdAqi, true);
      onSaveSubscription(saved, crossed);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save alert right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    let perm = pushStatus;
    if (channel === 'browser_push' && perm === 'default') {
      perm = await handleRequestBrowserPush();
    }
    const draft = buildSubscriptionObject(perm, reading);
    onTestAlert(draft, reading);
    setStatusNote('Test alert sent! Check the top alert banner (and desktop notification if allowed).');
  };

  const isCurrentlyOverLimit = shouldTriggerSmogAlert(reading, thresholdAqi, true);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="smog-alert-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/65 p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border-2 border-[#111111] bg-[#F7F5EE] p-5 shadow-[10px_10px_0px_#111111] sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#111111]/15 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[#3B66FF] uppercase">
              <BellRing className="h-4 w-4" aria-hidden="true" />
              <span>Extreme Smog Alert Setup</span>
            </div>
            <h2
              id="smog-alert-modal-title"
              className="font-display-tight text-2xl font-extrabold text-[#111111] sm:text-3xl"
            >
              Get warned before heavy smog hits your area
            </h2>
            <p className="text-xs font-medium text-[#4A4E57] sm:text-sm">
              Pin your society or sector below. Get an instant alert when outside air turns unsafe so
              you can shut balcony doors and protect kids &amp; parents.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close smog alert setup"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#111111] bg-white text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFE14D]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Location Search + Interactive Google Map */}
          {mapsApiKey ? (
            <APIProvider apiKey={mapsApiKey} language="en" region="IN">
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <PlacesSearchBar
                      query={searchQuery}
                      onQueryChange={setSearchQuery}
                      isBusy={isLocating}
                      onSelectResolvedPlace={({ locationLabel, placeId, lat, lng }) => {
                        setPinPos({ lat, lng });
                        setSelectedLabel(locationLabel);
                        setSelectedPlaceId(placeId);
                        void fetchAirQualityForCoords(lat, lng, locationLabel);
                      }}
                      onGeocodeFallback={(addr) => void geocodeAddress(addr)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    className="inline-flex h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-[#111111] bg-white px-4 text-xs font-extrabold text-[#111111] transition-colors hover:bg-[#70D6FF]"
                  >
                    <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isLocating ? 'Finding...' : 'Use My Location'}</span>
                  </button>
                </div>

                {/* Google Map (Explicit Height + DEMO_MAP_ID + RASTER mode + Mandatory Usage Attribution) */}
                <div className="overflow-hidden rounded-2xl border-2 border-[#111111] bg-[#D9F1FF] shadow-[4px_4px_0px_#111111]">
                  <div className="h-[230px] w-full" data-testid="smog-alert-map-container">
                    <GoogleMap
                      mapId="DEMO_MAP_ID"
                      renderingType={RenderingType.RASTER}
                      defaultCenter={pinPos}
                      defaultZoom={12}
                      gestureHandling="greedy"
                      disableDefaultUI={true}
                      zoomControl={true}
                      onClick={(ev) => void handleMapClick(ev)}
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: '100%', height: '230px' }}
                    >
                      <MapCameraSync center={pinPos} />
                      <AdvancedMarker position={pinPos} title={selectedLabel}>
                        <Pin
                          background="#FF6B35"
                          borderColor="#111111"
                          glyphColor="#FFFFFF"
                        />
                      </AdvancedMarker>
                    </GoogleMap>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#111111] bg-white px-3.5 py-2 text-xs font-bold text-[#111111]">
                    <span className="truncate">
                      <MapPin className="mr-1 inline h-3.5 w-3.5 text-[#3B66FF]" aria-hidden="true" />
                      {selectedLabel}
                    </span>
                    <span className="text-[11px] font-semibold text-[#555555]">
                      Click anywhere on map to move pin
                    </span>
                  </div>
                </div>
              </div>
            </APIProvider>
          ) : (
            <div className="rounded-2xl border-2 border-[#111111] bg-white p-4 text-sm font-semibold text-[#111111]">
              <p>
                Interactive map is getting ready. You can still type your sector name and turn on
                local smog alerts below.
              </p>
              <div className="mt-3">
                <label
                  htmlFor="smog-alert-location-fallback"
                  className="mb-1 block text-xs font-extrabold uppercase"
                >
                  Your Sector / Society Area
                </label>
                <input
                  id="smog-alert-location-fallback"
                  type="text"
                  value={selectedLabel}
                  onChange={(e) => {
                    setSelectedLabel(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  className="w-full rounded-xl border-2 border-[#111111] px-3.5 py-2 text-sm font-semibold"
                />
              </div>
            </div>
          )}

          {/* Live Local AQI Check Card */}
          <div
            data-testid="live-aqi-readout-card"
            className={`rounded-2xl border-2 border-[#111111] p-4 shadow-[4px_4px_0px_#111111] ${
              isCurrentlyOverLimit ? 'bg-[#FF66B3]/35' : 'bg-white'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                <Wind className="h-4 w-4 text-[#3B66FF]" aria-hidden="true" />
                <span>Live Air Check Around Your Pin</span>
              </div>
              <button
                type="button"
                onClick={() => void fetchAirQualityForCoords(pinPos.lat, pinPos.lng)}
                disabled={isCheckingAqi}
                className="rounded-full border border-[#111111] bg-[#F7F5EE] px-3 py-1 text-[11px] font-extrabold text-[#111111] hover:bg-[#FFE14D]"
              >
                {isCheckingAqi ? 'Checking...' : 'Refresh Reading'}
              </button>
            </div>

            {isCheckingAqi && !reading ? (
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#444444]">
                <Loader2 className="h-4 w-4 animate-spin text-[#3B66FF]" aria-hidden="true" />
                <span>Checking current outside air quality...</span>
              </div>
            ) : reading ? (
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="mono-num text-2xl font-extrabold text-[#111111]">
                      AQI {reading.aqi}
                    </span>
                    <span className="text-xs font-extrabold text-[#3B66FF]">
                      {reading.category}
                    </span>
                    {reading.dominantPollutant && (
                      <span className="mono-num text-[11px] font-bold text-[#555555]">
                        ({reading.scaleLabel} · Main: {reading.dominantPollutant})
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed font-medium text-[#22252A]">
                    {reading.healthTip}
                  </p>
                </div>
                {isCurrentlyOverLimit && (
                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-[#111111] bg-[#FFE14D] px-3 py-1.5 text-xs font-extrabold text-[#111111]">
                    <AlertTriangle className="h-4 w-4 text-[#FF6B35]" aria-hidden="true" />
                    <span>Above your {thresholdAqi}+ limit</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs font-medium text-[#4A4E57]">
                Search your society or click on the map to see real-time outside air quality.
              </p>
            )}
          </div>

          {/* Alert Trigger & Notification Channel Controls */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                When Should We Alert You?
              </span>
              <div className="space-y-2">
                {[
                  {
                    value: 101,
                    label: 'Alert me when air turns Poor',
                    hint: 'AQI 101+ · Shut balconies early & run chimney',
                  },
                  {
                    value: 151,
                    label: 'Alert me when air turns Unhealthy',
                    hint: 'AQI 151+ · Recommended for flats with kids & elders',
                  },
                  {
                    value: 201,
                    label: 'Alert me when air turns Severe',
                    hint: 'AQI 201+ · Stop morning walks & seal room doors',
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border-2 border-[#111111] p-2.5 transition-colors ${
                      thresholdAqi === opt.value ? 'bg-[#C8F542]' : 'bg-white hover:bg-[#FFE14D]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="alert-threshold"
                      checked={thresholdAqi === opt.value}
                      onChange={() => setThresholdAqi(opt.value)}
                      className="mt-1 accent-[#111111]"
                    />
                    <span className="text-xs leading-snug">
                      <strong className="block font-extrabold text-[#111111]">{opt.label}</strong>
                      <span className="text-[#3A3D45]">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3">
              <div>
                <span className="mb-1.5 block text-xs font-extrabold tracking-wide text-[#111111] uppercase">
                  How Should Alerts Arrive?
                </span>
                <div className="space-y-2">
                  <label
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border-2 border-[#111111] p-2.5 transition-colors ${
                      channel === 'browser_push' ? 'bg-[#70D6FF]' : 'bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="alert-channel"
                      checked={channel === 'browser_push'}
                      onChange={() => setChannel('browser_push')}
                      className="mt-1 accent-[#111111]"
                    />
                    <span className="text-xs leading-snug">
                      <strong className="block font-extrabold text-[#111111]">
                        Browser Push Notification + App Banner
                      </strong>
                      <span className="text-[#22252A]">
                        Status:{' '}
                        {pushStatus === 'granted'
                          ? 'Allowed & Ready'
                          : pushStatus === 'denied'
                            ? 'Blocked in browser (App Banner active)'
                            : pushStatus === 'unsupported'
                              ? 'App Banner Ready'
                              : 'Will ask permission when saving'}
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border-2 border-[#111111] p-2.5 transition-colors ${
                      channel === 'in_app_only' ? 'bg-[#70D6FF]' : 'bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="alert-channel"
                      checked={channel === 'in_app_only'}
                      onChange={() => setChannel('in_app_only')}
                      className="mt-1 accent-[#111111]"
                    />
                    <span className="text-xs leading-snug">
                      <strong className="block font-extrabold text-[#111111]">
                        Local In-App Warning Only
                      </strong>
                      <span className="text-[#22252A]">
                        No pop-ups—shows urgent warning bar inside this page.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {channel === 'browser_push' && pushStatus === 'default' && (
                <button
                  type="button"
                  onClick={() => void handleRequestBrowserPush()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2 text-xs font-extrabold text-[#111111] hover:bg-[#FFE14D]"
                >
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Allow Browser Push Notifications Now</span>
                </button>
              )}
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border-2 border-[#111111] bg-[#FF66B3]/30 px-4 py-2.5 text-xs font-bold text-[#111111]"
            >
              {errorMessage}
            </div>
          )}

          {statusNote && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#C8F542] px-4 py-2.5 text-xs font-bold text-[#111111]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{statusNote}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#111111]/15 pt-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSendTest}
                className="rounded-full border-2 border-[#111111] bg-white px-4 py-2.5 text-xs font-extrabold text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFE14D]"
              >
                Send Test Alert
              </button>
              {existingSubscription?.enabled && (
                <button
                  type="button"
                  onClick={onDisableSubscription}
                  className="rounded-full border-2 border-[#111111]/40 px-4 py-2.5 text-xs font-bold text-[#444444] hover:border-[#111111] hover:text-[#111111]"
                >
                  Turn Off Alert
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleSaveAlert()}
              disabled={isSaving}
              className="roll-btn bg-[#3B66FF] px-6 py-3 text-sm text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Saving Alert...</span>
                </>
              ) : (
                <>
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {existingSubscription?.enabled ? 'Update Smog Alert' : 'Save & Activate Alert'}
                  </span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] font-medium text-[#555555]">
            Location search &amp; live local air check powered by Google Maps Platform (subject to{' '}
            <a
              href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#111111]"
            >
              Google Maps End User Terms
            </a>
            ). Location preferences are saved locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
