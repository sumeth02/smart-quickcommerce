// Uptime label utility (carried over from the DevOps lab, DEVOPS-4).
export function formatStatus(uptimeSeconds) {
  if (uptimeSeconds < 60) return "warming-up";
  if (uptimeSeconds < 3600) return "healthy";
  return "steady";
}
