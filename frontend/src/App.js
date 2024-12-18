import React, { useEffect, useState } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  const [regions, setRegions] = useState([]);
  const [antennas, setAntennas] = useState([]);
  const [networkCoverage, setNetworkCoverage] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showAntennas, setShowAntennas] = useState(false);
  const [showCoverage, setShowCoverage] = useState(true);
  const [viewState, setViewState] = useState({
    latitude: -12.8275,
    longitude: 45.1662,
    zoom: 10,
    bearing: 0,
    pitch: 0,
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  // Fetch regions data
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/status`);
        const data = await response.json();
        setRegions(data);
      } catch (error) {
        console.error('Error fetching regions:', error);
      }
    };

    fetchRegions();
    const interval = setInterval(fetchRegions, 30000);
    return () => clearInterval(interval);
  }, [API_URL]);

  // Fetch antennas data
  useEffect(() => {
    const fetchAntennas = async () => {
      try {
        const response = await fetch(`${API_URL}/api/antennas`);
        const data = await response.json();
        setAntennas(data);
      } catch (error) {
        console.error('Error fetching antennas:', error);
      }
    };

    fetchAntennas();
  }, [API_URL]);

  // Fetch network coverage data
//   useEffect(() => {
//     const fetchNetworkCoverage = async () => {
//         console.log('Fetching network coverage...');
//         try {
//             const response = await fetch(`${API_URL}/api/network-coverage`);
//             console.log('Network coverage response status:', response.status);
//             const data = await response.json();
//             console.log('Network coverage data received:', data);
            
//             if (data.networkAreas && data.networkAreas.length > 0) {
//                 console.log('Sample network area:', data.networkAreas[0]);
//                 setNetworkCoverage(data.networkAreas);
//             } else {
//                 console.warn('No network areas received');
//             }
//         } catch (error) {
//             console.error('Error fetching network coverage:', error);
//         }
//     };

//     fetchNetworkCoverage();
// }, [API_URL]);

  // Prepare network coverage for visualization
  const coverageData = React.useMemo(() => ({
    type: 'FeatureCollection',
    features: networkCoverage
        .filter(area => area.coordinates) // Ensure coordinates exist
        .map(area => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [area.coordinates[1], area.coordinates[0]] // GeoJSON expects [lon, lat]
            },
            properties: {
                network: area.network,
                rangeCount: area.rangeCount,
                status: area.status,
                onlineCount: area.onlineCount
            }
        }))
}), [networkCoverage]);


  return (
    <>
      <div className="app-container">
        <div className="map-container">
          <Map
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          >
            {/* Network Coverage Layer */}
            {showCoverage && (
            
            <Source type="geojson" data={coverageData}>
            <Layer
              id="network-coverage"
              type="circle"
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['get', 'rangeCount'],
                  1, 10,
                  50, 30
                ],
                'circle-color': [
                  'match',
                  ['get', 'status'],
                  'online', '#4CAF50',
                  'offline', '#f44336',
                  '#FFA726'  // default color
                ],
                'circle-opacity': 0.6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
              }}
              onClick={(e) => {
                if (e.features.length > 0) {
                  const feature = e.features[0];
                  setSelectedMarker({
                    ...feature.properties,
                    coordinates: feature.geometry.coordinates,
                    type: 'coverage'
                  });
                }
              }}
              interactive={true}
            />
          </Source>
          )}
          
            

            {/* Network Status Markers */}
            {regions.map((region) => (
              <Marker
                key={region.name}
                longitude={region.coordinates[0]}
                latitude={region.coordinates[1]}
                anchor="center"
              >
                <div
                  className={`marker-dot ${region.status}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMarker({ ...region, type: 'region' });
                  }}
                  style={{ 
                    width: '20px', 
                    height: '20px',
                    backgroundColor: region.status === 'online' ? '#4CAF50' : '#f44336',
                    border: '2px solid white',
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                  }}
                >
                  <div className="pulse-ring"></div>
                </div>
              </Marker>
            ))}

            {/* Antenna Markers */}
            {showAntennas && antennas.map((antenna) => (
              <Marker
                key={antenna.id}
                longitude={antenna.lon}
                latitude={antenna.lat}
                anchor="center"
              >
                <div
                  className="antenna-marker"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMarker({ ...antenna, type: 'antenna' });
                  }}
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#FFA726',
                    border: '2px solid white',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    boxShadow: '0 0 10px rgba(255, 167, 38, 0.5)'
                  }}
                />
              </Marker>
            ))}

            {/* Popup for markers */}
            {selectedMarker && (
  <Popup
    longitude={
      selectedMarker.type === 'region' 
        ? selectedMarker.coordinates[0] 
        : selectedMarker.type === 'antenna'
        ? selectedMarker.lon
        : selectedMarker.coordinates[0]
    }
    latitude={
      selectedMarker.type === 'region' 
        ? selectedMarker.coordinates[1] 
        : selectedMarker.type === 'antenna'
        ? selectedMarker.lat
        : selectedMarker.coordinates[1]
    }
    anchor="top"
    onClose={() => setSelectedMarker(null)}
  >
    <div className="popup-content">
      {selectedMarker.type === 'region' ? (
        <>
          <h3>{selectedMarker.name}</h3>
          <p>Status: <span className={`status ${selectedMarker.status}`}>
            {selectedMarker.status.toUpperCase()}
          </span></p>
          <p>Connectivity: {selectedMarker.connectivity.toFixed(1)}%</p>
          <p>Last Updated: {new Date(selectedMarker.lastChecked).toLocaleTimeString()}</p>
        </>
      ) : selectedMarker.type === 'antenna' ? (
        <>
          <h3>Antenne GSM</h3>
          <p>Type: {selectedMarker.type}</p>
          <p>Opérateur: {selectedMarker.operator}</p>
          <p>Portée: {selectedMarker.range}m</p>
          <p>Dernière mise à jour: {new Date(selectedMarker.lastUpdate).toLocaleDateString()}</p>
        </>
      ) : (
        <>
          <h3>Zone IP: {selectedMarker.network}</h3>
          <p>Status: <span className={`status ${selectedMarker.status}`}>
            {selectedMarker.status.toUpperCase()}
          </span></p>
          <p>Nombre de plages IP: {selectedMarker.rangeCount}</p>
          <p>IPs en ligne: {selectedMarker.onlineCount || 0}</p>
          <p>IPs hors ligne: {selectedMarker.rangeCount - (selectedMarker.onlineCount || 0)}</p>

          <h3>Statistiques IP</h3>
    <p>IPs vérifiées: {regions.reduce((total, region) => {
        // Get total checked IPs from connectivity data
        const checkedCount = Math.round((100 / region.connectivity) * region.connectivity) || 0;
        return total + checkedCount;
    }, 0)}</p>
    <p>IPs en ligne: {regions.reduce((total, region) => {
        // Calculate responding IPs based on connectivity percentage
        const checkedCount = Math.round((100 / region.connectivity) * region.connectivity) || 0;
        const respondingCount = Math.round((region.connectivity / 100) * checkedCount) || 0;
        return total + respondingCount;
    }, 0)}</p>
        </>
      )}
    </div>
  </Popup>
)}


            {/* Layer Controls */}
            <div className="map-controls">
              <button 
                className={`layer-toggle ${showAntennas ? 'active' : ''}`}
                onClick={() => setShowAntennas(!showAntennas)}
              >
                Antennes GSM
              </button>
              <button 
                className={`layer-toggle ${showCoverage ? 'active' : ''}`}
                onClick={() => setShowCoverage(!showCoverage)}
              >
                Couverture IP
              </button>
            </div>

            <div className="debug-overlay">
              {regions.length} regions, {antennas.length} antennes
            </div>
          </Map>
        </div>

        <div className="sidebar-container">
          <h2>État du Réseau à Mayotte</h2>
          <p>
            Cette carte affiche l'état actuel de la connectivité réseau et les antennes GSM
            pour différentes régions de Mayotte. Les marqueurs indiquent :
          </p>
          <ul>
            <li><span style={{ color: '#4CAF50' }}>Vert</span> : Réseau en ligne</li>
            <li><span style={{ color: '#f44336' }}>Rouge</span> : Réseau hors ligne</li>
            <li><span style={{ color: '#FFA726' }}>Orange</span> : Antenne GSM</li>
            {/* <li><span style={{ color: '#2196F3' }}>Bleu</span> : Zone de couverture IP</li> */}
          </ul>
          <p>
            Cliquez sur un marqueur pour afficher plus de détails sur la région ou l'antenne.
            Les données réseau sont actualisées toutes les 30 secondes.
          </p>
          <div className="network-stats">
    <h3>Statistiques Réseau</h3>

    <p>Régions en ligne: {regions.filter(region => region.status === 'online').length}</p>
    <p>Régions hors ligne: {regions.filter(region => region.status === 'offline').length}</p>
    <p>*En attente de données GSM</p>
</div>
<b>Solidarité avec tous les habitants de Mayotte</b>

        </div>
      </div>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;