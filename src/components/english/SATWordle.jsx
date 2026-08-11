import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSatVocab } from '@/data/satVocab';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Shake animation for incorrect guess
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
  .shake-anim { animation: shake 0.5s ease; }
`;
document.head.appendChild(style);

const KEYBOARD_ROWS = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  ['ENTER', ...'ZXCVBNM'.split(''), 'DEL']
];

export default function SATWordle({ onBack }) {
  const SAT_VOCAB = useSatVocab();
  const [maxGuesses, setMaxGuesses] = useState(() => parseInt(localStorage.getItem('maxGuesses')) || 6);
  const [targetWord, setTargetWord] = useState('');
  const [targetDefinition, setTargetDefinition] = useState('');
  const [targetSynonyms, setTargetSynonyms] = useState([]);
  
  const [guesses, setGuesses] = useState([]);
  const [currentGuessIndex, setCurrentGuessIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [letterStates, setLetterStates] = useState({});
  const [showHint, setShowHint] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [shakeRow, setShakeRow] = useState(-1);
  const [revealedRows, setRevealedRows] = useState([]);
  const [startTime, setStartTime] = useState(() => Date.now());

  // Refs for state inside event listeners
  const stateRef = useRef({
    guesses, currentGuessIndex, targetWord, gameOver, maxGuesses, startTime
  });
  
  useEffect(() => {
    stateRef.current = { guesses, currentGuessIndex, targetWord, gameOver, maxGuesses, startTime };
  }, [guesses, currentGuessIndex, targetWord, gameOver, maxGuesses, startTime]);

  const startNewGame = useCallback((guessesCount = maxGuesses) => {
    if (SAT_VOCAB.length === 0) return;
    let selected, word;
    // ensure word doesn't have spaces or hyphens to fit the wordle grid properly
    do {
      const randomIndex = Math.floor(Math.random() * SAT_VOCAB.length);
      selected = SAT_VOCAB[randomIndex];
      word = selected.word.toUpperCase().replace(/[^A-Z]/g, '');
    } while(word.length < 3 || word.length > 14); // Avoid absurdly short/long words if they exist

    setTargetWord(word);
    setTargetDefinition(selected.definition);
    setTargetSynonyms(selected.synonyms || []);
    setGuesses(Array(guessesCount).fill(''));
    setCurrentGuessIndex(0);
    setGameOver(false);
    setWon(false);
    setLetterStates({});
    setShowHint(false);
    setShowResultModal(false);
    setRevealedRows([]);
    setStartTime(Date.now());
  }, [maxGuesses]);

  useEffect(() => {
    if (SAT_VOCAB.length > 0 && targetWord === '') {
      startNewGame();
    }
  }, [startNewGame, SAT_VOCAB, targetWord]);

  const addLetter = (letter) => {
    setGuesses(prev => {
      const newGuesses = [...prev];
      const currentGuess = newGuesses[stateRef.current.currentGuessIndex];
      if (currentGuess.length < stateRef.current.targetWord.length) {
        newGuesses[stateRef.current.currentGuessIndex] = currentGuess + letter;
      }
      return newGuesses;
    });
  };

  const deleteLetter = () => {
    setGuesses(prev => {
      const newGuesses = [...prev];
      const currentGuess = newGuesses[stateRef.current.currentGuessIndex];
      if (currentGuess.length > 0) {
        newGuesses[stateRef.current.currentGuessIndex] = currentGuess.slice(0, -1);
      }
      return newGuesses;
    });
  };

  const submitGuess = () => {
    const { guesses, currentGuessIndex, targetWord, maxGuesses } = stateRef.current;
    const guess = guesses[currentGuessIndex];
    
    if (guess.length !== targetWord.length) {
      setShakeRow(currentGuessIndex);
      setTimeout(() => setShakeRow(-1), 500);
      return;
    }

    revealGuess(guess, currentGuessIndex, targetWord, maxGuesses);
  };

  const revealGuess = (guess, rowIndex, target, maxGuessesCount) => {
    let correctCount = 0;
    const targetArr = target.split('');
    const guessArr = guess.split('');
    const statuses = Array(guess.length).fill('absent');

    // First pass
    for (let i = 0; i < guess.length; i++) {
      if (guessArr[i] === targetArr[i]) {
        statuses[i] = 'correct';
        targetArr[i] = null;
        correctCount++;
      }
    }

    // Second pass
    for (let i = 0; i < guess.length; i++) {
      if (statuses[i] === 'correct') continue;
      const targetIndex = targetArr.indexOf(guessArr[i]);
      if (targetIndex !== -1) {
        statuses[i] = 'present';
        targetArr[targetIndex] = null;
      }
    }

    setRevealedRows(prev => [...prev, rowIndex]);

    // Update keyboard states
    const newLetterStates = { ...letterStates };
    guessArr.forEach((letter, i) => {
      const status = statuses[i];
      const currentStatus = newLetterStates[letter];
      if (status === 'correct') {
        newLetterStates[letter] = 'correct';
      } else if (status === 'present' && currentStatus !== 'correct') {
        newLetterStates[letter] = 'present';
      } else if (status === 'absent' && !currentStatus) {
        newLetterStates[letter] = 'absent';
      }
    });
    setLetterStates(newLetterStates);

    if (correctCount === target.length) {
      endGame(true, target);
    } else if (rowIndex === maxGuessesCount - 1) {
      endGame(false, target);
    } else {
      setCurrentGuessIndex(rowIndex + 1);
    }
  };

  const endGame = (hasWon, word) => {
    setGameOver(true);
    setWon(hasWon);
    
    // Log session
    base44.auth.me().then(user => {
      if (user) {
        const endTime = Date.now();
        const durationMinutes = Math.max(0.1, (endTime - stateRef.current.startTime) / 60000);
        base44.entities.EnglishPracticeSession.create({
          user_id: user.id,
          session_type: "vocabulary",
          status: "completed",
          start_time: new Date(stateRef.current.startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          duration_minutes: Number(durationMinutes.toFixed(2)),
          questions_attempted: 1,
          questions_correct: hasWon ? 1 : 0,
          domains_covered: ["vocabulary", "wordle"]
        }).catch(console.error);
      }
    });

    if (hasWon) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#34d399', '#22c55e', '#eab308']
      });
    }

    setTimeout(() => {
      setShowResultModal(true);
    }, 1000);
  };

  useEffect(() => {
    const handleKeyDownEvent = (e) => {
      if (stateRef.current.gameOver) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      
      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE' || key === 'DELETE') {
        deleteLetter();
      } else if (/^[A-Z]$/.test(key)) {
        addLetter(key);
      }
    };

    window.addEventListener('keydown', handleKeyDownEvent);
    return () => window.removeEventListener('keydown', handleKeyDownEvent);
  }, []);

  const getTileStatus = (rowIndex, colIndex) => {
    if (!revealedRows.includes(rowIndex)) return '';
    const guess = guesses[rowIndex];
    const targetArr = targetWord.split('');
    const guessArr = guess.split('');
    const statuses = Array(guess.length).fill('absent');

    for (let i = 0; i < guess.length; i++) {
      if (guessArr[i] === targetArr[i]) {
        statuses[i] = 'correct';
        targetArr[i] = null;
      }
    }
    for (let i = 0; i < guess.length; i++) {
      if (statuses[i] === 'correct') continue;
      const targetIndex = targetArr.indexOf(guessArr[i]);
      if (targetIndex !== -1) {
        statuses[i] = 'present';
        targetArr[targetIndex] = null;
      }
    }
    return statuses[colIndex];
  };

  const getTileClass = (status) => {
    if (status === 'correct') return 'bg-emerald-500 text-white border-emerald-500';
    if (status === 'present') return 'bg-amber-500 text-white border-amber-500';
    if (status === 'absent') return 'bg-stone-500 text-white border-stone-500';
    return 'bg-white border-stone-200 text-stone-800';
  };

  const getKeyClass = (key) => {
    const status = letterStates[key];
    if (status === 'correct') return 'bg-emerald-500 text-white';
    if (status === 'present') return 'bg-amber-500 text-white';
    if (status === 'absent') return 'bg-stone-500 text-white opacity-50';
    return 'bg-stone-200 text-stone-800 hover:bg-stone-300';
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center h-full min-h-[600px] select-none p-4">
      <div className="w-full relative flex items-center justify-center mb-8">
        <Button variant="ghost" onClick={onBack} className="text-stone-500 absolute left-0">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <h2 className="text-3xl font-bold text-stone-800 font-display">SATWordle</h2>
        <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(true)} className="absolute right-0">
          <Settings className="w-6 h-6 text-stone-600" />
        </Button>
      </div>

      <div className="mb-6 w-full max-w-2xl text-center flex items-center justify-center flex-col">
        {!showHint ? (
          <Button 
            variant="outline" 
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => setShowHint(true)}
          >
            Use Hint
          </Button>
        ) : (
          <div className="text-sm font-medium text-emerald-800 bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-200 max-w-full">
            {targetSynonyms.length > 0 ? (
              <><strong>Synonyms:</strong> {targetSynonyms.join(', ')}</>
            ) : (
              <><strong>Definition:</strong> {targetDefinition}</>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full mb-8 overflow-x-auto pb-4">
        <div 
          className="grid gap-2 p-2" 
          style={{ gridTemplateRows: `repeat(${maxGuesses}, 1fr)` }}
        >
          {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
            const guess = guesses[rowIndex] || '';
            const rowClass = rowIndex === shakeRow ? 'shake-anim' : '';
            
            return (
              <div 
                key={rowIndex} 
                className={`grid gap-2 mx-auto ${rowClass}`}
                style={{ gridTemplateColumns: `repeat(${targetWord.length}, 1fr)` }}
              >
                {Array.from({ length: targetWord.length }).map((_, colIndex) => {
                  const letter = guess[colIndex] || '';
                  const status = getTileStatus(rowIndex, colIndex);
                  const filledClass = letter && !status ? 'border-stone-400 border-2' : 'border-2';
                  const statusClass = getTileClass(status);
                  
                  // Adjust tile size slightly based on word length to fit on screen
                  const sizeClass = targetWord.length > 10 ? 'w-8 h-8 sm:w-10 sm:h-10 text-xl' : 'w-10 h-10 sm:w-14 sm:h-14 text-2xl';

                  return (
                    <div 
                      key={colIndex} 
                      className={`${sizeClass} flex items-center justify-center font-bold uppercase rounded transition-colors ${filledClass} ${statusClass}`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-2 pb-8 px-2">
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5 sm:gap-2">
            {row.map(key => {
              const isLarge = key === 'ENTER' || key === 'DEL';
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'ENTER') submitGuess();
                    else if (key === 'DEL') deleteLetter();
                    else addLetter(key);
                  }}
                  className={`flex items-center justify-center font-semibold rounded-lg ${isLarge ? 'px-3 sm:px-5 text-xs sm:text-sm' : 'w-8 sm:w-11 text-sm sm:text-base'} h-12 sm:h-14 transition-colors ${getKeyClass(key)}`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-display font-bold mb-2 text-stone-900">
              {won ? 'Magnificent!' : 'The Word Was Revealed'}
            </h2>
            <div className="text-sm text-stone-500 mb-6">
              You played SATWordle
            </div>
            
            <div className="text-4xl font-bold tracking-widest text-emerald-600 mb-4 uppercase">
              {targetWord}
            </div>
            
            <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl mb-6 text-sm text-stone-700 leading-relaxed">
              <strong>Definition:</strong> {targetDefinition}
            </div>
            
            <Button onClick={() => startNewGame(maxGuesses)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg h-12 rounded-xl">
              Play Again
            </Button>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-4 text-stone-900">Settings</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2 flex justify-between">
                <span>Number of Guesses:</span>
                <span className="font-bold text-emerald-600">{maxGuesses}</span>
              </label>
              <input 
                type="range" 
                min="1" max="10" 
                value={maxGuesses}
                onChange={(e) => setMaxGuesses(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                localStorage.setItem('maxGuesses', maxGuesses);
                setShowSettingsModal(false);
                startNewGame(maxGuesses);
              }} className="bg-emerald-600 hover:bg-emerald-700">
                Save &amp; Restart
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
