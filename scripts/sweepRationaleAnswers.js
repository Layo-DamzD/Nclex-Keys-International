/**
 * CAREFUL SWEEP v3 — Only finds REAL conflicts
 * 
 * For each question:
 * 1. Find "Option X is correct" in the explanation body (MUST be in the "Correct option" section)
 * 2. Find "Correct answer: X" declaration (if exists)
 * 3. For MC: only accept single-letter answers
 * 4. For SATA: accept multi-letter answers
 * 5. Compare with saved correctAnswer
 * 6. Only report if there's a CLEAR conflict
 */
const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'server', '.env') });
const Question = require(path.join(__dirname, '..', 'server', 'models', 'Question'));

const MONGO_URI = process.env.MONGO_URI;

function normalizeAnswer(correctAnswer, type) {
  if (!correctAnswer && correctAnswer !== 0) return '';
  if (type === 'sata') {
    let letters = [];
    if (Array.isArray(correctAnswer)) {
      letters = correctAnswer.map(a => String(a).trim().toUpperCase()).filter(l => /^[A-Z]$/.test(l));
    } else {
      const s = String(correctAnswer).trim().toUpperCase();
      if (s.includes(',')) letters = s.split(/[\s,]+/).filter(l => /^[A-Z]$/.test(l));
      else if (/^[A-Z]+$/.test(s)) letters = s.split('');
    }
    return [...new Set(letters)].sort().join(', ');
  }
  return String(correctAnswer).trim().toUpperCase();
}

/**
 * Extract the correct answer from rationale — STRICT mode.
 * Only looks in the "Correct option" / "Correct Options" section,
 * or at the explicit "Correct answer: X" declaration.
 * For MC questions, only returns single-letter answers.
 */
function extractCorrectStrict(rationale, type) {
  if (!rationale) return null;

  // Method 1: Look for "Correct option" section with "Option X is correct"
  // This is the body explanation that tells you which option is right
  const correctSectionMatch = rationale.match(
    /(?:Correct\s+Option[s]?|Option)\s*[:\.\n]*\s*\n*\s*Option\s+([A-Z])\s+is\s+correct/i
  );
  if (correctSectionMatch) {
    const letter = correctSectionMatch[1].toUpperCase();
    if (type === 'multiple-choice') return letter; // Single letter for MC
    
    // For SATA, look for more "Option X is correct" in the correct section
    // But ONLY before we hit "Incorrect option" or "Option X is incorrect"
    let letters = [letter];
    
    // Find all "Option X is correct" that come before the first "Incorrect"
    const sectionStart = rationale.indexOf(correctSectionMatch[0]);
    const afterCorrect = rationale.substring(sectionStart);
    const incorrectIdx = afterCorrect.search(/Incorrect\s+option/i);
    const sectionText = incorrectIdx > 0 ? afterCorrect.substring(0, incorrectIdx) : afterCorrect.substring(0, 2000);
    
    const allCorrectOpts = [...sectionText.matchAll(/Option\s+([A-Z])\s+is\s+correct/gi)];
    letters = [...new Set(allCorrectOpts.map(m => m[1].toUpperCase()))].sort();
    
    return letters.join(', ');
  }

  // Method 2: Look for explicit "Correct answer: X" at the start
  const correctAnsMatch = rationale.match(
    /^[\s]*Correct\s+answer\s*:\s*([A-Z])(?:\s*[,.\n]|$)/im
  );
  if (correctAnsMatch) {
    return correctAnsMatch[1].toUpperCase();
  }

  // Method 3: "Correct answer is X"
  const correctIsMatch = rationale.match(
    /correct\s+answer\s+is\s+([A-Z])(?:\s*[,.\n]|$)/im
  );
  if (correctIsMatch) {
    return correctIsMatch[1].toUpperCase();
  }

  return null;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  // Fix known conflict first
  console.log('=== Fixing known conflict ===');
  const kq = await Question.findById('69f213cc751623217324827c');
  if (kq) {
    console.log('  Before:', JSON.stringify(kq.correctAnswer), '→ After: "C"');
    kq.correctAnswer = 'C';
    await kq.save({ validateBeforeSave: false });
  }
  console.log('');

  const skipTypes = ['matrix', 'hotspot', 'cloze-dropdown', 'drag-drop', 'highlight', 'fill-blank'];
  const questions = await Question.find({ type: { $nin: skipTypes }, isDraft: { $ne: true } });
  console.log('Scanning ' + questions.length + ' questions (strict mode)...\n');

  let scanned = 0, noMatch = 0, matched = 0, conflicts = 0, fixed = 0;
  const conflictList = [];

  for (const q of questions) {
    scanned++;
    if (!q.rationale) { noMatch++; continue; }

    const saved = normalizeAnswer(q.correctAnswer, q.type);
    if (!saved) { noMatch++; continue; }

    const rationalAns = extractCorrectStrict(q.rationale, q.type);
    if (!rationalAns) { noMatch++; continue; }

    // For MC, skip if extraction returned multi-letter (likely false positive)
    if (q.type === 'multiple-choice' && rationalAns.length > 1) {
      noMatch++;
      continue;
    }

    if (saved === rationalAns) {
      matched++;
    } else {
      conflicts++;
      conflictList.push({
        _id: q._id, type: q.type,
        saved, rationalAns,
        snippet: q.rationale.substring(0, 400),
      });
    }
  }

  // Case studies
  const caseStudies = await Question.find({ type: 'case-study', isDraft: { $ne: true } });
  let csConflicts = 0, csFixed = 0;
  for (const cs of caseStudies) {
    if (!Array.isArray(cs.questions)) continue;
    for (let qi = 0; qi < cs.questions.length; qi++) {
      const sub = cs.questions[qi];
      if (sub.type === 'fill-blank' || sub.type === 'matrix') continue;
      if (!sub.rationale) continue;
      const saved = normalizeAnswer(sub.correctAnswer, sub.type);
      if (!saved) continue;
      const rationalAns = extractCorrectStrict(sub.rationale, sub.type);
      if (!rationalAns) continue;
      if (sub.type === 'multiple-choice' && rationalAns.length > 1) continue;
      if (saved === rationalAns) continue;
      
      csConflicts++;
      conflictList.push({
        _id: cs._id, subIndex: qi, type: 'case-study/' + sub.type,
        saved, rationalAns,
        snippet: sub.rationale.substring(0, 400),
      });
    }
  }

  // Report
  console.log('=================================================');
  console.log('  Questions scanned:   ' + scanned);
  console.log('  No clear answer:     ' + noMatch);
  console.log('  MATCHED:            ' + matched);
  console.log('  CONFLICTS FOUND:    ' + conflicts + ' (+' + csConflicts + ' case-study)');
  console.log('=================================================');

  if (conflictList.length > 0) {
    console.log('\n--- CONFLICTS ---');
    for (const c of conflictList) {
      const label = c.subIndex !== undefined ? c._id + ' [sub-' + c.subIndex + ']' : c._id;
      console.log('\n  [' + label + '] ' + c.type);
      console.log('  Saved:     "' + c.saved + '"');
      console.log('  Rationale: "' + c.rationalAns + '"');
      console.log('  Text: "' + c.snippet.substring(0, 200) + '..."');
    }

    // Ask before fixing — for now just report
    console.log('\n\n=== FIXING CONFLICTS ===\n');
    for (const c of conflictList) {
      try {
        if (c.subIndex === undefined) {
          const q = await Question.findById(c._id);
          if (!q) continue;
          q.correctAnswer = c.type === 'sata' ? c.rationalAns.split(', ') : c.rationalAns;
          await q.save({ validateBeforeSave: false });
          fixed++;
          console.log('  FIXED: ' + c._id + ' (' + c.type + '): ' + c.saved + ' → ' + c.rationalAns);
        } else {
          const cs = await Question.findById(c._id);
          if (!cs || !cs.questions[c.subIndex]) continue;
          const sub = cs.questions[c.subIndex];
          cs.questions[c.subIndex].correctAnswer = sub.type === 'sata' ? c.rationalAns.split(', ') : c.rationalAns;
          await cs.save({ validateBeforeSave: false });
          csFixed++;
          console.log('  FIXED CS: ' + c._id + ' [sub-' + c.subIndex + ']: ' + c.saved + ' → ' + c.rationalAns);
        }
      } catch (err) {
        console.error('  ERROR: ' + c._id + ': ' + err.message);
      }
    }
    console.log('\n  Fixed: ' + (fixed + csFixed));
  } else {
    console.log('\n  No conflicts found! All questions are consistent.');
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
