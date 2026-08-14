import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function getSchema() {
  const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
  });
  const data = await res.json();
  const profilesDef = data.definitions.profiles;
  console.log('Profiles columns:', Object.keys(profilesDef.properties));
}
getSchema();
