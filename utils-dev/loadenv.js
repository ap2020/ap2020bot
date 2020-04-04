const fs = require('fs');
const path = require('path');

const envs = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'local.settings.json'),
    {encoding: 'utf-8'}
)).Values;
for (const [k, v] of Object.entries(envs)) {
    process.env[k] = v;
}
