import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Play, 
  Check, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Flame, 
  Info,
  Award,
  HelpCircle
} from 'lucide-react';
import { questions } from './questions';
import { sound } from './utils/audio';
import { Choice, Question, QuizLevel } from './types';

export default function App() {
  // Game states: 'welcome' | 'playing' | 'result'
  const [gameState, setGameState] = useState<'welcome' | 'playing' | 'result'>('welcome');
  
  // Single-page list of answers. Initially all are null
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>(new Array(questions.length).fill(null));
  
  // Active focused index (for keyboard hotkeys and visual highlight)
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  
  // Timer state (1 minute 30 seconds = 90 seconds)
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Interactive detail review on results screeen
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);

  // References to question cards for scrolling
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sound toggle logic
  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    sound.setMuted(newState);
  };

  // Keyboard hotkeys handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar starts the quiz if on the welcome screen
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'welcome') {
          handleStartQuiz();
        }
        return;
      }

      // Hotkeys for answering
      if (gameState === 'playing') {
        const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
        if (e.key in keyMap) {
          e.preventDefault();
          const choiceIdx = keyMap[e.key];
          const question = questions[focusedIdx];
          if (question && question.choices[choiceIdx]) {
            handleSelectOption(focusedIdx, question.choices[choiceIdx].value);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (focusedIdx > 0) {
            const prevIdx = focusedIdx - 1;
            setFocusedIdx(prevIdx);
            questionRefs.current[prevIdx]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (focusedIdx < questions.length - 1) {
            const nextIdx = focusedIdx + 1;
            setFocusedIdx(nextIdx);
            questionRefs.current[nextIdx]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, focusedIdx, selectedAnswers]);

  // Stable countdown timer interval
  useEffect(() => {
    let intervalId: any = null;
    if (gameState === 'playing') {
      intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            sound.playFinish(); 
            handleEndQuiz(); // Submit automatically when time is up
            return 0;
          }
          // Quiet tick sound for steady rhythm, no hectic alarm warning sound
          sound.playTick();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameState]);

  // Ensure volume configuration fits State on mount/change
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  // Start / restart diagnostic flow
  const handleStartQuiz = () => {
    setGameState('playing');
    setSelectedAnswers(new Array(questions.length).fill(null));
    setFocusedIdx(0);
    setTimeLeft(90);
    setReviewIdx(null);
  };

  // Option select handler
  const handleSelectOption = (questionIdx: number, value: string) => {
    const updated = [...selectedAnswers];
    updated[questionIdx] = value;
    setSelectedAnswers(updated);
    
    // Satisfying sound response, same sound regardless of correctness (blind trial)
    sound.playTick();

    // Auto-advance focused question and scroll seamlessly
    if (questionIdx === focusedIdx && focusedIdx < questions.length - 1) {
      const nextIdx = focusedIdx + 1;
      setFocusedIdx(nextIdx);
      setTimeout(() => {
        questionRefs.current[nextIdx]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 80);
    } else {
      setFocusedIdx(questionIdx);
    }
  };

  // Submit test and trigger results screen
  const handleEndQuiz = () => {
    sound.playFinish();
    setGameState('result');
  };

  // Grade calculation and stats summary constructor
  const getStatistics = () => {
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const reviewerAnswers = questions.map((q, idx) => {
      const selected = selectedAnswers[idx];
      const correctChoice = q.choices.find(c => c.correct);
      const isCorrectValue = selected ? q.choices.find(c => c.value === selected)?.correct === true : false;

      if (selected === null) {
        unansweredCount++;
      } else if (isCorrectValue) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        questionTitle: q.title,
        correctAnswer: correctChoice?.value || '',
        selectedAnswer: selected,
        isCorrect: isCorrectValue,
        choices: q.choices
      };
    });

    const total = questions.length;
    const percentage = Math.round((correctCount / total) * 100);

    // Criteria boundaries:
    // < 25% -> Уровень A
    // < 80% -> Уровень B
    // >= 80% -> Уровень C
    let level: QuizLevel = 'A';
    if (percentage >= 80) {
      level = 'C';
    } else if (percentage >= 25) {
      level = 'B';
    } else {
      level = 'A';
    }

    // Sequence streak calculation
    let currentStreak = 0;
    let maxStreak = 0;
    reviewerAnswers.forEach((ans) => {
      if (ans.isCorrect) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    });

    return {
      correctCount,
      incorrectCount,
      unansweredCount,
      percentage,
      level,
      maxStreak,
      reviewerAnswers,
      timeSpentSeconds: 90 - timeLeft
    };
  };

  const stats = getStatistics();

  // Duration parser helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div id="quiz-container" className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
      
      {/* Universal header banner */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white rounded-xl p-2 md:p-2.5 shadow-md flex items-center justify-center font-display font-extrabold text-xl leading-none select-none">
              <span>✖️</span>
            </div>
            <div>
              <h1 className="font-display font-black text-sm md:text-xl text-slate-900 tracking-tight leading-tight">
                Диагностика «Табличное умножение»
              </h1>
              <p className="text-[10px] md:text-xs text-slate-400 font-mono hidden sm:block">
                Диагностика устного счёта • 40 примеров на одной странице
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle Control */}
            <button
              id="sound-toggle-btn"
              onClick={toggleMute}
              className={`p-2 md:p-2.5 rounded-xl transition-all border ${
                isMuted 
                  ? 'border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100' 
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              title={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <span className="text-[10px] text-slate-500 font-mono hidden md:inline bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Клавиши: [1-4] [↑] [↓] [Пробел]
            </span>
          </div>
        </div>
      </header>

      {/* Sticky dashboard bar for Active Playing - ONLY during 'playing' state */}
      {gameState === 'playing' && (
        <div className="sticky top-[64px] z-30 bg-white/95 backdrop-blur-md border-b border-indigo-100 py-3 px-4 shadow-md transition-all">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-800">
            {/* Left information */}
            <div className="flex items-center gap-4 text-xs font-bold font-mono">
              <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100/40">
                <HelpCircle size={14} className="text-indigo-500" />
                <span>Заполнено: {selectedAnswers.filter(a => a !== null).length} из 40</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-xl border border-slate-150">
                <span>Вопрос: #{focusedIdx + 1}</span>
              </div>
            </div>

            {/* Right block countdown and submit */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-900 border border-indigo-100 font-extrabold px-4 py-2 rounded-2xl font-mono text-base shrink-0 select-none">
                <Timer size={18} className="text-indigo-600" />
                <span>⏱️ Осталось: {formatTime(timeLeft)}</span>
              </div>

              <button
                id="header-submit-btn"
                onClick={handleEndQuiz}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-98 text-xs md:text-sm cursor-pointer"
              >
                Отправить ответы
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Arena */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">

        {/* 1. WELCOME/START SCREEN */}
        {gameState === 'welcome' && (
          <div id="screen-welcome" className="bg-white rounded-[40px] shadow-xl p-8 md:p-12 text-center flex flex-col items-center mx-auto transition-all w-full max-w-2xl border border-slate-100 mt-4">
            <div className="text-center flex flex-col items-center mb-8">
              <div className="w-24 h-24 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mb-8 shadow-lg text-5xl select-none animate-pulse-slow">
                <span>✖️</span>
              </div>
              <h2 className="font-display font-black text-3xl md:text-4xl text-slate-900 mb-4 tracking-tight leading-tight">
                Интерактивная диагностика
              </h2>
              <div className="h-1 w-20 bg-indigo-500 mx-auto my-1.5 rounded-full"></div>
              <p className="text-base md:text-lg text-slate-600 mt-4 leading-relaxed max-w-md mx-auto">
                Перед вами быстрая устная диагностика табличного умножения. Все <span className="font-bold text-indigo-600">40 вопросов</span> отображаются на одной странице сверху вниз.
              </p>
              <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                Вы имеете ровно <span className="font-bold text-slate-700">1 минуту и 30 секунд</span> на заполнение и отправку всей формы. Выбирайте ответы внимательно!
              </p>
            </div>

            {/* Instruction Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-left w-full">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 rounded-xl p-2 shrink-0">
                  <Timer size={20} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-800">Таймер счёта</h4>
                  <p className="text-xs text-slate-500">Всего <strong className="text-indigo-600 font-bold">1 мин 30 сек</strong> на прохождение всей страницы.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 text-emerald-600 rounded-xl p-2 shrink-0">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-800">Критерии оценки</h4>
                  <p className="text-xs text-slate-500">
                    Уровень A (&lt;25%), Уровень B (&lt;80%), Уровень C (80% и выше).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 col-span-1 sm:col-span-2 border-t border-slate-200/60 pt-3">
                <div className="bg-amber-100 text-amber-700 rounded-xl p-2 shrink-0">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">Навигация клавишами</h4>
                  <p className="text-xs text-slate-500">
                    Нажимайте <kbd className="font-mono text-[10px] bg-white text-slate-600 px-1 py-0.5 rounded border shadow-2xs">1</kbd>, <kbd className="font-mono text-[10px] bg-white text-slate-600 px-1 py-0.5 rounded border shadow-2xs">2</kbd>, <kbd className="font-mono text-[10px] bg-white text-slate-600 px-1 py-0.5 rounded border shadow-2xs">3</kbd>, <kbd className="font-mono text-[10px] bg-white text-slate-600 px-1 py-0.5 rounded border shadow-2xs">4</kbd> для ответа. Используйте стрелки <kbd className="text-[10px] bg-white text-slate-600 px-1 py-0.5 rounded border shadow-2xs">↑ / ↓</kbd> для выбора активного задания.
                  </p>
                </div>
              </div>
            </div>

            {/* Call to action */}
            <button
              id="start-quiz-btn"
              onClick={handleStartQuiz}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg md:text-xl font-bold py-5 px-12 rounded-2xl shadow-xl hover:shadow-2xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer w-full max-w-md"
            >
              <Play fill="currentColor" size={16} />
              Начать выполнение теста
            </button>
          </div>
        )}

        {/* 2. ACTIVE QUIZ PLAYING SCREEN (Google Form list layout) */}
        {gameState === 'playing' && (
          <div id="screen-playing" className="w-full max-w-2xl mx-auto flex flex-col gap-6">
            
            {/* Helpful description card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col gap-3">
              <h3 className="font-display font-black text-lg text-slate-800">
                Задания устного счёта
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Пожалуйста, выберите по одному правильному варианту для каждого умножения ниже. Ваши ответы сохраняются автоматически. Никакие индикаторы правильности до отправки теста показаны не будут.
              </p>
            </div>

            {/* Vertical list of 40 questions stack */}
            <div className="flex flex-col gap-4">
              {questions.map((question, qIdx) => {
                const selectedValue = selectedAnswers[qIdx];
                const isFocused = focusedIdx === qIdx;

                return (
                  <div
                    key={qIdx}
                    ref={(el) => (questionRefs.current[qIdx] = el)}
                    onClick={() => setFocusedIdx(qIdx)}
                    className={`bg-white rounded-3xl p-6 shadow-xs border transition-all duration-200 cursor-pointer text-left relative ${
                      isFocused 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/15 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Active target handle on left side */}
                    {isFocused && (
                      <div className="absolute left-0 top-6 bottom-6 w-1 bg-indigo-500 rounded-r-lg" />
                    )}

                    {/* Header meta */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className={`text-xs font-mono font-black py-1 px-3 rounded-full ${
                        selectedValue !== null 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        Пример {qIdx + 1} из 40
                      </span>
                      
                      {selectedValue !== null && (
                        <span className="text-xs text-emerald-600 font-bold font-mono flex items-center gap-1.5 bg-emerald-50/50 px-2 py-0.5 rounded-lg border border-emerald-150">
                          <Check size={12} className="stroke-[3]" /> Ответ записан
                        </span>
                      )}
                    </div>

                    {/* Question representation in large italic typography */}
                    <div className="font-display font-black text-4xl text-slate-900 mb-5 select-none font-mono italic">
                      {question.title.trim()}
                    </div>

                    {/* Row layout for option buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      {question.choices.map((choice, cIdx) => {
                        const isChoiceSelected = selectedValue === choice.value;

                        return (
                          <button
                            key={`${qIdx}-${cIdx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectOption(qIdx, choice.value);
                            }}
                            className={`py-3.5 px-4 rounded-xl flex items-center gap-3 font-bold text-lg md:text-xl cursor-pointer transition-all border text-left ${
                              isChoiceSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-[1.01]'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80 hover:border-slate-300'
                            }`}
                          >
                            {/* Visual index badge (matches keyboard key) */}
                            <span className={`w-6 h-6 flex items-center justify-center text-[10px] font-mono font-black rounded ${
                              isChoiceSelected 
                                ? 'bg-indigo-700 text-white border border-indigo-800' 
                                : 'bg-white text-slate-400 border border-slate-200'
                            }`}>
                              {cIdx + 1}
                            </span>
                            
                            <span className="flex-1">{choice.value}</span>

                            {/* Standard Radio inner dot indicator */}
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${
                              isChoiceSelected 
                                ? 'bg-white border-white' 
                                : 'bg-white border-slate-300'
                            }`}>
                              {isChoiceSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Form Action Buttons */}
            <div className="py-10 text-center border-t border-slate-200 flex flex-col items-center gap-4">
              <button
                id="bottom-submit-btn"
                onClick={handleEndQuiz}
                className="w-full max-w-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold py-5 px-10 rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-3 border border-emerald-700"
              >
                <CheckCircle2 size={24} />
                Завершить тест и проверить ответы
              </button>
              <p className="text-slate-400 text-xs">
                Все 40 примеров должны быть заполнены перед отправкой. Проверьте результат выше.
              </p>
            </div>
          </div>
        )}

        {/* 4. COMPREHENSIVE DIAGNOSTIC RESULT SCREEN */}
        {gameState === 'result' && (
          <div id="screen-result" className="flex flex-col gap-6 w-full max-w-4xl mx-auto mt-4">
            
            {/* Top Score Summary Banner Card */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl text-center flex flex-col items-center border border-slate-100">
              
              {/* Giant status Badge */}
              <div id="result-badge" className="text-7xl mb-6 select-none animate-bounce">
                {stats.percentage < 25 ? '💪' : stats.percentage < 80 ? '🌟' : '👑'}
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                Диагностика завершена!
              </h2>
              <p className="text-slate-500 mb-8">Ваш результат прохождения теста:</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-12 mb-10 w-full max-w-lg">
                <div className="text-center bg-slate-50 border border-slate-100 rounded-3xl p-6 flex-1 w-full">
                  <div id="final-score" className="text-6xl font-black text-indigo-600 font-mono">
                    {stats.correctCount}
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Очков (из 40)</div>
                </div>

                <div className="hidden sm:block h-16 w-[2px] bg-slate-200"></div>

                <div className="text-center bg-slate-50 border border-slate-100 rounded-3xl p-6 flex-1 w-full">
                  <div 
                    id="final-level" 
                    className={`text-6xl font-black font-mono ${
                      stats.level === 'C' ? 'text-emerald-500' : stats.level === 'B' ? 'text-amber-500' : 'text-rose-500'
                    }`}
                  >
                    {stats.level}
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Уровень</div>
                </div>
              </div>

              {/* Micro Level Descriptions Accorded to Request */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 text-sm text-indigo-900 max-w-2xl text-left leading-relaxed mb-6">
                <h4 className="font-bold flex items-center gap-2 mb-2 text-indigo-950 font-display text-base">
                  <Info size={18} className="text-indigo-600 text-indigo-500" />
                  Уровень {stats.level === 'C' ? 'C (Высокий)' : stats.level === 'B' ? 'B (Средний)' : 'A (Начальный)'}
                </h4>
                {stats.level === 'C' && (
                  <p>
                    <strong>Уровень C:</strong> Вы прекрасно знаете таблицу умножения и быстро считаете, следующей ступенью для вас может стать внетабличное умножение. Рекомендуем вам записаться на Тренинг устного счета - Уровень С
                  </p>
                )}
                {stats.level === 'B' && (
                  <p>
                    <strong>Уровень B:</strong> Вы уже хорошо ориентируетесь в таблице умножения, но есть примеры, которые вызывают у вас сложности. Рекомендуем вам записаться на Тренинг устного счёта - Уровень В
                  </p>
                )}
                {stats.level === 'A' && (
                  <p>
                    <strong>Уровень A:</strong> На данный момент у вас есть сложности со счетом в пределах таблицы умножения. Вы нуждаетесь в отработке навыков быстрого умножения. Рекомендуем вам записаться на Тренинг устного счета - Уровень А
                  </p>
                )}
              </div>

              <p className="text-slate-400 text-xs font-mono">
                Диагностика заняла {formatTime(stats.timeSpentSeconds)} из 1:30 мин • Максимальная серия верных: {stats.maxStreak} 🔥
              </p>
            </div>

            {/* Visual Grid Assessment of All 40 Answers */}
            <div className="bg-white rounded-[40px] p-6 md:p-10 shadow-xl border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-6">
                <div className="text-left">
                  <h4 className="font-display font-black text-xl text-slate-800">
                    Интерактивная карта ответов
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Кликните на любой пример, чтобы просмотреть варианты решения и ваши ответы
                  </p>
                </div>
                
                {/* Stats indicators legend */}
                <div className="flex items-center gap-3 text-xs font-bold shrink-0">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500 block shrink-0"></span>
                    <span>Верно ({stats.correctCount})</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-3.5 h-3.5 rounded bg-rose-500 block shrink-0"></span>
                    <span>Неверно ({stats.incorrectCount})</span>
                  </span>
                  {stats.unansweredCount > 0 && (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-3.5 h-3.5 rounded bg-slate-300 block shrink-0"></span>
                      <span>Пропущено ({stats.unansweredCount})</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 40 Grid items */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2 mb-6">
                {stats.reviewerAnswers.map((item, idx) => {
                  let badgeBg = "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80";
                  if (item.selectedAnswer === null) {
                    badgeBg = "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200";
                  } else if (!item.isCorrect) {
                    badgeBg = "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80";
                  }

                  const isActive = reviewIdx === idx;

                  return (
                    <button
                      key={idx}
                      onClick={() => setReviewIdx(isActive ? null : idx)}
                      className={`py-3 px-1.5 text-xs md:text-sm font-mono font-black rounded-xl border text-center transition-all cursor-pointer ${badgeBg} ${
                        isActive ? 'ring-4 ring-indigo-500 border-transparent scale-105' : ''
                      }`}
                      title={`Пример ${idx + 1}`}
                    >
                      <div className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">№{idx + 1}</div>
                      <div>{item.questionTitle.split(' ')[0]} {item.questionTitle.split(' ')[1]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Detail Review of Selected Question */}
              {reviewIdx !== null && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 transition-all text-left">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-mono text-indigo-600 font-bold uppercase tracking-widest">
                      ПОДРОБНЫЙ РАЗБОР ПРИМЕРА №{reviewIdx + 1}
                    </span>
                    <button
                      onClick={() => setReviewIdx(null)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl bg-white shadow-3xs border border-slate-200 transition-all cursor-pointer animate-fade-in"
                    >
                      Снять выбор
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-5 text-center md:text-left">
                      <div className="font-display font-black text-4xl text-slate-900 tracking-tight italic">
                        {stats.reviewerAnswers[reviewIdx].questionTitle}
                        <span className="text-indigo-600 ml-2">
                          {stats.reviewerAnswers[reviewIdx].correctAnswer}
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-7">
                      <div className="grid grid-cols-2 gap-2">
                        {stats.reviewerAnswers[reviewIdx].choices.map((choice, cIdx) => {
                          const isCorrectChoice = choice.correct;
                          const isUserSelected = stats.reviewerAnswers[reviewIdx!].selectedAnswer === choice.value;

                          let choiceStyle = "bg-white border-slate-200 text-slate-600";
                          if (isCorrectChoice) {
                            choiceStyle = "bg-emerald-500 border-emerald-650 text-white font-bold shadow-md";
                          } else if (isUserSelected) {
                            choiceStyle = "bg-rose-500 border-rose-650 text-white font-bold shadow-md";
                          }

                          return (
                            <div key={cIdx} className={`p-3 rounded-xl border text-center transition-all ${choiceStyle}`}>
                              <span className={`block font-mono text-[9px] uppercase tracking-wider ${isCorrectChoice || isUserSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                {isCorrectChoice ? 'Верно ✅' : isUserSelected ? 'Ваш выбор ❌' : 'Вариант'}
                              </span>
                              <span className="text-base font-bold font-display">{choice.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick action controls */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 mb-10">
              <button
                id="retry-btn"
                onClick={handleStartQuiz}
                className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 font-extrabold py-4.5 px-6 rounded-2xl transition-all shadow-xl hover:shadow-2xl active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer text-base md:text-lg border border-indigo-700"
              >
                <RotateCcw size={18} />
                Пройти диагностику заново
              </button>
              
              <button
                id="reset-to-welcome-btn"
                onClick={() => setGameState('welcome')}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-4.5 px-8 rounded-2xl transition-all active:scale-98 cursor-pointer text-sm flex items-center justify-center border border-slate-200 shadow-xs"
              >
                Вернуться на главную
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer Banner */}
      <footer className="py-6 px-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} Диагностика «Табличное умножение». Разработано для автоматического анализа устного счёта.
          </span>
          <div className="flex gap-4">
            <span>Всего заданий: 40</span>
            <span>Таймер: 1:30 мин</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
