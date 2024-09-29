// src/graphStyles.js
const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-opacity': 0,
        label: 'data(label)',
        'text-valign': 'top',
        'text-margin-y': 0,
        'height': 50,
        'width': 50,
        color: '#fff',
        'text-wrap': 'wrap',
        'font-family': "UnifrakturMaguntia",
        'font-size': 10,
        'border-width': 0,
        'background-clip': 'none',
        'background-image': 'data(image)',
        'background-fit': 'cover',
        'background-image-opacity': 1,
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
        'font-size': 8,
        'background-image': 'none',
        'border-color': 'white',
        'border-width': 1,
        'font-family': "sans-serif"
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 1,
        'border-color': '#FFD700',
      },
    },
    {
      selector: 'node.action-node:selected',
      style: {
        'border-width': 0, // Ensure action nodes do not have a border when selected
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1,
        'line-color': 'white',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'none',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#ff6347', // Highlight color for selected edge
        'target-arrow-color': '#ff6347',
        'width': 2,
      },
    },
    {
      selector: 'node[state = "activated"]',
      style: {
        'opacity': 1,
      },
    },
    {
      selector: 'node[state = "available"]',
      style: {
        'opacity': 0.5,
      },
    },
    {
      selector: 'node[state = "hidden"]',
      style: {
        'display': 'none',
        // 'opacity': 0.25,
      },
    },
    {
      selector: 'node.action-node[selectState = "not-selected"]',
      style: {
        'opacity': 0.5,
      },
    }
    
  ];
  
  export default stylesheet;
  