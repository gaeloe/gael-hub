// The canonical list of Gaël's projects — nothing more, nothing less — in his
// preferred display order (tabs render this array as-is).
// Ocean = Ocean Worldwide / OceanWake / OceanWakeClaude. My Hub = this app.
// Tabs always show exactly these; task forms offer them as a dropdown; the
// API rejects anything else so scans and autopilot can't invent new ones.
// Adding a real new project means editing this list (and nothing else).
export const PROJECTS = [
  "Ocean",
  "North Site",
  "North Voice",
  "North Leads",
  "Be North",
  "Moveandstay",
  "My Hub",
];

export function isValidProject(project) {
  return project === "" || PROJECTS.includes(project);
}
