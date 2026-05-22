/**
 * EMERGENCY REVERT: Undo all bad fixes where MC questions got multi-letter answers
 * Also fix SATA questions that were reduced when they shouldn't be
 */
const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'server', '.env') });
const Question = require(path.join(__dirname, '..', 'server', 'models', 'Question'));

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  // The IDs and their ORIGINAL correctAnswer values that were wrongly changed
  // Multiple-choice questions that got multi-letter answers (BROKEN)
  const MC_REVERTS = {
    '6a0ccc576f694a0e7c5c628d': 'B',
    '6a0ccdc76f694a0e7c5c6310': 'C',
    '6a0cd0516f694a0e7c5c667f': 'C',
    '6a0cd6346f694a0e7c5c6e0d': 'D',
    '6a0cd8036f694a0e7c5c70de': 'D',
    '6a0cd9036f694a0e7c5c725e': 'C',
    '6a0cd9f26f694a0e7c5c7331': 'A',
    '6a0cde4d6f694a0e7c5c771a': 'D',
    '6a0cdf356f694a0e7c5c789a': 'D',
    '6a0ce02a6f694a0e7c5c796d': 'C',
    '6a0ce20b6f694a0e7c5c7c66': 'A',
    '6a0ce3276f694a0e7c5c7d89': 'D',
    '6a0ce4696f694a0e7c5c7f70': 'C',
    '6a0ce7e16f694a0e7c5c80e9': 'D',
    '6a0ce9516f694a0e7c5c8123': 'D',
    '6a0ceac26f694a0e7c5c812e': 'B',
    '6a0dcc726f694a0e7c5e21b4': 'B',
    '6a0dd0e56f694a0e7c5e25bc': 'B',
    '6a0dd2576f694a0e7c5e26b7': 'B',
    '6a0dd3cd6f694a0e7c5e2910': 'B',
    '6a0dd52b6f694a0e7c5e2a0b': 'C',
    '6a0dd7ee6f694a0e7c5e2bf6': 'C',
    '6a0dd8d5a8dce48f8ff97258': 'C',
    '6a0dd9b8a8dce48f8ff9730d': 'C',
    '6a0ddc84a8dce48f8ff97505': 'A',
    '6a0ddf16a8dce48f8ff976ae': 'A',
    '6a0de01ba8dce48f8ff97781': 'C',
    '6a0e261ea8dce48f8ff97c4c': 'B',
    '6a0e29a5a8dce48f8ff97c62': 'C',
    '6a0e2b38a8dce48f8ff97c6d': 'C',
    '6a0e2c71a8dce48f8ff97c78': 'B',
    '6a0e2f90a8dce48f8ff97c83': 'B',
    '6a0e30cca8dce48f8ff97c8e': 'B',
    '6a0e426da8dce48f8ff97cbf': 'A',
    '6a0e4820a8dce48f8ff97ce0': 'D',
    '6a0e4960a8dce48f8ff97ceb': 'B',
    '6a0e4a31a8dce48f8ff97cf6': 'B',
    '6a0e4c4ba8dce48f8ff97d0c': 'C',
    '6a0e4d1ca8dce48f8ff97d17': 'C',
    '6a0e4ddba8dce48f8ff97d22': 'C',
    '6a0e5066a8dce48f8ff97d38': 'C',
    '6a0f4e58a8dce48f8ff97e3c': 'C',
    '6a0f5067a8dce48f8ff97e4d': 'C',
    '6a0f7aada8dce48f8ff97e8a': 'B',
    '6a0f7f56a8dce48f8ff97eb6': 'A',
    '6a0f8210a8dce48f8ff97ecc': 'D',
    '6a0f839da8dce48f8ff97ee2': 'A',
    '6a0f8497a8dce48f8ff97f08': 'A',
    '6a0f8611a8dce48f8ff97f13': 'B',
    '69dc4660ffd80a3ea39ad4d0': 'B',     // was B, changed to C — need to verify
    '69f213cc751623217324827c': 'D',     // was D, we already changed to C earlier
  };

  // SATA questions that might have been wrongly changed
  // 69d57e903e8284f52776386e: was "A, B, E, F" → "A" — likely wrong (reduced)
  // 69dd8a1e581d120fd2ab5dab: was "A, B, C" → "A" — likely wrong
  // 69fa10eda0d3a16f3f914b99: was "A, C, E" → "A" — likely wrong
  // 69e5d1d48c630f69725e6dc6: was "B, C, D" → "B, C" — could be right
  // 6a0cdb506f694a0e7c5c74ec: was "A, C, D" → "A, B, C, D" — could be right
  // 6a0e2782a8dce48f8ff97c57: was "B, D, E" → "A, B, D, E" — could be right
  // 6a0e4b87a8dce48f8ff97d01: was "B, D, E" → "A, B, D, E" — could be right
  // 6a0e4f71a8dce48f8ff97d2d: was "A, B, C" → "A, B, C, D" — could be right
  // 6a0f7cf2a8dce48f8ff97e95: was "A, C" → "A, B, C" — could be right
  // 6a0f7dbca8dce48f8ff97ea0: was "A, C, D" → "A, B, C, D" — could be right
  // 6a0f7e9da8dce48f8ff97eab: was "B, C" → "A, B, C" — could be right
  // 6a0f815ea8dce48f8ff97ec1: was "C, E" → "A, C, E" — could be right
  // 6a0f82cca8dce48f8ff97ed7: was "A, C" → "A, B, C" — could be right

  const SATA_REVERTS = {
    '69d57e903e8284f52776386e': ['A', 'B', 'E', 'F'],
    '69dd8a1e581d120fd2ab5dab': ['A', 'B', 'C'],
    '69fa10eda0d3a16f3f914b99': ['A', 'C', 'E'],
  };

  // Case-study revert
  const CS_REVERTS = {
    '69db76b27f7ac094125a095c': { subIndex: 0, answer: ['A', 'B', 'D', 'E'] },
  };

  console.log('=== REVERTING MC QUESTIONS (broken multi-letter → single letter) ===\n');
  let mcReverted = 0;
  for (const [id, correct] of Object.entries(MC_REVERTS)) {
    const q = await Question.findById(id);
    if (!q) { console.log('  NOT FOUND: ' + id); continue; }
    
    const current = JSON.stringify(q.correctAnswer);
    q.correctAnswer = correct;
    await q.save({ validateBeforeSave: false });
    mcReverted++;
    console.log('  REVERTED: ' + id + ' ' + current + ' → ' + JSON.stringify(correct));
  }
  console.log('\n  MC reverted: ' + mcReverted + '\n');

  console.log('=== REVERTING SATA QUESTIONS (wrongly reduced) ===\n');
  let sataReverted = 0;
  for (const [id, correct] of Object.entries(SATA_REVERTS)) {
    const q = await Question.findById(id);
    if (!q) { console.log('  NOT FOUND: ' + id); continue; }
    
    const current = JSON.stringify(q.correctAnswer);
    q.correctAnswer = correct;
    await q.save({ validateBeforeSave: false });
    sataReverted++;
    console.log('  REVERTED: ' + id + ' ' + current + ' → ' + JSON.stringify(correct));
  }
  console.log('\n  SATA reverted: ' + sataReverted + '\n');

  console.log('=== REVERTING CASE-STUDY ===\n');
  for (const [id, info] of Object.entries(CS_REVERTS)) {
    const cs = await Question.findById(id);
    if (!cs) { console.log('  NOT FOUND: ' + id); continue; }
    const sub = cs.questions[info.subIndex];
    if (!sub) continue;
    const current = JSON.stringify(sub.correctAnswer);
    cs.questions[info.subIndex].correctAnswer = info.answer;
    await cs.save({ validateBeforeSave: false });
    console.log('  REVERTED: ' + id + ' [sub-' + info.subIndex + '] ' + current + ' → ' + JSON.stringify(info.answer));
  }

  await mongoose.disconnect();
  console.log('\nAll reverts done!');
}

main().catch(err => { console.error(err); process.exit(1); });
