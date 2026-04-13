import React from "react";

type ReactFlowTestState = {
  fitViewCalls: number;
  lastProps: ReactFlowProps | null;
};

const M_REACT_FLOW_TEST_STATE: ReactFlowTestState = {
  fitViewCalls: 0,
  lastProps: null
};

export type XYPosition = { x: number; y: number };

export type Node<Data = Record<string, unknown>> = {
  id: string;
  type?: string;
  data: Data;
  position: XYPosition;
  selected?: boolean;
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: Record<string, unknown>;
};

export type Connection = {
  source?: string | null;
  target?: string | null;
};

export type NodeChange = {
  id: string;
  type: "add" | "remove" | "replace" | "select" | "position" | "dimensions" | "reset";
  selected?: boolean;
  position?: XYPosition;
  item?: Node;
};

export type EdgeChange = {
  id: string;
  type: "add" | "remove" | "replace" | "select";
  selected?: boolean;
  item?: Edge;
};

export enum Position {
  Left = "left",
  Right = "right",
  Top = "top",
  Bottom = "bottom"
}

export function Handle(): React.JSX.Element {
  return <span data-testid="xy-handle" />;
}

export function Controls(): React.JSX.Element {
  return <div data-testid="xy-controls" />;
}

export function MiniMap(): React.JSX.Element {
  return <div data-testid="xy-minimap" />;
}

export function Background(): React.JSX.Element {
  return <div data-testid="xy-background" />;
}

export function ReactFlowProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

type ReactFlowProps = {
  nodes: Node[];
  edges?: Edge[];
  nodeTypes?: Record<string, React.ComponentType<any>>;
  style?: React.CSSProperties;
  onNodeClick?: (_event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (_event: React.MouseEvent, edge: Edge) => void;
  onPaneClick?: () => void;
  onMoveStart?: () => void;
  onNodesChange?: (_changes: NodeChange[]) => void;
  onEdgesChange?: (_changes: EdgeChange[]) => void;
  onConnect?: (_connection: Connection) => void;
  children?: React.ReactNode;
};

export function ReactFlow({
  nodes,
  edges = [],
  nodeTypes = {},
  style,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onMoveStart,
  onNodesChange,
  onEdgesChange,
  onConnect,
  children
}: ReactFlowProps): React.JSX.Element {
  M_REACT_FLOW_TEST_STATE.lastProps = {
    nodes,
    edges,
    nodeTypes,
    style,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onMoveStart,
    onNodesChange,
    onEdgesChange,
    onConnect,
    children
  };
  return (
    <div data-testid="xyflow-root" style={style} onClick={() => onPaneClick?.()}>
      {nodes.map((node) => {
        const NodeComponent = node.type ? nodeTypes[node.type] : undefined;
        return (
          <div
            key={node.id}
            data-testid={`xy-node-${node.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onNodeClick?.(event, node);
            }}
          >
            {NodeComponent ? <NodeComponent id={node.id} data={node.data} selected={node.selected} /> : <span>{node.id}</span>}
          </div>
        );
      })}
      {edges.map((edge) => (
        <button
          key={edge.id}
          type="button"
          data-testid={`xy-edge-${edge.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onEdgeClick?.(event, edge);
          }}
        >
          {edge.label ?? edge.id}
        </button>
      ))}
      {children}
    </div>
  );
}

export default ReactFlow;

export function useNodesInitialized(): boolean {
  return true;
}

export function useReactFlow(): { fitView: (_options?: Record<string, unknown>) => Promise<void> } {
  return {
    fitView: async () => {
      M_REACT_FLOW_TEST_STATE.fitViewCalls += 1;
    }
  };
}

export function useUpdateNodeInternals(): (_nodeId: string) => void {
  return () => {};
}

export function MResetReactFlowTestState(): void {
  M_REACT_FLOW_TEST_STATE.fitViewCalls = 0;
  M_REACT_FLOW_TEST_STATE.lastProps = null;
}

export function MGetReactFlowTestState(): ReactFlowTestState {
  return M_REACT_FLOW_TEST_STATE;
}

export function addEdge(connection: Connection, edges: Edge[]): Edge[] {
  if (!connection.source || !connection.target) {
    return edges;
  }

  return [
    ...edges,
    {
      id: `${connection.source}-${connection.target}-${edges.length + 1}`,
      source: connection.source,
      target: connection.target
    }
  ];
}

export function applyNodeChanges(changes: NodeChange[], nodes: Node[]): Node[] {
  let next = [...nodes];
  for (const change of changes) {
    if (change.type === "remove") {
      next = next.filter((node) => node.id !== change.id);
      continue;
    }

    next = next.map((node) =>
      node.id !== change.id
        ? node
        : {
            ...node,
            selected: change.type === "select" ? change.selected : node.selected,
            position: change.type === "position" && change.position ? change.position : node.position
          }
    );
  }

  return next;
}

export function applyEdgeChanges(changes: EdgeChange[], edges: Edge[]): Edge[] {
  let next = [...edges];
  for (const change of changes) {
    if (change.type === "remove") {
      next = next.filter((edge) => edge.id !== change.id);
      continue;
    }

    next = next.map((edge) =>
      edge.id !== change.id
        ? edge
        : {
            ...edge,
            data: {
              ...(edge.data ?? {}),
              selected: change.selected
            }
          }
    );
  }

  return next;
}
