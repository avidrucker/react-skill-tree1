// src/hooks/useGraphHandlers.js
import blankIcon from '../assets/icons/blank.png';

/**
 * Custom React hook for managing Cytoscape graph interactions.
 * This hook handles node and edge selection, editing, deletion, and other interactions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const PLAYER_MODE = 'player';
const BUILDER_MODE = 'builder';
const ACTIVE_STATE = 'activated';
const AVAIL_STATE = 'available';
const HIDDEN_STATE = 'hidden';

const flourishOffsetY = 45;

const useGraphHandlers = (cy, elements, setElements, onChangeIcon, skillTreeMode, setIsChangingIcon) => {
  // Refs for temporary action nodes (e.g., Edit, Delete buttons)
  const tempNodes = useRef([]);
  const tempEdgeNodes = useRef([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [editNodePosition, setEditNodePosition] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const selectedEdges = useRef([]);

  // Counter for generating unique node IDs
  const nodeIdCounter = useRef(1);

  // References for selected nodes and double-click detection
  const selectedNodes = useRef([]);
  const lastTappedNode = useRef(null);
  const lastTapTime = useRef(0);

  /**
   * Removes temporary action nodes from the graph (e.g., Edit and Delete buttons).
   */
  const removeTemporaryNodes = useCallback(() => {
    // console.count("removing temporary nodes...");
    setElements((els) =>
      els.filter(
        (el) =>
          !tempNodes.current.includes(el.data.id) &&
          !tempEdgeNodes.current.includes(el.data.id) &&
          !el.classes?.includes('action-node')
      )
    );

    // remove all temporary nodes by looking for 'btn' in the id
    selectedNodes.current = selectedNodes.current.filter(
      (id) => !id.includes('btn-'));

    tempNodes.current = [];
    tempEdgeNodes.current = [];
  }, [setElements]);

  /**
   * Performs cleanup after an action is completed.
   */
  const cleanupAfterAction = useCallback(() => {
    if (cy) {
      cy.$('node:selected').unselect();
      cy.$('edge:selected').unselect();
    }

    selectedNodes.current = [];
    selectedEdges.current = [];
    setIsEditing(false);
    setEditNode(null);
  }, [cy]);

  /**
   * Displays a temporary 'Connect' button between two selected nodes.
   */
  const showConnectButton = useCallback(() => {
    const [sourceId, targetId] = selectedNodes.current;
    const sourceNode = cy.getElementById(sourceId);
    const targetNode = cy.getElementById(targetId);

    // Validate that both nodes exist
    if (
      !sourceNode ||
      !targetNode ||
      sourceNode.length === 0 ||
      targetNode.length === 0
    )
      return;

    // Check if an edge already exists between these nodes
    const edgeExists = cy.edges().some((edge) => {
      return (
        (edge.data('source') === sourceId &&
          edge.data('target') === targetId) ||
        (edge.data('source') === targetId &&
          edge.data('target') === sourceId)
      );
    });

    if (edgeExists) {
      // console.log('Edge already exists between these nodes');
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
      selectable: false,
      classes: 'action-node',
    };

    setElements((els) => [...els, connectNode]);
    tempEdgeNodes.current = [connectBtnId];
  }, [cy, setElements]);

  // function which displays three buttons to toggle between the three states of a node
  // to enable the user to select the default initial state of the node
  const handleNodeSingleClick = useCallback((node) => {
    if (skillTreeMode === BUILDER_MODE) {

      if (selectedNodes.current.length !== 1) {
        return; // Do not show node buttons if not exactly one node selected
      }

      const nodeData = node.data();
      const nodeId = nodeData.id;
      const nodePosition = node.position();
      const offsetY = 55; // Distance above the original node

      const activatedNodeId = `btn-activated-${nodeId}`;
      const availableNodeId = `btn-available-${nodeId}`;
      const hiddenNodeId = `btn-hidden-${nodeId}`;

      // get node initial state
      const nodeState = nodeData.initialState;

      const activatedNodeButton = {
        data: { id: activatedNodeId, label: 'Activated', parentNodeId: nodeId, selectState: nodeState === ACTIVE_STATE ? 'selected' : 'not-selected' },
        position: { x: nodePosition.x - 60, y: nodePosition.y - offsetY },
        selectable: false,
        classes: `action-node`,
      };

      const availableNodeButton = {
        data: { id: availableNodeId, label: 'Available', parentNodeId: nodeId, selectState: nodeState === AVAIL_STATE ? 'selected' : 'not-selected' },
        position: { x: nodePosition.x, y: nodePosition.y - offsetY },
        selectable: false,
        classes: `action-node`,
      };

      const hiddenNodeButton = {
        data: { id: hiddenNodeId, label: 'Hidden', parentNodeId: nodeId, selectState: nodeState === HIDDEN_STATE ? 'selected' : 'not-selected' },
        position: { x: nodePosition.x + 60, y: nodePosition.y - offsetY },
        selectable: false,
        classes: `action-node`,
      };

      // Add the action buttons to the graph
      setElements((els) => [...els, activatedNodeButton, availableNodeButton, hiddenNodeButton]);
      tempNodes.current = [activatedNodeId, availableNodeId, hiddenNodeId];
      
      // if the node clicked on is not a button node, we will set the edit node to the node clicked on
      if(!node.id().includes("btn")) {
        setEditNode(node);
      } else {
        // console.log("Node clicked on is a button node");
      }

      // Set up position listener to move temporary nodes along with their parent
      const moveActionNodes = () => {
        const updatedPosition = node.position();
        setElements((els) =>
          els.map((el) => {
            if (el.data.id === activatedNodeId) {
              return {
                ...el,
                position: {
                  x: updatedPosition.x - 60,
                  y: updatedPosition.y - offsetY,
                },
              };
            } else if (el.data.id === availableNodeId) {
              return {
                ...el,
                position: {
                  x: updatedPosition.x,
                  y: updatedPosition.y - offsetY,
                },
              };
            } else if (el.data.id === hiddenNodeId) {
              return {
                ...el,
                position: {
                  x: updatedPosition.x + 60,
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

    }
  }, [setElements, skillTreeMode]);

  // Function to synchronize flourish node positions with their parent nodes
  const synchronizeFlourishNode = useCallback(
    (parentNode) => {
      const parentId = parentNode.id();
      const flourishNodeId = `flourish-${parentId}`;
      const parentPosition = parentNode.position();

      // Update the position of the flourish node
      setElements((els) =>
        els.map((el) => {
          if (el.data.id === flourishNodeId) {
            return {
              ...el,
              position: {
                x: parentPosition.x,
                y: parentPosition.y - flourishOffsetY, // Adjust as needed
              },
            };
          }
          return el;
        })
      );
    },
    [setElements]
  );

  useEffect(() => {
    if (!cy) return;
  
    // Handler for node position changes
    const onNodePosition = (evt) => {
      const node = evt.target;
      // Only handle main nodes (exclude action nodes and flourish nodes)
      if (!node.hasClass('action-node') && !node.hasClass('flourish-node')) {
        synchronizeFlourishNode(node);
      }
    };
  
    // Attach the position event listener
    cy.on('position', 'node', onNodePosition);
  
    // Cleanup on unmount
    return () => {
      cy.off('position', 'node', onNodePosition);
    };
  }, [cy, synchronizeFlourishNode]);

  /**
   * Handles the selection of a node.
   * Adds the node to the selected nodes list and shows the 'Connect' button if two nodes are selected.
   */
  const handleNodeSelect = useCallback(
    (evt) => {

      const node = evt.target;
      const nodeId = node.id();

      // Add node to selectedNodes if not already there
      if (!selectedNodes.current.includes(nodeId)) {
        selectedNodes.current.push(nodeId);
      }

      // Remove any existing temporary nodes
      removeTemporaryNodes();

      if (selectedNodes.current.length === 1) {
        // Show node buttons for this node
        handleNodeSingleClick(node);
      }

      // Show 'Connect' button if exactly two nodes are selected
      if (selectedNodes.current.length === 2) {
        showConnectButton();
      }
    },
    [showConnectButton, handleNodeSingleClick, removeTemporaryNodes]
  );

  /**
   * Handles the unselection of a node.
   * Removes the node from the selected nodes list and manages the 'Connect' button based on the new selection count.
   */
  const handleNodeUnselect = useCallback(
    (evt) => {
      const node = evt.target;
      const nodeId = node.id();
  
      // Remove the node from selectedNodes
      selectedNodes.current = selectedNodes.current.filter((id) => id !== nodeId);
  
      // Remove any existing temporary nodes
      // this is necessary for the case where a node is manually 
      // directly deselected
      removeTemporaryNodes();
  
      if (selectedNodes.current.length === 1) {
        // Show node buttons for the remaining node
        const remainingNodeId = selectedNodes.current[0];
        const remainingNode = cy.getElementById(remainingNodeId);
        handleNodeSingleClick(remainingNode);
      }
  
      // Show 'Connect' button if exactly two nodes are selected
      if (selectedNodes.current.length === 2) {
        showConnectButton();
      }
    },
    [removeTemporaryNodes, handleNodeSingleClick, showConnectButton, cy]
  );  

  /**
   * Adds a new node to the graph at the center of the viewport.
   * If a node is currently being edited, connects the new node to it.
   */
  const addNode = useCallback(() => {
    if (!cy) return;

    let nextId = nodeIdCounter.current;
    // if there is a node w/ the same id, increment the id
    // we increase the id by 1 until we find an id that is not in the graph
    while (cy.getElementById(`node-${nextId}`).length > 0) {
      nextId += 1;
    }

    const newId = `node-${nextId}`;
    const newLabel = `Skill ${nextId}`;
    nodeIdCounter.current = 1; // Reset the counter back to 1

    // Calculate viewport center position to place the new node
    const zoom = cy.zoom();
    const pan = cy.pan();
    const viewportCenter = {
      x: (cy.width() / 2 - pan.x) / zoom,
      y: (cy.height() / 2 - pan.y) / zoom,
    };

    const newNode = {
      group: 'nodes',
      data: { 
        id: newId, 
        label: newLabel, 
        image: blankIcon, 
        initialState: HIDDEN_STATE,
        state: null,
        tempState: HIDDEN_STATE
      },
      classes: 'icon-node',
      position: viewportCenter,
    };

    // Create the flourish node ////
  const flourishNodeId = `flourish-${newId}`;
  const flourishNode = {
    group: 'nodes',
    data: {
      id: flourishNodeId,
      parentId: newId, // Link to parent node
      tempState: HIDDEN_STATE,
      state: null,
    },
    position: {
      x: viewportCenter.x,
      y: viewportCenter.y - flourishOffsetY, // Position above the parent node
    },
    selectable: false,
    grabbable: false,
    classes: 'flourish-node',
  };

    let newEdge = null;
    if (editNode) {
      newEdge = {
        group: 'edges',
        data: {
          source: editNode.id(),
          target: newId,
        },
      };
    }

    // Add the new node, flourish node, and edge (if applicable) to the elements
    setElements((els) =>
      newEdge ? [...els, newNode, flourishNode, newEdge] : [...els, newNode, flourishNode]
    );
  }, [cy, editNode, setElements]);

  /**
   * Handles double-clicking on a node.
   * Displays temporary 'Delete', 'Change Icon', and 'Rename' action buttons 
   * near the node.
   */
  const handleNodeDoubleClick = useCallback(
    (node) => {
      if (skillTreeMode === BUILDER_MODE && node.classes().includes('icon-node')) {
        removeTemporaryNodes();

        const nodePosition = node.position();

        const editNodeId = `btn-edit-${node.id()}`;
        const deleteNodeId = `btn-delete-${node.id()}`;
        const changeIconNodeId = `btn-change-icon-${node.id()}`;

        const offsetY = 55; // Distance above the original node

        const editNodeButton = {
          data: { id: editNodeId, label: 'Rename', parentNodeId: node.id() },
          position: { x: nodePosition.x + 60, y: nodePosition.y - offsetY },
          selectable: false,
          classes: "action-node",
        };

        const deleteNodeButton = {
          data: { id: deleteNodeId, label: 'Delete', parentNodeId: node.id() },
          position: { x: nodePosition.x - 60, y: nodePosition.y - offsetY },
          selectable: false,
          classes: 'action-node',
        };

        const changeIconNodeButton = {
          data: { id: changeIconNodeId, label: 'Change Icon', parentNodeId: node.id() },
          position: { x: nodePosition.x, y: nodePosition.y - offsetY },
          selectable: false,
          classes: 'action-node',
        };

        // Add the action buttons to the graph
        setElements((els) => [...els, editNodeButton, deleteNodeButton, changeIconNodeButton]);
        tempNodes.current = [editNodeId, deleteNodeId, changeIconNodeId];
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
                    x: updatedPosition.x + 60,
                    y: updatedPosition.y - offsetY,
                  },
                };
              } else if (el.data.id === deleteNodeId) {
                return {
                  ...el,
                  position: {
                    x: updatedPosition.x - 60,
                    y: updatedPosition.y - offsetY,
                  },
                };
              } else if (el.data.id === changeIconNodeId) {
                return {
                  ...el,
                  position: {
                    x: updatedPosition.x,
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

      } else if (skillTreeMode === PLAYER_MODE && node.classes().includes('icon-node')) {
        // toggle node state activation
        const nodeData = node.data();
        const flourishNodeId = `flourish-${nodeData.id}`;

        if (nodeData.state === AVAIL_STATE) {
            // Activate the node and its flourish node
            setElements((els) =>
            els.map((el) => {
              if (el.data.id === nodeData.id || el.data.id === flourishNodeId) {
                return {
                  ...el,
                  data: {
                    ...el.data,
                    state: ACTIVE_STATE,
                  },
                };
              }
              return el;
            })
          );

          // Unlock adjacent hidden nodes
          const adjacentNodes = node.connectedEdges().connectedNodes().difference(node);
          adjacentNodes.forEach((adjNode) => {
            const adjNodeData = adjNode.data();
            const adjFlourishNodeId = `flourish-${adjNodeData.id}`;
            if (adjNodeData.state === HIDDEN_STATE) {
              setElements((els) =>
                els.map((el) => {
                  if (el.data.id === adjNodeData.id || el.data.id === adjFlourishNodeId) {
                    return {
                      ...el,
                      data: {
                        ...el.data,
                        state: AVAIL_STATE,
                      },
                    };
                  }
                  return el;
                })
              );
            }
          });
        } else if (nodeData.state === ACTIVE_STATE) {
          // Deactivate the node
          setElements((els) =>
            els.map((el) => {
              if (el.data.id === nodeData.id || el.data.id === flourishNodeId) {
                return {
                  ...el,
                  data: {
                    ...el.data,
                    state: AVAIL_STATE,
                  },
                };
              }
              return el;
            })
          );
        }
      }

    },
    [setElements, setEditNode, skillTreeMode, removeTemporaryNodes]
  );

  /**
   * Deletes the currently selected edges from the graph.
   */
  const handleDeleteEdges = useCallback(() => {
    if (selectedEdges.current.length > 0) {
      setElements((els) =>
        els.filter((el) => !selectedEdges.current.includes(el.data.id))
      );

      // Clear selected edges
      if (cy) {
        cy.edges().unselect();
      }
      selectedEdges.current = [];
      removeTemporaryNodes();
    }
  }, [setElements, cy, removeTemporaryNodes]);


  /**
     * Handles the unselection of an edge.
     * Removes the edge from the selected edges list.
     */
  const handleEdgeDeselect = useCallback(
    (evt) => {
      const edge = evt.target;
      const edgeId = edge.id();

      // Update the list of selected edges by removing the deselected edge
      selectedEdges.current = selectedEdges.current.filter(
        (id) => id !== edgeId
      );

      // if only 1 edge is selected, show the delete edge button over the currently selected edge
      if (selectedEdges.current.length === 1) {

        // get the currently selected edge via looking through the elements list for a matching edge
        const currentEdgeData = elements.find((el) => el.data.id === selectedEdges.current[0]);

        // look up the edge itself in the cytoscape graph to get its source, position, etc.
        const currentEdge = cy.getElementById(currentEdgeData.data.id);

        // Calculate the position for the delete button based on the edge's midpoint
        const midPointX =
          (currentEdge.source().position().x + currentEdge.target().position().x) / 2;
        const midPointY =
          (currentEdge.source().position().y + currentEdge.target().position().y) / 2;

        const deleteEdgeButtonId = `delete-edge-${currentEdge.id()}`;

        // Create a temporary node for deleting the edge
        const deleteEdgeButton = {
          data: { id: deleteEdgeButtonId, label: 'Delete Edge' },
          position: { x: midPointX, y: midPointY - 20 },
          classes: 'delete-edge-button action-node',
        };

        // Add the delete button to the graph
        setElements((els) => [...els, deleteEdgeButton]);
        tempEdgeNodes.current = [deleteEdgeButtonId];
      } else {
        // remove action nodes
        // this is necessary specifically for the case where the 
        // user clicks on an edge to manually deselect it
        removeTemporaryNodes();
        cleanupAfterAction();
      }
    },
    [setElements, cy, elements, removeTemporaryNodes, cleanupAfterAction]
  );

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
        const parentNode = cy.getElementById(parentNodeId);

        setIsEditing(true);
        setEditNode(parentNode);
        setEditLabel(parentNode.data('label'));
      } else if (label === 'Delete Edge') {
        // Remove the edge
        handleDeleteEdges();
        cleanupAfterAction();
      } else if (label === 'Delete') {
        // Delete the original node
        const parentNodeId = node.data('parentNodeId');
        const nodeId = parentNodeId;
        const flourishNodeId = `flourish-${nodeId}`;

        // Update elements state to remove the node and its edges
        setElements((els) =>
          els.filter(
            (el) =>
              el.data.id !== nodeId &&
              el.data.id !== flourishNodeId &&
              el.data.source !== nodeId &&
              el.data.target !== nodeId
          )
        );

        // remove action nodes
        cleanupAfterAction();
      } else if (label === 'Change Icon') {
        // Begin icon changing process
        const parentNodeId = node.data('parentNodeId');
        // Trigger the callback to App component
        if (onChangeIcon) {
          onChangeIcon(parentNodeId);
        }
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
      } else if (label === 'Activated') {
        // Set the current node's initial state and temp state to 'activated'
        const parentNodeId = node.data('parentNodeId');
        const flourishNodeId = `flourish-${parentNodeId}`;
        
        setElements((els) =>
          els.map((el) => {
            if ((el.data.id === parentNodeId || el.data.id === flourishNodeId)) {
              return {
                ...el,
                data: {
                  ...el.data,
                  initialState: ACTIVE_STATE,
                  tempState: ACTIVE_STATE,
                },
              };
            }
            return el;
          })
        );
      } else if (label === 'Available') {
        // Set the current node's initial state and temp state to 'available'
        const parentNodeId = node.data('parentNodeId');
        const flourishNodeId = `flourish-${parentNodeId}`;

        setElements((els) =>
          els.map((el) => {
            if (el.data.id === parentNodeId || el.data.id === flourishNodeId) {
              return {
                ...el,
                data: {
                  ...el.data,
                  initialState: AVAIL_STATE,
                  tempState: AVAIL_STATE,
                },
              };
            }
            return el;
          })
        );
      } else if (label === 'Hidden') {
        // Set the current node's initial state and temp state to 'hidden'
        const parentNodeId = node.data('parentNodeId');
        const flourishNodeId = `flourish-${parentNodeId}`;

        setElements((els) =>
          els.map((el) => {
            if (el.data.id === parentNodeId || el.data.id === flourishNodeId) {
              return {
                ...el,
                data: {
                  ...el.data,
                  initialState: HIDDEN_STATE,
                  tempState: HIDDEN_STATE,
                },
              };
            }
            return el;
          })
        );
      }

      // Remove the action node that was clicked
      setElements((els) => els.filter((el) => el.data.id !== node.id()));
    },
    [
      cy,
      setElements,
      setIsEditing,
      setEditNode,
      setEditLabel,
      handleDeleteEdges,
      cleanupAfterAction,
      onChangeIcon,
    ]
  );

  // handler that handles keydown events for deleting nodes or edges when they are selected via the delete key
  const handleGlobalKeyDown = useCallback(
    (e) => {

      if (e.key === 'Delete' && !isEditing && selectedEdges.current.length > 0) {
        // Delete the selected nodes
        handleDeleteEdges();
        // remove action nodes
        cleanupAfterAction();
      } else if (e.key === 'Delete' && !isEditing && selectedNodes.current.length > 0) {
        // Delete the selected nodes
        selectedNodes.current.forEach((nodeId) => {
          const flourishNodeId = `flourish-${nodeId}`;
          setElements((els) =>
            els.filter(
              (el) =>
                el.data.id !== nodeId &&
                el.data.id !== flourishNodeId &&
                el.data.source !== nodeId &&
                el.data.target !== nodeId
            )
          );
        });

        cleanupAfterAction();
      } else if (e.key === 'Escape') {
        // deselect all nodes and edges as if the background had been clicked
        // also quit from icon changing mode
        cy.$('node:selected').unselect();
        cy.$('edge:selected').unselect();
        selectedNodes.current = [];
        selectedEdges.current = [];
        setIsChangingIcon(false);
        removeTemporaryNodes();
        cleanupAfterAction();
      }
    }, [isEditing, handleDeleteEdges, cleanupAfterAction, setElements, cy, removeTemporaryNodes, setIsChangingIcon]);

    useEffect(() => {
      if (!cy) return;
    
      // For each main node, ensure it has a flourish node
      const mainNodes = cy.nodes().filter((node) => {
        return !node.hasClass('action-node') && !node.hasClass('flourish-node');
      });
    
      mainNodes.forEach((node) => {
        const nodeId = node.id();
        const nodeData = node.data();
        const flourishNodeId = `flourish-${nodeId}`;
        if (cy.getElementById(flourishNodeId).empty()) {
          // Create and add the flourish node
          const nodePosition = node.position();
          const flourishNode = {
            group: 'nodes',
            data: {
              id: flourishNodeId,
              parentId: nodeId,
              state: nodeData.state || nodeData.initialState || HIDDEN_STATE, // Set state to match parent
            },
            position: {
              x: nodePosition.x,
              y: nodePosition.y - flourishOffsetY,
            },
            selectable: false,
            grabbable: false,
            classes: 'flourish-node',
          };
          setElements((els) => [...els, flourishNode]);
        }
      });
    }, [cy, elements, setElements]);

  /**
   * Handles key down events for the input field when editing a node label.
   * Saves the label when 'Enter' is pressed.
   * Quits label editing operation when 'Escape' is pressed.
   * Note: For 'global' (non-input field specific) keypress events, handleGlobalKeyDown is used.
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

  /**
   * Handles the selection of an edge.
   * Displays a temporary 'Delete Edge' button near the edge.
   */
  const handleEdgeSelect = useCallback(
    (evt) => {
      removeTemporaryNodes();

      // close the icon change modal if it is open
      setIsChangingIcon(false);

      const edge = evt.target;
      const edgeId = edge.id();

      // Add edge to selectedEdges if not already there
      if (!selectedEdges.current.includes(edgeId)) {
        selectedEdges.current.push(edgeId);
      }

      // if only 1 edge is selected, show the delete edge button
      if (selectedEdges.current.length === 1) {

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
          selectable: false,
          classes: 'delete-edge-button action-node',
        };

        // Add the delete button to the graph
        setElements((els) => [...els, deleteEdgeButton]);
        tempEdgeNodes.current = [deleteEdgeButtonId];
      }
    },
    [setElements, removeTemporaryNodes, setIsChangingIcon]
  );

  /**
   * Updates the position of the input field when the graph changes.
   */
  useEffect(() => {
    if (isEditing && editNode && cy) {

      const updatePosition = () => {
        const nodePosition = editNode.renderedPosition();
        const container = cy.container();
        const containerRect = container.getBoundingClientRect();
        const absolutePosition = {
          x: containerRect.left + nodePosition.x,
          y: containerRect.top + nodePosition.y,
        };
        setEditNodePosition(absolutePosition);
      };

      updatePosition();

      const updateEvents = 'pan zoom resize';
      cy.on(updateEvents, updatePosition);
      editNode.on('position', updatePosition);

      return () => {
        cy.off(updateEvents, updatePosition);
        editNode.removeListener('position', updatePosition);
      };
    }
  }, [isEditing, editNode, cy]);

  /**
   * Sets up Cytoscape event handlers for node interactions.
   */
  useEffect(() => {
    if (!cy) return;

    // Handler for tapping on nodes "handleNodeTap"
    const onTapNode = (evt) => {
      // close the icon change modal if it is open
      setIsChangingIcon(false);

      if (skillTreeMode === BUILDER_MODE) {
        // Existing builder mode logic
        const tappedNode = evt.target;
        const currentTime = new Date().getTime();

        if (tappedNode.hasClass('action-node')) {
          // Clicked on a temporary action node (e.g., 'Rename', 'Delete', 'Connect')
          handleActionNodeClick(tappedNode);
          removeTemporaryNodes();
        } else {
          // Handle double-click detection for editing/deleting nodes
          if (
            lastTappedNode.current &&
            lastTappedNode.current.id() === tappedNode.id() &&
            currentTime - lastTapTime.current < 300
          ) {
            // Double-click detected
            removeTemporaryNodes();
            handleNodeDoubleClick(tappedNode);
            lastTappedNode.current = null;
            lastTapTime.current = 0;
          } else {
            // Single tap
            lastTappedNode.current = tappedNode;
            lastTapTime.current = currentTime;
          }
        }

      } else if (skillTreeMode === PLAYER_MODE) {
        // Player mode logic for activating/deactivating nodes
        const tappedNode = evt.target;
        const currentTime = new Date().getTime();

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
          // Single tap in player mode does not trigger any action
          lastTappedNode.current = tappedNode;
          lastTapTime.current = currentTime;
        }
      }

    };

    // Handler for tapping on the background
    // Note: onTapBackground fires anytime anywhere on the cytoscape canvas
    // is clicked, including nodes, edges, buttons, and the background
    const onTapBackground = (event) => {
      if (skillTreeMode === BUILDER_MODE) {
        // Existing builder mode logic

        // the following condition verifies that only the background 
        // was clicked on directly
        if (event.target === cy) {
          // Clicked on background
          setIsEditing(false);
          setEditNode(null);
          // Clear selected nodes and remove connect button
          cy.$('node:selected').unselect();
          selectedNodes.current = [];
          // Remove temporary action nodes
          removeTemporaryNodes();
          cleanupAfterAction();
          // close the icon change modal if it is open
          setIsChangingIcon(false);
        }

      } else if (skillTreeMode === PLAYER_MODE) {
        // Note: node selection will be useful in player mode for
        // displaying more information about a given selected node
        // Player mode logic for deselecting all nodes
        if (event.target === cy) {
          // Clicked on background
          // Clear selected nodes
          cy.$('node:selected').unselect();
          selectedNodes.current = [];
        }
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
    cy,
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
    handleGlobalKeyDown,
    skillTreeMode,
    setIsChangingIcon,
    handleNodeSingleClick
  ]);

  /**
   * Sets up Cytoscape event handlers for edge interactions.
   */
  useEffect(() => {
    if (!cy) return;

    // Handler for edge selection
    cy.on('select', 'edge', handleEdgeSelect);

    // Handler for edge deselection
    cy.on('unselect', 'edge', handleEdgeDeselect);

    // Cleanup event handlers on unmount
    return () => {
      cy.off('select', 'edge', handleEdgeSelect);
      cy.off('unselect', 'edge', handleEdgeDeselect);
    };
  }, [cy, handleEdgeSelect, handleEdgeDeselect]);

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
    removeTemporaryNodes
  };
};

export default useGraphHandlers;
