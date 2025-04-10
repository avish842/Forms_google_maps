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
  const [userLocation,setUserLocation] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    });

    console.log('User location:', userLocation);
  }, [userLocation]); 

  
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