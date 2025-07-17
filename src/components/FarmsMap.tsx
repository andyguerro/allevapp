import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

interface Farm {
  id: string;
  name: string;
  address?: string;
  company?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface FarmsMapProps {
  farms: Farm[];
  onClose?: () => void;
  isFullscreen?: boolean;
}

const FarmsMap: React.FC<FarmsMapProps> = ({ farms, onClose, isFullscreen = false }) => {
  const [mapFarms, setMapFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 45.4642, lng: 9.1900 }); // Milano come centro default
  const [isExpanded, setIsExpanded] = useState(isFullscreen);

  useEffect(() => {
    geocodeFarms();
  }, [farms]);

  const geocodeFarms = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const geocodedFarms: Farm[] = [];
      let validCoordinatesCount = 0;
      let totalLat = 0;
      let totalLng = 0;

      for (const farm of farms) {
        if (!farm.address) {
          geocodedFarms.push(farm);
          continue;
        }

        try {
          // Miglioramento: aggiungi più dettagli alla query per migliorare i risultati
          const formattedAddress = `${farm.address}, Italia`;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedAddress)}&limit=1&countrycodes=it&addressdetails=1`
          );
          
          if (!response.ok) throw new Error('Errore nella richiesta di geocoding');
          
          const data = await response.json();
          
          if (data && data.length > 0) {
            const coordinates = {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            };
            
            geocodedFarms.push({
              ...farm,
              coordinates
            });

            totalLat += coordinates.lat;
            totalLng += coordinates.lng;
            validCoordinatesCount++;
            
            // Aggiungi un log per debug
            console.log(`Geocoded ${farm.name}: ${coordinates.lat}, ${coordinates.lng}`);
          } else {
            console.log(`No geocoding results for ${farm.name}: ${farm.address}`);
            geocodedFarms.push(farm);
          }
          
          // Pausa per rispettare i limiti di rate dell'API
          await new Promise(resolve => setTimeout(resolve, 1200));
        } catch (err) {
          console.error(`Errore nel geocoding per ${farm.name}:`, err);
          geocodedFarms.push(farm);
        }
      }

      // Calcola il centro della mappa basato sugli allevamenti geocodificati
      if (validCoordinatesCount > 0) {
        setMapCenter({
          lat: totalLat / validCoordinatesCount,
          lng: totalLng / validCoordinatesCount
        });
      }

      setMapFarms(geocodedFarms);
    } catch (err) {
      setError('Errore nel caricamento delle posizioni degli allevamenti');
      console.error('Errore geocoding:', err);
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = (farm: Farm) => {
    if (farm.coordinates) {
      const url = `https://www.google.com/maps?q=${farm.coordinates.lat},${farm.coordinates.lng}`;
      window.open(url, '_blank');
    } else if (farm.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(farm.address)}`;
      window.open(url, '_blank');
    }
  };

  const getDirections = (farm: Farm) => {
    if (farm.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${farm.coordinates.lat},${farm.coordinates.lng}`;
      window.open(url, '_blank');
    } else if (farm.address) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(farm.address)}`;
      window.open(url, '_blank');
    }
  };

  const farmsWithCoordinates = mapFarms.filter(farm => farm.coordinates);
  const farmsWithoutCoordinates = mapFarms.filter(farm => !farm.coordinates && farm.address);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="animate-spin mx-auto mb-4 text-brand-blue" size={48} />
            <h3 className="text-lg font-medium text-brand-blue mb-2">Caricamento Mappa</h3>
            <p className="text-brand-gray">Geocodificazione degli indirizzi in corso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-brand-coral/20 ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
        <div className="flex items-center space-x-3">
          <MapPin size={24} className="text-brand-red" />
          <h2 className="text-xl font-semibold text-brand-blue">Mappa Allevamenti</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
            title={isExpanded ? "Riduci" : "Espandi"}
          >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-brand-gray hover:text-brand-red transition-colors"
              title="Chiudi"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className={`${isExpanded ? 'h-[calc(100vh-200px)]' : 'h-96'} overflow-hidden`}>
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 text-brand-red" size={48} />
              <h3 className="text-lg font-medium text-brand-red mb-2">Errore</h3>
              <p className="text-brand-gray">{error}</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Mappa Interattiva */}
            <div className="flex-1 relative bg-gradient-to-br from-brand-blue/10 to-brand-coral/10">
              {/* Simulazione mappa con punti */}
              <div className="absolute inset-0 overflow-hidden">
                <div 
                  className="w-full h-full relative bg-gradient-to-br from-green-100 via-blue-50 to-green-200"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 20% 30%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 60% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
                    `
                  }}
                >
                  {/* Griglia per simulare una mappa */}
                  <div className="absolute inset-0 opacity-20">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={`h-${i}`} className="absolute w-full border-t border-gray-300" style={{ top: `${i * 10}%` }} />
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={`v-${i}`} className="absolute h-full border-l border-gray-300" style={{ left: `${i * 10}%` }} />
                    ))}
                  </div>

                  {/* Punti degli allevamenti */}
                  {farmsWithCoordinates.map((farm, index) => {
                    // Posiziona i punti in modo distribuito sulla mappa
                    const x = 20 + (index % 3) * 25 + Math.random() * 10;
                    const y = 20 + Math.floor(index / 3) * 20 + Math.random() * 10;
                    
                    return (
                      <div
                        key={farm.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{ left: `${x}%`, top: `${y}%` }}
                        onClick={() => setSelectedFarm(selectedFarm?.id === farm.id ? null : farm)}
                      >
                        <div className="relative">
                          <div className="w-6 h-6 bg-brand-red rounded-full border-2 border-white shadow-lg group-hover:scale-110 transition-transform duration-200 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-brand-blue text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                              {farm.name}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-brand-blue"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Legenda */}
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                      <span className="text-brand-blue">Allevamento</span>
                    </div>
                    <div className="text-xs text-brand-gray mt-1 flex items-center justify-between">
                      <span>{farmsWithCoordinates.length} di {farms.length} localizzati</span>
                      {farmsWithCoordinates.length === 0 && farms.some(f => f.address) && (
                        <span className="text-xs text-brand-red ml-2">Ricarica per riprovare</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pannello laterale */}
            <div className="w-80 border-l border-brand-coral/20 bg-gradient-to-b from-brand-blue/5 to-brand-coral/5 overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold text-brand-blue mb-4">Allevamenti ({farms.length})</h3>
                
                {/* Allevamenti con coordinate */}
                {farmsWithCoordinates.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-brand-blue mb-3 flex items-center">
                      <MapPin size={16} className="mr-2 text-brand-red" />
                      Localizzati ({farmsWithCoordinates.length})
                    </h4>
                    <div className="space-y-2">
                      {farmsWithCoordinates.map((farm) => (
                        <div
                          key={farm.id}
                          className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                            selectedFarm?.id === farm.id
                              ? 'bg-brand-red/10 border-brand-red/30 shadow-md'
                              : 'bg-white border-brand-coral/20 hover:border-brand-coral/40 hover:shadow-sm'
                          }`}
                          onClick={() => setSelectedFarm(selectedFarm?.id === farm.id ? null : farm)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-brand-blue">{farm.name}</h5>
                              {farm.address && (
                                <p className="text-sm text-brand-gray mt-1">{farm.address}</p>
                              )}
                              {farm.coordinates && (
                                <p className="text-xs text-brand-gray mt-1">
                                  {farm.coordinates.lat.toFixed(4)}, {farm.coordinates.lng.toFixed(4)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {selectedFarm?.id === farm.id && (
                            <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-brand-coral/20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInGoogleMaps(farm);
                                }}
                                className="flex-1 bg-brand-blue text-white px-3 py-2 rounded-lg text-sm hover:bg-brand-blue-dark transition-colors flex items-center justify-center space-x-1"
                              >
                                <MapPin size={14} />
                                <span>Visualizza</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  getDirections(farm);
                                }}
                                className="flex-1 bg-brand-coral text-white px-3 py-2 rounded-lg text-sm hover:bg-brand-coral-light transition-colors flex items-center justify-center space-x-1"
                              >
                                <Navigation size={14} />
                                <span>Indicazioni</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allevamenti senza coordinate */}
                {farmsWithoutCoordinates.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-brand-gray mb-3 flex items-center">
                      <AlertCircle size={16} className="mr-2 text-brand-coral" />
                      Non localizzati ({farmsWithoutCoordinates.length})
                    </h4>
                    <div className="space-y-2">
                      {farmsWithoutCoordinates.map((farm) => (
                        <div
                          key={farm.id}
                          className="p-3 rounded-lg bg-brand-gray/10 border border-brand-gray/20"
                        >
                          <h5 className="font-medium text-brand-blue">{farm.name}</h5>
                          <p className="text-sm text-brand-gray mt-1">{farm.address}</p>
                          <p className="text-xs text-brand-coral mt-1">
                            Indirizzo non localizzato. Prova a specificare città e provincia.
                          </p>
                          <button
                            onClick={() => openInGoogleMaps(farm)}
                            className="mt-2 text-xs text-brand-coral hover:text-brand-coral-light transition-colors flex items-center space-x-1"
                          >
                            <MapPin size={12} />
                            <span>Cerca su Google Maps</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allevamenti senza indirizzo */}
                {farms.filter(f => !f.address).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-brand-gray mb-3 flex items-center">
                      <AlertCircle size={16} className="mr-2 text-brand-gray" />
                      Senza indirizzo ({farms.filter(f => !f.address).length})
                    </h4>
                    <div className="space-y-2">
                      {farms.filter(f => !f.address).map((farm) => (
                        <div
                          key={farm.id}
                          className="p-3 rounded-lg bg-brand-gray/5 border border-brand-gray/10"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-brand-blue">{farm.name}</h5>
                            <button
                              onClick={() => alert('Per localizzare questo allevamento, aggiungi un indirizzo nelle impostazioni.')}
                              className="text-xs text-brand-blue hover:text-brand-red transition-colors"
                            >
                              Aggiungi indirizzo
                            </button>
                          </div>
                          <p className="text-sm text-brand-gray mt-1">Indirizzo non specificato</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmsMap;