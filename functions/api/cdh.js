// Smart Hub - CDH bulk submission endpoint
// Accepts: { tanggal, jam: "14:00", tasks: [{branch_id, caption, deskripsi, hashtag}, ...] }
// Creates up to 7 tasks at once, all as "draft" status
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { tanggal, jam, tasks } = body;

    if (!tanggal || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'tanggal and tasks array are required',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (tasks.length > 7) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Maximum 7 tasks per submission',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const targetJam = jam || '14:00';
    const createdIds = [];
    const errors = [];

    // Process each task
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const { branch_id, caption, deskripsi, hashtag } = task;

      if (!branch_id) {
        errors.push({ index: i, message: 'branch_id is required' });
        continue;
      }

      try {
        // Verify branch exists
        const { results: branchCheck } = await env.DB.prepare('SELECT id FROM branches WHERE id = ?')
          .bind(branch_id)
          .all();

        if (branchCheck.length === 0) {
          errors.push({ index: i, branch_id, message: `Branch '${branch_id}' not found` });
          continue;
        }

        const result = await env.DB.prepare(
          `INSERT INTO tasks (tanggal, jam, branch_id, link_drive, caption, deskripsi, hashtag, link_music_tk, link_music_ig, status)
           VALUES (?, ?, ?, '', ?, ?, ?, '', '', 'draft')`
        )
          .bind(
            tanggal,
            targetJam,
            branch_id,
            caption || '',
            deskripsi || '',
            hashtag || ''
          )
          .run();

        createdIds.push({
          index: i,
          task_id: result.meta.last_row_id,
          branch_id,
        });
      } catch (taskErr) {
        errors.push({ index: i, branch_id: branch_id || 'unknown', message: taskErr.message });
      }
    }

    return new Response(JSON.stringify({
      success: errors.length === 0 || createdIds.length > 0,
      message: `${createdIds.length} task(s) created, ${errors.length} error(s)`,
      tanggal,
      jam: targetJam,
      created: createdIds,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      status: errors.length === tasks.length ? 500 : 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Internal server error', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
