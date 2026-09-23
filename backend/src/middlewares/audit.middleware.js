import AuditLog from "../models/auditLog.model.js";

export const auditLog = ({ action, resource, getDetails }) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const details = getDetails ? getDetails(req, body) : {};

        AuditLog.create({
          user: req.user._id,
          // Map JWT role/kind → Mongoose model name for polymorphic populate.
          userModel:
            {
              staff: "Staff",
              admin: "Admin",
              manager: "Manager",
              superadmin: "Superadmin",
            }[req.role] || "Staff",
          action,
          resource,
          resourceId: req.params.id || null,
          details,
          ip: req.ip,
        }).catch(() => {});
      }

      return originalJson(body);
    };

    next();
  };
};
