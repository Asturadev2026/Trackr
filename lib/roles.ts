// Roles that see Team Tracker instead of My Tracker
const MANAGER_LEVEL_ROLES = ["ADMIN", "MANAGER", "BUSINESS"]

// Roles that can manage team: add/remove members, edit users, edit workflows
const TEAM_MANAGE_ROLES = ["ADMIN", "MANAGER", "BUSINESS", "AI_ENGINEER", "SENIOR_ENGINEER"]

export function hasMyTracker(role: string): boolean {
  return !MANAGER_LEVEL_ROLES.includes(role)
}

export function hasTeamTracker(role: string): boolean {
  return role !== "INTERN"
}

export function canManageTeam(role: string): boolean {
  return TEAM_MANAGE_ROLES.includes(role)
}

export function isIntern(role: string): boolean {
  return role === "INTERN"
}
