import React, { createContext, use, useContext, useEffect, useReducer, useRef,useState } from 'react';
import reducer from '../undo-redo';
import { DrawingActionKind } from '../types';

const DrawingContext = createContext();


export function DrawingProvider({ children }) {
  
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    now: [],
    future: []
  });
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Start watching the user's position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        console.log('Updated location:', position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );    

    // Cleanup watcher on unmount
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  
  const overlaysShouldUpdateRef = useRef(false);

  
  return (
    <DrawingContext.Provider value={{ state, dispatch, overlaysShouldUpdateRef ,userLocation}}>
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawingContext() {
  return useContext(DrawingContext);
}