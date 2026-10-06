const { Client } = require('pg');

const regions = ['us-east-1', 'us-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-south-1', 'sa-east-1'];
const password = 'abdulbaseer412';
const projectRef = 'zdzeajqqxecyvvfrizmp';

async function testPoolers() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connStr = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
    console.log(`Testing ${region}...`);
    const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 4000 });
    try {
      await client.connect();
      console.log(`SUCCESS! Connected to ${region} pooler!`);
      const res = await client.query('SELECT current_database(), version()');
      console.log(res.rows[0]);
      await client.end();
      return connStr;
    } catch (err) {
      console.log(`Failed ${region}: ${err.message}`);
    }
  }
}

testPoolers();
