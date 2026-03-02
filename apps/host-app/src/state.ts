import { GROUNDTRUTH_CATEGORY } from "@groundtruth/contracts";

export type HostState = {
  selectedCategory: string;
  detailItemId: string | null;
};

export type HostAction =
  | { type: "SELECT_CATEGORY"; category: string }
  | { type: "OPEN_DETAIL"; itemId: string }
  | { type: "CLOSE_DETAIL" };

export function initialHostState(): HostState {
  return {
    selectedCategory: "Accessory Rules",
    detailItemId: null
  };
}

export function hostReducer(state: HostState, action: HostAction): HostState {
  if (action.type === "SELECT_CATEGORY") {
    return {
      selectedCategory: action.category,
      detailItemId: null
    };
  }

  if (action.type === "OPEN_DETAIL") {
    return {
      ...state,
      detailItemId: action.itemId
    };
  }

  return {
    ...state,
    detailItemId: null
  };
}

export function isGroundtruthCategory(category: string): boolean {
  return category === GROUNDTRUTH_CATEGORY;
}
