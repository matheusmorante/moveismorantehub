export type CategoryItem = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly type: string;
};

export type CategoryLink = {
  readonly parent_id: string;
  readonly child_id: string;
};

export type CategoryFormData = {
  name: string;
  slug: string;
  type: string;
  linkedIds: string[];
};
