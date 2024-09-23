import nodeOutlineBg from './assets/node_outline_bg.png';

// Add these styles in your graphStyles.js
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
        // 'text-outline-width': 2,
        // 'text-outline-color': '#28a745',
        'text-wrap': 'wrap',
        'font-family': "UnifrakturMaguntia",
        'font-size': 10,
        'border-width': 0,
        //'border-color': 'white',
        'background-clip': 'none',
        'background-image': [nodeOutlineBg, 'data(image)'],
        "background-fit": "cover contain",
        "background-image-opacity": 1
      },
    },
    {
      selector: 'node[image]',       // Target nodes with an 'image' data attribute
      style: {
        'background-image': [nodeOutlineBg, 'data(image)'], // Use the 'image' data attribute
        'background-fit': 'contain cover',
        'background-clip': 'none',
        "background-image-opacity": 1
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
        'background-image': [],
        'border-color': 'white',
        'border-width': 1,
        // 'text-outline-width': 2,
        // 'text-outline-color': '#007bff',
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
        width: 2,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
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
  ];
  
  export default stylesheet;
  