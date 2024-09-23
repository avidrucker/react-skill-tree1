// src/App.jsx
import { useState, useEffect } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

import stylesheet from './graphStyles';
import useGraphHandlers from './hooks/useGraphHandlers';
import eyeIcon from './assets/eye.png';
import leafIcon from './assets/leaf.png';
import windIcon from './assets/wind.png';

// import nodeOutlineBg from './assets/node_outline_bg.png';

function App() {
  const [treeName, setTreeName] = useState('Untitled 1');
  const [elements, setElements] = useState([
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
        target: 'node-2'
      },
    },
    {
      data: {
        id: 'edge-node-2-node-3',
        source: 'node-2',
        target: 'node-3'
      },
    },
  ]);
  const [cyRef, setCyRef] = useState(null);

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

  // const printCyRef = () => {
  //   console.log('Current cyRef:', cyRef);
  // }

  const saveToJson = () => {
    const json = JSON.stringify({ elements, cyRef: cyRef.json(), treeName });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${treeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromJson = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = JSON.parse(e.target.result);
        setElements(json.elements);
        cyRef.json(json.cyRef);
        setTreeName(json.treeName);
      };
      reader.readAsText(file);
    }
  };

  const loadGraphFromJSON = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json";
    fileInput.onchange = loadFromJson;
    fileInput.click();
  };

  const saveToLocalStorage = () => {
    if(cyRef) {
      const json = JSON.stringify({ elements, cyRef: cyRef.json(), treeName });
      localStorage.setItem('graphState', json);
    }
  };

  const loadFromLocalStorage = () => {
    const json = localStorage.getItem('graphState');
    if (json && cyRef) {
      const state = JSON.parse(json);
      setElements(state.elements);
      cyRef.json(state.cyRef);
      setTreeName(state.treeName);
    }
  };

  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  useEffect(() => {
    saveToLocalStorage();
  }, [treeName, elements, cyRef]);

  return (
    <div
      className="bg-black relative w-100 vh-100"
    >
      <CytoscapeComponent
        className="bg-dark-gray h-100 w-100 relative z-0 pa3"
        elements={elements}
        stylesheet={stylesheet}
        layout={{ name: 'preset' }}
        cy={setCyRef}
      />
      {/* Overlay UI Elements */}
      <div
        className="z-1 absolute top-0 left-0 pa3 pointer-events-none"
      >
        <h1 className="ma0 user-select-none">
          <span className="f2 mr2">Skill Tree:</span>
          {/*input which uses treeName as the default value and updating the text inside updates treeName via setTreeName*/}
          {/*if the enter key is pressed the text input is blurred*/}
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
          <button onClick={printElements}>Print Elements</button>
          {/* <button onClick={printCyRef}>Print CyRef</button> */}
          <button onClick={saveToJson}>Save to JSON</button>
          {/*<input type="file" accept="application/json" onChange={loadFromJson} />*/}
          <button onClick={loadGraphFromJSON}>Load from JSON</button>
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
