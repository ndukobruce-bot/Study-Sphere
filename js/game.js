/* ============================================
   GAME PAGE
============================================ */
.game-page {
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-stats {
  display: flex;
  gap: 1rem;
  width: 100%;
  margin-bottom: 1.5rem;
  justify-content: space-around;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.game-stat {
  text-align: center;
}

.game-stat-val {
  font-family: var(--font-head);
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--accent);
}

.game-stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.game-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 2.5rem 2rem;
  width: 100%;
  text-align: center;
  margin-bottom: 1rem;
  min-height: 350px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.game-card h2 {
  font-family: var(--font-head);
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 0.8rem;
}

.game-card p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
}

.game-emoji {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.difficulty-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.8rem;
  border-radius: 999px;
  margin-bottom: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.difficulty-badge.easy   { background: #22c55e20; color: var(--success); border: 1px solid #22c55e40; }
.difficulty-badge.medium { background: #f59e0b20; color: var(--warning); border: 1px solid #f59e0b40; }
.difficulty-badge.hard   { background: #ef444420; color: var(--danger);  border: 1px solid #ef444440; }

.question-text {
  font-family: var(--font-head);
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 2rem;
  letter-spacing: -1px;
}

.answer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.answer-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-head);
  font-size: 1.4rem;
  font-weight: 700;
  padding: 1rem;
  cursor: pointer;
  transition: var(--transition);
}

.answer-btn:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
  transform: translateY(-2px);
}

.answer-btn.correct {
  background: #22c55e20;
  border-color: var(--success);
  color: var(--success);
}

.answer-btn.wrong {
  background: #ef444420;
  border-color: var(--danger);
  color: var(--danger);
}

.answer-btn:disabled {
  cursor: not-allowed;
}

.feedback-msg {
  font-size: 0.95rem;
  font-weight: 600;
  min-height: 24px;
  margin-top: 0.5rem;
}

.final-score-card {
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin: 1.5rem 0;
}

.final-score-val {
  font-family: var(--font-head);
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--accent);
  line-height: 1;
}

.final-score-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.3rem;
}

.final-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.final-stat {
  text-align: center;
}

.final-stat span {
  font-family: var(--font-head);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
}

.final-stat small {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.gameover-btns {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.highscore-bar {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.7rem 1.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  width: 100%;
  text-align: center;
}

.highscore-bar span {
  color: var(--warning);
  font-weight: 700;
  font-family: var(--font-head);
}