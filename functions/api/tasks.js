// Smart Hub - Tasks endpoint (GET, POST, PUT, DELETE)
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  try {
    switch (method) {
      case 'GET':
        return handleGetTasks(env, url);
      case 'POST':
        return handleCreateTask(env, request);
      case 'PUT':
        return handleUpdateTask(env, request);
      case 'DELETE':
        return handleDeleteTask(env, url);
      default:
        return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Internal server error', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/tasks — list tasks, optional ?branch_id=xxx filter
async function handleGetTasks(env, url) {
  const branchId = url.searchParams.get('branch_id');
  const id = url.searchParams.get('id');

  let query;
  let bindings = [];

  if (id) {
    // Get single task by id
    query = 'SELECT * FROM tasks WHERE id = ?';
    bindings = [id];
  } else if (branchId) {
    // Filter by branch
    query = 'SELECT * FROM tasks WHERE branch_id = ? ORDER BY tanggal DESC, jam DESC';
    bindings = [branchId];
  } else {
    // All tasks (admin view)
    query = 'SELECT * FROM tasks ORDER BY tanggal DESC, jam DESC';
  }

  const { results } = await env.DB.prepare(query).bind(...bindings).all();

  return new Response(JSON.stringify({ success: true, tasks: results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/tasks — create a new task
async function handleCreateTask(env, request) {
  const body = await request.json();
  const { tanggal, jam, branch_id, link_drive, caption, deskripsi, hashtag, link_music_tk, link_music_ig } = body;

  if (!tanggal || !branch_id) {
    return new Response(JSON.stringify({ success: false, message: 'tanggal and branch_id are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await env.DB.prepare(
    `INSERT INTO tasks (tanggal, jam, branch_id, link_drive, caption, deskripsi, hashtag, link_music_tk, link_music_ig, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
  )
    .bind(
      tanggal,
      jam || '14:00',
      branch_id,
      link_drive || '',
      caption || '',
      deskripsi || '',
      hashtag || '',
      link_music_tk || '',
      link_music_ig || ''
    )
    .run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Task created',
    task_id: result.meta.last_row_id,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/tasks — update an existing task
async function handleUpdateTask(env, request) {
  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) {
    return new Response(JSON.stringify({ success: false, message: 'Task id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if task exists
  const { results: existing } = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).all();
  if (existing.length === 0) {
    return new Response(JSON.stringify({ success: false, message: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const task = existing[0];

  // Build dynamic update query with only provided fields
  const allowedFields = [
    'tanggal', 'jam', 'branch_id', 'link_drive',
    'caption', 'deskripsi', 'hashtag',
    'link_tiktok', 'link_ig', 'link_fb',
    'link_music_tk', 'link_music_ig',
    'status', 'submit_at', 'verify_at',
  ];

  const setClauses = [];
  const bindings = [];

  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      bindings.push(fields[field]);
    }
  }

  if (setClauses.length === 0) {
    return new Response(JSON.stringify({ success: false, message: 'No fields to update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Auto-set updated_at
  setClauses.push("updated_at = datetime('now', '+7 hours')");

  // If status is changing, handle timestamps
  if (fields.status === 'menunggu_verifikasi' && task.status !== 'menunggu_verifikasi') {
    setClauses.push("submit_at = datetime('now', '+7 hours')");
  }
  if (fields.status === 'selesai') {
    setClauses.push("verify_at = datetime('now', '+7 hours')");
  }

  bindings.push(id);

  await env.DB.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).bind(...bindings).run();

  // Fetch the updated task
  const { results: updated } = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).all();

  return new Response(JSON.stringify({ success: true, message: 'Task updated', task: updated[0] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// DELETE /api/tasks — delete a task by ?id=xxx
async function handleDeleteTask(env, url) {
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ success: false, message: 'Task id query parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if task exists
  const { results: existing } = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).all();
  if (existing.length === 0) {
    return new Response(JSON.stringify({ success: false, message: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();

  return new Response(JSON.stringify({ success: true, message: 'Task deleted' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
