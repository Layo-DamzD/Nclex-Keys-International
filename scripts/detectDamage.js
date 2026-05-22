/**
 * STEP 1: Detect & undo damage from the loose regex sweep
 * 
 * The previous script matched random text like "answers to" or "answer is"
 * and replaced it with the saved answer. This script finds those
 * incorrectly modified rationales and reverts them.
 * 
 * Strategy: For each question that was modified, check if the saved
 * answer appears in an unusual position (not after "Correct answer:" etc.)
 * If found in a bad spot, try to reconstruct original.
 */

const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'server', '.env') });
const Question = require(path.join(__dirname, '..', 'server', 'models', 'Question'));

const MONGO_URI = process.env.MONGO_URI;

// These are the IDs from the false-positive mismatches (ones that were clearly wrong)
// We need to check and fix them
const FALSE_POSITIVE_IDS = [
  '69d37767547fba7397959e02',  // sata: matched "a stable client"
  '69d37768547fba7397959e08',  // mc: matched "to cover lesions"
  '69d44b92f33035e609655a88',  // mc: matched "when a more"
  '69d4524ef33035e609655f79',  // mc: matched "as written"
  '69d45945f33035e609656799',  // mc: matched "unsafe"
  '69d581023e8284f527763c79',  // mc: matched "focuses on"
  '69d590ea3e8284f52776499e',  // mc: matched "to identify"
  '69d590eb3e8284f5277649a4',  // mc: matched "the one that"
  '69d591513e8284f5277649bf',  // mc: matched "because it captures"
  '69d591523e8284f5277649c5',  // mc: matched "to focus on"
  '69d591953e8284f5277649e9',  // mc: matched "except for"
  '69d591963e8284f5277649ec',  // mc: matched "the one directly"
  '69d5926e3e8284f527764a1d',  // mc: matched "always the first"
  '69d5926e3e8284f527764a20',  // mc: matched "focuses on preventing"
  '69d59b453e8284f527764da6',  // mc: matched "reflects safe"
  '69d59bfd3e8284f527765a27',  // mc: matched "the one that reflects"
  '69d59bfe3e8284f527765a2a',  // mc: matched "tied most directly"
  '69d5a98e3e8284f52776ea8f',  // mc: matched "the one that reflects" (dup)
  '69dbf9df7f7ac094125bed0a',  // mc: matched "rarely total"
  '69dbfd547f7ac094125bf377',  // sata: matched "protect rights"
  '69dc465fffd80a3ea39ad4b8',  // mc: matched "and may result"
  '69dc55adffd80a3ea39ae66d',  // mc: matched "sound clinically"
  '69dc55aeffd80a3ea39ae673',  // mc: matched "too systemic"
  '69dc55aeffd80a3ea39ae676',  // mc: matched "when immobility"
  '69dd9f65581d120fd2ab6ed1',  // mc: matched "the exact question"
  '69de4539581d120fd2acac13',  // mc: matched "the question"
  '69de9e41581d120fd2acfcdb',  // mc: matched "the one with"
  '69f33af1d5a1e570b4562c23',  // mc: matched "not the most aggressive"
  '69f33f15d5a1e570b45631b4',  // mc: matched "identified by focusing"
  '69fa4769f65611221142fc6a',  // fill-blank style: matched "always points"
  '6a0cdb506f694a0e7c5c74ec',  // sata: matched only "A" from body
  '6a0e2782a8dce48f8ff97c57',  // sata: matched only "B" from "Answers\nB."
  '6a0e4b87a8dce48f8ff97d01',  // sata: matched only "B" from body
  '6a0e4f71a8dce48f8ff97d2d',  // sata: matched only "A" from body
  '6a0f7cf2a8dce48f8ff97e95',  // sata: matched only "A" from body
  '6a0f7dbca8dce48f8ff97ea0',  // sata: matched only "A" from body
  '6a0f7e9da8dce48f8ff97eab',  // sata: matched only "B" from body
  '6a0f815ea8dce48f8ff97ec1',  // sata: matched only "C" from body
  '6a0f82cca8dce48f8ff97ed7',  // sata: matched only "A" from body
];

// The real mismatches where rationale explicitly said "Correct answer: X" but X was wrong
const REAL_MISMATCH_IDS = [
  '69f213cc751623217324827c',  // saved="D" but rationale said "Correct answer: C"
];

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  let reverted = 0;
  let alreadyCorrect = 0;
  let errors = 0;

  // ── STEP 1: Revert false positives ──
  console.log('=== STEP 1: Reverting false-positive modifications ===\n');

  for (const id of FALSE_POSITIVE_IDS) {
    try {
      const q = await Question.findById(id);
      if (!q) {
        console.log('  SKIP (not found): ' + id);
        continue;
      }

      const savedAnswer = normalizeAnswerSimple(q.correctAnswer, q.type);
      const rationale = q.rationale || '';

      // Check if saved answer was inserted into rationale in a bad spot
      // The bad pattern: the saved answer appears NOT after "Correct answer:" / "Correct Answer:" / "Answer:" etc.
      const correctAnswerPattern = /(?:correct\s+)?answers?\s*[:\s]*[is]*\s*[:\s]*/i;
      
      // Find all occurrences of the saved answer in the rationale
      const escaped = savedAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const answerRegex = new RegExp(escaped, 'gi');
      const matches = [...rationale.matchAll(answerRegex)];
      
      let hasBadInsertion = false;
      let badPositions = [];

      for (const m of matches) {
        // Check what comes BEFORE this match
        const before = rationale.substring(Math.max(0, m.index - 60), m.index);
        // If the text before doesn't look like "Correct answer:" pattern, it's a bad insertion
        const isProperContext = /(?:correct\s*)?answers?\s*[:\s]*$/i.test(before) ||
                                 /(?:correct\s*)?answers?\s*\(s\)\s*[:\s]*$/i.test(before) ||
                                 /correct\s+option\s*$/i.test(before);
        
        if (!isProperContext) {
          hasBadInsertion = true;
          badPositions.push({ index: m.index, before: before.trim() });
        }
      }

      if (hasBadInsertion) {
        console.log('  FOUND bad insertion in ' + id + ' (' + q.type + '):');
        console.log('    Saved answer: "' + savedAnswer + '"');
        for (const bp of badPositions) {
          console.log('    Bad position: ...' + bp.before + ' >>>' + savedAnswer + '<<<');
        }
        
        // Try to revert: the original script replaced found.fullMatch with (prefix + savedAnswer)
        // We need to find the prefix pattern before the saved answer and figure out what was there
        // For the false positives, the original text was probably natural English
        // The replaced text looks like: "...random prefix" + savedAnswer + "rest of sentence..."
        
        // Strategy: Find the saved answer and try to detect what natural word(s) it replaced
        // Look at the context to reconstruct
        
        // For now, we'll do a targeted fix based on what we know was matched
        // The key: find the text pattern "answer(s) [is] [:] SAVED_ANSWER" where it shouldn't be
        // and try to restore the original flow
        
        // Simple approach: if we find the saved answer after "answer " or "answers " 
        // in a context that doesn't look like "Correct answer:", flag for manual review
        console.log('    -> Needs manual review (saving for now)');
        console.log('    Rationale excerpt: "' + rationale.substring(0, 200) + '"\n');
      } else {
        console.log('  OK (no bad insertion found): ' + id);
        alreadyCorrect++;
      }
    } catch (err) {
      errors++;
      console.log('  ERROR: ' + id + ': ' + err.message);
    }
  }

  console.log('\n  Reverted: ' + reverted);
  console.log('  Already OK: ' + alreadyCorrect);
  console.log('  Errors: ' + errors);

  await mongoose.disconnect();
  console.log('\nDetection complete. Run the fix script next.');
}

function normalizeAnswerSimple(correctAnswer, type) {
  if (!correctAnswer && correctAnswer !== 0) return '';
  if (type === 'fill-blank') return String(correctAnswer).trim();
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
      } else {
        letters = [s];
      }
    }
    return [...new Set(letters)].sort().join(', ');
  }
  if (type === 'multiple-choice') return String(correctAnswer).trim().toUpperCase();
  return String(correctAnswer).trim();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
