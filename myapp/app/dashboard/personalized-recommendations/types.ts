export interface BowlingDelivery {
  id: number;
  speed: number;
  grip: number;
  wristAngle: number;
  wristClassification: 'Normal' | 'Possible wrist fault';
  gripClassification: 'Normal' | 'Possible grip fault';
}

export interface BowlingSession {
  id: string;
  date: string;
  status: 'Completed';
  deliveryCount: number;
  averageSpeed: number;
  averageGrip: number;
  averageWristAngle: number;
  // Already processed demonstration classifications, never inferred by the UI.
  wristClassifiedCount: number;
  gripClassifiedCount: number;
  deliveries: BowlingDelivery[];
}

export interface TrainingRecommendation {
  id: string;
  title: string;
  objective: string;
  instructions: string[];
  reassessment: string;
}

export interface RecommendationObservation {
  category: 'wrist' | 'grip' | 'speed';
  title: string;
  measurement: string;
  observation: string;
  explanation: string;
  trend: string;
  status: 'Practice focus' | 'For review';
  practice: TrainingRecommendation;
}

export interface RecommendationReport {
  id: string;
  generatedAt: string;
  session: BowlingSession;
  analysisMethod: 'Synthetic demonstration · processed session summaries';
  mainFocus: string;
  status: 'Demonstration';
  observations: RecommendationObservation[];
  trainingPlan: TrainingRecommendation[];
}
