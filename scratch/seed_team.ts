import WebSocket from 'ws';
globalThis.WebSocket = WebSocket as any;

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('.env.local not found!');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const team = [
  { name: 'Abhishek Giri', designation: 'Director', email: 'info@cinematickrs.in', phone: '8584005844' },
  { name: 'Manali Jain', designation: 'Senior Strategist', email: 'manali@cinematickrs.in', phone: '8250522456' },
  { name: 'Piyush Ranjan', designation: 'Associate Operational Manager', email: 'piyush@cinematickrs.in', phone: '6206616141' },
  { name: 'Shalini Sinha', designation: 'Human Resources', email: 'shalini@cinematickrs.in', phone: '6204290911' },
  { name: 'Nidhi Kumari', designation: 'Accountant', email: 'nidhi@cinematickrs.in', phone: '9006360293' },
  { name: 'Shivendra Kumar', designation: 'Web Developer & SEO Specialist', email: 'shiv@cinematickrs.in', phone: '9939196430' },
  { name: 'Vikram Kumar Yadav', designation: 'Social Media Manager', email: 'vikram@cinematickrs.in', phone: '9942081988' },
  { name: 'Aditya Chaudhary', designation: 'Graphic Designer', email: 'Aditya@cinematickrs.in', phone: '8709797289' },
  { name: 'Kunal Kumar', designation: 'Web Developer', email: 'kunal@cinematickrs.in', phone: '9142481962' },
  { name: 'Ayush Ranjan', designation: 'Cinematographer', email: 'ayush@cinematickrs.in', phone: '7488588168' },
  { name: 'Supriya Singh', designation: 'Content Creator', email: 'supriya@cinematickrs.in', phone: '7061787127' },
  { name: 'Sourav Goswami', designation: 'Team Leader', email: 'sourav@cinematickrs.in', phone: '7992211884' },
  { name: 'Ayushi Kumari', designation: 'Business Developer', email: 'ayushi@cinematickrs.in', phone: '9153738065' },
  { name: 'Shivani Singh', designation: 'Business Developer', email: 'shivani@cinematickrs.in', phone: '9334938668' },
  { name: 'Shravan Kujur', designation: 'Editor', email: 'shravan@cinematickrs.in', phone: '6206026299' },
  { name: 'Binita Kumari', designation: 'Graphic Designer', email: 'binita@cinematickrs.in', phone: '7258818682' },
  { name: 'Rohit Roshan Topno', designation: 'Cinematographer', email: 'rohit@cinematickrs.in', phone: '9341342985' },
];

async function seed() {
  console.log('Starting total reset and seed...');

  // 1. Delete all vertical workflow steps
  console.log('Deleting existing workflow configurations...');
  const { error: stepsError } = await supabase.from('vertical_workflow_steps').delete().neq('id', 0);
  if (stepsError) console.error('Error deleting workflow steps:', stepsError.message);

  // 2. Delete all existing users
  console.log('Fetching existing users...');
  const { data: usersData, error: listUsersError } = await supabase.auth.admin.listUsers();
  if (listUsersError) throw listUsersError;

  console.log(`Deleting ${usersData.users.length} existing users...`);
  for (const u of usersData.users) {
    const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
    if (delError) console.error(`Error deleting user ${u.email}:`, delError.message);
  }

  // 3. Delete all roles
  console.log('Deleting existing roles...');
  const { error: rolesDelError } = await supabase.from('roles').delete().neq('id', 0);
  if (rolesDelError) console.error('Error deleting roles:', rolesDelError.message);

  // 4. Create new roles
  const uniqueDesignations = Array.from(new Set(team.map(t => t.designation)));
  console.log(`Creating ${uniqueDesignations.length} new roles...`);
  const rolesToInsert = uniqueDesignations.map(d => ({ name: d }));
  const { data: newRoles, error: rolesError } = await supabase.from('roles').insert(rolesToInsert).select();
  if (rolesError) throw rolesError;

  const roleMap = new Map();
  for (const r of newRoles) {
    roleMap.set(r.name, r.id);
  }

  // 5. Create users and link to roles
  console.log(`Creating ${team.length} new users...`);
  for (const member of team) {
    try {
      // Create user
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email: member.email,
        password: 'Cinematickrs2026!',
        email_confirm: true,
        user_metadata: {
          full_name: member.name,
          phone: member.phone
        }
      });
      if (createError) throw createError;
      
      const userId = authData.user.id;
      
      // Wait for trigger to create profile (just in case)
      await new Promise(r => setTimeout(r, 1000));
      
      // Update profile with correct phone and name in case trigger missed it or if we want to be sure
      await supabase.from('profiles').update({
        full_name: member.name,
        phone: member.phone
      }).eq('id', userId);
      
      // Assign role
      const roleId = roleMap.get(member.designation);
      if (roleId) {
        await supabase.from('user_roles').insert({
          user_id: userId,
          role_id: roleId
        });
      }
      console.log(`✅ Created ${member.name} (${member.designation})`);
    } catch (err: any) {
      console.error(`❌ Failed to create ${member.name}: ${err.message}`);
    }
  }

  console.log('Seed complete!');
}

seed().catch(console.error);
