/**
 * Stack variables for the larr stack.
 * These are available via ctx.vars in all tasks.
 *
 * Usage in tasks:
 *   const goVersion = ctx.vars.goVersion ?? "1.23.4";
 */
export const vars: Record<string, string> = {
  // Tool versions (optional - tasks have defaults)
  goVersion: "1.23.4",
  zigVersion: "0.15.2",
  lazygitVersion: "0.57.0",
  ghVersion: "2.83.2",
  deltaVersion: "0.18.2",
  gitleaksVersion: "8.30.0",
  sopsVersion: "3.11.0",
  ageVersion: "1.3.1",

  // Git configuration
  gitName: "Lauri Liivamagi",
  gitEmail: "lauri@example.com",
};
