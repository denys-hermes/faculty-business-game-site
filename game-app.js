// Main React app for Game

const { useState, useEffect, useRef, useMemo } = React;

const TEAM_COLORS = [
  '#E8612E', '#1B2A5B', '#2A8A5F', '#C8A24A',
  '#7B3F8C', '#3E7BB6', '#C2453A', '#2C3E73',
  '#B07A4F', '#5A6B8C'
];
const MIN_TEAMS = 5;
const MAX_TEAMS = 35;

// === MAIN APP ===
function App() {
  const [stage, setStage] = useState('welcome'); // welcome | setup | round-intro | question | reveal | round-end | winner
  const [config, setConfig] = useState(null);
  const [teams, setTeams] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);

  const reset = () => {
    setStage('welcome');
    setConfig(null);
    setTeams([]);
    setCurrentRound(0);
    setCurrentQ(0);
  };

  return (
    <div className="app">
      <header className="game-header">
        <div className="brand">
          <div className="mark">Б</div>
          <div className="brand-text">
            Бізнес-перегони
            <small>Є питання · ЛНУ ім. Івана Франка</small>
          </div>
        </div>
        <div className="header-right">
          {stage !== 'welcome' && (
            <button className="exit-btn" onClick={() => {
              if (confirm('Завершити гру і повернутись на головний екран?')) reset();
            }}>← Завершити</button>
          )}
          <a href="index.html" className="exit-btn" style={{textDecoration:'none'}}>На лендінг</a>
        </div>
      </header>

      {stage === 'welcome' && <Welcome onStart={() => setStage('setup')} />}
      {stage === 'setup' && (
        <Setup
          onBack={() => setStage('welcome')}
          onStart={(cfg) => {
            setConfig(cfg);
            const t = cfg.teamNames.map((name, i) => ({
              id: i, name: name || `Команда ${i+1}`,
              color: TEAM_COLORS[i % TEAM_COLORS.length],
              score: 0,
              roundScores: {}
            }));
            setTeams(t);
            setCurrentRound(0);
            setCurrentQ(0);
            setStage('round-intro');
          }}
        />
      )}
      {stage === 'round-intro' && (
        <RoundIntro
          round={GAME_DATA.rounds[currentRound]}
          totalRounds={GAME_DATA.rounds.length}
          roundIndex={currentRound}
          onStart={() => setStage('question')}
        />
      )}
      {stage === 'question' && (
        <QuestionScreen
          round={GAME_DATA.rounds[currentRound]}
          qIndex={currentQ}
          teams={teams}
          config={config}
          onScore={(scoreMap) => {
            const newTeams = teams.map(t => {
              const gain = scoreMap[t.id] || 0;
              return {
                ...t,
                score: t.score + gain,
                roundScores: { ...t.roundScores, [currentRound]: (t.roundScores[currentRound] || 0) + gain }
              };
            });
            setTeams(newTeams);
            // advance
            const r = GAME_DATA.rounds[currentRound];
            if (currentQ + 1 < r.questions.length) {
              setCurrentQ(currentQ + 1);
            } else if (currentRound + 1 < GAME_DATA.rounds.length) {
              setStage('round-end');
            } else {
              setStage('winner');
            }
          }}
        />
      )}
      {stage === 'round-end' && (
        <RoundEnd
          round={GAME_DATA.rounds[currentRound]}
          teams={teams}
          onNext={() => {
            setCurrentRound(currentRound + 1);
            setCurrentQ(0);
            setStage('round-intro');
          }}
        />
      )}
      {stage === 'winner' && <Winner teams={teams} onReset={reset} />}
    </div>
  );
}

// === WELCOME ===
function Welcome({ onStart }) {
  return (
    <div className="screen welcome">
      <div className="welcome-shape-1"></div>
      <div className="welcome-shape-2"></div>
      <div className="welcome-content fade-in">
        <div>
          <div className="eyebrow">Інтелектуально-розважальна гра</div>
          <h1>
            Бізнес-перегони
            <span className="accent">є питання?</span>
          </h1>
          <p className="welcome-lead">
            Гра базується на опитуванні 109 студентів та викладачів. Ваше завдання — не просто знати правильну відповідь, а вгадати, що думає більшість.
          </p>
          <button className="btn btn-primary btn-large" onClick={onStart}>
            Розпочати гру
            <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
        <div className="rules-card">
          <h3>Правила гри</h3>
          <ul className="rules-list">
            <li><span className="num">01</span><span><strong>Ведучий</strong> зачитує питання</span></li>
            <li><span className="num">02</span><span>Команди мають <strong>30 секунд</strong> на обговорення</span></li>
            <li><span className="num">03</span><span>Команда записує <strong>одну відповідь</strong></span></li>
            <li><span className="num">04</span><span>Ведучий <strong>відкриває правильні</strong> варіанти</span></li>
            <li><span className="num">05</span><span>Команди, що вгадали, <strong>отримують бали</strong></span></li>
            <li><span className="num">06</span><span>Перемагає команда з <strong>найбільшою сумою</strong></span></li>
          </ul>
          <div className="rounds-preview">
            <div className="round-pill"><span className="n">1</span>Знай свого</div>
            <div className="round-pill"><span className="n">2</span>Цифри</div>
            <div className="round-pill"><span className="n">3</span>Фінал</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// === SETUP ===
function Setup({ onBack, onStart }) {
  const [teamCount, setTeamCount] = useState(MIN_TEAMS);
  const [teamNames, setTeamNames] = useState(Array.from({length: MAX_TEAMS}, () => ''));
  const [timePerQ, setTimePerQ] = useState(30);
  const [autoNext, setAutoNext] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const updateName = (i, v) => {
    const next = [...teamNames]; next[i] = v; setTeamNames(next);
  };

  const start = () => {
    const names = teamNames.slice(0, teamCount);
    onStart({ teamNames: names, timePerQ, autoNext, soundOn });
  };

  return (
    <div className="screen setup fade-in">
      <div className="screen-inner">
        <div className="eyebrow">Налаштування гри</div>
        <h2>Команди та таймер</h2>
        <p className="setup-lead">Сформуйте команди, оберіть час на обговорення — і вперед, до перших питань.</p>

        <div className="setup-grid">
          <div>
            <div className="setup-card">
              <h3>Кількість команд</h3>
              <p className="hint">Починаємо з 5 команд; за потреби додайте до 35.</p>
              <div className="team-count-control">
                <button className="count-btn" disabled={teamCount<=MIN_TEAMS} onClick={()=>setTeamCount(teamCount-1)}>−</button>
                <div className="count-display">{teamCount}<small>команд</small></div>
                <button className="count-btn" disabled={teamCount>=MAX_TEAMS} onClick={()=>setTeamCount(teamCount+1)}>+</button>
              </div>
            </div>

            <div className="setup-card" style={{marginTop:16}}>
              <h3>Час на обговорення</h3>
              <p className="hint">Скільки секунд команди мають на обмірковування.</p>
              <div className="timer-options">
                {[15, 30, 45, 60].map(s => (
                  <button key={s}
                    className={`timer-option ${timePerQ===s?'active':''}`}
                    onClick={()=>setTimePerQ(s)}>
                    {s}<small>сек</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="setup-card" style={{marginTop:16}}>
              <div className="toggle-row">
                <div className="label">Звук таймера
                  <small>Сигнал коли час закінчується</small>
                </div>
                <div className={`toggle ${soundOn?'on':''}`} onClick={()=>setSoundOn(!soundOn)}></div>
              </div>
              <div className="toggle-row">
                <div className="label">Автоматичний показ відповіді
                  <small>Відкривати відповідь одразу як вийде час</small>
                </div>
                <div className={`toggle ${autoNext?'on':''}`} onClick={()=>setAutoNext(!autoNext)}></div>
              </div>
            </div>
          </div>

          <div className="setup-card">
            <h3>Назви команд</h3>
            <p className="hint">Залиште порожнім — заповнимо за замовчуванням («Команда 1», «Команда 2» і т.д.)</p>
            <div className="team-list">
              {Array.from({length: teamCount}).map((_, i) => (
                <div className="team-row" key={i}>
                  <div className="team-color-dot" style={{background: TEAM_COLORS[i % TEAM_COLORS.length]}}>
                    {i+1}
                  </div>
                  <input
                    className="team-name-input"
                    placeholder={`Команда ${i+1}`}
                    value={teamNames[i]}
                    onChange={(e)=>updateName(i, e.target.value)}
                    maxLength={28}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="setup-actions">
          <button className="btn btn-ghost" onClick={onBack}>← Назад</button>
          <button className="btn btn-primary" onClick={start}>
            Розпочати гру
            <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// === ROUND INTRO ===
function RoundIntro({ round, roundIndex, totalRounds, onStart }) {
  return (
    <div className="round-intro fade-in">
      <div className="round-intro-content">
        <div className="round-num">
          {round.isFinal ? '★ ФІНАЛЬНИЙ РАУНД' : `РАУНД ${round.id} / ${totalRounds}`}
        </div>
        <h1>{round.title.replace(/^Раунд \d+ — /, '').replace(/^Фінальний раунд — /, '')}</h1>
        <p className="sub">{round.subtitle}</p>
        <div className="rule-box">
          <div className="label">Правила раунду</div>
          <p>{round.rule}</p>
        </div>
        <button className="btn btn-primary btn-large" onClick={onStart}>
          {roundIndex === 0 ? 'Перше питання' : 'Розпочати раунд'}
          <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// === QUESTION SCREEN (with countdown + reveal + scoring) ===
function QuestionScreen({ round, qIndex, teams, config, onScore }) {
  const question = round.questions[qIndex];
  const [phase, setPhase] = useState('countdown'); // countdown | reveal
  const [timeLeft, setTimeLeft] = useState(config.timePerQ);
  const [running, setRunning] = useState(true);
  const [revealedRanks, setRevealedRanks] = useState(0); // for round 1
  const [scoreMap, setScoreMap] = useState({}); // teamId -> points to add
  const [pickedAnswerByTeam, setPickedAnswerByTeam] = useState({}); // for round 1: teamId -> rank

  // reset when question changes
  useEffect(() => {
    setPhase('countdown');
    setTimeLeft(config.timePerQ);
    setRunning(true);
    setRevealedRanks(0);
    setScoreMap({});
    setPickedAnswerByTeam({});
  }, [qIndex, round.id]);

  // timer
  useEffect(() => {
    if (phase !== 'countdown' || !running) return;
    if (timeLeft <= 0) {
      // play beep
      if (config.soundOn) playBeep();
      if (config.autoNext) {
        setPhase('reveal');
      } else {
        setRunning(false);
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, running]);

  // reveal animation for round 1
  useEffect(() => {
    if (phase !== 'reveal' || round.id !== 1) return;
    const max = question.answers.length;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setRevealedRanks(i);
      if (i >= max) clearInterval(id);
    }, 350);
    return () => clearInterval(id);
  }, [phase, qIndex, round.id]);

  const totalQ = round.questions.length;
  const pct = Math.max(0, timeLeft / config.timePerQ);
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - pct);
  const timerClass = timeLeft <= 5 ? 'danger' : timeLeft <= 10 ? 'warn' : '';

  const toggleScore = (teamId, points) => {
    setScoreMap(m => {
      const next = { ...m };
      if (next[teamId]) delete next[teamId];
      else next[teamId] = points;
      return next;
    });
  };

  // Round 1 specific: pick which top-N answer a team got
  const pickAnswerForTeam = (teamId, ans) => {
    setPickedAnswerByTeam(p => {
      const next = { ...p };
      if (next[teamId] === ans.rank) {
        delete next[teamId];
      } else {
        next[teamId] = ans.rank;
      }
      return next;
    });
    setScoreMap(m => {
      const next = { ...m };
      const existing = pickedAnswerByTeam[teamId];
      if (existing === ans.rank) delete next[teamId];
      else next[teamId] = ans.count;
      return next;
    });
  };

  const handleNext = () => {
    onScore(scoreMap);
  };

  const totalAwarded = Object.values(scoreMap).reduce((a,b)=>a+b, 0);

  return (
    <div className="screen question-screen fade-in">
      <div className="screen-inner">
        <div className="question-bar">
          <div className="qb-left">
            <span className="qb-round-tag">{round.isFinal ? '★ ФІНАЛ' : `РАУНД ${round.id}`}</span>
            <span className="qb-progress">Питання <strong>{qIndex+1}</strong> / {totalQ}</span>
          </div>
          {phase === 'countdown' && (
            <button className="qb-skip" onClick={() => { setPhase('reveal'); setRunning(false); }}>
              Пропустити таймер →
            </button>
          )}
        </div>

        <div className="q-card">
          <div className="q-num">Питання № {qIndex+1}</div>
          <h2>{question.q}</h2>
          {round.id === 1 && <p className="q-rule">Вгадайте найпопулярнішу відповідь зі 109 опитаних</p>}
          {round.id === 2 && <p className="q-rule">Числова відповідь у відсотках, ±10% від правильного — 5 балів</p>}
          {(round.id === 3 || round.id === 4 || round.isFinal) && <p className="q-rule">Чітка правильна відповідь — 5 балів</p>}
        </div>

        {phase === 'countdown' && (
          <>
            <div className="timer-row">
              <div className={`timer-circle ${timerClass}`}>
                <svg viewBox="0 0 160 160">
                  <circle className="track" cx="80" cy="80" r={radius}/>
                  <circle className="progress" cx="80" cy="80" r={radius}
                    strokeDasharray={circ}
                    strokeDashoffset={dashOffset}/>
                </svg>
                <div className="timer-num">
                  {timeLeft}
                  <small>секунд</small>
                </div>
              </div>
            </div>

            <div className="timer-controls">
              {running ? (
                <button className="timer-ctrl-btn" onClick={()=>setRunning(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                  Пауза
                </button>
              ) : (
                <button className="timer-ctrl-btn primary" onClick={()=>{
                  if (timeLeft <= 0) setTimeLeft(config.timePerQ);
                  setRunning(true);
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
                  {timeLeft <= 0 ? 'Перезапустити' : 'Продовжити'}
                </button>
              )}
              <button className="timer-ctrl-btn" onClick={()=>setTimeLeft(config.timePerQ)}>↻ Скинути</button>
              <button className="timer-ctrl-btn primary" onClick={()=>{ setPhase('reveal'); setRunning(false); }}>
                Показати відповіді →
              </button>
            </div>
          </>
        )}

        {phase === 'reveal' && (
          <RevealAndScore
            round={round}
            question={question}
            teams={teams}
            scoreMap={scoreMap}
            pickedAnswerByTeam={pickedAnswerByTeam}
            revealedRanks={revealedRanks}
            onTogglePoints={toggleScore}
            onPickAnswer={pickAnswerForTeam}
            totalAwarded={totalAwarded}
            onNext={handleNext}
            isLast={qIndex+1 >= totalQ}
          />
        )}
      </div>
    </div>
  );
}

// === REVEAL + SCORE ===
function RevealAndScore({ round, question, teams, scoreMap, pickedAnswerByTeam, revealedRanks, onTogglePoints, onPickAnswer, totalAwarded, onNext, isLast }) {
  const [activeAnswer, setActiveAnswer] = useState(null); // for round 1 picker

  return (
    <div>
      <div className="reveal-section">
        {round.id === 1 ? (
          <div className="answers-card">
            <h3>Топ-{question.answers.length} відповідей з опитування</h3>
            <ul className="answer-list">
              {question.answers.map((a, i) => (
                <li key={a.rank}
                  className={`answer-row ${i < revealedRanks ? 'shown':''} ${a.rank===1?'top1':''}`}>
                  <span className="answer-rank">№{a.rank}</span>
                  <span className="answer-text">{a.text}</span>
                  <span className="answer-stat">
                    {a.count} ос.
                    <span className="pts">+{a.count} б.</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="correct-answer-card">
            <div className="label">Правильна відповідь</div>
            <div className="answer-big">{question.answer}</div>
            {question.note && <p className="note">{question.note}</p>}
          </div>
        )}

        <div className="scoring-card">
          <h3>Хто вгадав?</h3>
          <p className="hint">
            {round.id === 1
              ? 'Оберіть варіант — потім клацніть команди, які його назвали.'
              : `Клацніть команди, які дали правильну відповідь (+${round.pointsPerCorrect} б.).`}
          </p>

          {round.id === 1 && (
            <div className="picker-grid">
              {question.answers.map(a => (
                <button key={a.rank}
                  className={`picker-btn ${activeAnswer===a.rank?'active':''}`}
                  onClick={() => setActiveAnswer(activeAnswer===a.rank ? null : a.rank)}>
                  <span className="rank">№{a.rank}</span>
                  <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{a.text}</span>
                  <span className="pts">+{a.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="team-buttons">
            {teams.map(t => {
              const scored = scoreMap[t.id] !== undefined;
              const points = round.id === 1
                ? (activeAnswer ? question.answers.find(a=>a.rank===activeAnswer).count : 0)
                : round.pointsPerCorrect;

              return (
                <button key={t.id}
                  className={`team-btn ${scored?'scored':''}`}
                  style={scored?{background: t.color, borderColor: t.color}:{}}
                  onClick={() => {
                    if (round.id === 1 && !activeAnswer && !scored) {
                      alert('Спочатку оберіть варіант відповіді вище.');
                      return;
                    }
                    onTogglePoints(t.id, points);
                  }}>
                  <span className="name">{t.name}</span>
                  <span className="score">{t.score} б. {scored && `(+${scoreMap[t.id]})`}</span>
                  {scored && <span className="gain" style={{background:'rgba(255,255,255,0.25)'}}>+{scoreMap[t.id]}</span>}
                </button>
              );
            })}
          </div>

          <button className="next-q-btn" onClick={onNext}>
            {isLast ? 'Завершити раунд' : 'Наступне питання'} (нараховано: {totalAwarded} б.)
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>

      <Leaderboard teams={teams} scoreMap={scoreMap} compact />
    </div>
  );
}

// === LEADERBOARD ===
function Leaderboard({ teams, scoreMap = {}, compact }) {
  const sorted = useMemo(() => {
    return [...teams]
      .map(t => ({ ...t, projected: t.score + (scoreMap[t.id] || 0) }))
      .sort((a,b) => b.projected - a.projected);
  }, [teams, scoreMap]);

  return (
    <div className="leaderboard-mid">
      <h4>Поточний рейтинг</h4>
      {sorted.map((t, i) => (
        <div key={t.id} className={`lb-row ${i===0?'first':''}`}>
          <span className="pos">{i+1}</span>
          <span className="team">
            <span className="dot" style={{background: t.color}}></span>
            {t.name}
          </span>
          <span className="pts">{t.projected}</span>
        </div>
      ))}
    </div>
  );
}

// === ROUND END ===
function RoundEnd({ round, teams, onNext }) {
  const sorted = [...teams].sort((a,b)=> b.score - a.score);
  return (
    <div className="screen fade-in">
      <div className="screen-inner">
        <div className="eyebrow">Підсумок раунду {round.id}</div>
        <h2 style={{fontSize:'clamp(36px,4vw,52px)', margin:'12px 0 20px'}}>{round.title}</h2>
        <p style={{color:'var(--ink-2)', fontSize:17, marginBottom:32, maxWidth:600}}>
          Раунд завершено. Ось як виглядає рейтинг команд перед наступним блоком питань.
        </p>

        <div style={{background:'white', border:'1px solid var(--line)', borderRadius:12, padding:32}}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{
              display:'grid', gridTemplateColumns:'40px 1fr auto auto', gap:16,
              alignItems:'center', padding:'18px 0',
              borderTop: i>0?'1px solid var(--line)':'none'
            }}>
              <span style={{
                fontFamily:'Unbounded, serif', fontWeight:700, fontSize:18,
                color: i===0?'var(--orange)':'var(--ink-2)'
              }}>{i+1}</span>
              <span style={{display:'flex', alignItems:'center', gap:12}}>
                <span style={{width:14, height:14, background:t.color, borderRadius:3}}></span>
                <span style={{fontFamily:'Unbounded, serif', fontWeight:600, color:'var(--navy)', fontSize:15}}>{t.name}</span>
              </span>
              <span style={{fontSize:13, color:'var(--ink-2)'}}>
                +{t.roundScores[round.id-1] || 0} цей раунд
              </span>
              <span style={{fontFamily:'Unbounded, serif', fontWeight:700, fontSize:22, color: i===0?'var(--orange)':'var(--navy)'}}>
                {t.score}
              </span>
            </div>
          ))}
        </div>

        <div style={{display:'flex', justifyContent:'flex-end', marginTop:32}}>
          <button className="btn btn-primary btn-large" onClick={onNext}>
            До наступного раунду
            <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// === WINNER ===
function Winner({ teams, onReset }) {
  const sorted = [...teams].sort((a,b)=> b.score - a.score);
  const [first, second, third, ...rest] = sorted;

  useEffect(() => {
    fireConfetti();
  }, []);

  return (
    <div className="winner-screen fade-in">
      <div className="winner-content">
        <div className="trophy">🏆</div>
        <div className="label">Переможець гри</div>
        <h1>{first?.name || '—'}</h1>
        <p className="subtitle">{first?.score || 0} балів · «Бізнес-перегони: Є питання»</p>

        <div className="podium">
          <div className="podium-step second">
            <div className="place">2 МІСЦЕ</div>
            <div className="name">{second?.name || '—'}</div>
            <div className="pts">{second?.score || 0}</div>
          </div>
          <div className="podium-step first">
            <div className="place">★ 1 МІСЦЕ</div>
            <div className="name">{first?.name || '—'}</div>
            <div className="pts">{first?.score || 0}</div>
          </div>
          <div className="podium-step third">
            <div className="place">3 МІСЦЕ</div>
            <div className="name">{third?.name || '—'}</div>
            <div className="pts">{third?.score || 0}</div>
          </div>
        </div>

        {rest.length > 0 && (
          <div className="full-results">
            <h4>Повний рейтинг</h4>
            {sorted.map((t, i) => (
              <div className="fr-row" key={t.id}>
                <span className="pos">{i+1}</span>
                <span className="name">{t.name}</span>
                <span className="pts">{t.score}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{
          background:'rgba(232, 97, 46, 0.12)',
          border:'1px solid rgba(232, 97, 46, 0.3)',
          padding:'20px 24px', borderRadius:8,
          marginBottom:32, textAlign:'center'
        }}>
          <p style={{color:'var(--orange-soft)', fontSize:16, fontWeight:600, marginBottom:6, fontFamily:'Unbounded, serif'}}>
            🎁 Запрошуємо переможців на сцену
          </p>
          <p style={{color:'rgba(255,255,255,0.7)', fontSize:14}}>
            Команда «{first?.name}» — отримуйте призи за перемогу!
          </p>
        </div>

        <div className="winner-actions">
          <button className="btn btn-ghost" style={{borderColor:'rgba(255,255,255,0.4)', color:'white'}} onClick={onReset}>
            ↻ Нова гра
          </button>
          <a href="index.html" className="btn btn-primary" style={{textDecoration:'none'}}>
            На головну
          </a>
        </div>
      </div>
    </div>
  );
}

// === HELPERS ===
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch(e) {}
}

function fireConfetti() {
  const colors = ['#E8612E', '#1B2A5B', '#C8A24A', '#2A8A5F', '#F2A06A', '#FAF7F2'];
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  document.body.appendChild(wrap);
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random()*colors.length)];
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.transform = `rotate(${Math.random()*360}deg)`;
    if (Math.random() > 0.5) piece.style.borderRadius = '50%';
    wrap.appendChild(piece);
  }
  setTimeout(() => wrap.remove(), 5000);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
