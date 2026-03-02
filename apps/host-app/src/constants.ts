import { GROUNDTRUTH_CATEGORY } from "@groundtruth/contracts";

export const HOST_ORIGIN = window.location.origin;
export const IFRAME_ORIGIN = import.meta.env.VITE_IFRAME_ORIGIN ?? "http://localhost:5174";

export const FAVORITES_SECTIONS = [
  {
    title: "Accessorials",
    items: ["Accessorial Rules", "Search Locations", "Create New Location"]
  },
  {
    title: "Accounts",
    items: ["Tasks", "Search Accounts", "Create New Account"]
  },
  {
    title: "Administration",
    items: ["Assignment Templates", "Data Elements", "Driver Management", "Modules"]
  }
] as const;

export const TASK_CATEGORIES = [
  "Accessory Rules",
  "Account Tasks",
  "Driver Management",
  GROUNDTRUTH_CATEGORY,
  "Data Elements"
] as const;

export const TASK_COUNTS: Record<(typeof TASK_CATEGORIES)[number], number> = {
  "Accessory Rules": 2,
  "Account Tasks": 4,
  "Driver Management": 3,
  "Groundtruth Exceptions": 8,
  "Data Elements": 1
};

export const HOST_OWNED_CONTENT = {
  "Accessory Rules": "Host-owned accessory rules content.",
  "Account Tasks": "Host-owned account task workflow.",
  "Driver Management": "Host-owned driver management tools.",
  "Data Elements": "Host-owned data elements view."
};
