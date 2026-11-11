import express from "express";
import {
  getTelegramSettings,
  updateTelegramSettings,
  testTelegramConnection,
} from "../controllers/telegramController.js";
import { verificarToken, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/config", verificarToken, requireRole("superadmin"), getTelegramSettings);
router.put("/config", verificarToken, requireRole("superadmin"), updateTelegramSettings);
router.post("/test", verificarToken, requireRole("superadmin"), testTelegramConnection);

export default router;

