/**
 * @typedef {
 *   google.maps.Marker |
 *   google.maps.Polygon |
 *   google.maps.Polyline |
 *   google.maps.Rectangle |
 *   google.maps.Circle
 * } OverlayGeometry
 */

/**
 * @typedef {Object} DrawResult
 * @property {google.maps.drawing.OverlayType} type
 * @property {OverlayGeometry} overlay
 */

/**
 * @typedef {Object} Snapshot
 * @property {number} [radius]
 * @property {google.maps.LatLngLiteral} [center]
 * @property {google.maps.LatLngLiteral} [position]
 * @property {Array<google.maps.LatLng>} [path]
 * @property {google.maps.LatLngBoundsLiteral} [bounds]
 */

/**
 * @typedef {Object} Overlay
 * @property {google.maps.drawing.OverlayType} type
 * @property {OverlayGeometry} geometry
 * @property {Snapshot} snapshot
 */

/**
 * @typedef {Object} State
 * @property {Array<Array<Overlay>>} past
 * @property {Array<Overlay>} now
 * @property {Array<Array<Overlay>>} future
 */

// DrawingActionKind enum as object with string values
export const DrawingActionKind = {
  SET_OVERLAY: 'SET_OVERLAY',
  UPDATE_OVERLAYS: 'UPDATE_OVERLAYS',
  UNDO: 'UNDO',
  REDO: 'REDO'
  
  
};

/**
 * Checks if overlay is a Circle
 * @param {OverlayGeometry} overlay - The overlay to check
 * @returns {boolean} - True if the overlay is a Circle
 */
export function isCircle(overlay) {
  return overlay.getCenter !== undefined;
}

/**
 * Checks if overlay is a Marker
 * @param {OverlayGeometry} overlay - The overlay to check
 * @returns {boolean} - True if the overlay is a Marker
 */
export function isMarker(overlay) {
  return overlay.getPosition !== undefined;
}

/**
 * Checks if overlay is a Polygon
 * @param {OverlayGeometry} overlay - The overlay to check
 * @returns {boolean} - True if the overlay is a Polygon
 */
export function isPolygon(overlay) {
  return overlay.getPath !== undefined && !isPolyline(overlay);
}

/**
 * Checks if overlay is a Polyline
 * @param {OverlayGeometry} overlay - The overlay to check
 * @returns {boolean} - True if the overlay is a Polyline
 */
export function isPolyline(overlay) {
  return overlay.getPath !== undefined;
}

/**
 * Checks if overlay is a Rectangle
 * @param {OverlayGeometry} overlay - The overlay to check
 * @returns {boolean} - True if the overlay is a Rectangle
 */
export function isRectangle(overlay) {
  return overlay.getBounds !== undefined;
}
