import React from 'react';
import {createRoot} from 'react-dom/client';

import MapsComp from './MapsComp';



const App = () => {
  
 

  return (
    <MapsComp/>
  );
};

export default App;

export function renderToDom(container) {
  const root = createRoot(container);
  root.render(<App />);
}
