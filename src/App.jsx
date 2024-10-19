// src/App.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import FontFaceObserver from "fontfaceobserver";

import EditModal from "./components/EditModal";
import InfoModal from "./components/InfoModal";

import stylesheet from "./graphStyles";
import useGraphHandlers from "./hooks/useGraphHandlers";

import warningIcon from './assets/warning_triangle.png';

const PLAYER_MODE = "player";
const BUILDER_MODE = "builder";
// const ACTIVE_STATE = "activated";
const AVAIL_STATE = "available";
const HIDDEN_STATE = "hidden";

// Function to load all icons from assets/icons/
function loadIcons() {
  // Automatically import all files in the specified folder
  const context = import.meta.glob("./assets/icons/*.png", { eager: true });
  const icons = {};
  for (const key in context) {
    const iconName = key.replace("./assets/icons/", "").replace(".png", "");
    icons[iconName] = context[key].default;
  }
  return icons;
}

// Load icons
const icons = loadIcons();

const ZOOM_MIN = 0.9;
const ZOOM_MAX = 12;

const zoomToFontRem = {
  zoomMin: ZOOM_MIN,
  zoomMax: ZOOM_MAX,
  outMin: 0.55, // in rem
  outMax: 7, // in rem
};

const zoomToLabelWdith = {
  zoomMin: ZOOM_MIN,
  zoomMax: ZOOM_MAX,
  outMin: 120, // in px
  outMax: 800, // in px
};

const zoomToYOffset = {
  zoomMin: ZOOM_MIN,
  zoomMax: ZOOM_MAX,
  outMin: 20, // in px
  outMax: 450, // in px
};

const zoomToXOffset = {
  zoomMin: ZOOM_MIN,
  zoomMax: ZOOM_MAX,
  outMin: 45, // in px
  outMax: 385, // in px
};

function mapZoomToVal(zoom, mapping) {
  const { zoomMin, zoomMax, outMin, outMax } = mapping;
  const out =
    outMin + ((zoom - zoomMin) / (zoomMax - zoomMin)) * (outMax - outMin);
  // clamps output values for when outside of zoom range
  return Math.min(Math.max(out, outMin), outMax);
}

function stripUnderscores(str) {
  return str.replace(/_/g, " ");
}

function App() {
  const [treeName, setTreeName] = useState("Demo Tree");

  const [zoom, setZoom] = useState(2.2);
  const [pan, setPan] = useState({ x: 85, y: 315 });

  // State variables for changing icon
  const [isChangingIcon, setIsChangingIcon] = useState(false);
  const [iconChangeNodeId, setIconChangeNodeId] = useState(null);

  const [skillTreeMode, setSkillTreeMode] = useState(BUILDER_MODE); // 'builder' or 'player'

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isMenuFocused, setIsMenuFocused] = useState(false);
  const [menuHoverState, setMenuHoverState] = useState("");
  const hideMenuTimerRef = useRef(null);

  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentLabel, setCurrentLabel] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState(null);

  const [selectedNodeData, setSelectedNodeData] = useState(null);

  const carouselRef = useRef(null);

  useEffect(() => {
    const carousel = carouselRef.current;

    const handleWheel = (e) => {
      e.preventDefault();
      carousel.scrollLeft -= e.deltaY;
    };

    if (carousel) {
      carousel.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (carousel) {
        carousel.removeEventListener('wheel', handleWheel);
      }
    };
  }, [isChangingIcon]);

  const handleDescriptionChange = (newDescription) => {
    setCurrentDescription(newDescription);
  };

  const handleEditDescription = (nodeId) => {
    const node = elements.find((el) => el.data.id === nodeId);
    if (node) {
      setCurrentDescription(node.data.description || '');
      setCurrentLabel(node.data.label || '');
      setCurrentNodeId(nodeId);
      setIsDescriptionModalOpen(true);
    }
  };

  const saveDescription = () => {
    setElements((els) =>
      els.map((el) => {
        if (el.data.id === currentNodeId) {
          return {
            ...el,
            data: {
              ...el.data,
              description: currentDescription,
            },
          };
        }
        return el;
      })
    );
    closeDescriptionModal();
  };

  const closeDescriptionModal = () => {
    setIsDescriptionModalOpen(false);
    setCurrentDescription('');
    setCurrentLabel('');
    setCurrentNodeId(null);
  };

  useEffect(() => {
    return () => {
      if (hideMenuTimerRef.current) {
        clearTimeout(hideMenuTimerRef.current);
      }
    };
  }, []);

  const validateSkillTree = () => {
    removeTemporaryNodes();

    if (!cy) {
      console.error("Cytoscape instance not available");
      return false;
    }

    // Check for cycles in the graph
    if(detectCycles(cy)) {
      alert("Validation failed: The skill tree contains a cycle. Please remove the cycle before switching to Player Mode.");
      return false;
    }

    // Get all nodes excluding flourish and action nodes
    const nodes = cy.nodes().filter((node) => {
      return !node.hasClass('flourish-node') && !node.hasClass('action-node');
    });

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.roots();

    // Check if any root node is hidden
    const hiddenRootNodes = rootNodes.filter((node) => {
      const initialState = node.data('initialState');
      return initialState === HIDDEN_STATE;
    });

    if (hiddenRootNodes.length > 0) {
      // Highlight hidden root nodes or inform the user
      const hiddenRootNodeNames = hiddenRootNodes.map((node) => node.data('label') || node.id());
      alert(`Validation failed: The following root nodes are hidden: ${hiddenRootNodeNames.join(', ')}. Please set them to "available" or "activated" before switching to Player Mode.`);
      return false;
    }

    // All root nodes are available or activated
    return true;
  };



  // Initialize player progress data
  // Function which sets the current state of a node to its initial state
  // when in building mode, node states are not to be set (they should be null)
  // When switching from player mode to builder mode, temp states are set
  // from the current state of the nodes
  const initializePlayerDataForPlayerMode = () => {
    // console.log("initializing player data for player mode...");
    setElements((els) =>
      els.map((el) => {
        if (el.group === "nodes") {
          return {
            ...el,
            data: {
              ...el.data,
              state: el.data.initialState,
              tempState: null,
            },
            locked: true,
          };
        }
        return el;
      })
    );
  };

  const initializePlayerDataForBuilderMode = () => {
    // console.log("initializing player data for builder mode...");
    setElements((els) =>
      els.map((el) => {
        if (el.group === "nodes") {
          return {
            ...el,
            data: {
              ...el.data,
              state: null,
              tempState: el.data.initialState,
            },
            locked: false,
          };
        }
        return el;
      })
    );
  };

  const resetSkillTreeProgress = () => {
    if (
      window.confirm(
        "Are you sure you want to reset the skill tree progress back to its initial state?"
      )
    ) {
      initializePlayerDataForPlayerMode();
    }
  };

  // Save player progress by setting the temp state of each node
  // to have the value of the current state of each node, and
  // reset the current state of each node back to null
  const savePlayerProgress = () => {
    // console.log("saving player progress to temp states...");
    setElements((els) =>
      els.map((el) => {
        if (el.group === "nodes") {
          return {
            ...el,
            data: {
              ...el.data,
              tempState: el.data.state,
              state: null,
            },
            locked: false,
          };
        }
        return el;
      })
    );
  };

  // Restore player progress by setting the current state of each node
  // to have the value of the temp state of each node, and
  // reset the temp state of each node back to null
  const restorePlayerProgress = () => {
    // console.log("restoring player progress from temp states...");
    setElements((els) =>
      els.map((el) => {
        if (el.group === "nodes") {
          return {
            ...el,
            data: {
              ...el.data,
              state: el.data.tempState,
              tempState: null,
            },
            locked: true,
          };
        }
        return el;
      })
    );
  };

  const skillTreeHasTempStates = () => {
    // Check if the skill tree has any temp states set
    return elements.some(
      (el) => el.group === "nodes" && el.data.tempState !== null
    );
  };

  // Function to toggle modes
  const toggleMode = () => {
    if (skillTreeMode === BUILDER_MODE) {
      // Validate the skill tree before switching
      if (validateSkillTree()) {
        if (skillTreeHasTempStates()) {
          restorePlayerProgress();
        } else {
          initializePlayerDataForBuilderMode();
        }
        setSkillTreeMode(PLAYER_MODE);
      } // else do nothing if validation returns false
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
  const demoElements = useMemo(
    () => [
      {
        group: "nodes",
        classes: "icon-node",
        data: {
          id: "node-1",
          label: "Small Shield",
          image: icons["shield"],
          initialState: AVAIL_STATE,
          description: `During the first episode of Shield Hero, the first monster that Naofumi encounters is the balloon, a small, orange, and rubbery creature with pointy incisor teeth. Balloons are possibly the weakest of any enemy that Naofumi has encountered, so, unsurprisingly, they transform into weak shields once absorbed. Naofumi receives three unremarkable shields, with each one providing a minor defense bonus when equipped.`
        },
        position: { x: 0, y: 0 },
      },
      {
        group: "nodes",
        classes: "icon-node",
        data: {
          id: "node-2",
          label: "Leaf Shield",
          image: icons["leaf"],
          initialState: HIDDEN_STATE,
          description: `During the first episode of Shield Hero, Naofumi is attempting to gain enough money to live comfortably, taking on low-level monsters and collecting herbs. While experimenting and learning about his unique hero power, he places a leaf against his shield, and it's suddenly absorbed, transforming it into a Leaf Shield.

This is the first of two plant-type shields he acquires, granting him an improved absorption rate, making medicine more effective, and a harvest ability that allows him to collect herbs more effectively. Later in the series, he encounters a BioPlant. After absorbing one of its seeds, he gains three additional shields: the BioPlant Shield, the PlantRiwe Shield, and the Mandragora Shield.`
        },
        position: { x: 100, y: 0 },
      },
      {
        group: "nodes",
        classes: "icon-node",
        data: {
          id: "node-3",
          label: "Air Strike Shield",
          image: icons["wind"],
          initialState: HIDDEN_STATE,
          description: `Instantly creates a floating shield for defense anywhere within a radius of 5 meters which lasts for a duration of 15 seconds. This ability is very versatile, as it can create shields in the air that allow the user and others to jump over them to reach or escape threats, it can also be used to immobilize the enemy by blocking their path with shields. The Air Strike Shield was shown in the anime to be able to be thrown at targets, dealing light damage and knocking targets off balance.`
        },
        position: { x: 200, y: 0 },
      },
      {
        group: "edges",
        data: {
          id: "edge-node-1-node-2",
          source: "node-1",
          target: "node-2",
        },
      },
      {
        data: {
          group: "edges",
          id: "edge-node-2-node-3",
          source: "node-2",
          target: "node-3",
        },
      },
      {
        classes: "flourish-node",
        data: {
          id: "flourish-node-1",
          initialState: "available",
          parentId: "node-1",
          state: null,
          tempState: "available",
        },
        group: "nodes",
        position: { x: 0, y: -45 },
      },
      {
        classes: "flourish-node",
        data: {
          id: "flourish-node-2",
          initialState: "hidden",
          parentId: "node-2",
          state: null,
          tempState: "hidden",
        },
        group: "nodes",
        position: { x: 100, y: -45 },
      },
      {
        classes: "flourish-node",
        data: {
          id: "flourish-node-3",
          initialState: "hidden",
          parentId: "node-3",
          state: null,
          tempState: "hidden",
        },
        group: "nodes",
        position: { x: 200, y: -45 },
      },
    ],
    []
  );

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
    removeTemporaryNodes,
  } = useGraphHandlers(
    cy,
    elements,
    setElements,
    onChangeIcon,
    skillTreeMode,
    setIsChangingIcon,
    handleEditDescription,
    setSelectedNodeData
  );

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
                iconName: iconName, // Store the icon name
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
    console.log("Current elements:", elements);
    console.log("Current zoom level:", cyRef.current.zoom());
    console.log("Current pan position:", cyRef.current.pan());
  };

  const saveGraphToJSON = () => {
    if (cyRef && cyRef.current) {
      const elementsData = cyRef.current.elements().jsons(); // Get elements with positions
  
      // Remove image URLs from data before saving
      const adjustedElements = elementsData.map((el) => {
        if (el.data && el.data.iconName) {
          return {
            ...el,
            data: {
              ...el.data,
              image: undefined, // Remove the image property
            },
          };
        }
        return el;
      });
  
      const json = JSON.stringify({
        elements: adjustedElements,
        treeName,
        zoom: cyRef.current.zoom(),
        pan: cyRef.current.pan(),
        mode: skillTreeMode
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
  
      // Remove image URLs from data before saving
      const adjustedElements = elementsData.map((el) => {
        if (el.data && el.data.iconName) {
          return {
            ...el,
            data: {
              ...el.data,
              image: undefined, // Remove the image property
            },
          };
        }
        return el;
      });
  
      const json = JSON.stringify({
        elements: adjustedElements,
        treeName,
        zoom: cyRef.current.zoom(),
        pan: cyRef.current.pan(),
        mode: skillTreeMode
      });
      localStorage.setItem('graphState', json);
    }
  }, [cyRef, treeName, skillTreeMode]);
  

  const loadFromJSON = (event) => {
    const file = event.target.files[0];
    const preloadMode = skillTreeMode;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = JSON.parse(e.target.result);
        const elements = json.elements || demoElements;
  
        // Reconstruct images from icon names
        const updatedElements = elements.map((el) => {
          if (el.group === 'nodes') {
            let iconName = el.data.iconName;
        
            if (!iconName && el.data.image) {
              // Attempt to find the icon name based on the image URL
              iconName = Object.keys(icons).find(
                (name) => icons[name] === el.data.image
              );
            }
        
            const iconImage = icons[iconName] || warningIcon;
            return {
              ...el,
              data: {
                ...el.data,
                iconName: iconName,
                image: iconImage,
              },
            };
          }
          return el;
        });
        
  
        setElements(updatedElements);
        setTreeName(json.treeName || 'Untitled 1');
        setZoom(json.zoom || 1);
        setPan(json.pan || { x: 0, y: 0 });
        if(preloadMode !== json.mode) {
          // Then, switch the mode to the preload mode using the appropriate function
          if (preloadMode === PLAYER_MODE) {
            initializePlayerDataForPlayerMode();
          } else {
            initializePlayerDataForBuilderMode();
          }
        }
      };
      reader.readAsText(file);
    }
  };
  

  const loadGraphFromJSON = () => {
    if (
      elements.length === 0 ||
      window.confirm(
        "Before loading a new skill tree, are you sure you want to overwrite the current skill tree data?"
      )
    ) {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "application/json";
      fileInput.onchange = loadFromJSON;
      fileInput.click();
    }
  };

  const loadDemoGraph = useCallback(() => {
    if (
      elements.length === 0 ||
      window.confirm(
        "Before loading the demo tree, are you sure you want to overwrite the current skill tree data?"
      )
    ) {
      setElements(demoElements);
      setTreeName("Demo Tree");
      setZoom(2.2);
      setPan({ x: 85, y: 315 });
      saveToLocalStorage();
      if (skillTreeMode === PLAYER_MODE) {
        initializePlayerDataForPlayerMode();
      } else {
        initializePlayerDataForBuilderMode();
      }
    }
  }, [demoElements, saveToLocalStorage, skillTreeMode, elements]);

  const loadFromLocalStorage = useCallback(() => {
    const json = localStorage.getItem('graphState');
    if (json) {
      const state = JSON.parse(json);
      const elements = state.elements || demoElements;
  
      // Reconstruct images from icon names
      const updatedElements = elements.map((el) => {
        if (el.group === 'nodes') {
          let iconName = el.data.iconName;
      
          if (!iconName && el.data.image) {
            // Attempt to find the icon name based on the image URL
            iconName = Object.keys(icons).find(
              (name) => icons[name] === el.data.image
            );
          }
      
          const iconImage = icons[iconName] || warningIcon;
          return {
            ...el,
            data: {
              ...el.data,
              iconName: iconName,
              image: iconImage,
            },
          };
        }
        return el;
      });
      
  
      setElements(updatedElements);
      setTreeName(state.treeName || 'Untitled 1');
      setSkillTreeMode(state.mode || BUILDER_MODE);
      setZoom(state.zoom || 1);
      setPan(state.pan || { x: 0, y: 0 });
  
      if (!state.elements) {
        // If the elements are not present in the local storage data  
        console.log("Loading demo data because local storage data is not available");
        loadDemoGraph();
      }
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
    const font = new FontFaceObserver("Old English Text MT"); // Replace with your font's name

    font.load().then(
      () => {
        console.log("Font has loaded");
        setIsFontLoaded(true);
      },
      (err) => {
        console.error("Font failed to load", err);
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
    if (
      window.confirm("Are you sure you want to delete the current skill tree?")
    ) {
      localStorage.removeItem("graphState");
      setElements([]);
      setTreeName("Untitled 1");
    }
  };

  const dfs = (nodeId, visited, recStack) => {
    visited.add(nodeId);
    recStack.add(nodeId);
    
    // Only consider outgoing edges
    const neighbors = cy.getElementById(nodeId).outgoers('node');
  
    for (const neighbor of neighbors) {
      const neighborId = neighbor.id();
      
      // If the neighbor has not been visited, perform DFS
      if (!visited.has(neighborId)) {
        if (dfs(neighborId, visited, recStack)) {
          return true;
        }
      // If the neighbor is in the recursion stack, a cycle is detected
      } else if (recStack.has(neighborId)) {
        // console.log(`Cycle detected between ${nodeId} and ${neighborId}`);
        return true;
      }
    }
  
    // Remove node from the recursion stack once DFS is done
    recStack.delete(nodeId);
    return false;
  };
  
  const detectCycles = (cy) => {
    const visited = new Set();
    const recStack = new Set();
  
    for (const node of cy.nodes()) {
      const nodeId = node.id();  // Extract the node ID
      if (!visited.has(nodeId)) {
        if (dfs(nodeId, visited, recStack)) {
          // console.log("Cycle detected");
          return true;
        }
      }
    }
  
    // console.log("No cycles detected");
    return false;
  };

  return (
    <div className="bg-dark-gray relative w-100 vh-100">
      <div className="background-image absolute w-100 h-100">
      <div className="blur-div absolute z-0 w-100 h-100 bg-blur-1"></div>
        <img
          // src="https://images.unsplash.com/photo-1467810160588-c86c0deb5d16"
          src="https://www.pixelstalk.net/wp-content/uploads/2016/04/Stars-wallpapers-HD-backgrounds-download.jpg"
          alt="background"
          className="w-100 h-100 object-cover"
        />
      </div>
      {isFontLoaded && (
        <CytoscapeComponent
          className={`bg-transparent h-100 w-100 relative z-0 pa3 ${(isDescriptionModalOpen || selectedNodeData) && ' o-50 '}`}
          elements={elements}
          stylesheet={stylesheet}
          layout={{ name: "preset" }}
          cy={(cyInstance) => {
            cyRef.current = cyInstance;
            setCy(cyInstance); // Set the cy state variable
          }}
        />
      )}
      {/* Overlay UI Elements */}
      <div className="z-1 absolute top-0 left-0 pa3 pointer-events-none flex items-start">
        {/* Menu Button */}
        <div
          className={`menu-button relative top-0 left-0 pointer-events-auto ba bw1 b--white br4 pa2 ph3 dib ${
            menuHoverState === "focused"
              ? " bg-white-20 "
              : menuHoverState === "hovered"
              ? " bg-white-10 "
              : " bg-transparent "
          }`}
          onMouseEnter={() => {
            setIsMenuVisible(true);
            if (hideMenuTimerRef.current) {
              clearTimeout(hideMenuTimerRef.current);
              hideMenuTimerRef.current = null;
            }
            if (!isMenuFocused) {
              setMenuHoverState("hovered");
            }
          }}
          onMouseLeave={() => {
            if (!isMenuFocused) {
              setMenuHoverState("");
              hideMenuTimerRef.current = setTimeout(() => {
                setIsMenuVisible(false);
                hideMenuTimerRef.current = null;
              }, 1000);
            }
          }}
          onFocus={() => {
            setIsMenuFocused(true);
            setIsMenuVisible(true);
            setMenuHoverState("focused");
            if (hideMenuTimerRef.current) {
              clearTimeout(hideMenuTimerRef.current);
              hideMenuTimerRef.current = null;
            }
          }}
          onBlur={() => {
            setIsMenuFocused(false);
            setMenuHoverState("");
            hideMenuTimerRef.current = setTimeout(() => {
              setIsMenuVisible(false);
              hideMenuTimerRef.current = null;
            }, 1000);
          }}
          tabIndex="0" // Makes the div focusable
        >
          Menu
        </div>
        {/* Menu Content */}
        {isMenuVisible && (
          <div
            className="menu-content pointer-events-auto ph3 dib"
            onMouseEnter={() => {
              setIsMenuVisible(true);
              if (hideMenuTimerRef.current) {
                clearTimeout(hideMenuTimerRef.current);
                hideMenuTimerRef.current = null;
              }
            }}
            onMouseLeave={() => {
              if (!isMenuFocused) {
                hideMenuTimerRef.current = setTimeout(() => {
                  setIsMenuVisible(false);
                  hideMenuTimerRef.current = null;
                }, 1000);
              }
            }}
          >
            <h1 className="ma0 user-select-none dib flex">
              <span className="f2 mr2 w5 tc">Skill Tree:</span>
              <input
                className="f3 ph2 pointer-events-auto w-100"
                type="text"
                value={treeName}
                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                onChange={(e) => setTreeName(e.target.value)}
              />
            </h1>
            <div className="pointer-events-auto mt3">
              {skillTreeMode === BUILDER_MODE && (
                <button className="pointer-events-auto" onClick={addNode}>
                  Add Skill
                </button>
              )}
              <button
                className="pointer-events-auto"
                onClick={() => cyRef && cyRef.current && cyRef.current.fit()}
              >
                Re-Center
              </button>
              <button className="pointer-events-auto" onClick={printElements}>
                Log
              </button>
              <button className="pointer-events-auto" onClick={saveGraphToJSON}>
                Save
              </button>
              <button
                className="pointer-events-auto"
                onClick={loadGraphFromJSON}
              >
                Load
              </button>
              <button className="pointer-events-auto" onClick={loadDemoGraph}>
                Demo
              </button>
              {skillTreeMode === BUILDER_MODE && (
                <button
                  className="pointer-events-auto"
                  onClick={clearGraphData}
                >
                  Clear
                </button>
              )}
              {skillTreeMode === PLAYER_MODE && (
                <button
                  className="pointer-events-auto"
                  onClick={resetSkillTreeProgress}
                >
                  Reset
                </button>
              )}
              <button className="pointer-events-auto" onClick={toggleMode}>
                Switch to{" "}
                {skillTreeMode === BUILDER_MODE ? "Player" : "Builder"} Mode
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Edit Input Field */}
      {isEditing && editNode && editNodePosition && (
        <input
          className="f3 absolute z-2 tc"
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            left:
              editNodePosition.x -
              mapZoomToVal(cyRef.current.zoom(), zoomToXOffset), // Adjust based on input width
            top:
              editNodePosition.y -
              mapZoomToVal(cyRef.current.zoom(), zoomToYOffset), // Adjust to position over the node
            fontSize: `${mapZoomToVal(cyRef.current.zoom(), zoomToFontRem)}rem`,
            width: `${mapZoomToVal(cyRef.current.zoom(), zoomToLabelWdith)}px`,
          }}
          autoFocus
        />
      )}
      {/* Icon Selection Carousel */}
      {isChangingIcon && (
        <div
          className="icon-carousel-container absolute bottom-0 right-0 z-999 pointer-events-auto w-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="icon-carousel bg-blur bg-black-20 pa3 flex items-center overflow-x-auto"
            ref={carouselRef}
          >
            {Object.keys(icons).reduce((acc, iconName, index, array) => {
              // Add a decorative div before the first icon
              if (index === 0) {
                acc.push(<div key="decorative-start" className="relative w2 bg-blue h34 db pointer-events-none"><div className="dots db"></div></div>);
              }

              // Add the icon div button
              acc.push(
                <div
                  key={iconName}
                  onClick={() => handleIconSelect(iconName)} 
                  className="icon-item flex flex-column items-center w34 pointer"
                >
                  <img
                    src={icons[iconName]}
                    alt={iconName}
                    className="icon-button w33 h33 pa1 pointer"
                  />
                  <span className="icon-name w34 f6 white tc nowrap capitalized">{stripUnderscores(iconName)}</span>
                </div>
              );

              // Add a decorative div between elements AND after the last element
              if (index < array.length) {
                acc.push(<div key={`dot-${index}`} className="relative w2 bg-blue h34 db pointer-events-none"><div className="dots db"></div></div>);
              }

              return acc;
            }, [])}
          </div>
        </div>
      )}

      {skillTreeMode === BUILDER_MODE &&
        <EditModal
          isOpen={isDescriptionModalOpen}
          description={currentDescription}
          label={currentLabel}
          onDescriptionChange={handleDescriptionChange}
          onSave={saveDescription}
          onClose={closeDescriptionModal}
        />}

      {skillTreeMode === PLAYER_MODE && (
        <InfoModal
          nodeData={selectedNodeData}
          onClose={() => setSelectedNodeData(null)}  // Close info panel
        />
      )}

    </div>
  );
}

export default App;
