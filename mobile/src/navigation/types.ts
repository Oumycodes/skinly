import type { ScanResult } from '../services/scan';

export type RootStackParamList = {
  Tabs: undefined;
  ScanFlow: undefined;
  Routine: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Progress: undefined;
  Shelf: undefined;
  Profile: undefined;
};

export type ScanStackParamList = {
  ScanCamera: undefined;
  ScanResult: { result: ScanResult };
};
