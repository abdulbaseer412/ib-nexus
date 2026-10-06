const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/GEMINI_API_KEY=(.*)/);
const key = match[1].trim().replace(/^["']|["']$/g, '');

fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
  .then(r => r.json())
  .then(d => {
    if (d.models) {
      console.log("AVAILABLE GEMINI MODELS:");
      d.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
    } else {
      console.log("Response:", d);
    }
  })
  .catch(console.error);
