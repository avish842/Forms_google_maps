import React from "react";
import { useDrawingContext } from "./context/DrawingContext";

const AreaData = () => {
    const { state,userLocation } = useDrawingContext();

    
    
    console.log("AreaData", state.now);

    // Ensure comp is always an array to prevent runtime errors
    const comp = state.now || [];
    
    console.log("comp L", comp.length);
    console.log("comp E", comp.length > 0 ? comp[0] : "No elements");
    const bound = comp[0]?.snapshot?.bounds;
    console.log("bounds", bound);
    console.log("userLocation", userLocation);

    return (
        <div>
            <h2>lat :{userLocation?.lng}<br></br> lang: {userLocation?.lat}</h2>
            {comp.length > 0 ? (
                <div>
                    <h1>Component Details</h1>
                    <p>Type: {comp[0].type}</p>

                    <p>
                        
                    </p>
                </div>
            ) : (
                <p>No data</p>
            )}
        </div>
    );
};

export default AreaData;
