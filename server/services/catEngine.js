// server/services/catEngine.js

/**
 * CAT Engine implementing full IRT-based adaptive testing
 * Based on research from Bock & Gibbons (2021) and Linacre (2006) [citation:3][citation:6]
 */
class CATEngine {
  constructor(options = {}) {
    this.passingStandard = options.passingStandard || 0.0; // θ_cut
    this.confidenceLevel = options.confidenceLevel || 0.95; // 95% CI
    this.minItems = options.minItems || 85;
    this.maxItems = options.maxItems || 150;
    this.targetSE = options.targetSE || 0.08; // Tighter SE for more accurate pass/fail
    this.initialTheta = options.initialTheta || 0.0;
    this.estimationMethod = options.estimationMethod || 'EAP'; // MLE, EAP, or hybrid [citation:9]
  }

  /**
   * Calculate probability of correct response using 3PL/2PL model [citation:4][citation:10]
   */
  calculateProbability(theta, item) {
    const { irtDiscrimination: a, irtDifficulty: b, irtGuessing: c, irtModel } = item;
    
    if (irtModel === '1PL' || irtModel === 'Rasch') {
      // 1PL/Rasch model: a=1, c=0 [citation:8]
      return 1 / (1 + Math.exp(-(theta - b)));
    } else if (irtModel === '2PL') {
      // 2PL model: no guessing [citation:4]
      return 1 / (1 + Math.exp(-a * (theta - b)));
    } else {
      // 3PL model: with guessing parameter [citation:10]
      return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
    }
  }

  /**
   * Calculate Fisher Information for an item [citation:1]
   * I(θ) = a² * (P(θ) - c)² * (1 - P(θ)) / (P(θ) * (1 - c)²)
   */
  calculateFisherInformation(theta, item) {
    const { irtDiscrimination: a, irtGuessing: c, irtModel } = item;
    const P = this.calculateProbability(theta, item);
    
    if (irtModel === '1PL' || irtModel === '2PL') {
      // Simplified for 1PL/2PL: I(θ) = a² * P(θ) * (1 - P(θ))
      return a * a * P * (1 - P);
    } else {
      // 3PL formula [citation:1]
      const Q = 1 - P;
      const numerator = a * a * (P - c) * (P - c) * Q;
      const denominator = P * (1 - c) * (1 - c);
      return numerator / denominator;
    }
  }

  /**
   * Select next item using Maximum Fisher Information (MFI) [citation:9]
   */
  selectNextItem(theta, availableItems, administeredItems) {
    // Use Set for O(1) administered lookup instead of Array.includes O(n)
    const administeredSet = new Set(
      (Array.isArray(administeredItems) ? administeredItems : []).map(id => String(id))
    );
    const candidateItems = availableItems.filter(item => 
      !administeredSet.has(String(item._id))
    );
    
    let bestItem = null;
    let maxInfo = -1;
    
    for (const item of candidateItems) {
      const info = this.calculateFisherInformation(theta, item);
      if (info > maxInfo) {
        maxInfo = info;
        bestItem = item;
      }
    }
    
    return bestItem;
  }

  /**
   * Estimate ability using Maximum Likelihood Estimation (MLE) [citation:9]
   */
  estimateAbilityMLE(responses, items, initialTheta = 0) {
    let theta = initialTheta;
    const maxIter = 100;
    const tol = 0.001;
    
    for (let iter = 0; iter < maxIter; iter++) {
      let firstDerivative = 0;  // Score function S(θ) [citation:1]
      let secondDerivative = 0; // Negative of Fisher information
      
      for (let i = 0; i < responses.length; i++) {
        const item = items[i];
        const response = responses[i];
        const P = this.calculateProbability(theta, item);
        const a = item.irtDiscrimination;
        
        // Score function contribution [citation:1]
        if (item.irtModel === '3PL') {
          const c = item.irtGuessing;
          const term = (response - P) / (P * (1 - P)) * a * (P - c) / (1 - c);
          firstDerivative += term;
        } else {
          // Simpler for 1PL/2PL
          firstDerivative += a * (response - P);
        }
        
        // Information contribution
        secondDerivative -= this.calculateFisherInformation(theta, item);
      }
      
      // Newton-Raphson update
      const delta = firstDerivative / secondDerivative;
      theta = theta - delta;
      
      if (Math.abs(delta) < tol) break;
    }
    
    return theta;
  }

  /**
   * Estimate ability using Expected A Posteriori (EAP) [citation:9]
   * More stable for early responses or extreme patterns
   */
  estimateAbilityEAP(responses, items, priorMean = 0, priorSD = 1) {
    // Use Gauss-Hermite quadrature for numerical integration
    const quadraturePoints = 20;
    const nodes = this.getGaussHermiteNodes(quadraturePoints);
    
    let numerator = 0;
    let denominator = 0;
    
    for (const node of nodes) {
      const theta = node.point;
      const prior = this.normalPDF(theta, priorMean, priorSD);
      
      // Likelihood
      let likelihood = 1;
      for (let i = 0; i < responses.length; i++) {
        const P = this.calculateProbability(theta, items[i]);
        likelihood *= Math.pow(P, responses[i]) * Math.pow(1 - P, 1 - responses[i]);
      }
      
      const posterior = likelihood * prior;
      numerator += theta * posterior * node.weight;
      denominator += posterior * node.weight;
    }
    
    return numerator / denominator;
  }

  /**
   * Check stopping rules [citation:3][citation:7]
   */
  shouldStop(theta, se, administeredCount, responses, items) {
    // Minimum items not reached
    if (administeredCount < this.minItems) return false;
    
    // Maximum items reached
    if (administeredCount >= this.maxItems) return true;
    
    // Confidence interval around passing standard — primary stopping rule
    // This is the real NCLEX rule: stop when 95% CI doesn't cross the passing standard
    const z = 1.96; // 95% confidence
    const ciLow = theta - z * se;
    const ciHigh = theta + z * se;
    
    // If entire CI is above passing standard = PASS
    if (ciLow > this.passingStandard) return true;
    
    // If entire CI is below passing standard = FAIL
    if (ciHigh < this.passingStandard) return true;
    
    return false;
  }

  /**
   * Calculate standard error of measurement [citation:3]
   * SE = 1 / sqrt(total information)
   */
  calculateStandardError(theta, administeredItems) {
    let totalInfo = 0;
    for (const item of administeredItems) {
      totalInfo += this.calculateFisherInformation(theta, item);
    }
    return 1 / Math.sqrt(totalInfo);
  }

  /**
   * Main test simulation function [citation:9]
   */
  async runTest(studentId, itemPool, options = {}) {
    const administered = [];
    const responses = [];
    const items = [...itemPool];
    
    let theta = this.initialTheta;
    let se = Infinity;
    
    for (let i = 0; i < this.maxItems; i++) {
      // Select next item
      const nextItem = this.selectNextItem(theta, items, administered);
      if (!nextItem) break;
      
      // In real app, you'd present this item to student
      // For now, simulate response based on true theta if available
      let response;
      if (options.simulate && options.trueTheta) {
        const P = this.calculateProbability(options.trueTheta, nextItem);
        response = Math.random() < P ? 1 : 0;
      } else {
        // Wait for actual student response
        return { 
          nextItem, 
          theta, 
          se,
          administered,
          responses,
          status: 'awaiting_response'
        };
      }
      
      // Record response
      administered.push(nextItem._id);
      responses.push(response);
      
      // Re-estimate ability
      if (this.estimationMethod === 'MLE') {
        theta = this.estimateAbilityMLE(responses, administered);
      } else {
        theta = this.estimateAbilityEAP(responses, administered);
      }
      
      // Calculate standard error
      se = this.calculateStandardError(theta, administered);
      
      // Check stopping rules
      if (this.shouldStop(theta, se, administered.length, responses, administered)) {
        const passed = (theta - 1.96 * se) > this.passingStandard;
        
        return {
          theta,
          se,
          administered,
          responses,
          itemCount: administered.length,
          passed,
          confidence: passed ? (theta - 1.96 * se) : (theta + 1.96 * se),
          status: 'completed'
        };
      }
    }
    
    // Max items reached
    const passed = (theta - 1.96 * se) > this.passingStandard;
    return {
      theta,
      se,
      administered,
      responses,
      itemCount: administered.length,
      passed,
      status: 'completed_max'
    };
  }

  // Helper: Gauss-Hermite quadrature nodes and weights
  getGaussHermiteNodes(n) {
    // Simplified implementation - in production, use a library
    const nodes = [];
    for (let i = 0; i < n; i++) {
      const point = (i - (n-1)/2) * 0.5;
      const weight = Math.exp(-point*point) * 0.2;
      nodes.push({ point, weight });
    }
    return nodes;
  }

  // Helper: Normal PDF
  normalPDF(x, mean, sd) {
    return Math.exp(-0.5 * Math.pow((x - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
  }
}

module.exports = CATEngine;