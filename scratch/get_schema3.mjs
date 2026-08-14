import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const data = await res.json();
  const profiles = data.definitions.profiles;
  console.log(profiles ? Object.keys(profiles.properties) : data);
}
run();
