// src/hooks/useGraphHandlers.js
/**
 * This file contains custom React hooks and handlers for managing the 
 * Cytoscape node graph.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const useGraphHandlers = (cyRef, elements, setElements) => {
  const [tempNodes, setTempNodes] = useState([]);
  const [tempEdgeNodes, setTempEdgeNodes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [editNodePosition, setEditNodePosition] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [selectedEdge, setSelectedEdge] = useState(null);
  const nodeIdCounter = useRef(2);

  const selectedNodes = useRef([]);
  const lastTappedNode = useRef(null);
  const lastTapTime = useRef(0);

  // Function to remove temporary action nodes
  const removeTempNodes = useCallback(() => {
    if (tempNodes.length > 0) {
      setElements((els) => els.filter((el) => !tempNodes.includes(el.data.id)));
      setTempNodes([]);
    }
  }, [tempNodes, setElements, setTempNodes]);

  // Function to remove the connect button
  const removeConnectButton = useCallback(() => {
    if (tempEdgeNodes.length > 0) {
      setElements((els) => els.filter((el) => !tempEdgeNodes.includes(el.data.id)));
      setTempEdgeNodes([]);
    }
  }, [tempEdgeNodes, setElements]);

  // Function to show the connect button
  const showConnectButton = useCallback(() => {
    const [sourceId, targetId] = selectedNodes.current;
    const sourceNode = cyRef.getElementById(sourceId);
    const targetNode = cyRef.getElementById(targetId);

    if (!sourceNode || !targetNode) return;
    if (sourceNode.length === 0 || targetNode.length === 0) return;
    if (!selectedNodes) return;

    ////
    // Calculate position between the two nodes
    const sourcePosition = sourceNode.position();
    const targetPosition = targetNode.position();

    const connectNodePosition = {
      x: (sourcePosition.x + targetPosition.x) / 2,
      y: (sourcePosition.y + targetPosition.y) / 2 - 20, // Adjust as needed
    };

    const connectNodeId = `connect-${sourceId}-${targetId}`;

    const connectNode = {
      data: {
        id: connectNodeId,
        label: 'Connect',
        sourceId,
        targetId,
      },
      position: connectNodePosition,
      classes: 'action-node',
    };

    setElements((els) => [...els, connectNode]);
    setTempEdgeNodes([connectNodeId]);
  }, [cyRef, setElements]);

  // Handle node select event
  const handleNodeSelect = useCallback(
    (evt) => {
      const node = evt.target;
      // Add node to selectedNodes if not already there
      if (!selectedNodes.current.includes(node.id())) {
        selectedNodes.current.push(node.id());
      }

      // If exactly 2 nodes are selected, show the connect button
      if (selectedNodes.current.length === 2) {
        showConnectButton();
      } else {
        removeConnectButton();
      }
    },
    [showConnectButton, removeConnectButton]
  );

  // Handle node unselect event
  const handleNodeUnselect = useCallback(
    (evt) => {
      const node = evt.target;
      // Remove node from selectedNodes
      selectedNodes.current = selectedNodes.current.filter((id) => id !== node.id());

      // Remove the connect button when selection changes
      removeConnectButton();
    },
    [removeConnectButton]
  );

  const addNode = useCallback(() => {
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

  }, [cyRef, editNode, setElements]);

  const handleNodeDoubleClick = useCallback(
    (node) => {
      const nodePosition = node.position();

      const editNodeId = `edit-${node.id()}`;
      const deleteNodeId = `delete-${node.id()}`;

      const offsetY = 35; // Distance above the original node

      const editNodeButton = {
        data: { id: editNodeId, label: 'Edit', parentNodeId: node.id() },
        position: { x: nodePosition.x + 30, y: nodePosition.y - offsetY },
        classes: 'action-node',
      };

      const deleteNodeButton = {
        data: { id: deleteNodeId, label: 'Delete', parentNodeId: node.id() },
        position: { x: nodePosition.x - 30, y: nodePosition.y - offsetY },
        classes: 'action-node',
      };

      setElements((els) => [...els, editNodeButton, deleteNodeButton]);
      setTempNodes([editNodeId, deleteNodeId]);
      setEditNode(node);
    },
    [setElements, setTempNodes, setEditNode]
  );

  const handleTempNodeClick = useCallback(
    (node) => {
      const label = node.data('label');
      if (label === 'Edit') {
        // Begin editing the original node
        const parentNodeId = node.data('parentNodeId');
        const parentNode = cyRef.getElementById(parentNodeId);

        setIsEditing(true);
        setEditNode(parentNode);
        setEditLabel(parentNode.data('label'));
      } else if (label === 'Delete') {
        // Delete the original node
        const parentNodeId = node.data('parentNodeId');
        const nodeId = parentNodeId;

        // Remove temporary action nodes
        removeTempNodes();

        // Clear selection
        if (cyRef) {
          cyRef.$('node:selected').unselect();
        }
        selectedNodes.current = [];

        // Update the elements state to remove the node and its edges
        setElements((els) =>
          els.filter(
            (el) =>
              el.data.id !== nodeId &&
              el.data.source !== nodeId &&
              el.data.target !== nodeId
          )
        );

        setIsEditing(false);
        setEditNode(null);
      } else if (label === 'Connect') {
        // Handle connecting the two selected nodes
        const sourceId = node.data('sourceId');
        const targetId = node.data('targetId');

        const newEdge = {
          data: {
            id: `edge-${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
          },
        };

        setElements((els) => [...els, newEdge]);

        // Clear selection and remove temp nodes
        cyRef.$('node:selected').unselect();
        selectedNodes.current = [];
        removeConnectButton();
      }

      // Remove the temp node (the action node that was clicked)
      setElements((els) => els.filter((el) => el.data.id !== node.id()));
    },
    [
      cyRef,
      setElements,
      setIsEditing,
      setEditNode,
      setEditLabel,
      removeTempNodes,
      removeConnectButton,
    ]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        if (editNode) {
          // Update the node label in Cytoscape
          editNode.data('label', editLabel);

          // Update elements state to reflect the change
          setElements((els) =>
            els.map((el) => {
              if (el.data.id === editNode.id()) {
                return {
                  ...el,
                  data: {
                    ...el.data,
                    label: editLabel,
                  },
                };
              }
              return el;
            })
          );

          // Remove temporary action nodes
          removeTempNodes();

          // Reset editing state
          setIsEditing(false);
          setEditNode(null);
        }
      }
    },
    [editNode, editLabel, setElements, setIsEditing, setEditNode, removeTempNodes]
  );

  const handleBlur = useCallback(() => {
    if (editNode) {
      // Update the node label in Cytoscape
      editNode.data('label', editLabel);

      // Update elements state to reflect the change
      setElements((els) =>
        els.map((el) => {
          if (el.data.id === editNode.id()) {
            return {
              ...el,
              data: {
                ...el.data,
                label: editLabel,
              },
            };
          }
          return el;
        })
      );

      // Remove temporary action nodes
      removeTempNodes();

      // Reset editing state
      setIsEditing(false);
      setEditNode(null);
    }
  }, [editNode, editLabel, setElements, setIsEditing, setEditNode, removeTempNodes]);

  // Function to handle edge selection
  const handleEdgeSelect = useCallback((evt) => {
    const edge = evt.target;
    setSelectedEdge(edge);

    // Calculate the position for the delete button based on the edge's midpoint
    const midPointX = (edge.source().position().x + edge.target().position().x) / 2;
    const midPointY = (edge.source().position().y + edge.target().position().y) / 2;

    const deleteEdgeButtonId = `delete-edge-${edge.id()}`;
    ////
    // Create a temporary node for deleting the edge
    const deleteEdgeButton = {
      data: { id: deleteEdgeButtonId, label: 'Delete Edge' },
      position: { x: midPointX, y: midPointY - 20 },
      classes: ['delete-edge-button', 'action-node']
    };

    setElements(els => [...els, deleteEdgeButton]);
    setTempEdgeNodes([deleteEdgeButtonId]);
  }, [setElements, setTempEdgeNodes]);

  const removeTempEdgeNodes = useCallback(() => {
    if (tempEdgeNodes.length > 0) {
      setElements(els => els.filter(el => !tempEdgeNodes.includes(el.data.id)));
      setTempEdgeNodes([]);
    }
  }, [tempEdgeNodes, setElements, setTempEdgeNodes]);

  // Function to handle edge deselection
  const handleEdgeDeselect = useCallback(() => {
    setSelectedEdge(null);
    removeTempEdgeNodes(); // Ensure to implement this function similar to removeTempNodes
  }, [removeTempEdgeNodes]);

  // Function to handle edge deletion
  const handleDeleteEdge = useCallback(() => {
    if (selectedEdge) {
      const edgeId = selectedEdge.id();
      setElements((els) => els.filter((el) => el.data.id !== edgeId));
      setSelectedEdge(null); // Reset selected edge after deletion
    }
  }, [selectedEdge, setElements]);

  // Button click handler for deleting an edge
  const handleTempEdgeButtonClick = useCallback(() => {
    handleDeleteEdge();
  }, [handleDeleteEdge]);


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

  // Cytoscape event handlers
  useEffect(() => {
    if (!cyRef) return;

    const cy = cyRef;

    // Initialize selectedNodes
    selectedNodes.current = [];

    const onTapNode = (evt) => {
      const tappedNode = evt.target;
      const currentTime = new Date().getTime();

      if (tappedNode.hasClass('delete-edge-button')) {
        handleTempEdgeButtonClick();
      } else if (tappedNode.hasClass('action-node')) {
        // Clicked on temporary button node
        handleTempNodeClick(tappedNode);
      } else {
        // Handle double-click detection for editing/deleting nodes
        if (
          lastTappedNode.current &&
          lastTappedNode.current.id() === tappedNode.id() &&
          currentTime - lastTapTime.current < 300
        ) {
          // Double-click detected
          handleNodeDoubleClick(tappedNode);
          lastTappedNode.current = null;
          lastTapTime.current = 0;
        } else {
          // Single tap
          lastTappedNode.current = tappedNode;
          lastTapTime.current = currentTime;
        }
      }
    };

    const onTapBackground = (event) => {
      if (event.target === cy) {
        // Clicked on background
        setIsEditing(false);
        setEditNode(null);
        // Remove temp nodes
        removeTempNodes();
        // Clear selected nodes and remove connect button
        cyRef.$('node:selected').unselect();
        selectedNodes.current = [];
        removeConnectButton();
      }
    };

    cy.on('tap', 'node', onTapNode);
    cy.on('tap', onTapBackground);

    // Handle node selection and unselection
    cy.on('select', 'node', handleNodeSelect);
    cy.on('unselect', 'node', handleNodeUnselect);

    return () => {
      cy.off('tap', 'node', onTapNode);
      cy.off('tap', onTapBackground);
      cy.off('select', 'node', handleNodeSelect);
      cy.off('unselect', 'node', handleNodeUnselect);
    };
  }, [
    cyRef,
    handleNodeDoubleClick,
    handleTempNodeClick,
    removeTempNodes,
    setIsEditing,
    setEditNode,
    handleNodeSelect,
    handleNodeUnselect,
    removeConnectButton,
    lastTappedNode,
    lastTapTime,
  ]);

  useEffect(() => {

    if (!cyRef) return;
    const cy = cyRef;

    const onTapEdge = (event) => {
      handleEdgeSelect(event);
    };

    cy.on('select', 'edge', onTapEdge);
    cy.on('unselect', 'edge', handleEdgeDeselect);

    // Cleanup event listeners on component unmount
    return () => {
      cy.off('select', 'edge', onTapEdge);
      cy.off('unselect', 'edge', handleEdgeDeselect);
    };
  }, [cyRef]);

  useEffect(() => {
    if (!cyRef) return;
    const cy = cyRef.current;
    if (!cy) return;

    const onTapBackgroundOrDeleteButton = (event) => {
      if (event.target === cy || event.target.hasClass('delete-edge-button')) {
        // handleTempEdgeButtonClick(event.target.id());
        handleDeleteEdge();
        setIsEditing(false);
        setEditNode(null);
        removeTempNodes();
        removeTempEdgeNodes();
        cy.$('node:selected, edge:selected').unselect();
        selectedNodes.current = [];
        removeConnectButton();
      }
    };

    cy.on('tap', onTapBackgroundOrDeleteButton);

    return () => {
      cy.off('tap', onTapBackgroundOrDeleteButton);
    };
  }, [cyRef, handleTempEdgeButtonClick, removeTempNodes, removeTempEdgeNodes, removeConnectButton]);


  return {
    isEditing,
    editNode,
    editNodePosition,
    editLabel,
    addNode,
    handleKeyDown,
    handleBlur,
    setIsEditing,
    setEditNode,
    setEditLabel,
  };
};

export default useGraphHandlers;
