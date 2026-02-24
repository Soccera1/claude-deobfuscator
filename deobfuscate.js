import fs from 'node:fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Usage: node deobfuscate.js <file_path>
 * Required Env: 
 *   GEMINI_API_KEY
 * Pricing: 
 *   Pass 1 (2.5-flash-lite): $0.10/M input, $0.40/M output
 *   Pass 2 (3-flash-preview): $0.50/M input, $3.00/M output
 */

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const PASS1_MODEL_NAME = process.env.PASS1_MODEL || 'gemini-2.5-flash-lite';
const PASS2_MODEL_NAME = process.env.PASS2_MODEL || 'gemini-3-flash-preview';

const pass1Model = genAI.getGenerativeModel({ model: PASS1_MODEL_NAME });
const pass2Model = genAI.getGenerativeModel({ model: PASS2_MODEL_NAME });

async function callModel(model, prompt) {
  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text();
  return text.replace(/^```javascript\n/, '').replace(/\n```$/, '').replace(/^```json\n/, '').replace(/^```\n/, '');
}

async function pass1(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const chunkSize = 150; 
  let result = '';

  console.log(`--- Starting Pass 1: Chunked De-obfuscation (${PASS1_MODEL_NAME}) ---`);
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n');
    process.stdout.write(`\rProgress: ${Math.round((i / lines.length) * 100)}% (${i}/${lines.length} lines)`);
    
    const prompt = `De-obfuscate this JS code. Rename variables/functions descriptively. Output valid JS only. No preamble.\n\n\`\`\`javascript\n${chunk}\n\`\`\``;
    
    try {
      result += await callModel(pass1Model, prompt) + '\n';
    } catch (e) {
      console.error(`\nError at line ${i}: ${e.message}`);
      result += `// Error: ${e.message}\n${chunk}\n`;
    }
  }
  console.log('\nPass 1 Complete.');
  return result;
}

async function pass2(fullDeobfuscated) {
  console.log(`--- Starting Pass 2: Global Consistency Check (${PASS2_MODEL_NAME}) ---`);
  console.log('Sending entire file to Pass 2 for global context analysis...');

  const prompt = `
I am providing the ENTIRE de-obfuscated codebase (approx 17MB). 
The code was de-obfuscated in chunks, so naming might be inconsistent.

YOUR TASK:
1. Analyze the entire file to identify inconsistent names for the same logical entities.
2. Provide a JSON mapping of { "old_inconsistent_name": "new_consistent_name" } for all variables and functions that should be unified.
3. Ensure the names are descriptive and follow the project's logic.
4. Output ONLY the JSON mapping. No preamble.

CODE:
\`\`\`javascript
${fullDeobfuscated}
\`\`\`
`;

  try {
    const mappingText = await callModel(pass2Model, prompt);
    const mapping = JSON.parse(mappingText.trim());
    console.log(`Received mapping for ${Object.keys(mapping).length} symbols.`);
    
    let finalized = fullDeobfuscated;
    console.log('Applying global naming consistency...');
    for (const [oldName, newName] of Object.entries(mapping)) {
      // Use regex with word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${oldName}\\b`, 'g');
      finalized = finalized.replace(regex, newName);
    }
    return finalized;
  } catch (e) {
    console.error(`\nPass 2 Global Analysis failed: ${e.message}`);
    console.log('Falling back to raw Pass 1 output.');
    return fullDeobfuscated;
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node deobfuscate.js <file_path>');
    process.exit(1);
  }

  const deobfuscated = await pass1(filePath);
  const pass1Path = filePath.replace('.js', '.pass1.js');
  fs.writeFileSync(pass1Path, deobfuscated);
  console.log(`Pass 1 saved to ${pass1Path}`);

  const finalized = await pass2(deobfuscated);
  const finalPath = filePath.replace('.js', '.final.js');
  fs.writeFileSync(finalPath, finalized);
  console.log(`Final de-obfuscated code saved to ${finalPath}`);
}

main().catch(console.error);
