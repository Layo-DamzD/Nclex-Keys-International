const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', 'server', '.env') });
const Question = require(path.join(__dirname, '..', 'server', 'models', 'Question'));

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  await mongoose.connect(MONGO_URI);

  // Fix 69f20acb — check exact characters
  const q = await Question.findById('69f20acb7516232173245224');
  if (q) {
    // Show character codes around the damage
    const idx = q.rationale.indexOf('ability');
    const snippet = q.rationale.substring(Math.max(0, idx - 30), idx + 10);
    console.log('Snippet around damage:');
    console.log(snippet);
    console.log('Char codes:', [...snippet].map(c => c + '=' + c.charCodeAt(0)).join(', '));
    
    // Try replacement with the actual apostrophe
    // Find "C" followed by the apostrophe character
    const cIdx = q.rationale.indexOf("Correct answer: C");
    if (cIdx !== -1) {
      const afterC = q.rationale[cIdx + "Correct answer: C".length];
      console.log('\nChar after "Correct answer: C":', afterC, '(code:', afterC.charCodeAt(0), ')');
      
      // The apostrophe might be \u2019 (right single quotation mark)
      if (afterC === '\u2019' || afterC === '\u2018') {
        console.log('Found smart apostrophe!');
        q.rationale = q.rationale.replace(
          "Correct answer: C" + afterC + "s ability",
          "Correct answer: C\n\nMajor concept\nThis question tests the nurse" + afterC + "s ability"
        );
        await q.save({ validateBeforeSave: false });
        console.log('\nFixed! New rationale:');
        console.log(q.rationale.substring(0, 350));
      } else {
        // Regular apostrophe
        const before = q.rationale.substring(cIdx, cIdx + 50);
        console.log('\nBefore:', before);
        q.rationale = q.rationale.replace(
          before.substring(0, "Correct answer: C".length + 2) + 's ability',
          "Correct answer: C\n\nMajor concept\nThis question tests the nurse's ability"
        );
        await q.save({ validateBeforeSave: false });
        console.log('\nFixed! New rationale:');
        console.log(q.rationale.substring(0, 350));
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
