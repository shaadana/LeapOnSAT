import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Upload, FileText, Sparkles, ChevronRight, 
  CheckCircle, XCircle, RotateCcw, Trophy, Loader2, ArrowLeft,
  Brain, Zap, Map, Network
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import StudyPlanGraph from '@/components/study/StudyPlanGraph';

const STAGES = {
  INPUT: 'input',
  GENERATING: 'generating',
  PLAN: 'plan',
  LESSON: 'lesson',
  QUIZ: 'quiz',
  RESULT: 'result',
};

export default function IndependentStudy() {
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState(STAGES.INPUT);
  const [inputMode, setInputMode] = useState('outline'); // 'outline' | 'file'
  const [outline, setOutline] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);
  const [studyPlanId, setStudyPlanId] = useState(null);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [lessonContent, setLessonContent] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [nodeProgress, setNodeProgress] = useState({});
  const [conceptNodeIds, setConceptNodeIds] = useState({});
  const [conceptNodeData, setConceptNodeData] = useState({});
  const [loading, setLoading] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    const init = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      // Load saved study plans
      if (userData?.id) {
        const plans = await base44.entities.StudyPlan.filter({ user_id: userData.id }, '-created_date');
        setSavedPlans(plans || []);
      }
    };
    init().catch(() => base44.auth.redirectToLogin());
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setUploading(false);
  };

  const generateStudyPlan = async () => {
    setStage(STAGES.GENERATING);
    const prompt = inputMode === 'file'
      ? `A student uploaded a document for study. Analyze it and create a structured study plan.`
      : `A student wants to study the following topics: "${outline}"`;

    const plan = await base44.integrations.Core.InvokeLLM({
      prompt: `${prompt}

Create a comprehensive, personalized study plan as a learning pathway with 4-8 nodes. Each node should be a focused topic or concept. Order nodes from foundational to advanced — define prerequisites so learners build knowledge in the right order.

Return a JSON object with:
{
  "title": "Study Plan title",
  "description": "Brief 1-sentence overview",
  "estimated_minutes": number,
  "subject_area": "inferred subject (e.g. History, Biology, Math, Literature, etc.)",
  "nodes": [
    {
      "id": "node_1",
      "title": "Topic title",
      "type": "concept" | "skill" | "review",
      "description": "What this covers",
      "estimated_minutes": number,
      "emoji": "relevant emoji",
      "tags": ["keyword1", "keyword2"],
      "prerequisites": [] 
    },
    {
      "id": "node_2",
      "title": "Next Topic",
      "type": "skill",
      "description": "What this builds on",
      "estimated_minutes": number,
      "emoji": "relevant emoji",
      "tags": ["keyword1"],
      "prerequisites": ["node_1"]
    }
  ]
}

IMPORTANT: "prerequisites" must contain node ids from the same plan. Foundational nodes have empty prerequisites. Advanced or application nodes must list which earlier nodes they build on.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          estimated_minutes: { type: 'number' },
          subject_area: { type: 'string' },
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
                estimated_minutes: { type: 'number' },
                emoji: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      },
      file_urls: fileUrl ? [fileUrl] : undefined,
    });

    setStudyPlan(plan);

    // Save study plan to DB
    if (user) {
      const savedPlan = await base44.entities.StudyPlan.create({
        user_id: user.id,
        title: plan.title,
        description: plan.description,
        subject_area: plan.subject_area,
        estimated_minutes: plan.estimated_minutes,
        input_type: inputMode,
        input_content: inputMode === 'outline' ? outline : '',
        input_file_url: fileUrl,
        nodes_data: plan.nodes,
        status: 'in_progress',
      });
      setStudyPlanId(savedPlan.id);

      // Save concept nodes to DB
      const dbNodes = await Promise.all(plan.nodes.map(node =>
        base44.entities.ConceptNode.create({
          user_id: user.id,
          study_plan_title: plan.title,
          node_id: node.id,
          title: node.title,
          type: node.type,
          description: node.description,
          emoji: node.emoji,
          subject_area: plan.subject_area || 'General',
          tags: node.tags || [],
          related_node_ids: (node.prerequisites || []),
          mastery_level: 'not_started',
          completed: false,
        })
      ));
      // Store the saved node IDs mapped by node index so we can update them later
      const idMap = {};
      const dataMap = {};
      plan.nodes.forEach((node, idx) => {
        idMap[idx] = dbNodes[idx]?.id;
        dataMap[idx] = { ...dbNodes[idx], prerequisites: node.prerequisites || [] };
      });
      setConceptNodeIds(idMap);
      setConceptNodeData(dataMap);
    }

    setStage(STAGES.PLAN);
  };

  const loadSavedPlan = async (plan) => {
    setStudyPlan(plan);
    setStudyPlanId(plan.id);
    setFileUrl(plan.input_file_url || '');
    setOutline(plan.input_content || '');
    
    // Load progress for this plan's concept nodes
    if (user && plan.id) {
      const conceptNodes = await base44.entities.ConceptNode.filter({ 
        study_plan_title: plan.title,
        user_id: user.id 
      });
      
      const idMap = {};
      const progress = {};
      const dataMap = {};
      conceptNodes.forEach((cn, idx) => {
        idMap[idx] = cn.id;
        dataMap[idx] = cn;
        if (cn.quiz_score !== undefined) {
          progress[idx] = cn.quiz_score;
        }
      });
      setConceptNodeIds(idMap);
      setConceptNodeData(dataMap);
      setNodeProgress(progress);
    }
    
    setShowSavedPlans(false);
    setStage(STAGES.PLAN);
  };

  const startNode = async (nodeIndex) => {
    setCurrentNodeIndex(nodeIndex);
    setLoading(true);
    setStage(STAGES.LESSON);
    setLessonContent('');

    const node = studyPlan.nodes[nodeIndex];
    const context = inputMode === 'outline' ? outline : 'the uploaded document';

    const lesson = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a brilliant tutor teaching "${node.title}" as part of a study plan about: ${context}.

Write a clear, engaging lesson in markdown (2-4 paragraphs). Use:
- Simple language with vivid analogies
- Bold for key terms
- A bullet list of key takeaways at the end
- One concrete real-world example

Keep it focused and digestible for a student. End with a "✅ Ready to quiz?" line.`,
      file_urls: fileUrl ? [fileUrl] : undefined,
    });

    setLessonContent(lesson);
    setLoading(false);
  };

  const startQuiz = async () => {
    setLoading(true);
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setQuizResults([]);
    setSelectedAnswer('');
    setQuizAnswered(false);

    const node = studyPlan.nodes[currentNodeIndex];
    const context = inputMode === 'outline' ? outline : 'the uploaded document';

    const quiz = await base44.integrations.Core.InvokeLLM({
      prompt: `Create 3 multiple-choice quiz questions about "${node.title}" from the study material: ${context}.

Each question should test real understanding (not just recall). Include one tricky distractor.

Return JSON:
{
  "questions": [
    {
      "question": "question text",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "A",
      "explanation": "Why this is correct..."
    }
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correct: { type: 'string' },
                explanation: { type: 'string' }
              }
            }
          }
        }
      },
      file_urls: fileUrl ? [fileUrl] : undefined,
    });

    setQuizQuestions(quiz.questions || []);
    setStage(STAGES.QUIZ);
    setLoading(false);
  };

  const handleQuizAnswer = (option) => {
    if (quizAnswered) return;
    setSelectedAnswer(option);
    setQuizAnswered(true);
    const q = quizQuestions[currentQuizIndex];
    const correct = option.startsWith(q.correct);
    setQuizResults(prev => [...prev, { correct, question: q.question }]);
  };

  const nextQuizQuestion = async () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer('');
      setQuizAnswered(false);
    } else {
      // Quiz complete — mark node done
      const lastCorrect = quizResults[quizResults.length - 1]?.correct ? 1 : 0;
      const score = quizResults.slice(0, quizResults.length).filter(r => r.correct).length + (quizAnswered ? (quizResults[quizResults.length - 1]?.correct ? 0 : 0) : 0);
      // Recalculate score including current answer
      const totalCorrect = quizResults.filter(r => r.correct).length;
      setNodeProgress(prev => ({ ...prev, [currentNodeIndex]: totalCorrect }));

      // Update ConceptNode in DB
      const dbId = conceptNodeIds[currentNodeIndex];
      if (dbId) {
        const mastery = totalCorrect >= 3 ? 'mastered' : totalCorrect >= 2 ? 'practiced' : 'learning';
        await base44.entities.ConceptNode.update(dbId, {
          quiz_score: totalCorrect,
          completed: true,
          mastery_level: mastery,
        });
        setConceptNodeData(prev => ({
          ...prev,
          [currentNodeIndex]: { ...(prev[currentNodeIndex] || {}), mastery_level: mastery, quiz_score: totalCorrect }
        }));
      }

      setStage(STAGES.PLAN);
    }
  };

  const completeStudyPlan = async () => {
    // Mark assignment as completed if this was from an assignment
    const assignments = await base44.entities.StudentAssignmentProgress.filter({
      student_id: user.id
    });
    const indStudyAssignments = assignments.filter(a => {
      const assignmentData = base44.entities.Assignment.filter({ id: a.assignment_id });
      return assignmentData && assignmentData[0]?.assignment_type === 'independent_study';
    });
    for (const assignment of indStudyAssignments) {
      await base44.entities.StudentAssignmentProgress.update(assignment.id, {
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString()
      });
    }

    // Mark study plan as completed
    if (studyPlanId) {
      await base44.entities.StudyPlan.update(studyPlanId, { status: 'completed' });
    }
    setStage(STAGES.INPUT);
    setStudyPlan(null);
    setStudyPlanId(null);
    setNodeProgress({});
    setSavedPlans(await base44.entities.StudyPlan.filter({ user_id: user.id }, '-created_date'));
  };

  const allNodesComplete = studyPlan && Object.keys(nodeProgress).length >= studyPlan.nodes?.length;

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">Independent Study</h1>
              <p className="text-white/80 text-sm">Upload your material or describe what you want to learn</p>
            </div>
          </div>
          {savedPlans.length > 0 && stage === STAGES.INPUT && (
            <Button 
              onClick={() => setShowSavedPlans(!showSavedPlans)}
              className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-full font-bold shadow-lg"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              My Plans ({savedPlans.length})
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* SAVED PLANS */}
        {stage === STAGES.INPUT && showSavedPlans && savedPlans.length > 0 && (
          <motion.div key="saved" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-4 border-emerald-200 shadow-2xl rounded-3xl">
              <CardHeader>
                <CardTitle className="font-display text-xl text-stone-900">Your Study Plans</CardTitle>
                <p className="text-stone-600 text-sm mt-1">Resume where you left off</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedPlans.map(plan => (
                  <div key={plan.id} className="p-4 rounded-2xl border-2 border-emerald-100 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer" onClick={() => loadSavedPlan(plan)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-stone-900">{plan.title}</h3>
                        <p className="text-sm text-stone-600 mt-0.5">{plan.description}</p>
                        <p className="text-xs text-stone-500 mt-1">{plan.nodes_data?.length || 0} topics • {plan.estimated_minutes} min</p>
                      </div>
                      <Badge className={plan.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'}>
                        {plan.status === 'completed' ? '✓ Done' : 'In Progress'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* INPUT STAGE */}
        {stage === STAGES.INPUT && !showSavedPlans && (
          <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-4 border-white shadow-2xl rounded-3xl">
              <CardHeader>
                <CardTitle className="font-display text-xl text-stone-900">What do you want to study?</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant={inputMode === 'outline' ? 'default' : 'outline'}
                    onClick={() => setInputMode('outline')}
                    className={inputMode === 'outline' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Write an outline
                  </Button>
                  <Button
                    size="sm"
                    variant={inputMode === 'file' ? 'default' : 'outline'}
                    onClick={() => setInputMode('file')}
                    className={inputMode === 'file' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload a file
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {inputMode === 'outline' ? (
                  <div>
                    <Textarea
                      value={outline}
                      onChange={(e) => setOutline(e.target.value)}
                      placeholder="e.g. 'The causes of World War I, focusing on nationalism, alliances, and the assassination of Franz Ferdinand. Also the major battles and their outcomes.'"
                      className="h-40 border-2 border-emerald-200 focus:border-emerald-400 rounded-xl resize-none"
                    />
                    <p className="text-xs text-stone-500 mt-2">Be as specific or broad as you'd like — the AI will create a structured pathway from your description.</p>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center h-40 border-4 border-dashed border-emerald-200 rounded-2xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                      <input type="file" accept=".pdf,.pptx,.ppt,.docx,.txt" onChange={handleFileUpload} className="hidden" />
                      {uploading ? (
                        <div className="text-center">
                          <Loader2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-spin" />
                          <p className="text-stone-600">Uploading...</p>
                        </div>
                      ) : uploadedFile ? (
                        <div className="text-center">
                          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <p className="text-stone-700 font-medium">{uploadedFile.name}</p>
                          <p className="text-xs text-stone-500 mt-1">File ready</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                          <p className="text-stone-600 font-medium">Drop your file here</p>
                          <p className="text-xs text-stone-400 mt-1">PDF, PowerPoint, Word, or text</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                <Button
                  onClick={generateStudyPlan}
                  disabled={inputMode === 'outline' ? !outline.trim() : !fileUrl}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full font-bold h-12"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate My Study Plan
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* GENERATING */}
        {stage === STAGES.GENERATING && (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-500 flex items-center justify-center shadow-xl">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl font-bold text-stone-900 mb-2">Building your study plan...</h2>
            <p className="text-stone-500">Analyzing content and creating your personalized pathway</p>
          </motion.div>
        )}

        {/* STUDY PLAN */}
        {stage === STAGES.PLAN && studyPlan && (
          <motion.div key="plan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="bg-white border-4 border-emerald-200 rounded-3xl shadow-xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <CardTitle className="font-display text-xl text-stone-900">{studyPlan.title}</CardTitle>
                    <p className="text-stone-600 text-sm mt-1">{studyPlan.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={showGraph ? 'default' : 'outline'}
                      onClick={() => setShowGraph(g => !g)}
                      className={showGraph ? 'bg-stone-700 text-white rounded-full' : 'border-stone-300 text-stone-600 rounded-full'}
                    >
                      <Network className="w-4 h-4 mr-1" />
                      {showGraph ? 'Hide Graph' : 'View Graph'}
                    </Button>
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
                      ~{studyPlan.estimated_minutes} min
                    </Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Progress</span>
                    <span>{Object.keys(nodeProgress).length}/{studyPlan.nodes.length} topics</span>
                  </div>
                  <Progress value={(Object.keys(nodeProgress).length / studyPlan.nodes.length) * 100} className="h-2" />
                </div>
              </CardHeader>
            </Card>

            {/* Knowledge Graph for this study plan */}
            {showGraph && (
              <Card className="border-4 border-white shadow-xl rounded-3xl overflow-hidden" style={{ height: '420px' }}>
                <StudyPlanGraph
                  nodes={Object.values(conceptNodeData).length > 0
                    ? Object.entries(conceptNodeData).map(([idx, cn]) => ({
                        ...cn,
                        id: cn.id || String(idx),
                        title: studyPlan.nodes[idx]?.title || cn.title,
                        emoji: studyPlan.nodes[idx]?.emoji || cn.emoji || '📚',
                        type: studyPlan.nodes[idx]?.type || cn.type || 'concept',
                        prerequisites: (studyPlan.nodes[idx]?.prerequisites || cn.related_node_ids || [])
                          .map(pid => {
                            const prereqIdx = studyPlan.nodes.findIndex(n => n.id === pid);
                            return conceptNodeData[prereqIdx]?.id || pid;
                          }),
                        mastery_level: nodeProgress[idx] !== undefined
                          ? (nodeProgress[idx] >= 3 ? 'mastered' : nodeProgress[idx] >= 2 ? 'practiced' : 'learning')
                          : (cn.mastery_level || 'not_started'),
                      }))
                    : studyPlan.nodes.map((n, idx) => ({
                        id: `node_${idx}`,
                        title: n.title,
                        emoji: n.emoji || '📚',
                        type: n.type || 'concept',
                        prerequisites: (n.prerequisites || []).map(pid => {
                          const pidx = studyPlan.nodes.findIndex(x => x.id === pid);
                          return `node_${pidx >= 0 ? pidx : pid}`;
                        }),
                        mastery_level: nodeProgress[idx] !== undefined
                          ? (nodeProgress[idx] >= 3 ? 'mastered' : nodeProgress[idx] >= 2 ? 'practiced' : 'learning')
                          : 'not_started',
                      }))
                  }
                  onNodeClick={(node) => {
                    const idx = Object.entries(conceptNodeData).find(([, cn]) => cn.id === node.id)?.[0];
                    if (idx !== undefined) startNode(Number(idx));
                  }}
                />
              </Card>
            )}

            {allNodesComplete && (
              <Card className="bg-gradient-to-r from-emerald-50 to-stone-50 border-4 border-emerald-300 rounded-3xl shadow-xl">
                <CardContent className="p-6 text-center">
                  <Trophy className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-display text-xl font-bold text-emerald-900">Study Plan Complete! 🎉</h3>
                  <p className="text-stone-600 mt-1">You've worked through every topic. Great focus!</p>
                  <Button onClick={() => { setStage(STAGES.INPUT); setStudyPlan(null); setNodeProgress({}); setOutline(''); setFileUrl(''); setUploadedFile(null); }}
                    className="mt-4 bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold">
                    Start a New Study Plan
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {studyPlan.nodes.map((node, idx) => {
                const done = nodeProgress[idx] !== undefined;
                const score = nodeProgress[idx];
                return (
                  <motion.div key={node.id} whileHover={{ scale: 1.01 }}>
                    <Card className={`border-4 rounded-3xl shadow-lg transition-all ${
                      done ? 'border-emerald-300 bg-emerald-50' : 'border-white bg-white hover:border-emerald-200'
                    }`}>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md ${
                          done ? 'bg-emerald-500' : 'bg-stone-100'
                        }`}>
                          {done ? <CheckCircle className="w-6 h-6 text-white" /> : node.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-stone-900">{node.title}</h3>
                            <Badge variant="outline" className="text-xs capitalize">{node.type}</Badge>
                          </div>
                          <p className="text-sm text-stone-500 mt-0.5">{node.description}</p>
                          {done && (
                            <p className="text-xs text-emerald-600 font-medium mt-1">
                              ✓ Completed · Quiz: {score}/3
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-stone-400">~{node.estimated_minutes}min</span>
                          <Button
                            size="sm"
                            onClick={() => startNode(idx)}
                            className={`rounded-full shadow font-bold ${
                              done ? 'bg-stone-200 text-stone-600 hover:bg-stone-300' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}
                          >
                            {done ? <RotateCcw className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {done ? 'Review' : 'Start'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStage(STAGES.INPUT); setStudyPlan(null); setStudyPlanId(null); setNodeProgress({}); }}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-full flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              {studyPlanId && (
                <Button 
                  onClick={completeStudyPlan}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* LESSON */}
        {stage === STAGES.LESSON && (
          <motion.div key="lesson" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-4 border-white shadow-2xl rounded-3xl">
              <CardHeader className="border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStage(STAGES.PLAN)} className="rounded-full">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <CardTitle className="font-display text-lg">{studyPlan?.nodes[currentNodeIndex]?.title}</CardTitle>
                    <p className="text-xs text-stone-500">Lesson</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-spin" />
                    <p className="text-stone-500">Preparing your lesson...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="prose prose-sm prose-stone max-w-none [&>p]:leading-relaxed [&>ul]:ml-4">
                      <ReactMarkdown>{lessonContent}</ReactMarkdown>
                    </div>
                    <div className="pt-4 border-t border-stone-100 flex justify-end">
                      <Button onClick={startQuiz} className="bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold shadow-lg">
                        <Zap className="w-4 h-4 mr-2" />
                        Take the Quiz
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* QUIZ */}
        {stage === STAGES.QUIZ && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-4 border-white shadow-2xl rounded-3xl">
              <CardHeader className="border-b border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setStage(STAGES.LESSON)} className="rounded-full">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <CardTitle className="font-display text-lg">Quiz Time!</CardTitle>
                      <p className="text-xs text-stone-500">{studyPlan?.nodes[currentNodeIndex]?.title}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {currentQuizIndex + 1} / {quizQuestions.length}
                  </Badge>
                </div>
                <Progress value={((currentQuizIndex + 1) / quizQuestions.length) * 100} className="h-1.5 mt-3" />
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-spin" />
                    <p className="text-stone-500">Generating quiz...</p>
                  </div>
                ) : quizQuestions[currentQuizIndex] ? (() => {
                  const q = quizQuestions[currentQuizIndex];
                  const lastResult = quizResults[quizResults.length - 1];
                  return (
                    <div className="space-y-5">
                      <p className="text-base font-medium text-stone-800 leading-relaxed">{q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((option, i) => {
                          const letter = option[0];
                          const isSelected = selectedAnswer === option;
                          const isCorrect = letter === q.correct;
                          let cls = 'border-2 border-stone-200 bg-white text-stone-700 hover:border-emerald-300 hover:bg-emerald-50';
                          if (quizAnswered) {
                            if (isCorrect) cls = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900';
                            else if (isSelected) cls = 'border-2 border-red-400 bg-red-50 text-red-800';
                            else cls = 'border-2 border-stone-100 bg-stone-50 text-stone-400';
                          }
                          return (
                            <button
                              key={i}
                              onClick={() => handleQuizAnswer(option)}
                              disabled={quizAnswered}
                              className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 ${cls}`}
                            >
                              <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {letter}
                              </span>
                              <span className="text-sm">{option.slice(3)}</span>
                              {quizAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />}
                              {quizAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 ml-auto" />}
                            </button>
                          );
                        })}
                      </div>
                      {quizAnswered && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <Card className={`border-2 ${lastResult?.correct ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
                            <CardContent className="p-4">
                              <p className="text-sm font-semibold mb-1">
                                {lastResult?.correct ? '✅ Correct!' : '❌ Not quite'}
                              </p>
                              <p className="text-sm text-stone-700">{q.explanation}</p>
                            </CardContent>
                          </Card>
                          <div className="flex justify-end mt-4">
                            <Button onClick={nextQuizQuestion} className="bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold">
                              {currentQuizIndex < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })() : null}
              </CardContent>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
