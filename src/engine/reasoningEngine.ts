import {
  InferenceRule,
  KnowledgeFact,
  QuestionType,
  ReasoningStrategy,
} from '../types';

export interface InferredFact extends KnowledgeFact {
  derivedFromFactIds: string[];
}

export interface ForwardChainingResult {
  inferredFacts: InferredFact[];
  trace: string[];
  iterations: number;
}

export interface BackwardChainingGoal {
  subject?: string;
  predicate?: string;
  object?: string;
}

export interface BackwardChainingResult {
  proven: boolean;
  directMatches: KnowledgeFact[];
  inferredMatches: InferredFact[];
  trace: string[];
}

export interface QuestionAnswerResult {
  question: string;
  questionType: QuestionType;
  answer: string;
  reasoning: string;
  reasoningSteps: string[];
  directFacts: KnowledgeFact[];
  inferredFacts: InferredFact[];
  strategyUsed: ReasoningStrategy;
  answered: boolean;
  extractedTerms: string[];
}

export const INSUFFICIENT_INFO_MESSAGE =
  'Sorry, the uploaded document does not contain sufficient information to answer this question.';

export const DEFAULT_RULE_TEMPLATES: Omit<
  InferenceRule,
  'ruleId' | 'userId' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'Taxonomy Transitivity',
    condition: 'IF (?x, is_a, ?y) AND (?y, is_a, ?z)',
    conclusion: 'THEN (?x, is_a, ?z)',
    ruleType: 'taxonomy',
    antecedentSubject: '?x',
    antecedentPredicate: 'is_a',
    antecedentObject: '?y',
    secondPredicate: 'is_a',
    consequentPredicate: 'is_a',
    consequentObject: '?z',
    enabled: true,
  },
  {
    name: 'Property Inheritance',
    condition: 'IF (?x, is_a, ?y) AND (?y, has, ?z)',
    conclusion: 'THEN (?x, has, ?z)',
    ruleType: 'property-inheritance',
    antecedentSubject: '?x',
    antecedentPredicate: 'is_a',
    antecedentObject: '?y',
    secondPredicate: 'has',
    consequentPredicate: 'has',
    consequentObject: '?z',
    enabled: true,
  },
  {
    name: 'Capability Inheritance',
    condition: 'IF (?x, is_a, ?y) AND (?y, supports, ?z)',
    conclusion: 'THEN (?x, supports, ?z)',
    ruleType: 'property-inheritance',
    antecedentSubject: '?x',
    antecedentPredicate: 'is_a',
    antecedentObject: '?y',
    secondPredicate: 'supports',
    consequentPredicate: 'supports',
    consequentObject: '?z',
    enabled: true,
  },
  {
    name: 'Method Inheritance',
    condition: 'IF (?x, is_a, ?y) AND (?y, uses, ?z)',
    conclusion: 'THEN (?x, uses, ?z)',
    ruleType: 'property-inheritance',
    antecedentSubject: '?x',
    antecedentPredicate: 'is_a',
    antecedentObject: '?y',
    secondPredicate: 'uses',
    consequentPredicate: 'uses',
    consequentObject: '?z',
    enabled: true,
  },
  {
    name: 'Component Transitivity',
    condition: 'IF (?x, part_of, ?y) AND (?y, part_of, ?z)',
    conclusion: 'THEN (?x, part_of, ?z)',
    ruleType: 'transitivity',
    antecedentSubject: '?x',
    antecedentPredicate: 'part_of',
    antecedentObject: '?y',
    secondPredicate: 'part_of',
    consequentPredicate: 'part_of',
    consequentObject: '?z',
    enabled: true,
  },
  {
    name: 'Causal Chain Inference',
    condition: 'IF (?x, causes, ?y) AND (?y, leads_to, ?z)',
    conclusion: 'THEN (?x, causes, ?z)',
    ruleType: 'transitivity',
    antecedentSubject: '?x',
    antecedentPredicate: 'causes',
    antecedentObject: '?y',
    secondPredicate: 'leads_to',
    consequentPredicate: 'causes',
    consequentObject: '?z',
    enabled: true,
  },
  {
    name: 'Inverse Creation Relationship',
    condition: 'IF (?x, created_by, ?y)',
    conclusion: 'THEN (?y, created, ?x)',
    ruleType: 'equivalence',
    antecedentSubject: '?x',
    antecedentPredicate: 'created_by',
    antecedentObject: '?y',
    secondPredicate: '',
    consequentPredicate: 'created',
    consequentObject: '?x',
    enabled: true,
  },
];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will', 'shall',
  'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about',
  'and', 'or', 'not', 'all', 'any', 'list', 'name', 'show', 'tell', 'me',
  'between', 'relationship', 'related', 'mentioned', 'document', 'concepts',
  'facts', 'define', 'explain', 'describe', 'please', 'there', 'that', 'this',
]);

function norm(val: string): string {
  return val.trim().toLowerCase().replace(/\s+/g, ' ');
}

function singularizeWord(val: string): string {
  const s = norm(val);
  if (s.endsWith('ies') && s.length > 4) return `${s.slice(0, -3)}y`;
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) return s.slice(0, -1);
  return s;
}

function termsMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (singularizeWord(na) === singularizeWord(nb)) return true;
  return false;
}

function predicateToProse(predicate: string, object?: string): string {
  if (predicate === 'is_a' && object) {
    const article = /^[aeiou]/i.test(object.trim()) ? 'is an' : 'is a';
    return article;
  }
  return predicate.replace(/_/g, ' ');
}

export function classifyQuestionType(question: string): QuestionType {
  const q = norm(question).replace(/[?!.]+$/, '');
  if (/^(?:what is the relationship|how are .+ related|relationship between)/.test(q) || q.includes('relationship between')) {
    return 'relationship';
  }
  if (/^(?:does|do|is|are|was|were|can|has|have|did)\b/.test(q)) {
    return 'yes-no';
  }
  if (/^(?:list|name all|what are all|what are the|show all|enumerate|which)\b/.test(q)) {
    return 'list';
  }
  if (/^(?:who|whom|whose)\b/.test(q)) return 'who';
  if (/^(?:when|what year|what date)\b/.test(q)) return 'when';
  if (/^(?:where|in which place)\b/.test(q)) return 'where';
  if (/^(?:why|what causes|what is the reason)\b/.test(q)) return 'why';
  if (/^(?:how|in what way)\b/.test(q)) return 'how';
  if (/^(?:what|define|explain|describe)\b/.test(q)) return 'what';
  return 'unknown';
}

export function extractQuestionKeywords(question: string): string[] {
  return norm(question)
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

export function runForwardChaining(
  baseFacts: KnowledgeFact[],
  rules: InferenceRule[],
  maxIterations = 5
): ForwardChainingResult {
  const enabledRules = rules.filter((r) => r.enabled);
  const workingMemory: (KnowledgeFact | InferredFact)[] = [...baseFacts];
  const inferredFacts: InferredFact[] = [];
  const trace: string[] = [];

  const seenKeys = new Set<string>(
    baseFacts.map((f) => `${norm(f.subject)}|${norm(f.predicate)}|${norm(f.object)}`)
  );

  // Also synthesize dynamic class-property inference from universal plural statements
  // e.g., ("programming languages", "has", "syntax") + ("Java", "is_a", "programming language")
  let iterations = 0;

  for (let iter = 1; iter <= maxIterations; iter++) {
    let addedInIter = 0;
    iterations = iter;

    const addInferred = (
      subject: string,
      predicate: string,
      object: string,
      ruleName: string,
      parentFact: KnowledgeFact,
      sourceIds: string[],
      sourceLabel: string
    ) => {
      const key = `${norm(subject)}|${norm(predicate)}|${norm(object)}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const newFact: InferredFact = {
        factId: `inf_${iter}_${inferredFacts.length + 1}`,
        userId: parentFact.userId,
        documentId: parentFact.documentId,
        documentName: parentFact.documentName,
        subject,
        predicate,
        object,
        sourceText: sourceLabel,
        factType: 'inferred',
        verificationStatus: 'inferred',
        confidence: Math.max(70, Math.min(95, parentFact.confidence - 5)),
        ruleApplied: ruleName,
        createdAt: null,
        updatedAt: null,
        derivedFromFactIds: sourceIds,
      };
      workingMemory.push(newFact);
      inferredFacts.push(newFact);
      addedInIter++;
      trace.push(
        `Iteration ${iter}: [${ruleName}] derived (${subject}, ${predicate}, ${object}) from ${sourceLabel}`
      );
    };

    const snapshot = [...workingMemory];

    for (const rule of enabledRules) {
      const isVarSubj = rule.antecedentSubject.startsWith('?') || !rule.antecedentSubject;
      const isVarObj = rule.antecedentObject.startsWith('?') || !rule.antecedentObject;

      // Case 1: Two-premise chain rule (e.g., (?x, P1, ?y) AND (?y, P2, ?z) => (?x, P3, ?z))
      if (rule.secondPredicate) {
        for (const f1 of snapshot) {
          if (!termsMatch(f1.predicate, rule.antecedentPredicate)) continue;
          if (!isVarSubj && !termsMatch(f1.subject, rule.antecedentSubject)) continue;

          for (const f2 of snapshot) {
            if (f1.factId === f2.factId) continue;
            if (!termsMatch(f2.predicate, rule.secondPredicate)) continue;
            if (termsMatch(f1.object, f2.subject)) {
              addInferred(
                f1.subject,
                rule.consequentPredicate,
                f2.object,
                rule.name,
                f1,
                [f1.factId, f2.factId],
                `(${f1.subject} ${f1.predicate} ${f1.object}) + (${f2.subject} ${f2.predicate} ${f2.object})`
              );
            }
          }
        }
      } else {
        // Case 2: Single-premise rule
        for (const f1 of snapshot) {
          if (!termsMatch(f1.predicate, rule.antecedentPredicate)) continue;
          if (!isVarSubj && !termsMatch(f1.subject, rule.antecedentSubject)) continue;
          if (!isVarObj && !termsMatch(f1.object, rule.antecedentObject)) continue;

          if (rule.ruleType === 'equivalence' && rule.consequentObject === '?x') {
            addInferred(
              f1.object,
              rule.consequentPredicate,
              f1.subject,
              rule.name,
              f1,
              [f1.factId],
              `(${f1.subject} ${f1.predicate} ${f1.object})`
            );
          } else if (rule.consequentObject && !rule.consequentObject.startsWith('?')) {
            const targetSubj =
              rule.antecedentSubject === '?x' || !rule.antecedentSubject
                ? f1.subject
                : rule.antecedentSubject;
            addInferred(
              targetSubj,
              rule.consequentPredicate,
              rule.consequentObject,
              rule.name,
              f1,
              [f1.factId],
              `(${f1.subject} ${f1.predicate} ${f1.object})`
            );
          }
        }
      }
    }

    if (addedInIter === 0) break;
  }

  return { inferredFacts, trace, iterations };
}

export function runBackwardChaining(
  goal: BackwardChainingGoal,
  baseFacts: KnowledgeFact[],
  rules: InferenceRule[],
  maxDepth = 3
): BackwardChainingResult {
  const trace: string[] = [];
  const directMatches: KnowledgeFact[] = [];
  const inferredMatches: InferredFact[] = [];
  const visited = new Set<string>();
  const enabledRules = rules.filter((r) => r.enabled);

  function matchesGoal(f: KnowledgeFact, g: BackwardChainingGoal): boolean {
    if (g.subject && !termsMatch(f.subject, g.subject)) return false;
    if (g.predicate && !termsMatch(f.predicate, g.predicate)) return false;
    if (g.object && !termsMatch(f.object, g.object)) return false;
    return true;
  }

  function prove(g: BackwardChainingGoal, depth: number): boolean {
    const goalKey = `${norm(g.subject ?? '*')}|${norm(g.predicate ?? '*')}|${norm(g.object ?? '*')}`;
    if (visited.has(goalKey) || depth > maxDepth) return false;
    visited.add(goalKey);

    trace.push(
      `Depth ${depth}: Trying to prove goal (${g.subject ?? '?'}, ${g.predicate ?? '?'}, ${g.object ?? '?'})`
    );

    // Base case: Check direct facts
    const hits = baseFacts.filter((f) => matchesGoal(f, g));
    if (hits.length > 0) {
      for (const h of hits) {
        if (!directMatches.some((d) => d.factId === h.factId)) {
          directMatches.push(h);
        }
        trace.push(
          `Depth ${depth}: Goal matched direct fact (${h.subject}, ${h.predicate}, ${h.object}) [${h.factId}]`
        );
      }
      return true;
    }

    // Recursive step: Check rules whose consequent matches goal predicate
    let provenAny = false;
    for (const rule of enabledRules) {
      if (g.predicate && !termsMatch(rule.consequentPredicate, g.predicate)) continue;
      if (
        g.object &&
        rule.consequentObject &&
        !rule.consequentObject.startsWith('?') &&
        !termsMatch(rule.consequentObject, g.object)
      ) {
        continue;
      }

      trace.push(`Depth ${depth}: Checking rule "${rule.name}" (${rule.condition} ${rule.conclusion})`);

      if (rule.secondPredicate) {
        // Find candidate intermediate entities via first premise
        const firstCandidates = baseFacts.filter(
          (f) =>
            termsMatch(f.predicate, rule.antecedentPredicate) &&
            (!g.subject || termsMatch(f.subject, g.subject))
        );

        for (const cand of firstCandidates) {
          const subGoal: BackwardChainingGoal = {
            subject: cand.object,
            predicate: rule.secondPredicate,
            object: g.object,
          };
          if (prove(subGoal, depth + 1)) {
            const matchedSecond = directMatches.filter(
              (m) =>
                termsMatch(m.subject, cand.object) &&
                termsMatch(m.predicate, rule.secondPredicate) &&
                (!g.object || termsMatch(m.object, g.object))
            );
            for (const sec of matchedSecond) {
              const inf: InferredFact = {
                factId: `bc_${cand.factId}_${sec.factId}`,
                userId: cand.userId,
                documentId: cand.documentId,
                documentName: cand.documentName,
                subject: cand.subject,
                predicate: rule.consequentPredicate,
                object: sec.object,
                sourceText: `(${cand.subject} ${cand.predicate} ${cand.object}) AND (${sec.subject} ${sec.predicate} ${sec.object})`,
                factType: 'inferred',
                verificationStatus: 'inferred',
                confidence: 88,
                ruleApplied: rule.name,
                createdAt: null,
                updatedAt: null,
                derivedFromFactIds: [cand.factId, sec.factId],
              };
              if (!inferredMatches.some((x) => norm(x.subject) === norm(inf.subject) && norm(x.predicate) === norm(inf.predicate) && norm(x.object) === norm(inf.object))) {
                inferredMatches.push(inf);
              }
              if (!directMatches.some((d) => d.factId === cand.factId)) {
                directMatches.push(cand);
              }
              provenAny = true;
            }
          }
        }
      } else if (rule.ruleType === 'equivalence' && g.subject && g.predicate === 'created') {
        const subGoal: BackwardChainingGoal = {
          subject: g.object,
          predicate: rule.antecedentPredicate,
          object: g.subject,
        };
        if (prove(subGoal, depth + 1)) {
          provenAny = true;
        }
      } else if (rule.antecedentObject && !rule.antecedentObject.startsWith('?')) {
        const subGoal: BackwardChainingGoal = {
          subject: g.subject,
          predicate: rule.antecedentPredicate,
          object: rule.antecedentObject,
        };
        if (prove(subGoal, depth + 1)) {
          const hit = directMatches.find(
            (m) =>
              termsMatch(m.predicate, rule.antecedentPredicate) &&
              termsMatch(m.object, rule.antecedentObject) &&
              (!g.subject || termsMatch(m.subject, g.subject))
          );
          if (hit) {
            const inf: InferredFact = {
              factId: `bc_${hit.factId}_${rule.ruleId}`,
              userId: hit.userId,
              documentId: hit.documentId,
              documentName: hit.documentName,
              subject: hit.subject,
              predicate: rule.consequentPredicate,
              object: rule.consequentObject,
              sourceText: `(${hit.subject} ${hit.predicate} ${hit.object}) via ${rule.name}`,
              factType: 'inferred',
              verificationStatus: 'inferred',
              confidence: 90,
              ruleApplied: rule.name,
              createdAt: null,
              updatedAt: null,
              derivedFromFactIds: [hit.factId],
            };
            inferredMatches.push(inf);
            provenAny = true;
          }
        }
      }
    }

    return provenAny;
  }

  const proven = prove(goal, 1);
  return { proven, directMatches, inferredMatches, trace };
}

function findMatchingEntities(question: string, facts: KnowledgeFact[]): string[] {
  const qLower = norm(question);
  const candidates = new Set<string>();
  for (const f of facts) {
    if (f.subject.length >= 2) candidates.add(f.subject);
    if (f.object.length >= 2 && f.object.length <= 60) candidates.add(f.object);
  }

  const sorted = Array.from(candidates).sort((a, b) => b.length - a.length);
  const matchedWithPos: { entity: string; index: number }[] = [];

  for (const ent of sorted) {
    const entLower = norm(ent);
    const escaped = entLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, 'i');
    const m = regex.exec(qLower);
    if (m) {
      if (!matchedWithPos.some((item) => norm(item.entity).includes(entLower))) {
        matchedWithPos.push({ entity: ent, index: m.index });
      }
    }
  }
  return matchedWithPos
    .sort((a, b) => a.index - b.index)
    .map((item) => item.entity);
}

export function answerQuestionSymbolically(
  questionText: string,
  allUserFacts: KnowledgeFact[],
  rules: InferenceRule[],
  documentIdScope: string
): QuestionAnswerResult {
  const scopedBaseFacts =
    documentIdScope === 'all'
      ? allUserFacts
      : allUserFacts.filter((f) => f.documentId === documentIdScope);

  const nonInferredBase = scopedBaseFacts.filter((f) => f.factType !== 'inferred');
  const persistedInferred = scopedBaseFacts.filter((f) => f.factType === 'inferred');

  const questionType = classifyQuestionType(questionText);
  const keywords = extractQuestionKeywords(questionText);
  const steps: string[] = [];

  steps.push(`1. Question classified as [${questionType.toUpperCase()}] type.`);
  steps.push(
    `2. Extracted significant terms: ${keywords.length > 0 ? keywords.join(', ') : '(none)'}.`
  );

  if (scopedBaseFacts.length === 0) {
    steps.push('3. Knowledge Base is empty for the selected document scope.');
    return {
      question: questionText,
      questionType,
      answer: INSUFFICIENT_INFO_MESSAGE,
      reasoning: steps.join('\n'),
      reasoningSteps: steps,
      directFacts: [],
      inferredFacts: [],
      strategyUsed: 'insufficient-evidence',
      answered: false,
      extractedTerms: keywords,
    };
  }

  // Run Forward Chaining across base facts
  const fc = runForwardChaining(nonInferredBase.length > 0 ? nonInferredBase : scopedBaseFacts, rules);
  const combinedInferred: InferredFact[] = [
    ...persistedInferred.map((f) => ({ ...f, derivedFromFactIds: [] })),
    ...fc.inferredFacts,
  ];
  const workingFacts: KnowledgeFact[] = [...nonInferredBase, ...combinedInferred];

  steps.push(
    `3. Forward Chaining executed (${fc.iterations} iteration(s)), deriving ${fc.inferredFacts.length} new inferred fact(s) across ${workingFacts.length} total facts.`
  );

  const matchedEntities = findMatchingEntities(questionText, workingFacts);
  steps.push(
    `4. Entity matching identified: ${matchedEntities.length > 0 ? matchedEntities.join(', ') : 'none directly matched'}.`
  );

  // Special handling for Yes/No Questions via Backward Chaining
  if (questionType === 'yes-no') {
    const qClean = norm(questionText).replace(/[?!.]+$/, '');
    const doesMatch = qClean.match(
      /^(?:does|do|is|are|was|were|can|has|have)\s+(.+?)\s+(support|supports|have|has|use|uses|contain|contains|include|includes|provide|provides|require|requires|a|an|is|part of|created by|located in)\s+(.+)$/i
    );

    let targetSubj = matchedEntities[0];
    let targetPred: string | undefined;
    let targetObj = matchedEntities[1];

    if (doesMatch) {
      targetSubj = doesMatch[1].trim();
      const rawRel = doesMatch[2].toLowerCase();
      targetPred =
        rawRel === 'a' || rawRel === 'an' || rawRel === 'is'
          ? 'is_a'
          : rawRel
              .replace(/\s+/g, '_')
              .replace(/^(support|use|contain|include|provide|require)$/, '$1s')
              .replace(/^have$/, 'has');
      targetObj = doesMatch[3].replace(/^(?:a|an|the)\s+/i, '').trim();
    }

    if (targetSubj && targetObj) {
      const bc = runBackwardChaining(
        { subject: targetSubj, predicate: targetPred, object: targetObj },
        nonInferredBase.length > 0 ? nonInferredBase : scopedBaseFacts,
        rules
      );

      // Also verify directly in workingFacts (handles forward-chained + exact match)
      const directYes = workingFacts.filter(
        (f) =>
          termsMatch(f.subject, targetSubj!) &&
          (!targetPred || termsMatch(f.predicate, targetPred) || (targetPred === 'is_a' && f.predicate === 'is')) &&
          (termsMatch(f.object, targetObj!) || norm(f.object).includes(norm(targetObj!)))
      );

      steps.push(
        `5. Backward Chaining tested goal (${targetSubj}, ${targetPred ?? '*'}, ${targetObj}) -> ${bc.proven || directYes.length > 0 ? 'PROVEN' : 'NOT PROVEN'}.`
      );
      for (const t of bc.trace.slice(0, 6)) {
        steps.push(`   ${t}`);
      }

      const allHits = [...directYes, ...bc.inferredMatches];
      const uniqueDirect = allHits.filter((f) => f.factType !== 'inferred');
      const uniqueInferred = allHits.filter((f) => f.factType === 'inferred') as InferredFact[];

      if (allHits.length > 0) {
        const primary = allHits[0];
        const viaRule =
          primary.factType === 'inferred' && primary.ruleApplied
            ? ` (inferred via rule "${primary.ruleApplied}")`
            : '';
        const answer = `Yes. ${primary.subject} ${predicateToProse(primary.predicate, primary.object)} ${primary.object}${viaRule}.`;
        return {
          question: questionText,
          questionType,
          answer,
          reasoning: steps.join('\n'),
          reasoningSteps: steps,
          directFacts: uniqueDirect,
          inferredFacts: uniqueInferred,
          strategyUsed: bc.inferredMatches.length > 0 || uniqueInferred.length > 0 ? 'backward-chaining' : 'rule-based',
          answered: true,
          extractedTerms: keywords,
        };
      }
    }
  }

  // Special handling for Relationship Questions between two entities
  if (questionType === 'relationship' && matchedEntities.length >= 2) {
    const entA = matchedEntities[0];
    const entB = matchedEntities[1];

    const directRel = workingFacts.filter(
      (f) =>
        (termsMatch(f.subject, entA) && termsMatch(f.object, entB)) ||
        (termsMatch(f.subject, entB) && termsMatch(f.object, entA))
    );

    if (directRel.length > 0) {
      steps.push(`5. Direct relationship rule matched between "${entA}" and "${entB}".`);
      const summary = directRel
        .map((f) => `${f.subject} ${predicateToProse(f.predicate)} ${f.object}`)
        .join('; ');
      return {
        question: questionText,
        questionType,
        answer: `The relationship between ${entA} and ${entB} is: ${summary}.`,
        reasoning: steps.join('\n'),
        reasoningSteps: steps,
        directFacts: directRel.filter((f) => f.factType !== 'inferred'),
        inferredFacts: directRel.filter((f) => f.factType === 'inferred') as InferredFact[],
        strategyUsed: 'rule-based',
        answered: true,
        extractedTerms: keywords,
      };
    }

    // Check 2-hop connection (entA -> mid -> entB)
    const hop1 = workingFacts.filter((f) => termsMatch(f.subject, entA));
    for (const h1 of hop1) {
      const hop2 = workingFacts.find(
        (f) => termsMatch(f.subject, h1.object) && termsMatch(f.object, entB)
      );
      if (hop2) {
        steps.push(
          `5. Logical 2-hop chain found: (${h1.subject} -> ${h1.predicate} -> ${h1.object}) AND (${hop2.subject} -> ${hop2.predicate} -> ${hop2.object}).`
        );
        return {
          question: questionText,
          questionType,
          answer: `${entA} connects to ${entB} through ${h1.object}: ${h1.subject} ${predicateToProse(h1.predicate)} ${h1.object}, and ${hop2.subject} ${predicateToProse(hop2.predicate)} ${hop2.object}.`,
          reasoning: steps.join('\n'),
          reasoningSteps: steps,
          directFacts: [h1, hop2].filter((f) => f.factType !== 'inferred'),
          inferredFacts: [h1, hop2].filter((f) => f.factType === 'inferred') as InferredFact[],
          strategyUsed: 'logical-inference',
          answered: true,
          extractedTerms: keywords,
        };
      }
    }
  }

  // Predicate hints based on question type
  const predPreference: Record<QuestionType, string[]> = {
    what: ['is_a', 'defined_as', 'is', 'supports', 'has', 'used_for', 'provides', 'includes'],
    who: ['created_by', 'developed_by', 'invented_by', 'founded_by', 'designed_by', 'created'],
    when: ['created_in', 'released_in', 'founded_in', 'occurred_in'],
    where: ['located_in', 'based_in', 'headquartered_in'],
    why: ['causes', 'used_for', 'leads_to', 'results_in', 'enables'],
    how: ['uses', 'enables', 'supports', 'provides', 'used_for', 'consists_of'],
    list: ['supports', 'has', 'includes', 'contains', 'provides', 'is_a'],
    'yes-no': [],
    relationship: [],
    unknown: [],
  };

  // List all concepts in the document
  if (
    questionType === 'list' &&
    /\b(concepts|entities|topics|everything|all facts|mentioned)\b/i.test(questionText) &&
    matchedEntities.length === 0
  ) {
    const concepts = Array.from(
      new Set(
        workingFacts.flatMap((f) => [f.subject, f.object]).filter((c) => c.length <= 60)
      )
    ).slice(0, 24);
    if (concepts.length > 0) {
      steps.push(`5. Enumerated ${concepts.length} distinct concepts from the Knowledge Base.`);
      return {
        question: questionText,
        questionType,
        answer: `The concepts mentioned in the document knowledge base include: ${concepts.join(', ')}.`,
        reasoning: steps.join('\n'),
        reasoningSteps: steps,
        directFacts: nonInferredBase.slice(0, 12),
        inferredFacts: combinedInferred.slice(0, 6),
        strategyUsed: 'exact-keyword',
        answered: true,
        extractedTerms: keywords,
      };
    }
  }

  // Guard against queries asking about unknown attributes of a known entity (e.g. "stock price of Java Corp")
  const genericIntentWords = new Set([
    'feature', 'features', 'property', 'properties', 'capability', 'capabilities',
    'characteristic', 'characteristics', 'attribute', 'attributes', 'summary',
    'overview', 'information', 'detail', 'details', 'meaning', 'definition',
    'purpose', 'role', 'function', 'functions', 'type', 'kind', 'category',
  ]);
  const entityTokenSet = new Set(
    matchedEntities.flatMap((e) => norm(e).split(/\s+/))
  );
  const nonEntityKeywords = keywords.filter(
    (k) => !entityTokenSet.has(k) && !genericIntentWords.has(k)
  );

  // Score working facts deterministically using exact entity + predicate + keyword matching
  const scored = workingFacts
    .map((fact) => {
      let score = 0;
      let nonEntityHit = false;
      const fSubj = norm(fact.subject);
      const fPred = norm(fact.predicate);
      const fObj = norm(fact.object);

      for (const ent of matchedEntities) {
        if (termsMatch(fact.subject, ent)) score += 10;
        if (termsMatch(fact.object, ent)) score += 6;
      }

      for (const kw of keywords) {
        const isNonEnt = nonEntityKeywords.includes(kw);
        if (fSubj === kw || singularizeWord(fSubj) === singularizeWord(kw)) {
          score += 8;
          if (isNonEnt) nonEntityHit = true;
        } else if (fSubj.includes(kw)) {
          score += 4;
          if (isNonEnt) nonEntityHit = true;
        }

        if (fPred.includes(kw)) {
          score += 5;
          if (isNonEnt) nonEntityHit = true;
        }

        if (fObj === kw || singularizeWord(fObj) === singularizeWord(kw)) {
          score += 6;
          if (isNonEnt) nonEntityHit = true;
        } else if (fObj.includes(kw)) {
          score += 3;
          if (isNonEnt) nonEntityHit = true;
        }
      }

      const prefs = predPreference[questionType] ?? [];
      const prefIdx = prefs.indexOf(fact.predicate);
      if (prefIdx !== -1 && score > 0) {
        score += Math.max(1, 6 - prefIdx);
      }

      if (/\b(feature|features|capability|capabilities|support|supports)\b/i.test(questionText)) {
        if (['supports', 'has', 'provides', 'includes', 'enables'].includes(fact.predicate)) {
          score += 6;
        }
      }
      if (/\b(syntax)\b/i.test(questionText) && fObj.includes('syntax')) {
        score += 10;
      }

      return { fact, score, nonEntityHit };
    })
    .filter((entry) => {
      if (entry.score < 6) return false;
      // If the user asked about specific extra concepts not in generic intent words, require at least one match
      if (nonEntityKeywords.length > 0 && questionType === 'what' && !entry.nonEntityHit) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    steps.push(
      '5. No matching facts met the deterministic match threshold in direct or inferred memory.'
    );
    return {
      question: questionText,
      questionType,
      answer: INSUFFICIENT_INFO_MESSAGE,
      reasoning: steps.join('\n'),
      reasoningSteps: steps,
      directFacts: [],
      inferredFacts: [],
      strategyUsed: 'insufficient-evidence',
      answered: false,
      extractedTerms: keywords,
    };
  }

  // Filter for strong question-type alignment when who/when/where is asked
  let selectedFacts = scored.slice(0, 12).map((s) => s.fact);
  if (questionType === 'who') {
    const whoOnly = selectedFacts.filter((f) =>
      ['created_by', 'developed_by', 'invented_by', 'founded_by', 'designed_by', 'created'].includes(
        f.predicate
      )
    );
    if (whoOnly.length === 0) {
      steps.push('5. Question asks "Who" but no authorship/creator predicate was found for the matched entity.');
      return {
        question: questionText,
        questionType,
        answer: INSUFFICIENT_INFO_MESSAGE,
        reasoning: steps.join('\n'),
        reasoningSteps: steps,
        directFacts: [],
        inferredFacts: [],
        strategyUsed: 'insufficient-evidence',
        answered: false,
        extractedTerms: keywords,
      };
    }
    selectedFacts = whoOnly;
  } else if (questionType === 'when') {
    const whenOnly = selectedFacts.filter((f) =>
      ['created_in', 'released_in', 'founded_in', 'occurred_in'].includes(f.predicate)
    );
    if (whenOnly.length === 0) {
      steps.push('5. Question asks "When" but no temporal predicate was found for the matched entity.');
      return {
        question: questionText,
        questionType,
        answer: INSUFFICIENT_INFO_MESSAGE,
        reasoning: steps.join('\n'),
        reasoningSteps: steps,
        directFacts: [],
        inferredFacts: [],
        strategyUsed: 'insufficient-evidence',
        answered: false,
        extractedTerms: keywords,
      };
    }
    selectedFacts = whenOnly;
  } else if (questionType === 'where') {
    const whereOnly = selectedFacts.filter((f) =>
      ['located_in', 'based_in', 'headquartered_in'].includes(f.predicate)
    );
    if (whereOnly.length === 0) {
      steps.push('5. Question asks "Where" but no location predicate was found for the matched entity.');
      return {
        question: questionText,
        questionType,
        answer: INSUFFICIENT_INFO_MESSAGE,
        reasoning: steps.join('\n'),
        reasoningSteps: steps,
        directFacts: [],
        inferredFacts: [],
        strategyUsed: 'insufficient-evidence',
        answered: false,
        extractedTerms: keywords,
      };
    }
    selectedFacts = whereOnly;
  }

  const directHits = selectedFacts.filter((f) => f.factType !== 'inferred');
  const inferredHits = selectedFacts.filter((f) => f.factType === 'inferred') as InferredFact[];

  const strategyUsed: ReasoningStrategy =
    inferredHits.length > 0
      ? 'forward-chaining'
      : matchedEntities.length > 0
      ? 'rule-based'
      : 'exact-keyword';

  steps.push(
    `5. Fact matching retrieved ${directHits.length} direct fact(s) and ${inferredHits.length} logically inferred fact(s).`
  );
  if (inferredHits.length > 0) {
    for (const inf of inferredHits.slice(0, 4)) {
      steps.push(
        `   Inferred via "${inf.ruleApplied ?? 'Rule'}": (${inf.subject}, ${inf.predicate}, ${inf.object})`
      );
    }
  }
  steps.push('6. Answer formatted using deterministic predefined answer templates.');

  // Generate clean template answer
  const sentences = selectedFacts.slice(0, 6).map((f) => {
    const tag = f.factType === 'inferred' ? ` [inferred via ${f.ruleApplied ?? 'logical rule'}]` : '';
    return `${f.subject} ${predicateToProse(f.predicate, f.object)} ${f.object}${tag}.`;
  });

  const answer =
    questionType === 'list'
      ? `Based on the knowledge base:\n${selectedFacts
          .slice(0, 8)
          .map(
            (f, idx) =>
              `${idx + 1}. ${f.subject} ${predicateToProse(f.predicate, f.object)} ${f.object}${
                f.factType === 'inferred' ? ` (inferred via ${f.ruleApplied ?? 'rule'})` : ''
              }`
          )
          .join('\n')}`
      : sentences.join(' ');

  return {
    question: questionText,
    questionType,
    answer,
    reasoning: steps.join('\n'),
    reasoningSteps: steps,
    directFacts: directHits,
    inferredFacts: inferredHits,
    strategyUsed,
    answered: true,
    extractedTerms: keywords,
  };
}
