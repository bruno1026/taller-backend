import jwt from "jsonwebtoken";

export const verificarToken = (req, res, next) => {
  let token = req.headers["authorization"] || req.headers["x-access-token"] || req.query?.token;
  if (!token) return res.status(403).json({ ok: false, msg: "Token no proporcionado" });

  if (typeof token === "string" && token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  } else if (typeof token === "string") {
    token = token.trim();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ ok: false, msg: "Token inválido o expirado" });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(403).json({ ok: false, msg: "No autorizado" });
  }

  // Superadmin tiene acceso a todas las rutas protegidas
  if (req.usuario.rol === "superadmin" || roles.includes(req.usuario.rol)) {
    return next();
  }

  return res.status(403).json({ ok: false, msg: "No autorizado para este recurso" });
};
