import React, { useEffect, useMemo, useState } from 'react';
import {
  Maximize2,
  Network,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DocumentRecord, InferenceRule, KnowledgeFact } from '../types';

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  degree: number;
  isPrimarySubject: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  factType: KnowledgeFact['factType'];
  ruleApplied?: string;
}

export function KnowledgeGraphPage({
  documents,
  facts,
  rules,
}: {
  documents: DocumentRecord[];
  facts: KnowledgeFact[];
  rules: InferenceRule[];
}) {
  const [search, setSearch] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [showInferred, setShowInferred] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  const filteredFacts = useMemo(() => {
    return facts.filter((f) => {
      if (!showInferred && f.factType === 'inferred') return false;
      if (docFilter !== 'all' && f.documentId !== docFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          f.subject.toLowerCase().includes(q) ||
          f.predicate.toLowerCase().includes(q) ||
          f.object.toLowerCase().includes(q)
        );
      }
      return true;
    }).slice(0, 45);
  }, [facts, docFilter, showInferred, search]);

  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    for (const f of filteredFacts) {
      const sId = f.subject;
      const oId = f.object;
      if (!nodeMap.has(sId)) {
        nodeMap.set(sId, {
          id: sId,
          label: sId,
          x: 0,
          y: 0,
          degree: 0,
          isPrimarySubject: true,
        });
      }
      if (!nodeMap.has(oId)) {
        nodeMap.set(oId, {
          id: oId,
          label: oId,
          x: 0,
          y: 0,
          degree: 0,
          isPrimarySubject: false,
        });
      }
      nodeMap.get(sId)!.degree += 1;
      nodeMap.get(oId)!.degree += 1;
      edgeList.push({
        id: f.factId,
        source: sId,
        target: oId,
        label: f.predicate,
        factType: f.factType,
        ruleApplied: f.ruleApplied,
      });
    }

    const list = Array.from(nodeMap.values());
    const cx = 440;
    const cy = 270;
    const hubs = list.filter((n) => n.isPrimarySubject);
    const leaves = list.filter((n) => !n.isPrimarySubject);

    hubs.forEach((n, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, hubs.length);
      const r = hubs.length === 1 ? 0 : 120;
      const preset = nodePositions[n.id];
      n.x = preset ? preset.x : Math.round(cx + r * Math.cos(angle));
      n.y = preset ? preset.y : Math.round(cy + r * Math.sin(angle));
    });

    leaves.forEach((n, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, leaves.length);
      const r = 215 + (idx % 2) * 38;
      const preset = nodePositions[n.id];
      n.x = preset ? preset.x : Math.round(cx + r * Math.cos(angle));
      n.y = preset ? preset.y : Math.round(cy + r * Math.sin(angle));
    });

    return { nodes: list, edges: edgeList };
  }, [filteredFacts, nodePositions]);

  useEffect(() => {
    if (nodes.length > 0 && (!selectedNodeId || !nodes.some((n) => n.id === selectedNodeId))) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  const selectedRelatedFacts = useMemo(() => {
    if (!selectedNodeId) return [];
    return filteredFacts.filter(
      (f) => f.subject === selectedNodeId || f.object === selectedNodeId
    );
  }, [filteredFacts, selectedNodeId]);

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingNode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * (880 / zoom);
    const y = ((e.clientY - rect.top) / rect.height) * (540 / zoom);
    setNodePositions((prev) => ({
      ...prev,
      [draggingNode]: {
        x: Math.max(50, Math.min(830, Math.round(x))),
        y: Math.max(40, Math.min(500, Math.round(y))),
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Interactive Knowledge Graph
          </h1>
          <p className="text-sm text-slate-600 tabular-nums">
            Visualizing {nodes.length} entities · {edges.length} relationships · {rules.filter((r) => r.enabled).length} active inference rules
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
            className="p-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            className="p-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setNodePositions({});
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Layout
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter concepts or relationships..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="all">All Documents</option>
            {documents.map((d) => (
              <option key={d.documentId} value={d.documentId}>
                {d.fileName}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInferred}
              onChange={(e) => setShowInferred(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            Show Inferred Relationships
          </label>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <Network className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-medium text-slate-900">No graph entities to render</p>
          <p className="text-xs text-slate-500">
            Upload a document or clear your search filter to explore entities and relationships.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-blue-600 inline-block" />
                  Direct Fact
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
                  Inferred Fact
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Maximize2 className="w-3.5 h-3.5" />
                Drag nodes to reposition · Click node to inspect
              </span>
            </div>

            <div className="relative bg-slate-50/50 overflow-hidden">
              <svg
                viewBox={`0 0 ${Math.round(880 / zoom)} ${Math.round(540 / zoom)}`}
                className="w-full h-[520px] select-none cursor-grab active:cursor-grabbing"
                onPointerMove={handleSvgPointerMove}
                onPointerUp={() => setDraggingNode(null)}
                onPointerLeave={() => setDraggingNode(null)}
              >
                <defs>
                  <marker
                    id="arrow-direct"
                    viewBox="0 0 10 10"
                    refX="20"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563EB" />
                  </marker>
                  <marker
                    id="arrow-inferred"
                    viewBox="0 0 10 10"
                    refX="20"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
                  </marker>
                </defs>

                {edges.map((edge) => {
                  const s = nodes.find((n) => n.id === edge.source);
                  const t = nodes.find((n) => n.id === edge.target);
                  if (!s || !t) return null;
                  const isInferred = edge.factType === 'inferred';
                  const mx = (s.x + t.x) / 2;
                  const my = (s.y + t.y) / 2;
                  const highlighted =
                    selectedNodeId === edge.source || selectedNodeId === edge.target;

                  return (
                    <g key={edge.id} opacity={selectedNodeId && !highlighted ? 0.35 : 1}>
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={isInferred ? '#D97706' : '#2563EB'}
                        strokeWidth={highlighted ? 2 : 1.4}
                        strokeDasharray={isInferred ? '5,4' : undefined}
                        markerEnd={
                          isInferred ? 'url(#arrow-inferred)' : 'url(#arrow-direct)'
                        }
                      />
                      <rect
                        x={mx - 34}
                        y={my - 9}
                        width="68"
                        height="16"
                        rx="4"
                        fill="#FFFFFF"
                        stroke="#E2E8F0"
                      />
                      <text
                        x={mx}
                        y={my + 3}
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                        fill={isInferred ? '#B45309' : '#1D4ED8'}
                      >
                        {edge.label.length > 11 ? `${edge.label.slice(0, 10)}…` : edge.label}
                      </text>
                    </g>
                  );
                })}

                {nodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const r = node.isPrimarySubject ? 22 : 16;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setDraggingNode(node.id);
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        r={r}
                        fill={
                          isSelected
                            ? '#1D4ED8'
                            : node.isPrimarySubject
                            ? '#2563EB'
                            : '#FFFFFF'
                        }
                        stroke={node.isPrimarySubject ? '#1E40AF' : '#94A3B8'}
                        strokeWidth={isSelected ? 3 : 1.5}
                      />
                      <text
                        y={r + 14}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={isSelected || node.isPrimarySubject ? 600 : 500}
                        fill="#0F172A"
                      >
                        {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <p className="text-xs text-slate-500">Selected Entity</p>
              <h2 className="font-display text-lg font-semibold text-slate-900 break-words">
                {selectedNodeId ?? 'None'}
              </h2>
            </div>

            <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
              <p className="text-xs font-semibold text-slate-700">
                Connected Facts & Inference Paths ({selectedRelatedFacts.length})
              </p>
              {selectedRelatedFacts.map((f) => (
                <div
                  key={f.factId}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs"
                >
                  <p className="font-mono text-slate-900">
                    {f.subject} <span className="text-blue-700">→ {f.predicate} →</span>{' '}
                    {f.object}
                  </p>
                  <p className="text-slate-500">
                    {f.factType === 'inferred'
                      ? `Inferred via ${f.ruleApplied ?? 'Rule'}`
                      : `Source: ${f.documentName}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
