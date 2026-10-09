/**
 * FORTRESS ROLE-BASED ACCESS CONTROL
 * Enforces function-level authorization (OWASP API5:2023 - Broken Function Level Authorization).
 * Must run AFTER vaultGatekeeper, which populates req.vaultUser.
 */
export const requireRole = (...allowedRoles) => (req, res, next) => {
  const role = req.vaultUser?.role;
  if (role && allowedRoles.includes(role)) {
    return next();
  }
  return res.status(403).json({
    fortress_status: "REJECTED",
    threat_level: "HIGH",
    reason: `This operation requires one of the following roles: ${allowedRoles.join(", ")}.`,
    action: "RESTRICT_ADMIN_PRIVILEGE",
  });
};

export const requireMasterAdmin = requireRole("MASTER_ADMIN");
