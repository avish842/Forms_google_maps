import {useMap, useMapsLibrary} from '@vis.gl/react-google-maps';
import {useEffect, useState} from 'react';

/**
 * Hook to create and manage a drawing manager
 * @param {google.maps.drawing.DrawingManager|null} initialValue - Initial drawing manager value
 * @returns {google.maps.drawing.DrawingManager|null} - The drawing manager
 */
export function useDrawingManager(initialValue = null) {
  const map = useMap();
  const drawing = useMapsLibrary('drawing');

  const [drawingManager, setDrawingManager] = useState(initialValue);

  useEffect(() => {
    if (!map || !drawing) return;

    // Define common style options for all shape types
    const commonOptions = {
      strokeColor: '#FF0000', // Red stroke color
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: 'blue', // Red fill color
      fillOpacity: 0.35,
      editable: true
    };

    // https://developers.google.com/maps/documentation/javascript/reference/drawing
    const newDrawingManager = new drawing.DrawingManager({
      map,
      drawingMode: google.maps.drawing.OverlayType.CIRCLE,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [
          google.maps.drawing.OverlayType.MARKER,
          google.maps.drawing.OverlayType.CIRCLE,
          google.maps.drawing.OverlayType.POLYGON,
          google.maps.drawing.OverlayType.POLYLINE,
          google.maps.drawing.OverlayType.RECTANGLE
        ]
      },
      markerOptions: {
        draggable: true,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#FF0000',
          fillOpacity: 1,
          strokeColor: '#FF0000'
        }
      },
      circleOptions: {
        ...commonOptions,
        editable: true
      },
      polygonOptions: {
        ...commonOptions,
        editable: true,
        draggable: true
      },
      rectangleOptions: {
        ...commonOptions,
        editable: true,
        draggable: true
      },
      polylineOptions: {
        ...commonOptions,
        editable: true,
        draggable: true
      }
    });

    setDrawingManager(newDrawingManager);

    return () => {
      newDrawingManager.setMap(null);
    };
  }, [drawing, map]);

  return drawingManager;
}
