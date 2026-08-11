import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, CheckCircle } from 'lucide-react';
import MathText from '../sat/MathText';
import ReportQuestionModal from './ReportQuestionModal';
import { prefixedId } from '@/utils/questionResolver';

const DATABASES = {
  SATQuestion: { label: 'SAT Math Bank', subject: 'math', domainField: 'domain', sourceField: 'source' },
  CanyonMath: { label: 'Canyon Math DB', subject: 'math', domainField: 'category', sourceField: 'source' },
  CanyonMathPDFsandGuidance: { label: 'Canyon PDF Questions', subject: 'math', domainField: 'category', sourceField: 'source_pdf' },
  PYQQuestion: { label: 'Previous Year Questions', subject: 'math', domainField: 'domain', sourceField: 'source' },
  EnglishQuestion: { label: 'English Question Bank', subject: 'english', domainField: 'domain', sourceField: 'source' },
  EnglishCBQuestion: { label: 'College Board English', subject: 'english', domainField: 'domain', sourceField: 'source' },
};

/**
 * Comprehensive question picker supporting all question databases.
 *
 * Props:
 *  - subject: 'math' | 'english'   (which databases to show)
 *  - selectedIds: array of (prefixed) question IDs
 *  - onToggle: (prefixedId) => void
 *  - canyonOnly: if true, restrict to Canyon databases and store raw (unprefixed) IDs
 */
export default function QuestionPicker({ subject = 'math', selectedIds = [], onToggle, canyonOnly = false }) {
  const availableDbs = useMemo(() => {
    if (canyonOnly) {
      return Object.entries(DATABASES).filter(([name]) => name === 'CanyonMath' || name === 'CanyonMathPDFsandGuidance');
    }
    return Object.entries(DATABASES).filter(([, meta]) => meta.subject === subject);
  }, [subject, canyonOnly]);

  const [activeDb, setActiveDb] = useState(availableDbs[0]?.[0] || 'SATQuestion');
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const dbMeta = DATABASES[activeDb] || {};

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['pickerDb', activeDb],
    queryFn: () => base44.entities[activeDb].list('-created_date', 5000),
    enabled: !!activeDb,
  });

  const uniqueSources = useMemo(
    () => Array.from(new Set(questions.map((q) => q[dbMeta.sourceField]).filter(Boolean))),
    [questions, dbMeta.sourceField]
  );

  const uniqueDomains = useMemo(
    () => Array.from(new Set(questions.map((q) => q[dbMeta.domainField]).filter(Boolean))).sort(),
    [questions, dbMeta.domainField]
  );

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (domainFilter !== 'all' && q[dbMeta.domainField] !== domainFilter) return false;
      if (sourceFilter !== 'all' && q[dbMeta.sourceField] !== sourceFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        const inText = q.question_text?.toLowerCase().includes(term);
        const inTags = q.tags?.some((tag) => tag.toLowerCase().includes(term));
        const inPassage = q.passage?.toLowerCase().includes(term);
        if (!inText && !inTags && !inPassage) return false;
      }
      return true;
    });
  }, [questions, domainFilter, sourceFilter, difficultyFilter, search, dbMeta]);

  const grouped = useMemo(() => {
    const acc = {};
    filtered.forEach((q) => {
      let cat = q[dbMeta.domainField];
      if (!cat) cat = 'Uncategorized';
      const label = cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      if (!acc[label]) acc[label] = [];
      acc[label].push(q);
    });
    return acc;
  }, [filtered, dbMeta]);

  const sortedCategories = Object.keys(grouped).sort();

  const toggleId = (q) => {
    const id = canyonOnly ? q.id : prefixedId(activeDb, q.id);
    onToggle(id);
  };

  const isSelected = (q) => {
    if (canyonOnly) return selectedIds.includes(q.id);
    return selectedIds.includes(prefixedId(activeDb, q.id));
  };

  return (
    <div className="space-y-3">
      {/* Database selector + filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={activeDb} onValueChange={(val) => { setActiveDb(val); setDomainFilter('all'); setSourceFilter('all'); }}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableDbs.map(([name, meta]) => (
              <SelectItem key={name} value={name}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
            <SelectItem value="expert">Expert</SelectItem>
          </SelectContent>
        </Select>

        {uniqueDomains.length > 0 && (
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Domain" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {uniqueDomains.map((d) => (
                <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {uniqueSources.length > 1 && (
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {uniqueSources.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedIds.length > 0 && (
        <p className="text-xs text-emerald-700 font-medium">
          {selectedIds.length} question{selectedIds.length === 1 ? '' : 's'} selected
        </p>
      )}

      <div className="max-h-96 overflow-y-auto border border-stone-200 rounded-lg">
        {isLoading && <p className="p-4 text-sm text-stone-500 text-center">Loading questions…</p>}
        {!isLoading && sortedCategories.length === 0 && (
          <p className="p-4 text-sm text-stone-500 text-center">No questions match.</p>
        )}
        <Accordion type="multiple" className="w-full">
          {sortedCategories.map((cat) => (
            <AccordionItem key={cat} value={cat}>
              <AccordionTrigger className="px-4 py-3 hover:bg-stone-50 text-sm font-medium border-b-0">
                <div className="flex items-center gap-2">
                  {cat} <Badge variant="secondary">{grouped[cat].length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 divide-y border-t">
                {grouped[cat].map((q) => {
                  const selected = isSelected(q);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleId(q)}
                      className={`w-full text-left p-3 text-sm transition-colors ${selected ? 'bg-emerald-50' : 'hover:bg-stone-50'}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300'}`}>
                          {selected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0 pr-6 relative">
                          <div className="absolute right-0 top-0">
                            <ReportQuestionModal question={q} source={q[dbMeta.sourceField] || activeDb} />
                          </div>
                          {q.passage && (
                            <p className="text-xs text-stone-500 mb-1 line-clamp-2 italic">{q.passage}</p>
                          )}
                          <p className="text-stone-800 line-clamp-2"><MathText>{q.question_text}</MathText></p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {q.difficulty && <Badge variant="outline" className="text-[10px] capitalize">{q.difficulty}</Badge>}
                            {q[dbMeta.sourceField] && <Badge variant="secondary" className="text-[10px] truncate max-w-[120px]">{q[dbMeta.sourceField]}</Badge>}
                            {q.tags?.map((t) => <Badge key={t} className="bg-stone-100 text-stone-600 border-stone-200 text-[10px]">{t}</Badge>)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
