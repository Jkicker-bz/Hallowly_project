// ---------------------------------------------------------------------------
// A person's role determines which shell they see, not just which buttons
// are disabled. "Lead" gets the Database/Logic surfaces (setlist builder,
// scheduling, library management); "Member" gets the Service/Spirit surface
// (their assigned setlists, the on-stage performance view). Same account
// system, two very different daily experiences — see AppShell.tsx for how
// this actually branches the navigation.
// ---------------------------------------------------------------------------

export type Role = "lead" | "member";

export interface Team {
  id: string;
  name: string;
  /** Which Personal Hallow accent this team defaults new members to. */
  defaultAccent: "amethyst" | "lumen" | "bronze" | "flow";
}

export interface User {
  id: string;
  name: string;
  role: Role;
  teamId: string;
}

export interface TeamMember {
  id: string;
  name: string;
  /** Default role/instrument, e.g. "Keys", "Vocals". */
  instrument: string;
}
