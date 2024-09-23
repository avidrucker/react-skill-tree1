// src/App.jsx
import { useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

import stylesheet from './graphStyles';
import useGraphHandlers from './hooks/useGraphHandlers';
import eyeIcon from './assets/eye.png';
import leafIcon from './assets/leaf.png';
import windIcon from './assets/wind.png';

// import nodeOutlineBg from './assets/node_outline_bg.png';

function App() {
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
        <h1 className="ma0 user-select-none">Skill Tree</h1>
        <div className="pointer-events-auto">
          <button onClick={addNode}>Add Skill</button>
          <button onClick={() => cyRef && cyRef.fit()}>Center Graph</button>
          <button onClick={printElements}>Print Elements</button> 
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
