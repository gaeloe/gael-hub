// The canonical list of Gaël's projects — nothing more, nothing less.
// Tabs always show exactly these; task forms offer them as a dropdown; the
// API rejects anything else so scans and autopilot can't invent new ones.
// Adding a real new project means editing this list (and nothing else).
export const PROJECTS = [
  "Be North",
  "Move and Stay",
  "North Leads",
  "North Sight",
  "North Voice",
  "Ocean Wake",
];

export function isValidProject(project) {
  return project === "" || PROJECTS.includes(project);
}
