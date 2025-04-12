import React,{useState,useEffect} from 'react';
import {ControlPosition, Map, MapControl, Marker} from '@vis.gl/react-google-maps';

import {UndoRedoControl} from './undo-redo-control';
import {useDrawingManager} from './use-drawing-manager';
import {useDrawingContext} from './context/DrawingContext';



const DrawingExample = () => {
  const drawingManager = useDrawingManager();
  const { state,userLocation } = useDrawingContext();
  console.log("userLocation Map", userLocation);
  
  const [initialCenter, setInitialCenter] = useState(null);

  // Set initialCenter only once, when userLocation is first available
  useEffect(() => {
    if (userLocation && !initialCenter) {
      setInitialCenter(userLocation);
    }
  }, [userLocation, initialCenter]);
  console.log("initialCenter", initialCenter);
  

  return (
    <>
      <Map
      style={{width: '80%', height: '80%'}}
        
        defaultZoom={20}
        defaultCenter={initialCenter}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        mapTypeControlStyle={0}
        mapTypeId="hybrid"

      />
      {/* <Marker
        position={userLocation}
        draggable={true}
        onDragEnd={(e) => setCenter({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
        icon="http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
      /> */}
      <Marker
        position={initialCenter}
        icon="https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png"
      />
      <Marker
        position={userLocation}
        draggable={true}
        icon="https://maps.gstatic.com/mapfiles/ms2/micons/yellow-dot.png"
      />

      

      <MapControl position={ControlPosition.TOP_CENTER}>
        <UndoRedoControl drawingManager={drawingManager} />
      </MapControl>
    </>
  );
};

export default DrawingExample;
