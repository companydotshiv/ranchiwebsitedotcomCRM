import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We must use the service role key to bypass RLS and create users as an admin
// without logging out the current user session in the browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    // Check if the user already exists in auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing auth users:', listError);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const existingUser = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let user;
    if (existingUser) {
      // Update existing user password and metadata
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          user_metadata: {
            full_name: fullName || 'Client',
            role: 'client',
          },
          email_confirm: true,
        }
      );
      if (updateError) {
        console.error('Error updating auth user:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
      user = updateData.user;
    } else {
      // Create new user using the admin API
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || 'Client',
          role: 'client',
        },
      });

      if (createError) {
        console.error('Error creating auth user:', createError);
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
      user = createData.user;
    }

    // Force update the profile role since the trigger might default to 'user'
    if (user) {
       await supabaseAdmin
        .from('profiles')
        .update({ role: 'client' })
        .eq('id', user.id);
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error in client auth creation:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
