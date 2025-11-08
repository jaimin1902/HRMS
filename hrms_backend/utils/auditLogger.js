import { AuditLog } from '../models/AuditLog.js';

export const logAction = async (req, action, entityType = null, entityId = null, oldValues = null, newValues = null) => {
    try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await AuditLog.create({
            user_id: req.user?.id || null,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues,
            new_values: newValues,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    } catch (error) {
        console.error('Failed to log audit action:', error);
        // Don't throw error - audit logging should not break the main flow
    }
};


