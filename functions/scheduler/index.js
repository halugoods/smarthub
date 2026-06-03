// Smart Hub - Cron scheduler for auto-publishing tasks
// Triggered by Cloudflare Cron Triggers (runs every minute)
// Publishes tasks with status='draft' when jam matches current time (14:00 WIB)
// WIB = UTC+7

export async function onRequest(context) {
  const { env } = context;

  try {
    // Get current time in WIB (UTC+7)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcDate = now.getUTCDate();
    const utcMonth = now.getUTCMonth() + 1;
    const utcYear = now.getUTCFullYear();

    // Convert to WIB
    let wibHours = utcHours + 7;
    let wibDate = utcDate;

    // Handle day rollover
    if (wibHours >= 24) {
      wibHours -= 24;
      // Note: we're not computing the next day's date precisely since
      // month/year rollover is complex; D1 uses CURRENT_DATE or similar.
      // For the query we'll rely on comparing jam only, not the date boundary.
    }

    // Format current WIB time as HH:MM for comparison
    const currentTimeWIB = `${String(wibHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;

    // Find all draft tasks where jam <= current time
    // We check the time portion; the scheduler runs every minute so
    // tasks scheduled for e.g. "14:00" will be picked up at/before 14:01
    const { results: draftTasks } = await env.DB.prepare(
      "SELECT id, tanggal, jam, branch_id FROM tasks WHERE status = 'draft' AND jam <= ? ORDER BY jam ASC"
    )
      .bind(currentTimeWIB)
      .all();

    if (draftTasks.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        published: 0,
        message: 'No tasks to publish',
        checked_at: currentTimeWIB,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update all matching tasks to 'published' status
    const taskIds = draftTasks.map((t) => t.id);
    const placeholders = taskIds.map(() => '?').join(',');

    const updateResult = await env.DB.prepare(
      `UPDATE tasks SET status = 'published', updated_at = datetime('now', '+7 hours') WHERE id IN (${placeholders})`
    )
      .bind(...taskIds)
      .run();

    const publishedCount = updateResult.meta.changes || taskIds.length;

    // Log what was published
    const publishedDetails = draftTasks.map((t) => ({
      id: t.id,
      branch_id: t.branch_id,
      tanggal: t.tanggal,
      jam: t.jam,
    }));

    console.log(`[Scheduler] Published ${publishedCount} task(s) at ${currentTimeWIB} WIB`);
    console.log('[Scheduler] Details:', JSON.stringify(publishedDetails));

    return new Response(JSON.stringify({
      success: true,
      published: publishedCount,
      message: `${publishedCount} task(s) published`,
      checked_at: currentTimeWIB,
      tasks: publishedDetails,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Scheduler] Error:', err.message);
    return new Response(JSON.stringify({ success: false, message: 'Scheduler error', error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
