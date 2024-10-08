## Features:
- **Add Node**: Users can add new nodes to the skill tree. Adding a node also creates a corresponding flourish node and potentially an edge if another node is already selected.
- **Rename Node**: Nodes can be renamed directly in the graph.
- **Delete Node**: Nodes, along with their connected edges and flourish nodes, can be deleted.
- **Change Node Icon**: Users can change the icon of a node.
- **Connect Nodes**: Users can manually create edges between nodes.
- **Set Node State**: Users can set the initial state of a node to `Activated`, `Available`, or `Hidden` in Builder Mode.
- **Add Edge**: Users can connect edges between nodes in Builder Mode.
- **Delete Edge**: Users can delete connections between nodes in Builder Mode.
- **Zoom and Pan**: Users can zoom in and out and pan across the skill tree.
- **Show/Hide Menu**: Toggles visibility of the main menu.
- **Save and Load Tree State**: Users can save the current tree to a file (JSON format) or load it.
- **Validate Tree**: Validates the skill tree to ensure each component (cluster of connected nodes) has at least 1 accessible node.
- **Activate Node**: Users can activate nodes that are "Available" by double clicking on them.
- **Deactivate Node**: Users can deactivate nodes that are "Activated" by double clicking on them. 
- **Load Icons From Folder**: Users can load icons from a folder to use in the skill tree.
- **Keyboard Shortcuts**: Users can use keyboard shortcuts to perform actions such as deleting nodes/edges, submitting or aborting text changes, and quitting modal dialogs.
- **Skill Tree Modes**: Users can switch between Builder and Player modes to modify the skill tree or interact with it.
- **Double-click Interactions**: Supports double-click actions on nodes to bring up action buttons for editing, deleting, or changing the icon of a node.
- **Multi-Prerequisite Nodes**: Nodes can have multiple prerequisites, requiring all to be met before the node becomes available.
- **Flourish Nodes**: Nodes can have flourish nodes that are displayed when the node is activated or available

## User Stories:
- User can progressively activate a skill tree in player mode, setting nodes to `Available` status as prerequisites are met.
- User can zoom in and out of the graph manually, adjusting the view according to their preference, as well as auto-zoom to fit the graph to the screen.
- User can modify the skill tree in builder mode, freely adding, removing, or connecting skills.
- User can switch between builder and player modes, changing the interactivity of the tree.
- User can export and import skill trees, facilitating sharing and backup of skill tree designs.
- User can view and interact with the skill tree on various devices, ensuring accessibility and convenience.
- User receives feedback on actions, enhancing understanding and correcting mistakes during skill tree creation.