// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

function App() {
  const [elements, setElements] = useState([
    {
      data: { id: 'node-1', label: 'Skill 1' },
      position: { x: 0, y: 0 },
    },
  ]);
  const [cyRef, setCyRef] = useState(null);
  const [tempNodes, setTempNodes] = useState([]); // Stores IDs of temporary button nodes
  const [isEditing, setIsEditing] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [editNodePosition, setEditNodePosition] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const nodeIdCounter = useRef(2); // Start from 2 since 'node-1' exists

  const addNode = () => {
    if (!cyRef) return;

    const newId = `node-${nodeIdCounter.current}`;
    const newLabel = `Skill ${nodeIdCounter.current}`;
    nodeIdCounter.current += 1; // Increment the counter

    const zoom = cyRef.zoom();
    const pan = cyRef.pan();
    const viewportCenter = {
      x: (cyRef.width() / 2 - pan.x) / zoom,
      y: (cyRef.height() / 2 - pan.y) / zoom,
    };

    const newNode = {
      data: { id: newId, label: newLabel },
      position: viewportCenter,
    };

    let newEdge = null;
    if (editNode) {
      newEdge = {
        data: {
          source: editNode.id(),
          target: newId,
        },
      };
    }

    setElements((els) => (newEdge ? [...els, newNode, newEdge] : [...els, newNode]));
  };

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#28a745',
        label: 'data(label)',
        'text-valign': 'center',
        color: '#fff',
        'text-outline-width': 2,
        'text-outline-color': '#28a745',
        'text-wrap': 'wrap'
      },
    },
    {
      selector: 'node.action-node',
      style: {
        'background-color': '#007bff',
        shape: 'round-rectangle',
        width: 50,
        height: 30,
        'text-valign': 'center',
        'text-halign': 'center',
        color: '#fff',
        'font-size': 12,
        'text-outline-width': 0,
      },
    },
    {
      selector: 'node:selected:not(.action-node)',
      style: {
        'border-width': 3,
        'border-color': '#FFD700',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
  ];

  // Custom double-click detection
  let lastTappedNode = null;
  let lastTapTime = 0;

  const handleNodeDoubleClick = (node) => {
    const nodePosition = node.position();

    const editNodeId = `edit-${node.id()}`;
    const deleteNodeId = `delete-${node.id()}`;

    const offsetY = 50; // Distance above the original node

    const editNode = {
      data: { id: editNodeId, label: 'Edit', parentNodeId: node.id() },
      position: { x: nodePosition.x + 30, y: nodePosition.y - offsetY },
      classes: 'action-node',
    };

    const deleteNode = {
      data: { id: deleteNodeId, label: 'Delete', parentNodeId: node.id() },
      position: { x: nodePosition.x - 30, y: nodePosition.y - offsetY },
      classes: 'action-node',
    };

    setElements((els) => [...els, editNode, deleteNode]);
    setTempNodes([editNodeId, deleteNodeId]);
    setEditNode(node);
  };

  const handleTempNodeClick = (node) => {
    const parentNodeId = node.data('parentNodeId');
    const parentNode = cyRef.getElementById(parentNodeId);

    if (node.data('label') === 'Edit') {
      // Begin editing the original node
      setIsEditing(true);
      setEditNode(parentNode);
      setEditLabel(parentNode.data('label'));
    } else if (node.data('label') === 'Delete') {
      // Delete the original node
      const nodeId = parentNodeId;
      setElements((els) =>
        els.filter(
          (el) =>
            el.data.id !== nodeId &&
            el.data.source !== nodeId &&
            el.data.target !== nodeId &&
            !tempNodes.includes(el.data.id)
        )
      );
      setIsEditing(false);
      setEditNode(null);
    }
    // Remove the temp nodes
    setElements((els) => els.filter((el) => !tempNodes.includes(el.data.id)));
    setTempNodes([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      editNode.data('label', editLabel);
      setElements([...elements]);
      setIsEditing(false);
      setEditNode(null);
    }
  };

  const handleBlur = () => {
    if (editNode) {
      editNode.data('label', editLabel);
      setElements([...elements]);
      setIsEditing(false);
      setEditNode(null);
    }
  };

  // Update position of input field when the graph changes
  useEffect(() => {
    if (isEditing && editNode && cyRef) {
      const updatePosition = () => {
        const nodePosition = editNode.renderedPosition();
        const container = cyRef.container();
        const containerRect = container.getBoundingClientRect();
        const absolutePosition = {
          x: containerRect.left + nodePosition.x,
          y: containerRect.top + nodePosition.y,
        };
        setEditNodePosition(absolutePosition);
      };

      updatePosition();

      const updateEvents = 'pan zoom resize';
      cyRef.on(updateEvents, updatePosition);
      editNode.on('position', updatePosition);

      return () => {
        cyRef.off(updateEvents, updatePosition);
        editNode.removeListener('position', updatePosition);
      };
    }
  }, [isEditing, editNode, cyRef]);

  return (
    <div
      className="bg-black relative w-100 vh-100"
    >
      <CytoscapeComponent
        className="bg-dark-gray h-100 w-100"
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
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      {/* Overlay UI Elements */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '10px',
          zIndex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '5px',
        }}
      >
        <h1 className="ma0">Skill Tree</h1>
        <div>
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
