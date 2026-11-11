import express from "express";
import {
  getFileTree,
  viewFile,
  downloadFile,
  deleteFile,
  downloadBackupZip,
  purgeAllNotesAndFiles
} from "../controllers/fileController.js";
import { verificarToken, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/tree", verificarToken, requireRole("superadmin", "admin"), getFileTree);
router.get("/view", verificarToken, requireRole("superadmin", "admin"), viewFile);
router.get("/download", verificarToken, requireRole("superadmin", "admin"), downloadFile);
router.get("/backup-zip", verificarToken, requireRole("superadmin", "admin"), downloadBackupZip);
router.post("/purge", verificarToken, requireRole("superadmin"), purgeAllNotesAndFiles);
router.delete("/", verificarToken, requireRole("superadmin", "admin"), deleteFile);

export default router;


