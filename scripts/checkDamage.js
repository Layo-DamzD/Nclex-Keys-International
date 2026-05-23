/**
 * Quick damage assessment — check a sample of the 49 modified questions
 */
const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'server', '.env') });
const Question = require(path.join(__dirname, '..', 'server', 'models', 'Question'));

const MONGO_URI = process.env.MONGO_URI;

// IDs from the first run that were modified — sample the suspicious ones
const SUSPICIOUS_IDS = [
  '69f20acb7516232173245224',  // had "Correct answer: C\n\nMajor concept" captured
  '69f20be87516232173245385',  // same pattern
  '69f213cc751623217324827c',  // REAL mismatch: saved="D" but rational said "C"
  '69d37767547fba7397959e02',  // SATA: captured "because a stable client..."
  '69d4524ef33035e609655f79',  // captured "as written"
  '69d45945f33035e609656799',  // captured "unsafe"
  '6a0cdb506f694a0e7c5c74ec', // SATA: captured only "A" from body
  '69dbfd547f7ac094125bf377', // SATA: captured "protect rights"
  '69fa4769f65611221142fc6a',  // fill-blank style
  '69f214877516232173248a1c', // had "Correct answer: B"
  '69f215407516232173248cee', // had "Correct answer: C"
  '69f21156751623217324695a', // had "Correct answer: B"
  '69f211ca7516232173246e12', // had "Correct answer: B"
  '69f212197516232173247161', // had "Correct answer: B"
  '69f212957516232173247673', // had "Correct answer: B"
  '69f20c3c751623217324541c', // had "Correct answer: C"
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  for (const id of SUSPICIOUS_IDS) {
    const q = await Question.findById(id);
    if (!q) { console.log('NOT FOUND: ' + id); continue; }
    const r = q.rationale || '(empty)';
    console.log('=== ' + id + ' (' + q.type + ') correctAnswer=' + JSON.stringify(q.correctAnswer) + ' ===');
    console.log(r.substring(0, 500));
    console.log('...\n');
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
