export interface LabelImage {
  readonly id: number;
  readonly name: string;
  readonly image: string;
  readonly category: string;
}

export const LABEL_IMAGE_PAGE_SIZE = 15;

export interface LabelImagePage {
  readonly rows: readonly LabelImage[];
  readonly totalCount: number;
}

export interface CreateLabelImageInput {
  readonly name: string;
  readonly image: string;
  readonly category: string;
}
