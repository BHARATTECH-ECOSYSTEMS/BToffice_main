export const mapStatusToDisplay = (status) => {
  const statusMap = {
    pending: "Pending",
    "in-progress": "In Progress",
    completed: "Completed"
  };
  return statusMap[status?.toLowerCase()] || status || "Pending";
};

export const getStatusColor = (status) => {
  const normalizedStatus = status?.toLowerCase();
  switch (normalizedStatus) {
    case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'completed': return 'text-green-600 bg-green-50 border-green-200';
    case 'submitted': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'graded': return 'text-green-600 bg-green-50 border-green-200';
    case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50';
  }
};
