import React, { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  deleteDocumentAndFacts,
  rebuildDocumentKnowledgeBase,
} from '../services/firestoreService';
import {
  DocumentRecord,
  FileType,
  InferenceRule,
  KnowledgeFact,
  NavPage,
} from '../types';

export function DocumentsPage({
  userId,
  documents,
  facts,
  rules,
  onNavigate,
}: {
  userId: string;
  documents: DocumentRecord[];
  facts: KnowledgeFact[];
  rules: InferenceRule[];
  onNavigate: (page: NavPage, documentId?: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FileType>('all');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rebuildingId, setRebuildingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'text' | 'facts'>('text');

  const filtered = documents.filter((d) => {
    const matchesSearch = d.fileName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || d.fileType === typeFilter;
    return matchesSearch && matchesType;
  });

  const selectedDoc =
    documents.find((d) => d.documentId === selectedDocId) ?? filtered[0] ?? null;

  const selectedDocFacts = selectedDoc
    ? facts.filter((f) => f.documentId === selectedDoc.documentId)
    : [];

  const handleRebuild = async (docItem: DocumentRecord) => {
    setRebuildingId(docItem.documentId);
    try {
      await rebuildDocumentKnowledgeBase({
        userId,
        document: docItem,
        existingFacts: facts,
        existingRules: rules,
      });
    } finally {
      setRebuildingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await deleteDocumentAndFacts(docId, facts);
      if (selectedDocId === docId) setSelectedDocId(null);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Document Management
          </h1>
          <p className="text-sm text-slate-600">
            Inspect extracted text, rebuild Knowledge Base triples, or manage uploaded documents.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('upload')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          Upload New Document
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search uploaded documents..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(['all', 'pdf', 'docx', 'txt', 'csv'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                typeFilter === t
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'all' ? 'All' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="font-display text-base font-semibold text-slate-900">
            No documents uploaded
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Upload a PDF, DOCX, TXT, or CSV file to start building your Knowledge Base.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Go to Upload
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Documents ({filtered.length})
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filtered.map((docItem) => {
                const isSelected = selectedDoc?.documentId === docItem.documentId;
                const docFactCount = facts.filter(
                  (f) => f.documentId === docItem.documentId
                ).length;

                return (
                  <div
                    key={docItem.documentId}
                    className={`p-4 transition-colors ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDocId(docItem.documentId)}
                        className="flex items-start gap-3 text-left min-w-0 flex-1"
                      >
                        <FileText
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            isSelected ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {docItem.fileName}
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                            {docItem.fileType.toUpperCase()} ·{' '}
                            {Math.max(1, Math.round(docItem.fileSize / 1024))} KB ·{' '}
                            {docFactCount} facts ·{' '}
                            {docItem.uploadDate
                              ? docItem.uploadDate.toLocaleDateString()
                              : 'Just now'}
                          </p>
                        </div>
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate('chat', docItem.documentId)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md whitespace-nowrap"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Ask Q&A
                      </button>
                      <button
                        type="button"
                        disabled={rebuildingId === docItem.documentId}
                        onClick={() => void handleRebuild(docItem)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap disabled:opacity-60"
                      >
                        {rebuildingId === docItem.documentId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Rebuild KB
                      </button>
                      {docItem.fileURL && (
                        <a
                          href={docItem.fileURL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open File
                        </a>
                      )}
                      {confirmDeleteId === docItem.documentId ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === docItem.documentId}
                            onClick={() => void handleDelete(docItem.documentId)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md whitespace-nowrap"
                          >
                            {deletingId === docItem.documentId ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(docItem.documentId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            {selectedDoc ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-slate-900 truncate">
                      {selectedDoc.fileName}
                    </h2>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Document ID: <span className="font-mono">{selectedDoc.documentId}</span> ·{' '}
                      {selectedDocFacts.length} facts
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start">
                    <button
                      type="button"
                      onClick={() => setDetailTab('text')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        detailTab === 'text'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Extracted Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('facts')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        detailTab === 'facts'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Document Facts ({selectedDocFacts.length})
                    </button>
                  </div>
                </div>

                {detailTab === 'text' ? (
                  <pre className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 font-sans whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">
                    {selectedDoc.extractedText}
                  </pre>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 text-xs font-semibold text-slate-700">Subject</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-slate-700">Predicate</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-slate-700">Object</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-slate-700">Origin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {selectedDocFacts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">
                              <BookOpen className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                              No facts linked to this document yet. Click &ldquo;Rebuild KB&rdquo; to extract.
                            </td>
                          </tr>
                        ) : (
                          selectedDocFacts.map((fact) => (
                            <tr key={fact.factId} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-900">{fact.subject}</td>
                              <td className="py-2 px-3 font-mono text-blue-700">{fact.predicate}</td>
                              <td className="py-2 px-3 text-slate-700">{fact.object}</td>
                              <td className="py-2 px-3 text-slate-600 capitalize">
                                {fact.factType}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500 py-8 text-center">
                Select a document on the left to inspect its extracted content and facts.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
