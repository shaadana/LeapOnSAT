import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MINDSET_QUESTIONS = [
  {
    id: 'm1',
    type: 'scale',
    text: "When someone makes a mistake, I believe they can learn from it and improve.",
    options: [
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neutral" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly Agree" }
    ]
  },
  {
    id: 'm2',
    type: 'scale',
    text: "I believe that intelligence and abilities can be developed through effort and learning.",
    options: [
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neutral" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly Agree" }
    ]
  },
  {
    id: 'm3',
    type: 'scale',
    text: "When faced with a difficult challenge, I believe my hard work will eventually lead to success.",
    options: [
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neutral" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly Agree" }
    ]
  },
  {
    id: 'm4',
    type: 'scale',
    text: "I see failure as an opportunity to learn rather than a reflection of my limitations.",
    options: [
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neutral" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly Agree" }
    ]
  },
  {
    id: 'm5',
    type: 'scale',
    text: "When I receive critical feedback, I tend to feel motivated rather than discouraged.",
    options: [
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neutral" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly Agree" }
    ]
  },
  {
    id: 'm6',
    type: 'scale',
    text: "I believe my basic abilities and talents can change significantly with practice and effort.",
    options: [
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neutral" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly Agree" }
    ]
  },
  {
    id: 'm7',
    type: 'text',
    text: "Think of a time you struggled with something academic. What helped you most?"
  }
];

export default function MindsetSection({ onComplete, onBack }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < MINDSET_QUESTIONS.length - 1) {
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
    // Calculate growth mindset score from all relevant questions
    const growthMindsetQuestions = ['m2', 'm3', 'm4', 'm6'];
    const growthScores = growthMindsetQuestions
      .map(id => answers[id] || 3)
      .filter(val => typeof val === 'number');
    const avgGrowthScore = growthScores.reduce((a, b) => a + b, 0) / growthScores.length;
    const growthMindsetPercentage = Math.round((avgGrowthScore / 5) * 100);
    
    // Calculate mentor mindset indicators
    const mentorQuestions = ['m1', 'm5']; // learning from mistakes, feedback motivation
    const mentorScores = mentorQuestions
      .map(id => answers[id] || 3)
      .filter(val => typeof val === 'number');
    const avgMentorScore = mentorScores.reduce((a, b) => a + b, 0) / mentorScores.length;
    const mentorMindsetPercentage = Math.round((avgMentorScore / 5) * 100);
    
    // Calculate enforcer tendencies (reverse: if they disagree with growth, more enforcer)
    const enforcerPercentage = 100 - growthMindsetPercentage;
    
    // Calculate protector tendencies (if they avoid failure/feedback)
    const protectorIndicator = 5 - (answers['m4'] || 3); // reverse score on failure question
    const protectorPercentage = Math.round((protectorIndicator / 5) * 100);
    
    // Get text responses
    const textResponses = MINDSET_QUESTIONS
      .filter(q => q.type === 'text')
      .map(q => answers[q.id] || '')
      .filter(r => r.length > 0);

    onComplete({
      mindset_appraisal: {
        mentor_mindset_score: mentorMindsetPercentage,
        growth_mindset_score: growthMindsetPercentage,
        enforcer_tendencies: enforcerPercentage > 65 ? enforcerPercentage : Math.max(0, enforcerPercentage - 30),
        protector_tendencies: protectorPercentage,
        responses: textResponses
      }
    });
  };

  const question = MINDSET_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / MINDSET_QUESTIONS.length) * 100;
  const isAnswered = question.type === 'text' 
    ? (answers[question.id]?.length > 10)
    : (answers[question.id] !== undefined);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center">
            <Heart className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Mindset</h2>
            <p className="text-sm text-gray-500">Question {currentQuestion + 1} of {MINDSET_QUESTIONS.length}</p>
          </div>
        </div>
        <Progress value={progress} className="h-2 bg-pink-100" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-white/90 backdrop-blur border-pink-100 shadow-lg">
            <CardContent className="p-6">
              <p className="text-lg font-medium text-gray-800 mb-6">
                {question.text}
              </p>

              {question.type === 'scale' ? (
                <RadioGroup
                  value={answers[question.id]?.toString()}
                  onValueChange={(value) => handleAnswer(question.id, parseInt(value))}
                  className="space-y-3"
                >
                  {question.options.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <RadioGroupItem
                        value={option.value.toString()}
                        id={`${question.id}-${option.value}`}
                        className="text-pink-600"
                      />
                      <Label
                        htmlFor={`${question.id}-${option.value}`}
                        className="ml-3 text-gray-700 cursor-pointer flex-1 py-2"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                  placeholder="Share your thoughts..."
                  className="min-h-32 border-pink-200 focus:ring-pink-500"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrev}
          className="border-pink-200 text-pink-700 hover:bg-pink-50"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!isAnswered}
          className="bg-pink-500 hover:bg-pink-600 text-white"
        >
          {currentQuestion === MINDSET_QUESTIONS.length - 1 ? 'Complete Section' : 'Next'}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
