// src/graphStyles.js
// This stylesheet defines the styles used for the 
// Cryptoscape node graph. It includes styles for 
// different types of nodes and edges, as well as 
// specific styles for selected nodes.
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
      selector: 'node:selected',
      style: {
        'border-width': 3,
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
  ];
  
  export default stylesheet;
  