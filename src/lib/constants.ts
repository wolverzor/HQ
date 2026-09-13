// HQ V1 is single-user (no auth). Every row is scoped to this fixed demo user,
// which keeps the data model ready for real multi-user auth later without
// having to touch every query today.
export const DEMO_USER_ID = "demo-user";
