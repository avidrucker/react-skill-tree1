// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import FontFaceObserver from 'fontfaceobserver';

import stylesheet from './graphStyles';
import useGraphHandlers from './hooks/useGraphHandlers';
import eyeIcon from './assets/eye.png';
import leafIcon from './assets/leaf.png';
import windIcon from './assets/wind.png';

function App() {
  const [treeName, setTreeName] = useState('Demo Tree');

  const [zoom, setZoom] = useState(3.5);
  const [pan, setPan] = useState({ x: 160, y: 272 });

  // Define the demo elements
  const demoElements = [
    {
      data: { id: 'node-1', label: 'Insight', image: eyeIcon },
      position: { x: 0, y: 0 },
    },
    {
      data: { id: 'node-2', label: 'Leaf Shield', image: leafIcon },
      position: { x: 100, y: 0 },
    },
    {
      data: { id: 'node-3', label: 'Air Strike Shield', image: windIcon },
      position: { x: 200, y: 0 },
    },
    {
      data: {
        id: 'edge-node-1-node-2',
        source: 'node-1',
        target: 'node-2',
      },
    },
    {
      data: {
        id: 'edge-node-2-node-3',
        source: 'node-2',
        target: 'node-3',
      },
    },
  ];

  const [elements, setElements] = useState(demoElements);
  const [cyRef, setCyRef] = useState(null);

  // Use a ref to track whether we've loaded from localStorage
  const hasLoadedFromLocalStorage = useRef(false);

  // State to track if the font has loaded
  const [isFontLoaded, setIsFontLoaded] = useState(false);

  const {
    isEditing,
    editNode,
    editNodePosition,
    editLabel,
    addNode,
    handleKeyDown,
    handleBlur,
    setEditLabel,
  } = useGraphHandlers(cyRef, elements, setElements);

  const printElements = () => {
    console.log('Current elements:', elements);
  };

  const saveGraphToJSON = () => {
    if (cyRef) {
      const elementsData = cyRef.elements().jsons(); // Get elements with positions
      const json = JSON.stringify({
        elements: elementsData,
        treeName,
        zoom: cyRef.zoom(),
        pan: cyRef.pan(),
      });
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${treeName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const saveToLocalStorage = () => {
    if (cyRef) {
      const elementsData = cyRef.elements().jsons(); // Get elements with positions
      const json = JSON.stringify({
        elements: elementsData,
        treeName,
        zoom: cyRef.zoom(),
        pan: cyRef.pan(),
      });
      localStorage.setItem('graphState', json);
    }
  };

  const loadFromJSON = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = JSON.parse(e.target.result);
        setElements(json.elements || demoElements);
        setTreeName(json.treeName || 'Untitled 1');
        // Save zoom and pan in state variables
        setZoom(json.zoom || 1);
        setPan(json.pan || { x: 0, y: 0 });
      };
      reader.readAsText(file);
    }
  };

  const loadGraphFromJSON = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.onchange = loadFromJSON;
    fileInput.click();
  };
  
  const loadFromLocalStorage = () => {
    const json = localStorage.getItem('graphState');
    if (json) {
      const state = JSON.parse(json);
      setElements(state.elements || demoElements);
      setTreeName(state.treeName || 'Untitled 1');
      // Save zoom and pan in state variables
      setZoom(state.zoom || 1);
      setPan(state.pan || { x: 0, y: 0 });
    } else {
      // If no data in localStorage, use demo data
      setElements(demoElements);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };
  

  // Load from local storage once when the component mounts
  useEffect(() => {
    if (!hasLoadedFromLocalStorage.current) {
      loadFromLocalStorage();
      hasLoadedFromLocalStorage.current = true;
    }
  }, []); // Empty dependency array ensures this runs once

  // Save to local storage whenever elements or treeName change
  useEffect(() => {
    saveToLocalStorage();
  }, [treeName, elements]);

  // Load the custom font before rendering Cytoscape
  useEffect(() => {
    const font = new FontFaceObserver('UnifrakturMaguntia'); // Replace with your font's name

    font.load().then(
      () => {
        console.log('Font has loaded');
        setIsFontLoaded(true);
      },
      (err) => {
        console.error('Font failed to load', err);
        setIsFontLoaded(true); // Proceed anyway
      }
    );
  }, []);

  useEffect(() => {
    if (cyRef && zoom !== null && pan !== null) {
      cyRef.zoom(zoom);
      cyRef.pan(pan);
    }
  }, [cyRef, zoom, pan]);

  const clearGraphData = () => {
    localStorage.removeItem('graphState');
    setElements([]);
    setTreeName('Untitled 1');
  };

  const loadDemoGraph = () => {
    setElements(demoElements);
    setTreeName('Demo Tree');
    setZoom(3.5);
    setPan({ x: 160, y: 272 });
    saveToLocalStorage();
  };

  return (
    <div className="bg-black relative w-100 vh-100">
      {isFontLoaded && (
      <CytoscapeComponent
        className="bg-dark-gray h-100 w-100 relative z-0 pa3"
        elements={elements}
        stylesheet={stylesheet}
        layout={{ name: 'preset' }}
        cy={setCyRef}
      />
      )}
      {/* Overlay UI Elements */}
      <div className="z-1 absolute top-0 left-0 pa3 pointer-events-none">
        <h1 className="ma0 user-select-none">
          <span className="f2 mr2">Skill Tree:</span>
          <input
            className="f2 pointer-events-auto"
            type="text"
            value={treeName}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            onChange={(e) => setTreeName(e.target.value)}
          />
        </h1>
        <div className="pointer-events-auto">
          <button onClick={addNode}>Add Skill</button>
          <button onClick={() => cyRef && cyRef.fit()}>Center Graph</button>
          <button onClick={printElements}>Console Log</button>
          <button onClick={saveGraphToJSON}>Save</button>
          <button onClick={loadGraphFromJSON}>Load</button>
          <button onClick={clearGraphData}>Clear</button>
          <button onClick={loadDemoGraph}>Demo</button>
        </div>
      </div>
      {/* Edit Input Field */}
      {isEditing && editNode && editNodePosition && (
        <input
          className="f3"
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            position: 'absolute',
            left: editNodePosition.x - 85, // Adjust based on input width
            top: editNodePosition.y - 115, // Adjust to position over the node
            zIndex: 2,
          }}
          autoFocus
        />
      )}
    </div>
  );
}

export default App;
