import React from 'react';

import {APIProvider} from '@vis.gl/react-google-maps';
import{DrawingProvider} from './context/DrawingContext';
import DrawingExample from './drawing-example';
import AreaData from './AreaData';




const MapsComp = () => {
  
 

  return (
    <APIProvider apiKey='AIzaSyD49as3_zk9mFpDLnbXvTkUx7Jp9tZ0PS8'>
        {/* <h1>Welcome to Google maps</h1> */}
      <DrawingProvider>
        
      <DrawingExample >

      </DrawingExample>
      <AreaData/>


      </DrawingProvider>
    </APIProvider>
  );
};

export default MapsComp;


