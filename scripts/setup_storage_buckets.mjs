/**
 * Create required Supabase Storage buckets for the new project.
 * 
 * Usage: node scripts/setup_storage_buckets.mjs
 * 
 * Required buckets:
 *   - avatars  (public — for user profile photos)
 *   - notes_media (public — for note images)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Read .env.local for credentials
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
const envFile = readFileSync(envPath, 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key.trim()] = values.join('=').trim().replace(/(^"|"$)/g, '');
  }
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
);

const BUCKETS = [
  {
    name: 'avatars',
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  },
  {
    name: 'notes_media',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  },
];

async function setupBuckets() {
  console.log('Setting up storage buckets for new Supabase project...\n');
  console.log(`Project URL: ${env['NEXT_PUBLIC_SUPABASE_URL']}\n`);

  for (const bucket of BUCKETS) {
    const { data: existing } = await supabase.storage.getBucket(bucket.name);
    
    if (existing) {
      console.log(`✅ Bucket "${bucket.name}" already exists.`);
      continue;
    }

    const { data, error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    });

    if (error) {
      console.error(`❌ Failed to create bucket "${bucket.name}":`, error.message);
    } else {
      console.log(`✅ Created bucket "${bucket.name}" (public: ${bucket.public})`);
    }
  }

  console.log('\nDone!');
}

setupBuckets();
