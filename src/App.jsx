// src/App.jsx
import { useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

import stylesheet from './graphStyles';
import useGraphHandlers from './hooks/useGraphHandlers';
import { copyIcon, checkIcon, eyeIcon, eyeSlashIcon } from './assets/icons';

// function svgToDataURI(svgString) {
//   return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
// }

// function svgToBase64DataURI(svgString) {
//   return 'data:image/svg+xml;base64,' + window.btoa(svgString);
// }

function App() {
  const [elements, setElements] = useState([
    {
      data: { id: 'node-1', label: 'Skill 1' },
      position: { x: 0, y: 0 },
      // image: 'https://farm8.staticflickr.com/7272/7633179468_3e19e45a0c_b.jpg' 
      "style": {
        "background-image": [
          "https://upload.wikimedia.org/wikipedia/commons/b/b4/High_above_the_Cloud_the_Sun_Stays_the_Same.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Pigeon_silhouette_4874.svg/1000px-Pigeon_silhouette_4874.svg.png"
        ],
        "background-fit": "cover cover",
        "background-image-opacity": 0.5
      }
      // svgToBase64DataURI(eyeIcon),
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
        className="bg-dark-gray h-100 w-100 relative z-0"
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
