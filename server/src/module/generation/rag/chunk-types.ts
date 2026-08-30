// Parent/child chunk model shared by the markdown and PDF chunkers.
// A parent is a heading-based section; its children are the sub-chunks of its
// body that are actually searched. Children reference their parent via
// `parentKey`, which the vector-store layer resolves to the parent point id.
export interface ParentChunk {
  key: string;
  heading: string;
  text: string;
}

export interface ChildChunk {
  parentKey: string;
  heading: string;
  part: number;
  text: string;
  page?: number;
}

export interface ChunkedDocument {
  parents: ParentChunk[];
  children: ChildChunk[];
}