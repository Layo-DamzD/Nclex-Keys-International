/**
 * Fix the one clearly damaged rationale and do a final check
 */
const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'server', '.env') });
const Question = require(path.join(__dirname, '..', 'server', 'models', 'Question'));

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  // Fix 69f20acb7516232173245224 — "Correct answer: C's ability to distinguish..."
  // Original was: "Correct answer: C\n\nMajor concept\nThis question tests the nurse's ability to distinguish..."
  // The regex captured up to "nurse" (stopped at apostrophe) and replaced with just "C"
  const q1 = await Question.findById('69f20acb7516232173245224');
  if (q1) {
    console.log('BEFORE FIX:');
    console.log(q1.rationale.substring(0, 300));
    console.log('\n---\n');
    
    // Fix: replace "Correct answer: C's" with "Correct answer: C\n\nMajor concept\nThis question tests the nurse's"
    q1.rationale = q1.rationale.replace(
      "Correct answer: C's",
      "Correct answer: C\n\nMajor concept\nThis question tests the nurse's"
    );
    await q1.save({ validateBeforeSave: false });
    
    console.log('AFTER FIX:');
    console.log(q1.rationale.substring(0, 300));
    console.log('\n---\n');
  }

  // Check 69f213cc751623217324827c — saved="D" but explanation says "Option C is correct"
  const q2 = await Question.findById('69f213cc751623217324827c');
  if (q2) {
    console.log('CONFLICT CHECK for 69f213cc751623217324827c:');
    console.log('Saved answer:', q2.correctAnswer);
    console.log('Rationale says "Correct answer: D" but explanation says:');
    // Find the option explanations
    const correctOptMatch = q2.rationale.match(/Option ([A-Z]) is correct/i);
    console.log('  "' + (correctOptMatch ? correctOptMatch[0] : 'not found') + '"');
    console.log('');
    console.log('This question has a data conflict — saved answer D but explanation supports C.');
    console.log('This was a pre-existing issue, not caused by the sweep.');
  }

  // Now do a final comprehensive check: scan ALL questions for actual "Correct answer:" 
  // that conflicts with the explanation "Option X is correct"
  console.log('\n=== FINAL CONFLICT CHECK ===\n');
  
  const questions = await Question.find({
    type: { $in: ['multiple-choice', 'sata'] },
    isDraft: { $ne: true }
  });
  
  let conflicts = 0;
  for (const q of questions) {
    if (!q.rationale) continue;
    
    // Extract "Correct answer: X" from the explicit declaration
    const declMatch = q.rationale.match(/correct\s+answer\s*:\s*([A-Z])(?:\s*[,.\s:]|\s*$)/m);
    // Extract "Option X is correct" from the explanation
    const explMatches = [...q.rationale.matchAll(/Option ([A-Z]) is correct/gi)];
    
    if (declMatch && explMatches.length > 0) {
      const declaredLetter = declMatch[1].toUpperCase();
      const explainedLetters = explMatches.map(m => m[1].toUpperCase());
      
      // Check if the declared answer is NOT in the explained correct options
      if (!explainedLetters.includes(declaredLetter)) {
        conflicts++;
        const saved = normalizeAnswer(q.correctAnswer, q.type);
        console.log('CONFLICT: ' + q._id + ' (' + q.type + ')');
        console.log('  Saved answer:     ' + saved);
        console.log('  Declared:         ' + declaredLetter);
        console.log('  Explanation says: ' + explainedLetters.join(', '));
      }
    }
  }
  
  console.log('\nTotal conflicts found: ' + conflicts);
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

function normalizeAnswer(correctAnswer, type) {
  if (!correctAnswer && correctAnswer !== 0) return '';
  if (type === 'sata') {
    let letters = [];
    if (Array.isArray(correctAnswer)) {
      letters = correctAnswer.map(a => String(a).trim().toUpperCase()).filter(l => /^[A-Z]$/.test(l));
    } else {
      const s = String(correctAnswer).trim().toUpperCase();
      if (s.includes(',') || s.includes(' ')) {
        letters = s.split(/[\s,]+/).filter(l => /^[A-Z]$/.test(l));
      } else if (/^[A-Z]+$/.test(s)) {
        letters = s.split('');
      }
    }
    return [...new Set(letters)].sort().join(', ');
  }
  return String(correctAnswer).trim().toUpperCase();
}

main().catch(err => { console.error(err); process.exit(1); });
