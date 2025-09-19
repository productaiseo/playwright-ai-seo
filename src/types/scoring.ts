export type SubcomponentScore = {
  name: string;
  score: number | null; // Hata durumunda null olabilir
  weight: number;
  error?: string; // Hata mesajı
};

export type PillarScore = {
  name: string;
  score: number;
  subcomponents: SubcomponentScore[];
};
