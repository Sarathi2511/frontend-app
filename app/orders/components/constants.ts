export const ACCENT = "#3D5AFE";

export const statusOptions = ["Pending", "DC", "Invoice", "Dispatched"];

// Define valid status transitions for flexible workflow
export const getValidNextStatuses = (currentStatus: string): string[] => {
  const validTransitions = {
    'Pending': ['DC'],
    'DC': ['Invoice'],
    'Invoice': ['Dispatched'],
    'Dispatched': [] // Final state, no further transitions
  };
  return validTransitions[currentStatus as keyof typeof validTransitions] || [];
};

