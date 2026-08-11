import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, CheckCircle, Lock, ArrowLeft, Trophy, Target, Zap, ClipboardList } from 'lucide-react';
import { UNIT_CURRICULUM, getCheckpointStatus, getUnitTestStatus } from '@/data/unitCurriculum';
import LessonViewer from './LessonViewer';
import UnitQuiz from './UnitQuiz';

const DOMAIN_LABELS = {
  algebra: 'Algebra', advanced_algebra: 'Advanced Algebra', geometry: 'Geometry',
  trigonometry: 'Trigonometry', statistics: 'Statistics', problem_solving: 'Problem Solving',
  systems_of_equations: 'Systems of Equations', quadratics: 'Quadratics',
  exponentials: 'Exponentials', ratios_proportions: 'Ratios & Proportions',
  circles: 'Circles', polynomials: 'Polynomials',
};

export default function UnitBrowser({ domain, onBack }) {
  const [user, setUser] = useState(null);
  const [progressMap, setProgressMap] = useState({}); // unit_id -> UnitProgress record
  const [activeView, setActiveView] = useState('units'); // 'units' | 'lesson' | 'quiz'
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null); // { unit, quizType }

  const units = UNIT_CURRICULUM[domain] || [];
  const domainLabel = DOMAIN_LABELS[domain] || domain;

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadProgress(u.id);
    }).catch(() => {});
  }, [domain]);

  const loadProgress = async (userId) => {
    const records = await base44.entities.UnitProgress.filter({ user_id: userId, domain });
    const map = {};
    records.forEach(r => { map[r.unit_id] = r; });
    setProgressMap(map);
  };

  const getOrCreateProgress = async (unitId) => {
    if (progressMap[unitId]) return progressMap[unitId];
    const created = await base44.entities.UnitProgress.create({
      user_id: user.id,
      domain,
      unit_id: unitId,
      lessons_completed: [],
    });
    setProgressMap(m => ({ ...m, [unitId]: created }));
    return created;
  };

  const handleLessonComplete = async (unitId, lessonTopic) => {
    const prog = await getOrCreateProgress(unitId);
    const already = prog.lessons_completed || [];
    if (already.includes(lessonTopic)) return prog;
    const updated = await base44.entities.UnitProgress.update(prog.id, {
      lessons_completed: [...already, lessonTopic],
    });
    setProgressMap(m => ({ ...m, [unitId]: updated }));
    return updated;
  };

  const handleQuizComplete = async (unitId, quizType, score, total, passed) => {
    const prog = await getOrCreateProgress(unitId);
    const unit = units.find(u => u.id === unitId);
    const updateData = quizType === 'checkpoint'
      ? { checkpoint_passed: passed, checkpoint_score: score, checkpoint_total: total }
      : {
          unit_test_passed: passed,
          unit_test_score: score,
          unit_test_total: total,
          unit_completed: passed,
        };

    // Check if unit is now completed
    const prog2 = { ...prog, ...updateData };
    const allLessons = (prog2.lessons_completed || []).length >= (unit?.lessons.length || 0);
    if (quizType === 'unit_test' && passed && allLessons) {
      updateData.unit_completed = true;
    }

    const updated = await base44.entities.UnitProgress.update(prog.id, updateData);
    setProgressMap(m => ({ ...m, [unitId]: updated }));
    setActiveView('units');
  };

  // Determine if a unit is locked (previous unit must have test passed)
  const isUnitLocked = (unitIndex) => {
    if (unitIndex === 0) return false;
    const prevUnit = units[unitIndex - 1];
    const prevProg = progressMap[prevUnit.id];
    return !prevProg?.unit_test_passed;
  };

  if (activeView === 'lesson' && activeLesson) {
    return (
      <LessonViewer
        domain={domain}
        subtopic={activeLesson.topic}
        onBack={() => setActiveView('units')}
        onLessonComplete={async () => {
          await handleLessonComplete(activeLesson.unitId, activeLesson.topic);
          setActiveView('units');
        }}
      />
    );
  }

  if (activeView === 'quiz' && activeQuiz) {
    return (
      <UnitQuiz
        unit={activeQuiz.unit}
        domain={domain}
        domainLabel={domainLabel}
        quizType={activeQuiz.quizType}
        onBack={() => setActiveView('units')}
        onComplete={({ score, total, passed }) =>
          handleQuizComplete(activeQuiz.unit.id, activeQuiz.quizType, score, total, passed)
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-stone-500 hover:text-stone-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-stone-900">{domainLabel} — Unit Curriculum</h2>
          <p className="text-sm text-stone-500">Complete lessons → checkpoint → unit test to progress</p>
        </div>
      </div>

      <div className="space-y-4">
        {units.map((unit, unitIdx) => {
          const prog = progressMap[unit.id] || {};
          const lessonsCompleted = (prog.lessons_completed || []).length;
          const locked = isUnitLocked(unitIdx);
          const checkpointStatus = getCheckpointStatus(unit, lessonsCompleted);
          const unitTestStatus = getUnitTestStatus(unit, lessonsCompleted, prog.checkpoint_passed);

          return (
            <motion.div
              key={unit.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: unitIdx * 0.08 }}
            >
              <Card className={`rounded-2xl border-2 ${locked ? 'border-stone-200 opacity-60' : prog.unit_completed ? 'border-emerald-300 bg-emerald-50/30' : 'border-stone-200'}`}>
                <CardContent className="p-5">
                  {/* Unit header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      {locked
                        ? <Lock className="w-5 h-5 text-stone-400 flex-shrink-0 mt-0.5" />
                        : prog.unit_completed
                          ? <Trophy className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          : <BookOpen className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      }
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">{unit.title}</h3>
                        <p className="text-xs text-stone-500 mt-0.5">{unit.description}</p>
                      </div>
                    </div>
                    {prog.unit_completed && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs flex-shrink-0">Complete ✓</Badge>}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-stone-500">{lessonsCompleted}/{unit.lessons.length} lessons</span>
                      <span className="text-xs text-stone-500">{Math.round((lessonsCompleted / unit.lessons.length) * 100)}%</span>
                    </div>
                    <Progress value={(lessonsCompleted / unit.lessons.length) * 100} className="h-2" />
                  </div>

                  {/* Lessons list */}
                  {!locked && (
                    <div className="space-y-1 mb-3">
                      {unit.lessons.map((lesson, lIdx) => {
                        const done = (prog.lessons_completed || []).includes(lesson);
                        return (
                          <button
                            key={lIdx}
                            onClick={() => {
                              setActiveLesson({ topic: lesson, unitId: unit.id });
                              setActiveView('lesson');
                            }}
                            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs ${
                              done
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-emerald-700'
                            }`}
                          >
                            {done
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              : <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-300 flex-shrink-0" />
                            }
                            <span>{lesson}</span>
                            <ChevronRight className="w-3 h-3 text-stone-300 ml-auto" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Checkpoint quiz */}
                  {!locked && checkpointStatus && (
                    <div className={`flex items-center justify-between p-3 rounded-xl border-2 mb-2 ${
                      checkpointStatus.unlocked
                        ? prog.checkpoint_passed
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-amber-50 border-amber-300'
                        : 'bg-stone-50 border-stone-200 opacity-60'
                    }`}>
                      <div className="flex items-center gap-2">
                        <ClipboardList className={`w-4 h-4 ${checkpointStatus.unlocked ? (prog.checkpoint_passed ? 'text-emerald-500' : 'text-amber-500') : 'text-stone-400'}`} />
                        <div>
                          <p className="text-xs font-semibold text-stone-700">📝 Checkpoint Quiz</p>
                          {prog.checkpoint_passed
                            ? <p className="text-xs text-emerald-600">Passed! {prog.checkpoint_score}/{prog.checkpoint_total}</p>
                            : checkpointStatus.unlocked
                              ? <p className="text-xs text-amber-600">Ready to take</p>
                              : <p className="text-xs text-stone-400">{checkpointStatus.lessonsNeeded} more lesson{checkpointStatus.lessonsNeeded !== 1 ? 's' : ''} to unlock</p>
                          }
                        </div>
                      </div>
                      {checkpointStatus.unlocked && (
                        <Button
                          size="sm"
                          onClick={() => { setActiveQuiz({ unit, quizType: 'checkpoint' }); setActiveView('quiz'); }}
                          className={`text-xs rounded-full px-3 h-7 ${prog.checkpoint_passed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                          variant={prog.checkpoint_passed ? 'outline' : 'default'}
                        >
                          {prog.checkpoint_passed ? 'Retake' : 'Start'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Unit test */}
                  {!locked && (
                    <div className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                      unitTestStatus.unlocked
                        ? prog.unit_test_passed
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-purple-50 border-purple-300'
                        : 'bg-stone-50 border-stone-200 opacity-60'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Target className={`w-4 h-4 ${unitTestStatus.unlocked ? (prog.unit_test_passed ? 'text-emerald-500' : 'text-purple-500') : 'text-stone-400'}`} />
                        <div>
                          <p className="text-xs font-semibold text-stone-700">🎯 Unit Test</p>
                          {prog.unit_test_passed
                            ? <p className="text-xs text-emerald-600">Passed! {prog.unit_test_score}/{prog.unit_test_total}</p>
                            : unitTestStatus.unlocked
                              ? <p className="text-xs text-purple-600">Ready — complete all lessons first</p>
                              : <p className="text-xs text-stone-400">Finish all lessons{checkpointStatus ? ' + checkpoint' : ''} to unlock</p>
                          }
                        </div>
                      </div>
                      {unitTestStatus.unlocked && (
                        <Button
                          size="sm"
                          onClick={() => { setActiveQuiz({ unit, quizType: 'unit_test' }); setActiveView('quiz'); }}
                          className={`text-xs rounded-full px-3 h-7 ${prog.unit_test_passed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
                          variant={prog.unit_test_passed ? 'outline' : 'default'}
                        >
                          {prog.unit_test_passed ? 'Retake' : 'Start'}
                        </Button>
                      )}
                    </div>
                  )}

                  {locked && (
                    <div className="flex items-center gap-2 text-xs text-stone-400 mt-2">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pass the previous unit test to unlock</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
