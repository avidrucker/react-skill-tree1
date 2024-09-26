// src/App.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import FontFaceObserver from 'fontfaceobserver';

import stylesheet from './graphStyles';
import useGraphHandlers from './hooks/useGraphHandlers';

// Function to load all icons from assets/icons/
function loadIcons() {
  // Automatically import all files in the specified folder
  const context = import.meta.glob('./assets/icons/*.png', { eager: true });
  const icons = {};
  for (const key in context) {
    const iconName = key.replace('./assets/icons/', '').replace('.png', '');
    icons[iconName] = context[key].default;
  }
  return icons;
}

// Load icons
const icons = loadIcons();

function App() {
  const [treeName, setTreeName] = useState('Demo Tree');

  const [zoom, setZoom] = useState(3.5);
  const [pan, setPan] = useState({ x: 160, y: 272 });

  // State variables for changing icon
  const [isChangingIcon, setIsChangingIcon] = useState(false);
  const [iconChangeNodeId, setIconChangeNodeId] = useState(null);

  const onChangeIcon = (nodeId) => {
    setIconChangeNodeId(nodeId);
    setIsChangingIcon(true);
  };

  // Define the demo elements
  const demoElements = useMemo(() => [
    {
      group: 'nodes',
      data: { id: 'node-1', label: 'Insight', image: icons['eye'] },
      position: { x: 0, y: 0 },
    },
    {
      group: 'nodes',
      data: { id: 'node-2', label: 'Leaf Shield', image: icons['leaf'] },
      position: { x: 100, y: 0 },
    },
    {
      group: 'nodes',
      data: { id: 'node-3', label: 'Air Strike Shield', image: icons['wind'] },
      position: { x: 200, y: 0 },
    },
    {
      group: 'edges',
      data: {
        id: 'edge-node-1-node-2',
        source: 'node-1',
        target: 'node-2',
      },
    },
    {
      data: {
        group: 'edges',
        id: 'edge-node-2-node-3',
        source: 'node-2',
        target: 'node-3',
      },
    },
  ], []);

  const [elements, setElements] = useState(demoElements);
  const cyRef = useRef(null);
  const [cy, setCy] = useState(null); // Add this line

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
  } = useGraphHandlers(cy, elements, setElements, onChangeIcon);

  // Handle icon selection
  const handleIconSelect = (iconName) => {
    if (iconChangeNodeId && cyRef.current) {
      // Update the node's image data
      setElements((els) =>
        els.map((el) => {
          if (el.data.id === iconChangeNodeId && el.group === 'nodes') {
            return {
              ...el,
              data: {
                ...el.data,
                image: icons[iconName], // Set the new image
              },
            };
          }
          return el;
        })
      );

      // Close the sidebar
      setIsChangingIcon(false);
      setIconChangeNodeId(null);
    }
  };

  const printElements = () => {
    console.log('Current elements:', elements);
  };

  const saveGraphToJSON = () => {
    if (cyRef && cyRef.current) {
      const elementsData = cyRef.current.elements().jsons(); // Get elements with positions
      const json = JSON.stringify({
        elements: elementsData,
        treeName,
        zoom: cyRef.current.zoom(),
        pan: cyRef.current.pan(),
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
  
  const saveToLocalStorage = useCallback(() => {
    if (cyRef && cyRef.current) {
      const elementsData = cyRef.current.elements().jsons(); // Get elements with positions
      const json = JSON.stringify({
        elements: elementsData,
        treeName,
        zoom: cyRef.current.zoom(),
        pan: cyRef.current.pan(),
      });
      localStorage.setItem('graphState', json);
    }
  }, [cyRef, treeName]);

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
  
  const loadFromLocalStorage = useCallback(() => {
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
  }, [demoElements]);
  

  // Load from local storage once when the component mounts
  useEffect(() => {
    if (!hasLoadedFromLocalStorage.current) {
      loadFromLocalStorage();
      hasLoadedFromLocalStorage.current = true;
    }
  }, [loadFromLocalStorage]); // Empty dependency array ensures this runs once

  // Save to local storage whenever elements or treeName change
  useEffect(() => {
    saveToLocalStorage();
  }, [treeName, elements, saveToLocalStorage]);

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
    if (cyRef && cyRef.current && zoom !== null && pan !== null) {
      cyRef.current.zoom(zoom);
      cyRef.current.pan(pan);
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
        cy={(cyInstance) => {
          cyRef.current = cyInstance;
          setCy(cyInstance); // Set the cy state variable
        }}
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
          <button onClick={() => cyRef && cyRef.current && cyRef.current.fit()}>Re-Center</button>
          <button onClick={printElements}>Log</button>
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
      {/* Icon Selection Sidebar //// */}
      {isChangingIcon && (
        <div className="icon-sidebar bg-blue overflow-y-auto h-100 z-999 absolute top-0 right-0">
          <div className="icon-list flex flex-column pa3">
            {Object.keys(icons).map((iconName) => (
              <img
                key={iconName}
                src={icons[iconName]}
                alt={iconName}
                onClick={() => handleIconSelect(iconName)}
                className="icon-button w4 h4 pa1 pointer"
              />
            ))}
          </div>
          <button onClick={() => setIsChangingIcon(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default App;
