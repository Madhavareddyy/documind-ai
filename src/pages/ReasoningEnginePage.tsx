import React, { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  BackwardChainingResult,
  ForwardChainingResult,
  runBackwardChaining,
  runForwardChaining,
} from '../engine/reasoningEngine';
import {
  deleteRuleById,
  saveInferenceRule,
  toggleRuleEnabled,
} from '../services/firestoreService';
import {
  DocumentRecord,
  InferenceRule,
  KnowledgeFact,
  RuleType,
} from '../types';

export function ReasoningEnginePage({
  userId,
  documents,
  facts,
  rules,
}: {
  userId: string;
  documents: DocumentRecord[];
  facts: KnowledgeFact[];
  rules: InferenceRule[];
}) {
  const [activeTab, setActiveTab] = useState<'rules' | 'forward' | 'backward'>('rules');
  const [docScope, setDocScope] = useState<string>('all');

  // Add Rule state
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('if-then');
  const [antSubj, setAntSubj] = useState('?x');
  const [antPred, setAntPred] = useState('is_a');
  const [antObj, setAntObj] = useState('?y');
  const [secPred, setSecPred] = useState('has');
  const [consPred, setConsPred] = useState('has');
  const [consObj, setConsObj] = useState('?z');
  const [savingRule, setSavingRule] = useState(false);

  // Forward Chaining state
  const [fcResult, setFcResult] = useState<ForwardChainingResult | null>(null);

  // Backward Chaining state
  const [goalSubj, setGoalSubj] = useState('Java');
  const [goalPred, setGoalPred] = useState('has');
  const [goalObj, setGoalObj] = useState('syntax');
  const [bcResult, setBcResult] = useState<BackwardChainingResult | null>(null);

  const scopedFacts =
    docScope === 'all' ? facts : facts.filter((f) => f.documentId === docScope);
  const baseFacts = scopedFacts.filter((f) => f.factType !== 'inferred');

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !antPred.trim() || !consPred.trim()) return;
    setSavingRule(true);
    try {
      await saveInferenceRule({
        userId,
        name: ruleName,
        ruleType,
        antecedentSubject: antSubj,
        antecedentPredicate: antPred,
        antecedentObject: antObj,
        secondPredicate: secPred,
        consequentPredicate: consPred,
        consequentObject: consObj,
      });
      setRuleName('');
      setShowAddRule(false);
    } finally {
      setSavingRule(false);
    }
  };

  const handleRunForward = () => {
    const res = runForwardChaining(
      baseFacts.length > 0 ? baseFacts : scopedFacts,
      rules
    );
    setFcResult(res);
  };

  const handleRunBackward = (e: React.FormEvent) => {
    e.preventDefault();
    const res = runBackwardChaining(
      {
        subject: goalSubj.trim() || undefined,
        predicate: goalPred.trim() || undefined,
        object: goalObj.trim() || undefined,
      },
      baseFacts.length > 0 ? baseFacts : scopedFacts,
      rules
    );
    setBcResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Symbolic AI Reasoning Engine
          </h1>
          <p className="text-sm text-slate-600">
            Inspect IF-THEN rules, execute Forward Chaining derivations, and prove goals via Backward Chaining.
          </p>
        </div>

        <select
          value={docScope}
          onChange={(e) => setDocScope(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 self-start"
        >
          <option value="all">All Documents ({baseFacts.length} base facts)</option>
          {documents.map((d) => (
            <option key={d.documentId} value={d.documentId}>
              {d.fileName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {(
          [
            { id: 'rules', label: `IF-THEN Rules (${rules.length})` },
            { id: 'forward', label: 'Forward Chaining' },
            { id: 'backward', label: 'Backward Chaining' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 tabular-nums">
              {rules.filter((r) => r.enabled).length} of {rules.length} rules active
            </p>
            <button
              type="button"
              onClick={() => setShowAddRule((v) => !v)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              New IF-THEN Rule
            </button>
          </div>

          {showAddRule && (
            <form
              onSubmit={handleCreateRule}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Define Symbolic Inference Rule
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddRule(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Framework Language Inheritance"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as RuleType)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="if-then">IF-THEN Rule</option>
                    <option value="taxonomy">Taxonomy Transitivity</option>
                    <option value="property-inheritance">Property Inheritance</option>
                    <option value="transitivity">Transitivity</option>
                    <option value="equivalence">Equivalence</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Antecedent Subject
                  </label>
                  <input
                    type="text"
                    value={antSubj}
                    onChange={(e) => setAntSubj(e.target.value)}
                    placeholder="?x or Java"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Antecedent Predicate
                  </label>
                  <input
                    type="text"
                    required
                    value={antPred}
                    onChange={(e) => setAntPred(e.target.value)}
                    placeholder="is_a"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Antecedent Object
                  </label>
                  <input
                    type="text"
                    value={antObj}
                    onChange={(e) => setAntObj(e.target.value)}
                    placeholder="?y or programming language"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    2nd Premise Predicate (optional)
                  </label>
                  <input
                    type="text"
                    value={secPred}
                    onChange={(e) => setSecPred(e.target.value)}
                    placeholder="has (leave blank for 1-premise)"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Consequent Predicate
                  </label>
                  <input
                    type="text"
                    required
                    value={consPred}
                    onChange={(e) => setConsPred(e.target.value)}
                    placeholder="has"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Consequent Object
                  </label>
                  <input
                    type="text"
                    value={consObj}
                    onChange={(e) => setConsObj(e.target.value)}
                    placeholder="?z or syntax"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRule(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Save Rule
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {rules.map((rule) => (
              <div
                key={rule.ruleId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{rule.name}</h3>
                    <span className="text-xs text-slate-500 capitalize">
                      · {rule.ruleType.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-blue-800">
                    {rule.condition} {rule.conclusion}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => void toggleRuleEnabled(rule.ruleId, !rule.enabled)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                      rule.enabled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteRuleById(rule.ruleId)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'forward' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Data-Driven Forward Chaining Engine
              </h2>
              <p className="text-xs text-slate-500">
                Starts with {baseFacts.length} known base facts and repeatedly applies active IF-THEN rules to derive new inferred facts.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunForward}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4" />
              Run Forward Chaining
            </button>
          </div>

          {fcResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-700">
                  Newly Inferred Facts ({fcResult.inferredFacts.length})
                </h3>
                {fcResult.inferredFacts.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    No additional facts could be inferred from the current base facts and enabled rules.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
                    {fcResult.inferredFacts.map((inf) => (
                      <div key={inf.factId} className="p-3 space-y-1 text-xs">
                        <p className="font-mono font-semibold text-amber-800">
                          ({inf.subject}, {inf.predicate}, {inf.object})
                        </p>
                        <p className="text-slate-500">
                          Rule: {inf.ruleApplied} · Premises: {inf.sourceText}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-700">
                  Inference Execution Trace ({fcResult.iterations} iteration(s))
                </h3>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 space-y-1.5 max-h-96 overflow-y-auto">
                  {fcResult.trace.length === 0 ? (
                    <p className="text-slate-500">Fixpoint reached immediately with 0 rule firings.</p>
                  ) : (
                    fcResult.trace.map((line, i) => <p key={i}>{line}</p>)
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-lg">
              <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                Click &ldquo;Run Forward Chaining&rdquo; to inspect rule firings and derived facts.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'backward' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Goal-Driven Backward Chaining Prover
            </h2>
            <p className="text-xs text-slate-500">
              Specify a target hypothesis triple (Subject, Predicate, Object) and work backward through rules to verify if the Knowledge Base proves it.
            </p>
          </div>

          <form onSubmit={handleRunBackward} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={goalSubj}
              onChange={(e) => setGoalSubj(e.target.value)}
              placeholder="Subject (e.g. Java)"
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              value={goalPred}
              onChange={(e) => setGoalPred(e.target.value)}
              placeholder="Predicate (e.g. has)"
              className="px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              value={goalObj}
              onChange={(e) => setGoalObj(e.target.value)}
              placeholder="Object (e.g. syntax)"
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              Prove Goal
            </button>
          </form>

          {bcResult && (
            <div className="space-y-4 pt-2">
              <div
                className={`p-4 rounded-lg border flex items-center gap-3 ${
                  bcResult.proven
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold">
                    {bcResult.proven ? 'Goal Proven' : 'Goal Not Proven'}
                  </span>{' '}
                  — Matched {bcResult.directMatches.length} direct fact(s) and{' '}
                  {bcResult.inferredMatches.length} inferred derivation(s).
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">
                  Backward Chaining Search Trace
                </h3>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 space-y-1.5 max-h-80 overflow-y-auto">
                  {bcResult.trace.map((step, i) => (
                    <p key={i}>{step}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
