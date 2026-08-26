// ============================================================
// SAHAY — Shared TypeScript Types
// Used by: apps/api, apps/web, apps/mobile
// ============================================================

// ─── Roles & Badges ─────────────────────────────────────────

export type UserRole =
  | 'citizen_guest'
  | 'citizen'
  | 'verified_citizen'
  | 'civic_leader'
  | 'ngo'
  | 'company_csr'
  | 'society_rwa'
  | 'municipal_officer'
  | 'elected_representative'
  | 'political_party'
  | 'police'
  | 'journalist'
  | 'sub_admin'
  | 'super_admin';

export type BadgeType =
  | 'blue_tick'      // Government-verified: municipal officers, elected reps, police, party
  | 'green_tick'     // Verified org: NGOs, Companies/CSR, Societies/RWAs
  | 'gold_star'      // High civic-impact individual: Civic Leaders / Level 4-5
  | 'grey_check'     // Identity-verified citizen: Aadhaar/DigiLocker
  | 'press_badge'    // Verified journalist
  | 'none';          // Unverified/basic

export type PrivacyLevel = 'public' | 'semi_private' | 'private';

export type CivicLevel = 1 | 2 | 3 | 4 | 5;

export const CIVIC_LEVELS: Record<CivicLevel, { name: string; emoji: string; minScore: number }> = {
  1: { name: 'Community Starter',  emoji: '🌱', minScore: 0 },
  2: { name: 'Active Citizen',     emoji: '🌿', minScore: 100 },
  3: { name: 'Civic Contributor',  emoji: '🌳', minScore: 500 },
  4: { name: 'Community Leader',   emoji: '🏙️', minScore: 2000 },
  5: { name: 'Civic Champion',     emoji: '🇮🇳', minScore: 5000 },
};

// ─── Users ───────────────────────────────────────────────────

export interface User {
  id: string;
  firebase_uid: string;
  phone?: string;
  email?: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';
  badge_type: BadgeType;
  bio?: string;
  language_pref: string;
  privacy_level: PrivacyLevel;
  civic_impact_score: number;
  level: CivicLevel;
  jurisdiction_id?: string;
  city_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  role_applied: UserRole;
  documents: { url: string; type: string; name: string }[];
  status: 'pending' | 'approved' | 'rejected' | 'more_info_requested';
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

// ─── Geography ───────────────────────────────────────────────

export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  config: Record<string, unknown>;
}

export interface Ward {
  id: string;
  city_id: string;
  name: string;
  ward_number: string;
  boundary_geojson?: unknown; // GeoJSON polygon
  population_estimate: number;
  area_sqkm?: number;
}

// ─── Civic Data ──────────────────────────────────────────────

export type ReportCategory =
  | 'waterlogging'
  | 'pothole'
  | 'garbage'
  | 'streetlight'
  | 'water_supply'
  | 'sewage'
  | 'road_damage'
  | 'encroachment'
  | 'tree_hazard'
  | 'air_pollution'
  | 'noise_pollution'
  | 'park_damage'
  | 'stray_animals'
  | 'safety'
  | 'other';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus =
  | 'submitted'
  | 'ai_processed'
  | 'clustered'
  | 'standalone'
  | 'resolved'
  | 'rejected';

export interface Report {
  id: string;
  user_id: string;
  category: ReportCategory;
  description: string;
  ai_structured_data?: {
    category: ReportCategory;
    severity: Severity;
    affected_groups: string[];
    root_cause_hint?: string;
    confidence: number;
    language_detected: string;
  };
  media_urls: string[];
  location: { lat: number; lng: number };
  address?: string;
  ward_id?: string;
  evidence_confidence: number; // 0-1
  status: ReportStatus;
  incident_id?: string;
  created_at: string;
}

export type IncidentStatus = 'active' | 'in_progress' | 'resolved' | 'closed';

export interface CivicIncident {
  id: string;
  city_id: string;
  ward_id?: string;
  category: ReportCategory;
  title: string;
  description: string;
  report_count: number;
  unique_citizen_count: number;
  severity: Severity;
  status: IncidentStatus;
  root_cause_hypothesis?: string;
  priority_score: number;
  affected_population_estimate: number;
  location_center: { lat: number; lng: number };
  location_radius_m: number;
  first_detected_at: string;
  updated_at: string;
}

export type DemandStage =
  | 'proposed'
  | 'community_supported'
  | 'submitted'
  | 'accepted'
  | 'work_planned'
  | 'in_progress'
  | 'completed'
  | 'citizen_verification'
  | 'resolved'
  | 'reopened';

export interface CivicDemand {
  id: string;
  incident_id: string;
  title: string;
  description: string;
  supporters_count: number;
  affected_residents: number;
  priority: number;
  stage: DemandStage;
  department_id?: string;
  assigned_officer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  demand_id: string;
  department_id: string;
  contractor_id?: string;
  status: 'created' | 'assigned' | 'in_progress' | 'completed' | 'verified';
  evidence_before: string[];
  evidence_after: string[];
  started_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface ResolutionVerification {
  id: string;
  demand_id: string;
  user_id: string;
  verdict: 'solved' | 'partially_solved' | 'not_solved';
  evidence_urls: string[];
  ai_confidence: number;
  created_at: string;
}

// ─── Organizations ───────────────────────────────────────────

export type OrgType = 'ngo' | 'company' | 'society';

export interface Organization {
  id: string;
  type: OrgType;
  name: string;
  registration_number?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  operating_wards: string[];
  focus_areas: ReportCategory[];
  contact: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  description?: string;
  logo_url?: string;
  created_at: string;
}

export interface Initiative {
  id: string;
  organization_id: string;
  incident_id?: string;
  title: string;
  description: string;
  type: 'fund' | 'volunteer' | 'awareness' | 'equipment' | 'skills' | 'materials';
  goal_amount?: number;
  raised_amount: number;
  volunteer_target?: number;
  volunteer_count: number;
  status: 'active' | 'completed' | 'cancelled';
  contributor_count: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

// ─── Government ──────────────────────────────────────────────

export interface Department {
  id: string;
  city_id: string;
  name: string;
  categories: ReportCategory[];
  head_officer_id?: string;
  contact?: string;
}

// ─── Gamification ────────────────────────────────────────────

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: ReportCategory | 'leadership' | 'validation' | 'volunteer' | 'special';
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  badge: Badge;
  earned_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  sponsor_org_id?: string;
  points_required: number;
  stock: number;
  active: boolean;
  expires_at?: string;
}

// ─── Missions / Circles ──────────────────────────────────────

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  goal_metric: string;
  current_progress: number;
  target: number;
  created_by: string;
  status: 'proposed' | 'approved' | 'active' | 'completed' | 'cancelled';
  start_at?: string;
  end_at?: string;
  ward_id?: string;
  participant_count: number;
}

export interface Circle {
  id: string;
  name: string;
  type: 'college' | 'locality' | 'ngo' | 'school' | 'general';
  description?: string;
  member_count: number;
  city_id: string;
  ward_id?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
}

// ─── City Score ──────────────────────────────────────────────

export interface CityScore {
  city_id: string;
  total: number;
  cleanliness: number;
  roads: number;
  water: number;
  safety: number;
  satisfaction: number;
  resolution_rate: number;
  citizen_participation: number;
  period_start: string;
  period_end: string;
}

export interface RiskPrediction {
  id: string;
  city_id: string;
  ward_id?: string;
  category: ReportCategory;
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  prediction_window_days: number;
  reasoning: string;
  generated_at: string;
}

// ─── Notifications ───────────────────────────────────────────

export type NotificationType =
  | 'incident_near_you'
  | 'demand_stage_change'
  | 'verification_request'
  | 'mission_update'
  | 'reward_earned'
  | 'sos_alert'
  | 'report_clustered'
  | 'verification_result';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// ─── AI Engine Types ─────────────────────────────────────────

export interface AIStructuredReport {
  category: ReportCategory;
  severity: Severity;
  affected_groups: string[];
  location_description?: string;
  root_cause_hint?: string;
  confidence: number;
  language_detected: string;
  urgency_flags: string[];
}

export interface ClusterResult {
  incident_id: string | null; // null = create new incident
  is_new: boolean;
  similarity_score: number;
  nearby_reports: string[];
}

export interface PriorityScore {
  total: number;
  breakdown: {
    severity: number;
    affected_population: number;
    citizen_support: number;
    recurrence: number;
    vulnerability: number;
    evidence_confidence: number;
    urgency: number;
  };
}

export interface VerificationResult {
  confidence: number;
  verdict: 'resolved' | 'partially_resolved' | 'not_resolved';
  reasoning: string;
  flags: string[];
}

// ─── API Response Wrappers ───────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ─── WebSocket Events ────────────────────────────────────────

export interface WSIncidentUpdate {
  event: 'incident:updated';
  incident: Partial<CivicIncident>;
}

export interface WSDemandUpdate {
  event: 'demand:stage_changed';
  demand_id: string;
  old_stage: DemandStage;
  new_stage: DemandStage;
}

export interface WSNotification {
  event: 'notification';
  notification: Notification;
}

export type WSEvent = WSIncidentUpdate | WSDemandUpdate | WSNotification;
export * from './schemas';
