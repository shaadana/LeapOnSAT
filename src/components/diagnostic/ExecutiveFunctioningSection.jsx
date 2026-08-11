import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EF_QUESTIONS = [
  // Working Memory (1-2)
  { id: 1, text: "I have a good memory for facts, dates, and details.", skill: "working_memory" },
  { id: 2, text: "I am very good at remembering the things I have committed to do.", skill: "working_memory" },
  
  // Emotional Control (3-4)
  { id: 3, text: "My emotions seldom get in the way when performing on tasks.", skill: "emotional_control" },
  { id: 4, text: "I can defer my personal feelings until after a task has been completed.", skill: "emotional_control" },
  
  // Task Initiation (5-6)
  { id: 5, text: "No matter what the task, I believe in getting started as soon as possible.", skill: "task_initiation" },
  { id: 6, text: "Procrastination is usually not a problem for me.", skill: "task_initiation" },
  
  // Sustained Attention (7-8)
  { id: 7, text: "I find it easy to stay focused on my work.", skill: "sustained_attention" },
  { id: 8, text: "Once I start an assignment, I work diligently until it's completed.", skill: "sustained_attention" },
  
  // Planning/Prioritization (9-10)
  { id: 9, text: "When I have a lot to do, I can easily focus on the most important things.", skill: "planning_prioritization" },
  { id: 10, text: "I typically break big tasks down into subtasks and timelines.", skill: "planning_prioritization" },
  
  // Organization (11-12)
  { id: 11, text: "I am an organized person.", skill: "organization" },
  { id: 12, text: "I am good at maintaining systems for organizing my work.", skill: "organization" },
  
  // Time Management (13-14)
  { id: 13, text: "At the end of the day, I've usually finished what I set out to do.", skill: "time_management" },
  { id: 14, text: "I am good at estimating how long it takes to do something.", skill: "time_management" },
  
  // Flexibility (15-16)
  { id: 15, text: "I easily adjust to changes in plans and priorities.", skill: "flexibility" },
  { id: 16, text: "I consider myself to be flexible and adaptive to change.", skill: "flexibility" },
  
  // Goal-Directed Persistence (17-18)
  { id: 17, text: "I think of myself as being driven to meet my goals.", skill: "goal_directed_persistence" },
  { id: 18, text: "I easily give up immediate pleasures to work on long-term goals.", skill: "goal_directed_persistence" },
  
  // Response Inhibition (19-20)
  { id: 19, text: "I am able to resist acting too quickly or impulsively.", skill: "response_inhibition" },
  { id: 20, text: "I can think before I act.", skill: "response_inhibition" },
  
  // Metacognition (21-22)
  { id: 21, text: "I regularly monitor my progress toward goals and adjust as needed.", skill: "metacognition" },
  { id: 22, text: "I can step back and take a different view of things when solving problems.", skill: "metacognition" },
  
  // Stress Tolerance (23-24)
  { id: 23, text: "I am able to remain calm under pressure.", skill: "stress_tolerance" },
  { id: 24, text: "Small setbacks don't easily derail me.", skill: "stress_tolerance" },
];

const RATING_OPTIONS = [
  { value: "1", label: "Strongly Disagree" },
  { value: "2", label: "Disagree" },
  { value: "3", label: "Tend to Disagree" },
  { value: "4", label: "Neutral" },
  { value: "5", label: "Tend to Agree" },
  { value: "6", label: "Agree" },
  { value: "7", label: "Strongly Agree" },
];

export default function ExecutiveFunctioningSection({ onComplete, onBack }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const handleNext = () => {
    if (currentQuestion < EF_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      calculateScores();
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const calculateScores = () => {
    const scores = {};
    const skills = [...new Set(EF_QUESTIONS.map(q => q.skill))];
    
    skills.forEach(skill => {
      const skillQuestions = EF_QUESTIONS.filter(q => q.skill === skill);
      const total = skillQuestions.reduce((sum, q) => sum + (answers[q.id] || 4), 0);
      scores[skill] = total;
    });

    // Find strengths and weaknesses
    const sortedSkills = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const strengths = sortedSkills.slice(0, 3).map(([skill]) => formatSkillName(skill));
    const weaknesses = sortedSkills.slice(-3).map(([skill]) => formatSkillName(skill));

    onComplete({
      executive_functioning: scores,
      ef_strengths: strengths,
      ef_weaknesses: weaknesses
    });
  };

  const formatSkillName = (skill) => {
    return skill.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const question = EF_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / EF_QUESTIONS.length) * 100;
  const isAnswered = answers[question.id] !== undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Brain className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Learning Skills Assessment</h2>
            <p className="text-sm text-gray-500">Question {currentQuestion + 1} of {EF_QUESTIONS.length}</p>
          </div>
        </div>
        <Progress value={progress} className="h-2 bg-emerald-100" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-white/90 backdrop-blur border-emerald-100 shadow-lg">
            <CardContent className="p-6">
              <p className="text-lg font-medium text-gray-800 mb-6">
                {question.text}
              </p>

              <RadioGroup
                value={answers[question.id]?.toString()}
                onValueChange={(value) => handleAnswer(question.id, value)}
                className="space-y-3"
              >
                {RATING_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <RadioGroupItem
                      value={option.value}
                      id={`q${question.id}-${option.value}`}
                      className="text-emerald-600"
                    />
                    <Label
                      htmlFor={`q${question.id}-${option.value}`}
                      className="ml-3 text-gray-700 cursor-pointer flex-1 py-2"
                    >
                      <span className="font-medium mr-2">{option.value}.</span>
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrev}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!isAnswered}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {currentQuestion === EF_QUESTIONS.length - 1 ? 'Complete Section' : 'Next'}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
