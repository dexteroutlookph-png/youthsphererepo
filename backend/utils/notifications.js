const db = require('../database/connection');

const createNotification = async ({ userId, actorId = null, type, entityId = null, message }) => {
  if (!userId || !type || !message || (actorId && Number(userId) === Number(actorId))) return;
  await db.query(
    `INSERT INTO notifications (user_id, actor_id, type, entity_id, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, actorId, type, entityId, message]
  );
};

module.exports = { createNotification };