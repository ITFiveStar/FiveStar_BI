
export interface FileState {
  orderData: File | null;
  skuEconomics: FileList | null;
  inboundShipping: File | null;
  depositedStatements: FileList | null;
  newDepositedStatement: File | null;
}

export interface LocationState {
  decompositionTable?: DecompositionTable;
}

export interface DecompositionTable {
  headers: string[];
  rows: string[][];
}

export interface Message {
  type: 'success' | 'error';
  text: string;
}