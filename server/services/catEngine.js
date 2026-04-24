// server/services/catEngine.js

/**
 * ══════════════════════════════════════════════════════════════════
 *  NCLEX-Style Computer Adaptive Testing (CAT) Engine
 * ══════════════════════════════════════════════════════════════════
 *
 *  Core Principles:
 *  - Adapts question difficulty based on candidate performance
 *  - Estimates candidate ability (theta) in real time
 *  - Determines PASS or FAIL using 95% confidence relative to
 *    a passing standard — NOT percentage scoring
 *  - Implements borderline candidate detection for realistic
 *    test lengths (85–150 questions)
 *
 *  Decision is based on CONFIDENCE IN ABILITY, NOT number of
 *  questions or percentage of correct answers.
 *
 *  Stopping behaviour:
 *  - A student can PASS at 85, 100, 120, or 150
 *  - A student can FAIL at 85, 100, 120, or 150
 *
 *  Difficulty Scale:
 *  -3 = very easy … 0 = medium (passing level) … +3 = very hard
 * ══════════════════════════════════════════════════════════════════
 */

class CATEngine {
  constructor(options = {}) {
    // ── Core parameters ──
    this.passingStandard = options.passingStandard || 0.0;     // θ_cut
    this.minItems = options.minItems || 85;
    this.maxItems = options.maxItems || 150;
    this.confidenceThreshold = options.confidenceThreshold || 0.95;

    // ── Theta adjustment (starts large, shrinks over time) ──
    this.initialAdjustment = options.initialAdjustment || 0.3;
    this.minAdjustment = options.minAdjustment || 0.05;

    // ── Standard-error decay ──
    this.seDecay = options.seDecay || 0.95;
    this.borderlineSeDecay = options.borderlineSeDecay || 0.975;

    // ── Borderline candidate detection ──
    this.borderlineThreshold = options.borderlineThreshold || 0.2;

    // ── Scoring settings (configurable via super-admin) ──
    this.partialScoring = options.partialScoring !== false;         // default true
    this.negativeScoring = options.negativeScoring !== false;       // default true
    this.negativePenalty = options.negativePenalty || 0.15;         // extra theta penalty for wrong
    this.partialThreshold = options.partialThreshold || 0.6;        // min proportion for positive shift
  }

  /* ────────────────────────────────────────────────────────────
   *  BORDERLINE CANDIDATE DETECTION
   *  When theta hovers within ±0.2 of the passing standard,
   *  the engine slows adjustment AND SE reduction, pushing
   *  the test toward 130–150 questions — real NCLEX behaviour.
   * ──────────────────────────────────────────────────────────── */

  isBorderline(theta) {
    return Math.abs(theta - this.passingStandard) < this.borderlineThreshold;
  }

  /* ────────────────────────────────────────────────────────────
   *  ADJUSTMENT FACTOR
   *  Linear decay from 0.3 → 0.05 over the test.
   *  Halved for borderline candidates.
   * ──────────────────────────────────────────────────────────── */

  getAdjustmentFactor(questionCount, isBorderline = false) {
    const progress = Math.min(questionCount / this.maxItems, 1);
    let adjustment =
      this.initialAdjustment -
      (this.initialAdjustment - this.minAdjustment) * progress;

    if (isBorderline) {
      adjustment *= 0.5;          // slow theta movement
    }

    return Math.max(adjustment, this.minAdjustment * 0.25);
  }

  /* ────────────────────────────────────────────────────────────
   *  CONFIDENCE
   *  confidence = 1 − SE  (per spec)
   * ──────────────────────────────────────────────────────────── */

  getConfidence(se) {
    return Math.max(0, Math.min(1, 1 - se));
  }

  /* ────────────────────────────────────────────────────────────
   *  QUESTION SELECTION
   *  Picks the question whose difficulty ≈ theta, with noise
   *  for borderline candidates and content-balancing penalties.
   * ──────────────────────────────────────────────────────────── */

  selectNextItem(theta, availableItems, administeredItems) {
    const administeredSet = new Set(
      (Array.isArray(administeredItems) ? administeredItems : []).map(id =>
        String(id)
      )
    );
    const candidates = availableItems.filter(item =>
      !administeredSet.has(String(item._id))
    );
    if (candidates.length === 0) return null;

    const borderline = this.isBorderline(theta);

    // Track recent question types for content balancing
    const administeredTypes = (Array.isArray(administeredItems)
      ? administeredItems
      : []
    )
      .map(id => {
        const item = availableItems.find(a => String(a._id) === String(id));
        return item ? item.type : null;
      })
      .filter(Boolean);
    const recentTypes = administeredTypes.slice(-5);

    // Score each candidate by proximity to theta
    const scored = candidates.map(item => {
      const difficulty = item.irtDifficulty || item.difficulty_level || 0;
      let distance = Math.abs(difficulty - theta);

      // Borderline: inject noise to mix harder + easier items
      if (borderline) {
        distance += (Math.random() - 0.5) * 0.6;
      }

      // Content-balancing penalty to prevent question-type streaks
      let penalty = 0;
      const sameCount = recentTypes.filter(t => t === item.type).length;
      if (sameCount >= 3) penalty = 0.3;
      else if (sameCount >= 2) penalty = 0.15;

      return { item, score: distance + penalty };
    });

    scored.sort((a, b) => a.score - b.score);

    // Pick from top-N for variety
    const topN = Math.min(borderline ? 5 : 3, scored.length);
    const pick = scored[Math.floor(Math.random() * topN)];

    return pick?.item || null;
  }

  /* ────────────────────────────────────────────────────────────
   *  RESPONSE PROCESSING  (core of the adaptive loop)
   *
   *  1. Determine if the response is correct (binary or NGN partial)
   *  2. Update theta  += adjustment  (or −= for wrong)
   *  3. Decay SE       *= 0.95  (or 0.975 for borderline)
   *  4. Return new theta, SE, confidence, and metadata
   * ──────────────────────────────────────────────────────────── */

  processResponse(theta, se, isCorrect, questionCount, questionType, earnedMarks, totalMarks) {
    const borderline = this.isBorderline(theta);
    let adjustment = this.getAdjustmentFactor(questionCount, borderline);

    // ── NGN partial scoring ──
    let effectiveCorrect = isCorrect;
    const ngnTypes = [
      'case-study',
      'drag-and-drop',
      'hotspot',
      'bowtie',
      'matrix',
      'cloze-dropdown',
      'highlight',
    ];
    // SATA also supports partial scoring via earnedMarks/totalMarks
    const partialTypes = this.partialScoring ? [...ngnTypes, 'sata'] : [];

    if (
      partialTypes.includes(questionType) &&
      totalMarks > 0 &&
      earnedMarks >= 0
    ) {
      const proportion = earnedMarks / totalMarks;
      if (proportion >= this.partialThreshold) {
        // Majority correct → partial positive theta adjustment (scaled by proportion)
        adjustment *= proportion;
        effectiveCorrect = true;
      } else if (proportion > 0) {
        // Some correct but below threshold → small positive shift OR negative
        if (this.negativeScoring) {
          // Wrong answers outweigh correct: negative theta shift with penalty
          adjustment += this.negativePenalty;
          effectiveCorrect = false;
        } else {
          // No negative: just count as wrong with normal adjustment
          effectiveCorrect = false;
        }
      } else {
        // Fully wrong
        effectiveCorrect = false;
      }
    }

    // ── Update theta ──
    let newTheta = effectiveCorrect ? theta + adjustment : theta - adjustment;

    // ── Extra negative penalty for fully wrong answers (all question types) ──
    if (!effectiveCorrect && this.negativeScoring && !partialTypes.includes(questionType)) {
      newTheta -= this.negativePenalty * 0.5; // half penalty for MCQ/fill-blank wrong
    }

    newTheta = Math.max(-3, Math.min(3, newTheta));   // clamp to scale

    // ── Update SE (slower decay for borderline → more questions) ──
    const decay = borderline ? this.borderlineSeDecay : this.seDecay;
    const newSe = se * decay;

    return {
      theta: newTheta,
      se: newSe,
      confidence: this.getConfidence(newSe),
      isBorderline: borderline,
      adjustment,
      effectiveCorrect,
    };
  }

  /* ────────────────────────────────────────────────────────────
   *  STOPPING RULES  (the decision engine)
   *
   *  1. Cannot stop before minItems (85 for CAT, 50 for assessment)
   *  2. At 95 % confidence:
   *       CI entirely ABOVE  passing standard → PASS
   *       CI entirely BELOW  passing standard → FAIL
   *  3. At maxItems (150):
   *       theta > passing standard → PASS, else FAIL
   * ──────────────────────────────────────────────────────────── */

  shouldStop(theta, se, questionCount) {
    // Rule 1 — minimum not reached
    if (questionCount < this.minItems) {
      return { shouldStop: false, reason: 'min_not_reached' };
    }

    // Rule 2 — maximum reached
    if (questionCount >= this.maxItems) {
      return {
        shouldStop: true,
        passed: theta > this.passingStandard,
        reason: 'max_reached',
      };
    }

    // Calculate 95 % confidence interval
    const confidence = this.getConfidence(se);

    // Rules 3–4 — confidence threshold met
    if (confidence >= this.confidenceThreshold) {
      const lowerBound = theta - 1.96 * se;
      const upperBound = theta + 1.96 * se;

      if (lowerBound > this.passingStandard) {
        return { shouldStop: true, passed: true, reason: 'ci_above_passing' };
      }
      if (upperBound < this.passingStandard) {
        return { shouldStop: true, passed: false, reason: 'ci_below_passing' };
      }
    }

    // Not enough confidence yet — continue testing
    return { shouldStop: false, reason: 'insufficient_confidence' };
  }

  /* ────────────────────────────────────────────────────────────
   *  TIME-OUT RULE
   *  If time expires, evaluate the last 60 theta values.
   *  Average theta above passing standard → PASS, else FAIL.
   * ──────────────────────────────────────────────────────────── */

  evaluateTimeout(theta, recentThetas) {
    if (!recentThetas || recentThetas.length === 0) {
      return theta > this.passingStandard;
    }
    const recent = recentThetas.slice(-60);
    const avg = recent.reduce((sum, t) => sum + t, 0) / recent.length;
    return avg > this.passingStandard;
  }

  /* ────────────────────────────────────────────────────────────
   *  FINAL RESULT (for analytics / admin display)
   * ──────────────────────────────────────────────────────────── */

  getFinalResult(theta, se, questionCount) {
    const confidence = this.getConfidence(se);
    const lowerBound = theta - 1.96 * se;
    const upperBound = theta + 1.96 * se;
    const passed = theta > this.passingStandard;

    return {
      passed,
      theta,
      se,
      confidence,
      lowerBound,
      upperBound,
      questionCount,
      decisionBasis:
        confidence >= this.confidenceThreshold
          ? 'confidence_interval'
          : 'max_items_reached',
    };
  }

  /* ────────────────────────────────────────────────────────────
   *  RUN TEST  (simulation mode — for testing / calibration)
   * ──────────────────────────────────────────────────────────── */

  async runTest(studentId, itemPool, options = {}) {
    const administered = [];
    const responses = [];
    const items = [...itemPool];
    let theta = 0;
    let se = 1.0;

    for (let i = 0; i < this.maxItems; i++) {
      const nextItem = this.selectNextItem(theta, items, administered);
      if (!nextItem) break;

      let response;
      if (options.simulate && options.trueTheta) {
        const difficulty = nextItem.irtDifficulty || nextItem.difficulty_level || 0;
        const gap = options.trueTheta - difficulty;
        const prob = 1 / (1 + Math.exp(-gap));
        response = Math.random() < prob ? 1 : 0;
      } else {
        return {
          nextItem,
          theta,
          se,
          administered,
          responses,
          status: 'awaiting_response',
        };
      }

      administered.push(nextItem._id);
      responses.push(response);

      const result = this.processResponse(theta, se, response === 1, administered.length, nextItem.type, 0, 0);
      theta = result.theta;
      se = result.se;

      const stopResult = this.shouldStop(theta, se, administered.length);
      if (stopResult.shouldStop) {
        return {
          theta,
          se,
          administered,
          responses,
          itemCount: administered.length,
          passed: stopResult.passed,
          stopReason: stopResult.reason,
          status: 'completed',
        };
      }
    }

    return {
      theta,
      se,
      administered,
      responses,
      itemCount: administered.length,
      passed: theta > this.passingStandard,
      stopReason: 'max_reached',
      status: 'completed_max',
    };
  }
}

module.exports = CATEngine;
