// Smart Hub - Auth endpoint (PIN-based login)
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { pin, branch_id } = await request.json();

    if (!pin || !branch_id) {
      return new Response(JSON.stringify({ success: false, message: 'PIN and branch_id are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Look up the branch by ID and verify PIN
    const { results } = await env.DB.prepare('SELECT id, name, outlet, ig_handle, wa_number, karyawan FROM branches WHERE id = ? AND pin = ?')
      .bind(branch_id, pin)
      .all();

    if (results.length === 0) {
      // Check if branch exists at all (to distinguish wrong PIN vs wrong branch)
      const { results: branchCheck } = await env.DB.prepare('SELECT id FROM branches WHERE id = ?')
        .bind(branch_id)
        .all();

      if (branchCheck.length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Cabang tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: false, message: 'PIN salah' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const branch = results[0];
    const isAdmin = branch_id === 'indonesia';

    // Generate a simple session token
    const token = crypto.randomUUID();

    return new Response(JSON.stringify({
      success: true,
      message: 'Login berhasil',
      branch: {
        id: branch.id,
        name: branch.name,
        outlet: branch.outlet,
        ig_handle: branch.ig_handle,
        wa_number: branch.wa_number,
        karyawan: branch.karyawan,
      },
      isAdmin,
      token,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Internal server error', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
