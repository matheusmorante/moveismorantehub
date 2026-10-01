export interface LabelImage {
  readonly id: number;
  readonly name: string;
  readonly image: string;
  readonly category: string;
}

export interface CreateLabelImageInput {
  readonly name: string;
  readonly image: string;
  readonly category: string;
}
