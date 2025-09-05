export interface FileState {
    depositStatement: File | null;
    orderData: FileList | null;
  }

export interface Message {
  type: 'success' | 'error';
  text: string;
}