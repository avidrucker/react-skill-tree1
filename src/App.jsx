// src/App.jsx
import { useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

function App() {
  const [elements, setElements] = useState([
    {
      data: { id: 'node-1', label: 'Skill 1' },
      position: { x: 0, y: 0 },
    },
  ]);
  const [cyRef, setCyRef] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeInfo, setNodeInfo] = useState({ label: '' });

  const addNode = () => {
    if (!cyRef) return;
  
    const newId = `node-${elements.length + 1}`;
    const zoom = cyRef.zoom();
    const pan = cyRef.pan();
    const viewportCenter = {
      x: (cyRef.width() / 2 - pan.x) / zoom,
      y: (cyRef.height() / 2 - pan.y) / zoom,
    };
  
    const newNode = {
      data: { id: newId, label: `Skill ${elements.length + 1}` },
      position: viewportCenter,
    };
  
    let newEdge = null;
    if (selectedNode) {
      newEdge = {
        data: {
          source: selectedNode.id(),
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
      },
    },
    {
      selector: 'node:selected',
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

  return (
    <div className="bg-black flex flex-column vh-100 w-100 relative">
      <section className="absolute w-100 top-0 left-0 z-1">
        <h1 className="ma0">Skill Tree</h1>
        <div>
          <button onClick={addNode}>Add Skill</button>
          <button onClick={() => cyRef && cyRef.fit()}>Center Graph</button>
        </div>
        {selectedNode && (
          <div>
            <h2>Edit Skill</h2>
            <input
              type="text"
              value={nodeInfo.label}
              onChange={(e) => setNodeInfo({ label: e.target.value })}
            />
            <button
              onClick={() => {
                // Update node label
                selectedNode.data('label', nodeInfo.label);
                setElements([...elements]); // Trigger re-render
              }}
            >
              Rename Skill
            </button>
            <button
              onClick={() => {
                // Delete node and connected edges
                const nodeId = selectedNode.id();
                setElements((els) =>
                  els.filter(
                    (el) =>
                      el.data.id !== nodeId &&
                      el.data.source !== nodeId &&
                      el.data.target !== nodeId
                  )
                );
                setSelectedNode(null);
              }}
            >
              Delete Skill
            </button>
          </div>
        )}
      </section>
      <div className="" style={{ flexGrow: 1 }}>
        <CytoscapeComponent
          className="bg-dark-gray h-100 w-100"
          elements={elements}
          stylesheet={stylesheet}
          layout={{ name: 'preset' }}
          cy={(cy) => {
            setCyRef(cy);

            cy.on('tap', 'node', (evt) => {
              const node = evt.target;
              setSelectedNode(node);
              setNodeInfo({ label: node.data('label') });
            });

            cy.on('tap', (event) => {
              if (event.target === cy) {
                // Clicked on background
                setSelectedNode(null);
              }
            });
          }}
        />
      </div>
    </div>
  );
}

export default App;
