// In lib/auditUtils.js
import { DateTime } from 'luxon';

// Helper function to get current time in Dhaka timezone
export const getCurrentDateTime = () => {
  return DateTime.now().setZone('Asia/Dhaka').toFormat('yyyy-MM-dd HH:mm:ss');
};

// Generate meaningful audit messages based on changes
// Improved generateAuditMessage function
export const generateAuditMessage = (oldData, newData) => {
  const messages = [];
  
  // Helper function to format dates consistently for comparison
  const formatDateForComparison = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  // Helper function to format dates for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Portal changes
  if (oldData.portal_name !== newData.portal_name) {
    const oldPortals = oldData.portal_name ? oldData.portal_name.split(',').map(p => p.trim()) : [];
    const newPortals = newData.portal_name ? newData.portal_name.split(',').map(p => p.trim()) : [];
    
    const addedPortals = newPortals.filter(p => !oldPortals.includes(p));
    const removedPortals = oldPortals.filter(p => !newPortals.includes(p));
    
    if (addedPortals.length > 0) {
      messages.push(`Added Portal: ${addedPortals.join(', ')}`);
    }
    if (removedPortals.length > 0) {
      messages.push(`Removed Portal: ${removedPortals.join(', ')}`);
    }
  }
  
  // Role changes
  if (oldData.role !== newData.role) {
    const oldRoles = oldData.role ? oldData.role.split(',').map(r => r.trim()) : [];
    const newRoles = newData.role ? newData.role.split(',').map(r => r.trim()) : [];
    
    const addedRoles = newRoles.filter(r => !oldRoles.includes(r));
    const removedRoles = oldRoles.filter(r => !newRoles.includes(r));
    
    if (addedRoles.length > 0) {
      messages.push(`Added Role: ${addedRoles.join(', ')}`);
    }
    if (removedRoles.length > 0) {
      messages.push(`Removed Role: ${removedRoles.join(', ')}`);
    }
    
    // Check for replaced roles (one added, one removed)
    if (addedRoles.length === 1 && removedRoles.length === 1) {
      messages.push(`Replaced Role: ${removedRoles[0]} with ${addedRoles[0]}`);
    }
  }
  
  // Status changes
  if (oldData.status !== newData.status) {
    messages.push(`Status Changed: ${oldData.status} to ${newData.status}`);
  }
  
  // Revoke date changes - only show if there's a meaningful change
  const oldRevokeDate = formatDateForComparison(oldData.revoke_date);
  const newRevokeDate = formatDateForComparison(newData.revoke_date);
  
  if (oldRevokeDate !== newRevokeDate) {
    if (!oldData.revoke_date && newData.revoke_date) {
      messages.push(`Revoke Date Set: ${formatDateForDisplay(newData.revoke_date)}`);
    } else if (oldData.revoke_date && !newData.revoke_date) {
      messages.push(`Revoke Date Removed`);
    } else {
      messages.push(`Revoke Date Changed: ${formatDateForDisplay(oldData.revoke_date)} to ${formatDateForDisplay(newData.revoke_date)}`);
    }
  }
  
  // REMOVED: Effective date comparison since we don't update it in tracker table
  
  // Other field changes - only show if there's a meaningful change
  const otherFields = ['ngd_id', 'user_name', 'email', 'mobile_number', 'division', 'department', 'remark', 'additional_info'];
  otherFields.forEach(field => {
    const oldValue = oldData[field] || '';
    const newValue = newData[field] || '';
    
    if (oldValue !== newValue) {
      if (!oldValue && newValue) {
        messages.push(`Added ${field}: ${newValue}`);
      } else if (oldValue && !newValue) {
        messages.push(`Removed ${field}`);
      } else {
        // For remark field, show a more user-friendly message
        if (field === 'remark') {
          messages.push(`Remark: ${oldValue} → ${newValue}`);
        } else {
          messages.push(`Modified ${field}: ${oldValue} to ${newValue}`);
        }
      }
    }
  });
  
  return messages.length > 0 ? messages.join('; ') : 'No changes detected';
};

// Validate dates
export const validateDates = (effectiveDate, revokeDate) => {
  const errors = {};
  
  if (!effectiveDate) {
    errors.effective_date = 'Effective date is required';
  }
  
  if (revokeDate) {
    const effective = new Date(effectiveDate);
    const revoke = new Date(revokeDate);
    
    if (revoke <= effective) {
      errors.revoke_date = 'Revoke date must be after effective date';
    }
  }
  
  return errors;
};

// Determine status based on revoke date
export const determineStatus = (currentStatus, revoke_date) => {
  if (revoke_date && currentStatus === 'Active') {
    return 'Inactive';
  } else if (!revoke_date && currentStatus === 'Inactive') {
    return 'Active';
  }
  return currentStatus;
};