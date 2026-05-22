export interface RecommendationRow {
  id: number;
  text: string;
  co2_saving: string;
  difficulty: string | null;
  impact: number | null;
  category: string | null;
  is_active: boolean;
}

export interface RecommendationsResponse {
  items: RecommendationRow[];
  cached: boolean;
  fetchedAt: string;
}
