// src/App.jsx
import { useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

import stylesheet from './graphStyles';
import useGraphHandlers from './hooks/useGraphHandlers';

function App() {
  const [elements, setElements] = useState([
    {
      data: { id: 'node-1', label: 'Skill 1' },
      position: { x: 0, y: 0 },
    },
  ]);
  const [cyRef, setCyRef] = useState(null);
  
  // Custom double-click detection variables
  let lastTappedNode = null;
  let lastTapTime = 0;

  const {
    tempNodes,
    isEditing,
    editNode,
    editNodePosition,
    editLabel,
    addNode,
    handleNodeDoubleClick,
    handleTempNodeClick,
    handleKeyDown,
    handleBlur,
    setTempNodes,
    setIsEditing,
    setEditNode,
    setEditLabel,
  } = useGraphHandlers(cyRef, elements, setElements);

  return (
    <div
      className="bg-black relative w-100 vh-100"
    >
      <CytoscapeComponent
        className="bg-dark-gray h-100 w-100 relative z-0"
        elements={elements}
        stylesheet={stylesheet}
        layout={{ name: 'preset' }}
        cy={(cy) => {
          setCyRef(cy);

          cy.on('tap', 'node', (evt) => {
            const tappedNode = evt.target;
            const currentTime = new Date().getTime();

            if (
              lastTappedNode &&
              lastTappedNode.id() === tappedNode.id() &&
              currentTime - lastTapTime < 300
            ) {
              // Double-click detected
              handleNodeDoubleClick(tappedNode);
              lastTappedNode = null;
              lastTapTime = 0;
            } else {
              if (tempNodes.includes(tappedNode.id())) {
                // Clicked on temporary button node
                handleTempNodeClick(tappedNode);
              } else {
                // Single tap
                lastTappedNode = tappedNode;
                lastTapTime = currentTime;
              }
            }
          });

          cy.on('tap', (event) => {
            if (event.target === cy) {
              // Clicked on background
              setIsEditing(false);
              setEditNode(null);
              // Remove temp nodes
              if (tempNodes.length > 0) {
                setElements((els) => els.filter((el) => !tempNodes.includes(el.data.id)));
                setTempNodes([]);
              }
            }
          });
        }}
      />
      {/* Overlay UI Elements */}
      <div
        className="z-1 absolute top-0 left-0 pa3 pointer-events-none"
      >
        <h1 className="ma0 user-select-none">Skill Tree</h1>
        <div className="pointer-events-auto">
          <button onClick={addNode}>Add Skill</button>
          <button onClick={() => cyRef && cyRef.fit()}>Center Graph</button>
        </div>
      </div>
      {/* Edit Input Field */}
      {isEditing && editNode && editNodePosition && (
        <input
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            position: 'absolute',
            left: editNodePosition.x - 50, // Adjust based on input width
            top: editNodePosition.y - 20, // Adjust to position over the node
            zIndex: 2,
          }}
          autoFocus
        />
      )}
    </div>
  );
}

export default App;
