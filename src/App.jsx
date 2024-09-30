// src/App.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import FontFaceObserver from 'fontfaceobserver';

import stylesheet from './graphStyles';
import useGraphHandlers from './hooks/useGraphHandlers';

const PLAYER_MODE = 'player';
const BUILDER_MODE = 'builder';
// const ACTIVE_STATE = 'activated';
const AVAIL_STATE = 'available';
const HIDDEN_STATE = 'hidden';

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

  const [skillTreeMode, setSkillTreeMode] = useState(BUILDER_MODE); // 'builder' or 'player'

  const validateSkillTree = () => {

    removeTemporaryNodes();

    // Logic to check if every connected component has at least one node set as 'available'
    const cyElements = cy.elements();
  
    const components = cyElements.components(); // Get connected components
    for (let i = 0; i < components.length; i++) {
      const component = components[i];

      // skip checking current component if it is a button node
      if(component.data().id.includes("btn")) {
        continue;
      };

      const hasAvailableNode = component.nodes().some((node) => {
        return node.data('initialState') === 'available';
      });
      if (!hasAvailableNode) {
        // Highlight the component or inform the user
        return false;
      }
    }
    return true;
  };  

  // Initialize player progress data
  // Function which sets the current state of a node to its initial state
  // when in building mode, node states are not to be set (they should be null)
  // When switching from player mode to builder mode, temp states are set
  // from the current state of the nodes
  const initializePlayerDataForPlayerMode = () => {
    setElements((els) =>
      els.map((el) => {
        if (el.group === 'nodes') {
          return {
            ...el,
            data: {
              ...el.data,
              state: el.data.initialState,
              tempState: null
            },
          };
        }
        return el;
      })
    );
  };

  const initializePlayerDataForBuilderMode = () => {
    setElements((els) =>
      els.map((el) => {
        if (el.group === 'nodes') {
          return {
            ...el,
            data: {
              ...el.data,
              state: null,
              tempState: el.data.initialState
            },
          };
        }
        return el;
      })
    );
  }

  const resetSkillTreeProgress = () => {
    if (window.confirm('Are you sure you want to reset the skill tree?')) {
      initializePlayerDataForPlayerMode();
    }
  }

  // Save player progress by setting the temp state of each node
  // to have the value of the current state of each node, and
  // reset the current state of each node back to null
  const savePlayerProgress = () => {
    setElements((els) =>
      els.map((el) => {
        if (el.group === 'nodes') {
          return {
            ...el,
            data: {
              ...el.data,
              tempState: el.data.state,
              state: null,
            },
          };
        }
        return el;
      })
    );
  }

  // Restore player progress by setting the current state of each node
  // to have the value of the temp state of each node, and
  // reset the temp state of each node back to null
  const restorePlayerProgress = () => {
    setElements((els) =>
      els.map((el) => {
        if (el.group === 'nodes') {
          return {
            ...el,
            data: {
              ...el.data,
              state: el.data.tempState,
              tempState: null,
            },
          };
        }
        return el;
      })
    );
  }

  const skillTreeHasTempStates = () => {
    // Check if the skill tree has any temp states set
    return elements.some((el) => el.group === 'nodes' && el.data.tempState !== null);
  }

  // Function to toggle modes
  const toggleMode = () => {
    if (skillTreeMode === BUILDER_MODE) {
      // Validate the skill tree before switching
      if (validateSkillTree()) {
        if(skillTreeHasTempStates()) {
          restorePlayerProgress();
        } else {
          initializePlayerDataForBuilderMode();
        }
        setSkillTreeMode(PLAYER_MODE);
      } else {
        alert('Skill tree is not valid. Please fix the errors before switching to Player Mode.');
      }
    } else {
      // Save player progress
      savePlayerProgress();
      setSkillTreeMode(BUILDER_MODE);
    }
  };

  const onChangeIcon = (nodeId) => {
    setIconChangeNodeId(nodeId);
    setIsChangingIcon(true);
  };

  // Define the demo elements
  const demoElements = useMemo(() => [
    {
      group: 'nodes',
      data: { id: 'node-1', label: 'Insight', image: icons['eye'], initialState: AVAIL_STATE },
      position: { x: 0, y: 0 },
    },
    {
      group: 'nodes',
      data: { id: 'node-2', label: 'Leaf Shield', image: icons['leaf'], initialState: HIDDEN_STATE },
      position: { x: 100, y: 0 },
    },
    {
      group: 'nodes',
      data: { id: 'node-3', label: 'Air Strike Shield', image: icons['wind'], initialState: HIDDEN_STATE },
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
    removeTemporaryNodes
  } = useGraphHandlers(cy, elements, setElements, onChangeIcon, skillTreeMode, setIsChangingIcon);

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
      const elementsData = cyRef.current.elements().jsons(); // Includes node states
      const json = JSON.stringify({
        elements: elementsData,
        treeName,
        zoom: cyRef.current.zoom(),
        pan: cyRef.current.pan(),
        playerProgress: skillTreeMode === PLAYER_MODE ? elementsData : null,
      });
      localStorage.setItem('graphState', json);
    }
  }, [cyRef, treeName, skillTreeMode]);
  

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
  
  const loadDemoGraph = useCallback(() =>{
    setElements(demoElements);
    setTreeName('Demo Tree');
    setZoom(3.5);
    setPan({ x: 160, y: 272 });
    saveToLocalStorage();
    if(skillTreeMode === PLAYER_MODE) {
      initializePlayerDataForPlayerMode();
    } else {
      initializePlayerDataForBuilderMode();
    }
  }, [demoElements, saveToLocalStorage, skillTreeMode]);

  const loadFromLocalStorage = useCallback(() => {
    const json = localStorage.getItem('graphState');
    if (json) {
      const state = JSON.parse(json);
      setElements(state.elements || demoElements);
      setTreeName(state.treeName || 'Untitled 1');
      setZoom(state.zoom || 1);
      setPan(state.pan || { x: 0, y: 0 });
      //// TODO: confirm that player mode is relevant to whether or not player progress should be loaded
      if (state.playerProgress && skillTreeMode === PLAYER_MODE) {
        // Load player progress
        setElements(state.playerProgress);
      }
    } else {
      // Use demo data
      loadDemoGraph();
      // setElements(demoElements);
      // setZoom(1);
      // setPan({ x: 0, y: 0 });
    }
  }, [demoElements, skillTreeMode, loadDemoGraph]);
  
  

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
    const font = new FontFaceObserver('Old English Text MT'); // Replace with your font's name

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
        <div className="pointer-events-none">
          {skillTreeMode === BUILDER_MODE &&
          <button className="pointer-events-auto" onClick={addNode}>Add Skill</button>}
          <button className="pointer-events-auto" onClick={() => cyRef && cyRef.current && cyRef.current.fit()}>Re-Center</button>
          <button className="pointer-events-auto" onClick={printElements}>Log</button>
          <button className="pointer-events-auto" onClick={saveGraphToJSON}>Save</button>
          <button className="pointer-events-auto" onClick={loadGraphFromJSON}>Load</button>
          <button className="pointer-events-auto" onClick={loadDemoGraph}>Demo</button>
          {skillTreeMode === BUILDER_MODE &&
          <button className="pointer-events-auto" onClick={clearGraphData}>Clear</button>}
          {skillTreeMode === PLAYER_MODE &&
            <button className="pointer-events-auto" onClick={resetSkillTreeProgress}>Reset</button>}
          <button className="pointer-events-auto" onClick={toggleMode}>
            Switch to {skillTreeMode === BUILDER_MODE ? 'Player' : 'Builder'} Mode
          </button>
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
            left: editNodePosition.x - 80, // Adjust based on input width
            top: editNodePosition.y - 115, // Adjust to position over the node
            width: '200px',
            zIndex: 2,
          }}
          autoFocus
        />
      )}
      {/* Icon Selection Sidebar */}
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
