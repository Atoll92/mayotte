import React, { useEffect, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/react"



function App() {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [viewState, setViewState] = useState({
    latitude: -12.8275,
    longitude: 45.1662,
    zoom: 10,
    bearing: 0,
    pitch: 0,
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

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
  }, []);

  return (<>
    <div className="app-container">
      {/* Map Container */}
      <div className="map-container">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
        >
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
                  setSelectedRegion(region);
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

          {selectedRegion && (
            <Popup
              longitude={selectedRegion.coordinates[0]}
              latitude={selectedRegion.coordinates[1]}
              anchor="top"
              onClose={() => setSelectedRegion(null)}
            >
              <div className="popup-content">
                <h3>{selectedRegion.name}</h3>
                <p>Status: <span className={`status ${selectedRegion.status}`}>{selectedRegion.status.toUpperCase()}</span></p>
                <p>Connectivity: {selectedRegion.connectivity.toFixed(1)}%</p>
                <p>Last Updated: {new Date(selectedRegion.lastChecked).toLocaleTimeString()}</p>
              </div>
            </Popup>
          )}

          <div className="debug-overlay">{regions.length} regions loaded</div>
        </Map>
      </div>

      {/* Sidebar Container */}
      <div className="sidebar-container">
        <h2>État du Réseau à Mayotte</h2>
        <p>
          Cette carte affiche l'état actuel de la connectivité réseau pour
          différentes régions de Mayotte. Chaque marqueur représente une région,
          et sa couleur indique l'état :
        </p>
        <ul>
          <li><span style={{ color: '#4CAF50' }}>Vert</span> : En ligne</li>
          <li><span style={{ color: '#f44336' }}>Rouge</span> : Hors ligne</li>
        </ul>
        <p>
          Cliquez sur un marqueur pour afficher plus de détails sur la région,
          y compris le pourcentage de connectivité et l'heure de la dernière mise
          à jour.
        </p>
        <p>
          Les données sont actualisées toutes les 30 secondes pour fournir des
          mises à jour en quasi-temps réel.
        </p>
        <b>Solidarité avec tous les habitants de Mayotte</b>
      </div>
    </div>
    <Analytics />
    <SpeedInsights/>
        </>
    
  );
}

export default App;
