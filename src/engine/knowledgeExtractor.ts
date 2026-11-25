import { RuleType } from '../types';

export interface ExtractedFactDraft {
  subject: string;
  predicate: string;
  object: string;
  sourceText: string;
  confidence: number;
}

export interface ExtractedRuleDraft {
  name: string;
  condition: string;
  conclusion: string;
  ruleType: RuleType;
  antecedentSubject: string;
  antecedentPredicate: string;
  antecedentObject: string;
  secondPredicate: string;
  consequentPredicate: string;
  consequentObject: string;
}

export interface ExtractionOutput {
  facts: ExtractedFactDraft[];
  derivedRules: ExtractedRuleDraft[];
  entities: string[];
  sentenceCount: number;
}

const KNOWN_MODIFIERS = new Set([
  'object-oriented',
  'functional',
  'procedural',
  'interpreted',
  'compiled',
  'declarative',
  'imperative',
  'relational',
  'distributed',
  'symbolic',
  'deterministic',
  'open-source',
  'cross-platform',
  'platform-independent',
  'high-level',
  'low-level',
  'strongly-typed',
  'statically-typed',
  'dynamically-typed',
  'concurrent',
  'portable',
  'scalable',
  'secure',
  'modular',
  'hierarchical',
  'graph-based',
  'rule-based',
]);

function cleanPhrase(raw: string): string {
  return raw
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLeadingArticle(raw: string): string {
  return raw.replace(/^(?:a|an|the)\s+/i, '').trim();
}

function splitListItems(raw: string): string[] {
  // Handle "A, B, and C" or "A and B" or "A, B, C"
  const normalized = raw.replace(/,\s*and\s+/gi, ', ').replace(/\s+and\s+/gi, ', ');
  return normalized
    .split(',')
    .map((item) => cleanPhrase(stripLeadingArticle(item)))
    .filter((item) => item.length > 0 && item.length <= 180);
}

function splitIntoSentences(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/([a-z0-9])\n([A-Z])/g, '$1. $2')
    .replace(/\n+/g, ' ');

  // Protect common abbreviations before splitting on sentence boundaries
  const protectedText = normalized
    .replace(/\b(e\.g|i\.e|vs|Dr|Prof|Mr|Mrs|Ms|Inc|Ltd|etc)\./gi, '$1<DOT>');

  const rawSentences = protectedText.split(/(?<=[.!?])\s+|;\s+/);
  return rawSentences
    .map((s) => s.replace(/<DOT>/g, '.').trim())
    .filter((s) => s.length >= 6);
}

function normalizePredicate(rawVerb: string): string {
  const lower = rawVerb.toLowerCase().trim().replace(/\s+/g, '_');
  const mapping: Record<string, string> = {
    is_a: 'is_a',
    is_an: 'is_a',
    are: 'is_a',
    was_a: 'is_a',
    was_an: 'is_a',
    is: 'is',
    supports: 'supports',
    support: 'supports',
    has: 'has',
    have: 'has',
    contains: 'contains',
    contain: 'contains',
    includes: 'includes',
    include: 'includes',
    provides: 'provides',
    provide: 'provides',
    uses: 'uses',
    use: 'uses',
    enables: 'enables',
    enable: 'enables',
    requires: 'requires',
    require: 'requires',
    depends_on: 'depends_on',
    depend_on: 'depends_on',
    consists_of: 'consists_of',
    consist_of: 'consists_of',
    creates: 'creates',
    created_by: 'created_by',
    was_created_by: 'created_by',
    developed_by: 'developed_by',
    was_developed_by: 'developed_by',
    invented_by: 'invented_by',
    was_invented_by: 'invented_by',
    founded_by: 'founded_by',
    was_founded_by: 'founded_by',
    designed_by: 'designed_by',
    was_designed_by: 'designed_by',
    released_in: 'released_in',
    was_released_in: 'released_in',
    created_in: 'created_in',
    was_created_in: 'created_in',
    founded_in: 'founded_in',
    was_founded_in: 'founded_in',
    located_in: 'located_in',
    is_located_in: 'located_in',
    used_for: 'used_for',
    is_used_for: 'used_for',
    causes: 'causes',
    cause: 'causes',
    leads_to: 'leads_to',
    lead_to: 'leads_to',
    results_in: 'results_in',
    part_of: 'part_of',
    is_part_of: 'part_of',
    belongs_to: 'belongs_to',
    connects_to: 'connects_to',
    extends: 'extends',
    implements: 'implements',
    defined_as: 'defined_as',
    is_defined_as: 'defined_as',
    stores: 'stores',
    processes: 'processes',
    produces: 'produces',
    prevents: 'prevents',
    improves: 'improves',
    runs_on: 'runs_on',
    run_on: 'runs_on',
  };
  return mapping[lower] ?? lower;
}

function singularize(term: string): string {
  const lower = term.trim();
  if (lower.endsWith('ies') && lower.length > 4) {
    return `${lower.slice(0, -3)}y`;
  }
  if (
    (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('ches') || lower.endsWith('shes')) &&
    lower.length > 4
  ) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) {
    return lower.slice(0, -1);
  }
  return lower;
}

export function extractKnowledgeFromText(
  text: string,
  csvRows?: Record<string, string>[],
  csvHeaders?: string[]
): ExtractionOutput {
  const facts: ExtractedFactDraft[] = [];
  const derivedRules: ExtractedRuleDraft[] = [];
  const seenFactKeys = new Set<string>();
  const seenRuleKeys = new Set<string>();

  const addFact = (
    subjectRaw: string,
    predicateRaw: string,
    objectRaw: string,
    sourceText: string,
    confidence = 95
  ) => {
    const subject = cleanPhrase(subjectRaw);
    const predicate = normalizePredicate(predicateRaw);
    const object = cleanPhrase(objectRaw);
    if (!subject || !predicate || !object) return;
    if (subject.length > 180 || object.length > 280) return;

    const key = `${subject.toLowerCase()}|${predicate.toLowerCase()}|${object.toLowerCase()}`;
    if (seenFactKeys.has(key)) return;
    seenFactKeys.add(key);

    facts.push({
      subject,
      predicate,
      object,
      sourceText: sourceText.slice(0, 950),
      confidence,
    });
  };

  const addDerivedRule = (rule: ExtractedRuleDraft) => {
    const key = `${rule.antecedentPredicate}|${rule.antecedentObject.toLowerCase()}|${rule.consequentPredicate}|${rule.consequentObject.toLowerCase()}`;
    if (seenRuleKeys.has(key)) return;
    seenRuleKeys.add(key);
    derivedRules.push(rule);
  };

  // 1. Direct CSV structural triple extraction when CSV metadata is available
  if (csvRows && csvRows.length > 0 && csvHeaders && csvHeaders.length >= 2) {
    const primaryCol = csvHeaders[0];
    for (const row of csvRows) {
      const subject = cleanPhrase(row[primaryCol] ?? '');
      if (!subject) continue;
      for (let i = 1; i < csvHeaders.length; i++) {
        const header = csvHeaders[i];
        const cell = cleanPhrase(row[header] ?? '');
        if (!cell) continue;
        const pred = header.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const items = cell.includes(',') ? splitListItems(cell) : [cell];
        for (const item of items) {
          addFact(subject, pred || 'has_attribute', item, `${primaryCol}=${subject}, ${header}=${cell}`, 98);
        }
      }
    }
  }

  // 2. Rule-based deterministic sentence parsing
  const sentences = splitIntoSentences(text);
  let lastSubject = '';

  for (const rawSentence of sentences) {
    const sentence = rawSentence.replace(/[.!?]+$/, '').trim();
    if (!sentence) continue;

    // CSV-formatted summary line fallback ("Subject: attr is val; attr2 is val2")
    const colonMatch = sentence.match(/^([A-Z0-9][^:]{1,80}):\s+(.+)$/);
    if (colonMatch && colonMatch[2].includes(' is ')) {
      const subj = cleanPhrase(colonMatch[1]);
      lastSubject = subj;
      const clauses = colonMatch[2].split(';');
      for (const cl of clauses) {
        const kv = cl.trim().match(/^(.+?)\s+is\s+(.+)$/i);
        if (kv) {
          const pred = kv[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
          const items = kv[2].includes(',') ? splitListItems(kv[2]) : [cleanPhrase(kv[2])];
          for (const item of items) {
            addFact(subj, pred, item, rawSentence, 96);
          }
        }
      }
      continue;
    }

    // Simple deterministic pronoun coreference ("It ...", "They ...")
    let workingSentence = sentence;
    if (lastSubject && /^(?:It|They|This\s+\w+)\s+/i.test(workingSentence)) {
      workingSentence = workingSentence.replace(/^(?:It|They|This\s+\w+)\s+/i, `${lastSubject} `);
    }

    // Universal Quantification Rules: "All <Category> have/support/use/are <Property>"
    const universalMatch = workingSentence.match(
      /^(?:All|Every)\s+([A-Za-z0-9\s-]{2,80}?)\s+(have|has|support|supports|use|uses|contain|contains|include|includes|require|requires|are)\s+(.+)$/i
    );
    if (universalMatch) {
      const categoryPlural = cleanPhrase(universalMatch[1]);
      const categorySingular = singularize(categoryPlural);
      const verb = normalizePredicate(universalMatch[2]);
      const targets = splitListItems(universalMatch[3]);
      for (const target of targets) {
        addFact(categoryPlural, verb, target, rawSentence, 95);
        const consequentPred = verb === 'is_a' ? 'is_a' : verb;
        addDerivedRule({
          name: `Universal Rule: ${categorySingular} -> ${consequentPred} ${target}`,
          condition: `IF (?x, is_a, ${categorySingular})`,
          conclusion: `THEN (?x, ${consequentPred}, ${target})`,
          ruleType: 'property-inheritance',
          antecedentSubject: '?x',
          antecedentPredicate: 'is_a',
          antecedentObject: categorySingular,
          secondPredicate: '',
          consequentPredicate: consequentPred,
          consequentObject: target,
        });
      }
      lastSubject = categoryPlural;
      continue;
    }

    // Passive / Temporal / Attribution: "X was created by Y in Z"
    const passiveByInMatch = workingSentence.match(
      /^([A-Za-z0-9][A-Za-z0-9\s._+-]{1,80}?)\s+(was|were)\s+(created|developed|invented|founded|designed|built|written|introduced)\s+by\s+([A-Za-z0-9\s.,'-]{2,90}?)(?:\s+(?:in|at|on)\s+([A-Za-z0-9\s,/-]{2,60}))?$/i
    );
    if (passiveByInMatch) {
      const subj = cleanPhrase(passiveByInMatch[1]);
      const verb = passiveByInMatch[3].toLowerCase();
      const agent = cleanPhrase(passiveByInMatch[4]);
      const timeOrPlace = passiveByInMatch[5] ? cleanPhrase(passiveByInMatch[5]) : '';
      addFact(subj, `${verb}_by`, agent, rawSentence, 96);
      if (timeOrPlace) {
        addFact(subj, `${verb}_in`, timeOrPlace, rawSentence, 94);
      }
      lastSubject = subj;
      continue;
    }

    // Passive temporal/location/purpose without "by": "X was released/founded/located/used in/for Y"
    const passiveInMatch = workingSentence.match(
      /^([A-Za-z0-9][A-Za-z0-9\s._+-]{1,80}?)\s+(?:is|are|was|were)\s+(released|created|founded|established|located|based|headquartered|used)\s+(?:in|at|for|on)\s+(.+)$/i
    );
    if (passiveInMatch) {
      const subj = cleanPhrase(passiveInMatch[1]);
      const verb = passiveInMatch[2].toLowerCase();
      const prep = /\bfor\b/i.test(workingSentence) ? 'for' : 'in';
      const rawObj = passiveInMatch[3];
      const items = verb === 'used' ? splitListItems(rawObj) : [cleanPhrase(stripLeadingArticle(rawObj))];
      for (const item of items) {
        addFact(subj, `${verb}_${prep}`, item, rawSentence, 94);
      }
      lastSubject = subj;
      continue;
    }

    // Definition / Taxonomy: "X is a/an Y" or "X are Y"
    const isAMatch = workingSentence.match(
      /^([A-Za-z0-9][A-Za-z0-9\s._+-]{1,80}?)\s+(?:is|was)\s+(?:a|an)\s+(.+)$/i
    );
    if (isAMatch) {
      const subj = cleanPhrase(isAMatch[1]);
      const rawPredicateObj = cleanPhrase(isAMatch[2]);
      // Split out trailing "that/which ..." relative clause if present
      const relClause = rawPredicateObj.match(/^(.+?)\s+(?:that|which)\s+(supports|uses|has|provides|enables|contains|includes|requires)\s+(.+)$/i);
      const classPhrase = relClause ? cleanPhrase(relClause[1]) : rawPredicateObj;
      addFact(subj, 'is_a', classPhrase, rawSentence, 97);

      // Extract leading modifier adjective if present (e.g., "object-oriented programming language")
      const words = classPhrase.split(/\s+/);
      if (words.length >= 2) {
        const firstWord = words[0].toLowerCase();
        const restClass = words.slice(1).join(' ');
        if (KNOWN_MODIFIERS.has(firstWord) || firstWord.includes('-')) {
          addFact(subj, 'is', words[0], rawSentence, 93);
          addFact(subj, 'is_a', restClass, rawSentence, 94);
        }
      }

      if (relClause) {
        const relVerb = normalizePredicate(relClause[2]);
        const items = splitListItems(relClause[3]);
        for (const item of items) {
          addFact(subj, relVerb, item, rawSentence, 92);
        }
      }

      lastSubject = subj;
      continue;
    }

    // Predicative adjective / state / plural taxonomy: "X is/are Y"
    const isSimpleMatch = workingSentence.match(
      /^([A-Za-z0-9][A-Za-z0-9\s._+-]{1,80}?)\s+(is|are)\s+(?:also\s+)?(.+)$/i
    );
    if (isSimpleMatch && !/\b(?:used for|located in|defined as|part of|created by)\b/i.test(workingSentence)) {
      const subj = cleanPhrase(isSimpleMatch[1]);
      const copula = isSimpleMatch[2].toLowerCase();
      const items = splitListItems(isSimpleMatch[3]);
      for (const item of items) {
        if (item.length <= 120) {
          const pred = copula === 'are' && item.split(/\s+/).length >= 2 ? 'is_a' : 'is';
          addFact(subj, pred, item, rawSentence, 90);
        }
      }
      lastSubject = subj;
      continue;
    }

    // General SVO patterns with curated academic/domain verbs
    const svoMatch = workingSentence.match(
      /^([A-Za-z0-9][A-Za-z0-9\s._+-]{1,80}?)\s+(supports?|has|have|contains?|includes?|provides?|uses?|enables?|requires?|depends on|consists of|causes?|leads to|results in|extends?|implements?|stores?|processes?|produces?|prevents?|improves?|runs on|connects to|belongs to|is part of|is defined as|is used for|refers to|means)\s+(.+)$/i
    );
    if (svoMatch) {
      const subj = cleanPhrase(svoMatch[1]);
      const verb = normalizePredicate(svoMatch[2]);
      const rawObj = cleanPhrase(svoMatch[3]);
      const items =
        verb === 'is_defined_as' || verb === 'defined_as' || verb === 'means'
          ? [stripLeadingArticle(rawObj)]
          : splitListItems(rawObj);

      for (const item of items) {
        addFact(subj, verb, item, rawSentence, 94);
      }
      lastSubject = subj;
    }
  }

  const entitySet = new Set<string>();
  for (const f of facts) {
    entitySet.add(f.subject);
    if (f.object.length <= 60) {
      entitySet.add(f.object);
    }
  }

  return {
    facts,
    derivedRules,
    entities: Array.from(entitySet),
    sentenceCount: sentences.length,
  };
}
