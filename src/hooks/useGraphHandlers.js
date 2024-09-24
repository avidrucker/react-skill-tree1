// src/hooks/useGraphHandlers.js

/**
 * Custom React hook for managing Cytoscape graph interactions.
 * This hook handles node and edge selection, editing, deletion, and other interactions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const useGraphHandlers = (cyRef, elements, setElements) => {
  // Refs for temporary action nodes (e.g., Edit, Delete buttons)
  const tempNodes = useRef([]);
  const tempEdgeNodes = useRef([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [editNodePosition, setEditNodePosition] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [selectedEdge, setSelectedEdge] = useState(null);

  // Counter for generating unique node IDs
  const nodeIdCounter = useRef(elements.length + 1);

  // References for selected nodes and double-click detection
  const selectedNodes = useRef([]);
  const lastTappedNode = useRef(null);
  const lastTapTime = useRef(0);

  // TODO: debug why removeTemporaryNodes is called 3-4 times in a row
  /**
   * Removes temporary action nodes from the graph (e.g., Edit and Delete buttons).
   */
  const removeTemporaryNodes = useCallback(() => {
    setElements((els) =>
      els.filter(
        (el) =>
          !tempNodes.current.includes(el.data.id) &&
          !tempEdgeNodes.current.includes(el.data.id) &&
          !el.classes?.includes('action-node')
      )
    );

    // if selectedNodes has an nodes with the data.id containing "delete-edge", remove it
    selectedNodes.current = selectedNodes.current.filter(
      (id) => !id.includes('delete-edge') && 
              !id.includes('connect-node') && 
              !id.includes('delete-node'));

    tempNodes.current = [];
    tempEdgeNodes.current = [];
  }, [setElements]);

  /**
   * Performs cleanup after an action is completed.
   */
  const cleanupAfterAction = useCallback(() => {
    if (cyRef) {
      cyRef.$('node:selected').unselect();
    }
    
    selectedNodes.current = [];
    setIsEditing(false);
    setEditNode(null);
  }, [cyRef]);

  /**
   * Displays a temporary 'Connect' button between two selected nodes.
   */
  const showConnectButton = useCallback(() => {
    const [sourceId, targetId] = selectedNodes.current;
    const sourceNode = cyRef.getElementById(sourceId);
    const targetNode = cyRef.getElementById(targetId);

    // Validate that both nodes exist
    if (
      !sourceNode ||
      !targetNode ||
      sourceNode.length === 0 ||
      targetNode.length === 0
    )
      return;

    // Check if an edge already exists between these nodes
    const edgeExists = cyRef.edges().some((edge) => {
      return (
        (edge.data('source') === sourceId &&
          edge.data('target') === targetId) ||
        (edge.data('source') === targetId &&
          edge.data('target') === sourceId)
      );
    });

    if (edgeExists) {
      console.log('Edge already exists between these nodes');
      return;
    }

    // Calculate position between the two nodes for placing the 'Connect' button
    const sourcePosition = sourceNode.position();
    const targetPosition = targetNode.position();

    const connectNodePosition = {
      x: (sourcePosition.x + targetPosition.x) / 2,
      y: (sourcePosition.y + targetPosition.y) / 2,
    };

    const connectBtnId = `connect-${sourceId}-${targetId}`;

    const connectNode = {
      data: {
        id: connectBtnId,
        label: 'Connect',
        sourceId,
        targetId,
      },
      position: connectNodePosition,
      classes: 'action-node',
    };

    setElements((els) => [...els, connectNode]);
    tempEdgeNodes.current = [connectBtnId];
  }, [cyRef, setElements]);

  /**
   * Handles the selection of a node.
   * Adds the node to the selected nodes list and shows the 'Connect' button if two nodes are selected.
   */
  const handleNodeSelect = useCallback(
    (evt) => {
      const node = evt.target;
      const nodeId = node.id();

      removeTemporaryNodes();

      // Add node to selectedNodes if not already there
      if (!selectedNodes.current.includes(nodeId)) {
        // if the nodeId does not contain "delete-node", "connect-node", or "delete-edge", add it to selectedNodes
        if (!nodeId.includes('delete-node') && !nodeId.includes('connect-node') && !nodeId.includes('delete-edge')) {
          selectedNodes.current.push(nodeId);
        }
      }

      // Show 'Connect' button if exactly two nodes are selected
      if (selectedNodes.current.length === 2) {
        showConnectButton();
      }
    },
    [showConnectButton, removeTemporaryNodes]
  );

  /**
   * Handles the unselection of a node.
   * Removes the node from the selected nodes list and manages the 'Connect' button based on the new selection count.
   */
  const handleNodeUnselect = useCallback(
    (evt) => {
      const node = evt.target;
      const nodeId = node.id();

      // Update the list of selected nodes by removing the deselected node
      selectedNodes.current = selectedNodes.current.filter((id) => id !== nodeId);

      // Remove all temporary nodes immediately
      removeTemporaryNodes();

      // If exactly two nodes are still selected, potentially show the 'Connect' button
      if (selectedNodes.current.length === 2) {
        showConnectButton();
      }
    },
    [removeTemporaryNodes, showConnectButton]
  );

  /**
   * Adds a new node to the graph at the center of the viewport.
   * If a node is currently being edited, connects the new node to it.
   */
  const addNode = useCallback(() => {
    if (!cyRef) return;

    const newId = `node-${nodeIdCounter.current}`;
    const newLabel = `Skill ${nodeIdCounter.current}`;
    nodeIdCounter.current += 1; // Increment the counter

    // Calculate viewport center position to place the new node
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

    // Add the new node (and edge if applicable) to the elements
    setElements((els) => (newEdge ? [...els, newNode, newEdge] : [...els, newNode]));
  }, [cyRef, editNode, setElements]);

  /**
   * Handles double-clicking on a node.
   * Displays temporary 'Rename' and 'Delete' action buttons near the node.
   */
  const handleNodeDoubleClick = useCallback(
    (node) => {
      const nodePosition = node.position();

      const editNodeId = `edit-${node.id()}`;
      const deleteNodeId = `delete-${node.id()}`;

      const offsetY = 55; // Distance above the original node

      const editNodeButton = {
        data: { id: editNodeId, label: 'Rename', parentNodeId: node.id() },
        position: { x: nodePosition.x + 30, y: nodePosition.y - offsetY },
        classes: 'action-node',
      };

      const deleteNodeButton = {
        data: { id: deleteNodeId, label: 'Delete', parentNodeId: node.id() },
        position: { x: nodePosition.x - 30, y: nodePosition.y - offsetY },
        classes: 'action-node',
      };

      // Add the action buttons to the graph
      setElements((els) => [...els, editNodeButton, deleteNodeButton]);
      tempNodes.current = [editNodeId, deleteNodeId];
      setEditNode(node);

      // Set up position listener to move temporary nodes along with their parent
      const moveActionNodes = () => {
        const updatedPosition = node.position();
        setElements((els) =>
          els.map((el) => {
            if (el.data.id === editNodeId) {
              return {
                ...el,
                position: {
                  x: updatedPosition.x + 30,
                  y: updatedPosition.y - offsetY,
                },
              };
            } else if (el.data.id === deleteNodeId) {
              return {
                ...el,
                position: {
                  x: updatedPosition.x - 30,
                  y: updatedPosition.y - offsetY,
                },
              };
            }
            return el;
          })
        );
      };
      node.on('position', moveActionNodes);

      // Clean up listener when nodes are removed or deselected
      return () => node.removeListener('position', moveActionNodes);
    },
    [setElements, setEditNode]
  );

  //// TODO: modify function to be handlleDeleteEdges
  /**
   * Deletes the currently selected edge from the graph.
   */
  const handleDeleteEdge = useCallback(() => {
    
    if (selectedEdge) {
      const edgeId = selectedEdge.id();
      setElements((els) => els.filter((el) => el.data.id !== edgeId));
      //// remove action nodes
      setElements((els) =>
        els.filter(
          (el) =>
            !el.data.id?.includes('delete-edge')
        )
      );
      // Clear selected nodes and remove connect button
      cyRef.$('node:selected').unselect();
      selectedNodes.current = [];
      setSelectedEdge(null);
      handleEdgeDeselect();
    }
  }, [selectedEdge, setElements]);


  //// TODO: modify handleEdgeDeslect
  /**
   * Handles the deselection of an edge.
   * Removes the temporary 'Delete Edge' button.
   */
  const handleEdgeDeselect = useCallback(() => {
    setSelectedEdge(null);
    removeTemporaryNodes();
    cleanupAfterAction();
  }, [cleanupAfterAction, removeTemporaryNodes]);

  /**
   * Handles clicking on a temporary action node (e.g., 'Edit', 'Delete', 'Connect').
   * Performs the corresponding action based on the label.
   */
  const handleActionNodeClick = useCallback(
    (node) => {
      const label = node.data('label');

      if (label === 'Rename') {
        // Begin editing the original node
        const parentNodeId = node.data('parentNodeId');
        const parentNode = cyRef.getElementById(parentNodeId);

        setIsEditing(true);
        setEditNode(parentNode);
        setEditLabel(parentNode.data('label'));
      } else if (label === 'Delete Edge') {
        // Remove the edge
        handleDeleteEdge();
        handleEdgeDeselect();
        removeTemporaryNodes();
        cleanupAfterAction();
        selectedNodes.current = [];

        // if selectedNodes has an nodes with the data.id containing "delete-edge", remove it
        selectedNodes.current = selectedNodes.current.filter(
          (id) => !id.includes('delete-edge') && 
                  !id.includes('connect-node') && 
                  !id.includes('delete-node'));
      } else if (label === 'Delete') {
        // Delete the original node
        const parentNodeId = node.data('parentNodeId');
        const nodeId = parentNodeId;

        // Update elements state to remove the node and its edges
        setElements((els) =>
          els.filter(
            (el) =>
              el.data.id !== nodeId &&
              el.data.source !== nodeId &&
              el.data.target !== nodeId
          )
        );

        // remove action nodes
        cleanupAfterAction();
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
        cleanupAfterAction();
      }

      // Remove the action node that was clicked
      setElements((els) => els.filter((el) => el.data.id !== node.id()));
    },
    [
      cyRef,
      setElements,
      setIsEditing,
      setEditNode,
      setEditLabel,
      handleDeleteEdge,
      handleEdgeDeselect,
      cleanupAfterAction,
      removeTemporaryNodes
    ]
  );

  // handler that handles keydown events for deleting nodes or edges when they are selected via the delete key
  const handleGlobalKeyDown = useCallback(
    (e) => {
      // console.log("------");
      // console.log("key pressed: ", e.key);
      // console.log("selectedNodes.current", selectedNodes.current);
      // console.log("selectedEdge", selectedEdge);
      // console.log("isEditing: ", isEditing);
      // console.log("------");
      if (e.key === 'Delete' && !isEditing && selectedEdge !== null) {
        // Delete the selected nodes
        // console.log("deleting currently selected edge");
        handleDeleteEdge();
        // remove action nodes
        cleanupAfterAction();
      } else if (e.key === 'Delete' && !isEditing && selectedNodes.current.length > 0) {
        // Delete the selected nodes
        // console.log("deleting currently selected nodes");
        selectedNodes.current.forEach((nodeId) => {
          setElements((els) =>
            els.filter(
              (el) =>
                el.data.id !== nodeId &&
                el.data.source !== nodeId &&
                el.data.target !== nodeId
            )
          );
        });

        // remove action nodes
        cleanupAfterAction();
      }
    });

  /**
   * Handles key down events for the input field when editing a node label.
   * Saves the label when 'Enter' is pressed.
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && editNode) {
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

        cleanupAfterAction();
      } else if (e.key === 'Escape' && editNode) {
        // Cancel editing and reset the label
        setEditLabel(editNode.data('label'));
        cleanupAfterAction();
      }
    },
    [editNode, editLabel, setElements, cleanupAfterAction]
  );

  /**
   * Handles blur event for the input field when editing a node label.
   * Saves the label when the input loses focus.
   */
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

      cleanupAfterAction();
    }
  }, [editNode, editLabel, setElements, cleanupAfterAction]);

  //// TODO: implement multi-edge selection, multi-edge deletion
  /**
   * Handles the selection of an edge.
   * Displays a temporary 'Delete Edge' button near the edge.
   */
  const handleEdgeSelect = useCallback(
    (evt) => {
      const edge = evt.target;
      setSelectedEdge(edge);

      // Calculate the position for the delete button based on the edge's midpoint
      const midPointX =
        (edge.source().position().x + edge.target().position().x) / 2;
      const midPointY =
        (edge.source().position().y + edge.target().position().y) / 2;

      const deleteEdgeButtonId = `delete-edge-${edge.id()}`;

      // Create a temporary node for deleting the edge
      const deleteEdgeButton = {
        data: { id: deleteEdgeButtonId, label: 'Delete Edge' },
        position: { x: midPointX, y: midPointY - 20 },
        classes: 'delete-edge-button action-node',
      };

      // Add the delete button to the graph
      setElements((els) => [...els, deleteEdgeButton]);
      tempEdgeNodes.current = [deleteEdgeButtonId];
    },
    [setElements]
  );

  /**
   * Updates the position of the input field when the graph changes.
   */
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

  /**
   * Sets up Cytoscape event handlers for node interactions.
   */
  useEffect(() => {
    if (!cyRef) return;

    const cy = cyRef;

    // Handler for tapping on nodes
    const onTapNode = (evt) => {
      const tappedNode = evt.target;
      const currentTime = new Date().getTime();

      if (tappedNode.hasClass('action-node')) {
        // Clicked on a temporary action node (e.g., 'Rename', 'Delete', 'Connect')
        handleActionNodeClick(tappedNode);
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

    // Handler for tapping on the background
    const onTapBackground = (event) => {
      if (event.target === cy) {
        // Clicked on background
        setIsEditing(false);
        setEditNode(null);
        // Clear selected nodes and remove connect button
        cyRef.$('node:selected').unselect();
        selectedNodes.current = [];
        // Remove temporary action nodes
        removeTemporaryNodes();
        cleanupAfterAction();
      }
    };

    // Bind event handlers
    cy.on('tap', 'node', onTapNode);
    cy.on('tap', onTapBackground);

    // Handle node selection and unselection
    cy.on('select', 'node', handleNodeSelect);
    cy.on('unselect', 'node', handleNodeUnselect);

    document.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup event handlers on unmount
    return () => {
      cy.off('tap', 'node', onTapNode);
      cy.off('tap', onTapBackground);
      cy.off('select', 'node', handleNodeSelect);
      cy.off('unselect', 'node', handleNodeUnselect);

      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    cyRef,
    handleNodeDoubleClick,
    handleActionNodeClick,
    removeTemporaryNodes,
    setIsEditing,
    setEditNode,
    handleNodeSelect,
    handleNodeUnselect,
    lastTappedNode,
    lastTapTime,
    cleanupAfterAction,
    handleGlobalKeyDown
  ]);

  /**
   * Sets up Cytoscape event handlers for edge interactions.
   */
  useEffect(() => {
    if (!cyRef) return;
    const cy = cyRef;

    // Handler for edge selection
    cy.on('select', 'edge', handleEdgeSelect);

    // Handler for edge deselection
    cy.on('unselect', 'edge', handleEdgeDeselect);

    // Cleanup event handlers on unmount
    return () => {
      cy.off('select', 'edge', handleEdgeSelect);
      cy.off('unselect', 'edge', handleEdgeDeselect);
    };
  }, [cyRef, handleEdgeSelect, handleEdgeDeselect]);

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
    setEditLabel
  };
};

export default useGraphHandlers;
