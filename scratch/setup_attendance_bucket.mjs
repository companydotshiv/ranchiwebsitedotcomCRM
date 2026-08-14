import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import WebSocket from 'ws';

global.WebSocket = WebSocket;
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function setupStorage() {
  console.log('Checking storage buckets...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError.message);
    return;
  }
  
  const bucketName = 'attendance-photos';
  const bucket = buckets.find(b => b.name === bucketName);
  
  if (!bucket) {
    console.log(`Creating ${bucketName} bucket...`);
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      fileSizeLimit: 5 * 1024 * 1024 // 5MB
    });
    
    if (error) {
      console.error('Error creating bucket:', error.message);
    } else {
      console.log(`${bucketName} bucket created successfully!`);
    }
  } else {
    console.log(`${bucketName} bucket already exists.`);
  }
}

setupStorage();
