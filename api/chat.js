/* Vercel serverless entry.
   Text: OIIO_AI_API_KEY, OIIO_AI_BASE_URL, OIIO_AI_MODEL.
   Vision: OIIO_VISION_API_KEY, OIIO_VISION_BASE_URL, OIIO_VISION_MODEL. */
const { handleChat } = require("../server/chat-handler");

module.exports = function chatRoute(req, res) {
  return handleChat(req, res);
};
