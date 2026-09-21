const dns = require('dns');

const hosts = [
  'db.zdzeajqqxecyvvfrizmp.supabase.co',
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-us-west-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com'
];

for (const host of hosts) {
  dns.lookup(host, (err, address) => {
    if (err) {
      console.log(`[DNS FAIL] ${host}: ${err.message}`);
    } else {
      console.log(`[DNS OK] ${host} => ${address}`);
    }
  });
}
