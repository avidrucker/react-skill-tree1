// src/hooks/useGraphHandlers.js
/**
 * This file contains custom React hooks and handlers for managing the 
 * Cryptoscape node graph.
 * 
 * The handlers include functions for managing node and edge interactions, 
 * such as adding, removing, and updating nodes and edges.
 * 
 * The useEffect hooks are used to set up and clean up event listeners and 
 * other side effects related to the node graph.
 * These effects ensure that the graph state is synchronized with the 
 * component state and that any necessary updates are performed when the 
 * component mounts, updates, or unmounts.
 */
import { useState, useEffect, useRef } from 'react';

const useGraphHandlers = (cyRef, elements, setElements) => {
  const [tempNodes, setTempNodes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [editNodePosition, setEditNodePosition] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const nodeIdCounter = useRef(2);

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

  return {
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
  };
};

export default useGraphHandlers;
