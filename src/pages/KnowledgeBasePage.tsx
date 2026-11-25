import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  addManualFact,
  deleteKnowledgeFact,
  downloadCsvFile,
  updateKnowledgeFact,
} from '../services/firestoreService';
import {
  DocumentRecord,
  FactType,
  KnowledgeFact,
  VerificationStatus,
} from '../types';

export function KnowledgeBasePage({
  userId,
  documents,
  facts,
}: {
  userId: string;
  documents: DocumentRecord[];
  facts: KnowledgeFact[];
}) {
  const [search, setSearch] = useState('');
  const [docFilter, setDocFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | FactType>('all');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newPredicate, setNewPredicate] = useState('is_a');
  const [newObject, setNewObject] = useState('');
  const [newDocId, setNewDocId] = useState('manual');
  const [newSourceText, setNewSourceText] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingFact, setEditingFact] = useState<KnowledgeFact | null>(null);

  const filtered = facts.filter((f) => {
    const q = search.toLowerCase();
    const matchesQuery =
      !q ||
      f.subject.toLowerCase().includes(q) ||
      f.predicate.toLowerCase().includes(q) ||
      f.object.toLowerCase().includes(q) ||
      f.factId.toLowerCase().includes(q) ||
      f.documentName.toLowerCase().includes(q);
    const matchesDoc = docFilter === 'all' || f.documentId === docFilter;
    const matchesType = typeFilter === 'all' || f.factType === typeFilter;
    return matchesQuery && matchesDoc && matchesType;
  });

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newPredicate.trim() || !newObject.trim()) return;
    setSaving(true);
    try {
      const targetDoc = documents.find((d) => d.documentId === newDocId);
      await addManualFact({
        userId,
        documentId: targetDoc ? targetDoc.documentId : 'manual',
        documentName: targetDoc ? targetDoc.fileName : 'Manual Entry',
        subject: newSubject,
        predicate: newPredicate,
        object: newObject,
        sourceText: newSourceText || `${newSubject} ${newPredicate.replace(/_/g, ' ')} ${newObject}`,
      });
      setNewSubject('');
      setNewObject('');
      setNewSourceText('');
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFact) return;
    setSaving(true);
    try {
      await updateKnowledgeFact({
        factId: editingFact.factId,
        subject: editingFact.subject,
        predicate: editingFact.predicate,
        object: editingFact.object,
        sourceText: editingFact.sourceText,
        verificationStatus: editingFact.verificationStatus,
        confidence: editingFact.confidence,
      });
      setEditingFact(null);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    downloadCsvFile(
      'documind-knowledge-base.csv',
      [
        'Fact ID',
        'Subject',
        'Relationship',
        'Object',
        'Source Document',
        'Fact Type',
        'Verification Status',
        'Confidence',
        'Rule Applied',
      ],
      filtered.map((f) => [
        f.factId,
        f.subject,
        f.predicate,
        f.object,
        f.documentName,
        f.factType,
        f.verificationStatus,
        f.confidence,
        f.ruleApplied ?? '',
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Structured Knowledge Base
          </h1>
          <p className="text-sm text-slate-600 tabular-nums">
            {facts.length} total triples ({facts.filter((f) => f.factType !== 'inferred').length} direct ·{' '}
            {facts.filter((f) => f.factType === 'inferred').length} inferred)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Fact
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddFact}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Add Structured Knowledge Fact
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Subject</label>
              <input
                type="text"
                required
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Java"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Relationship</label>
              <input
                type="text"
                required
                value={newPredicate}
                onChange={(e) => setNewPredicate(e.target.value)}
                placeholder="e.g. supports"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Object</label>
              <input
                type="text"
                required
                value={newObject}
                onChange={(e) => setNewObject(e.target.value)}
                placeholder="e.g. inheritance"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Source Document</label>
              <select
                value={newDocId}
                onChange={(e) => setNewDocId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="manual">Manual Entry</option>
                {documents.map((d) => (
                  <option key={d.documentId} value={d.documentId}>
                    {d.fileName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Fact'}
            </button>
          </div>
        </form>
      )}

      {editingFact && (
        <form
          onSubmit={handleUpdateFact}
          className="bg-white border border-blue-300 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Edit Fact <span className="font-mono text-xs text-slate-500">{editingFact.factId}</span>
            </h2>
            <button
              type="button"
              onClick={() => setEditingFact(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Subject</label>
              <input
                type="text"
                required
                value={editingFact.subject}
                onChange={(e) =>
                  setEditingFact({ ...editingFact, subject: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Relationship</label>
              <input
                type="text"
                required
                value={editingFact.predicate}
                onChange={(e) =>
                  setEditingFact({ ...editingFact, predicate: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Object</label>
              <input
                type="text"
                required
                value={editingFact.object}
                onChange={(e) =>
                  setEditingFact({ ...editingFact, object: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Status</label>
              <select
                value={editingFact.verificationStatus}
                onChange={(e) =>
                  setEditingFact({
                    ...editingFact,
                    verificationStatus: e.target.value as VerificationStatus,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="inferred">Inferred</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Confidence (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={editingFact.confidence}
                onChange={(e) =>
                  setEditingFact({
                    ...editingFact,
                    confidence: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingFact(null)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Update Fact
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by subject, relationship, object, or fact ID..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="all">All Source Documents</option>
            <option value="manual">Manual Entries</option>
            {documents.map((d) => (
              <option key={d.documentId} value={d.documentId}>
                {d.fileName}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'extracted', 'inferred', 'manual'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap ${
                  typeFilter === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Fact ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Subject</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Relationship</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Object</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Source Document</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Status & Confidence</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <BookOpen className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    No matching facts in the Knowledge Base.
                  </td>
                </tr>
              ) : (
                filtered.map((fact) => (
                  <tr key={fact.factId} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {fact.factId.slice(0, 14)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{fact.subject}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-blue-700 whitespace-nowrap">
                      {fact.predicate}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{fact.object}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 max-w-[180px] truncate">
                      {fact.documentName}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          fact.factType === 'inferred'
                            ? 'text-amber-700'
                            : fact.verificationStatus === 'verified'
                            ? 'text-emerald-700'
                            : 'text-slate-600'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="capitalize">{fact.factType}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{fact.confidence}%</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingFact(fact)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md"
                          title="Edit fact"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteKnowledgeFact(fact.factId)}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-md"
                          title="Delete fact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
