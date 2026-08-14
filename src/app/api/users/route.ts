import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with the service role key to bypass RLS and access auth schema
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Fetch all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // 2. Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');
    if (profilesError) throw profilesError;

    // 3. Fetch user roles (many-to-many junction table)
    const { data: userRoles, error: userRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role_id');
    
    // Ignore error if table doesn't exist yet, we'll just return empty arrays
    if (userRolesError && userRolesError.code !== '42P01') {
      console.warn('Error fetching user_roles:', userRolesError);
    }

    // Fetch clients to reliably filter them out
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('auth_user_id');
    const clientIds = new Set(clients?.map(c => c.auth_user_id) || []);

    // 4. Merge them
    const users = authData.users.map((authUser) => {
      const profile = profiles?.find((p) => p.id === authUser.id);
      const rolesForUser = userRoles?.filter(ur => ur.user_id === authUser.id).map(ur => ur.role_id) || [];
      
      // Fallback to legacy workspace_role_id if user_roles is empty but legacy column has data
      const finalRoleIds = rolesForUser.length > 0 
        ? rolesForUser 
        : (profile?.workspace_role_id ? [profile.workspace_role_id] : []);

      const userRole = profile?.role || authUser.user_metadata?.role || 'user';
      return {
        id: authUser.id,
        email: authUser.email,
        name: profile?.full_name || authUser.user_metadata?.full_name || 'Unknown',
        role: userRole,
        workspace_role_ids: finalRoleIds,
        created_at: authUser.created_at,
        date_of_birth: profile?.date_of_birth || null,
      };
    }).filter(u => u.role !== 'client' && !clientIds.has(u.id));

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncUserRoles(userId: string, roleIds: number[]) {
  // Delete existing roles
  const { error: delError } = await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  if (delError && delError.code !== '42P01') throw delError;

  // Insert new roles
  if (roleIds && roleIds.length > 0) {
    const inserts = roleIds.map(id => ({ user_id: userId, role_id: id }));
    const { error: insError } = await supabaseAdmin.from('user_roles').insert(inserts);
    if (insError) {
      if (insError.code === '42P01') {
        throw new Error('Database schema needs updating. Please run the provided SQL in Supabase.');
      }
      throw insError;
    }
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, workspaceRoleIds } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await syncUserRoles(userId, workspaceRoleIds || []);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user roles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, workspaceRoleIds, date_of_birth } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Invite user via Supabase Auth Admin
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: name || '',
        phone: phone || '',
      }
    });

    if (inviteError) throw inviteError;
    const userId = inviteData.user.id;

    // Wait briefly for the auth trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: name || '',
        phone: phone || '',
        date_of_birth: date_of_birth || null,
      })
      .eq('id', userId);

    // Sync roles
    if (workspaceRoleIds && workspaceRoleIds.length > 0) {
      await syncUserRoles(userId, workspaceRoleIds);
    }

    return NextResponse.json({ success: true, user: inviteData.user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, email, phone, workspaceRoleIds, date_of_birth } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Update Auth metadata
    await supabaseAdmin.auth.admin.updateUserById(id, {
      email,
      user_metadata: { full_name: name, phone },
    });

    // 2. Update Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: name,
        phone: phone,
        date_of_birth: date_of_birth || null,
      })
      .eq('id', id);

    if (profileError) throw profileError;

    // 3. Sync Roles
    await syncUserRoles(id, workspaceRoleIds || []);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete user from auth (cascades to profiles and user_roles)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
