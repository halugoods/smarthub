// Smart Hub - Verify task endpoint (admin marks as complete)
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { task_id } = await request.json();

    if (!task_id) {
      return new Response(JSON.stringify({ success: false, message: 'task_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if task exists
    const { results: existing } = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(task_id)
      .all();

    if (existing.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const task = existing[0];

    // Validate current status — should be menunggu_verifikasi or at least not already selesai
    if (task.status === 'selesai') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Task sudah diverifikasi sebelumnya',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update status to selesai and set verify_at
    await env.DB.prepare(
      "UPDATE tasks SET status = 'selesai', verify_at = datetime('now', '+7 hours'), updated_at = datetime('now', '+7 hours') WHERE id = ?"
    )
      .bind(task_id)
      .run();

    // Fetch the updated task
    const { results: updated } = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(task_id)
      .all();

    return new Response(JSON.stringify({
      success: true,
      message: 'Task telah diverifikasi',
      task: updated[0],
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
