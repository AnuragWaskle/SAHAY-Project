"""
Sahay AI Services — FastAPI application
8 AI engines using NVIDIA Nemotron API
"""

import os
import asyncio
import json
import math
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
from dotenv import load_dotenv
import asyncpg

from dinov2_engine import load_dinov2_model, run_dinov2_verification

load_dotenv()

app = FastAPI(
    title="Sahay AI Services",
    description="8 AI engines for civic intelligence + DINOv2 Evidence Verification",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── NVIDIA Nemotron Client ────────────────────────────────────

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-ultra-253b-v1")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sahay:sahay_dev_pw@localhost:5434/sahay")

client = AsyncOpenAI(
    api_key=NVIDIA_API_KEY,
    base_url=NVIDIA_BASE_URL,
)

# ─── DB Connection Pool ───────────────────────────────────────

db_pool: Optional[asyncpg.Pool] = None

@app.on_event("startup")
async def startup():
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        print("✅ Database pool created")
    except Exception as e:
        print(f"⚠️  DB pool failed (AI services work without DB): {e}")

    # Load DINOv2 Model once on startup
    load_dinov2_model()

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()

# ─── Helper: Call Nemotron ────────────────────────────────────

async def log_ai_operation(task: str, success: bool, latency_ms: int, confidence: float = None, tokens_used: int = None, entity_type: str = None, entity_id: str = None, error_code: str = None, error_message: str = None):
    """Log AI operation for monitoring and economics tracking"""
    if not db_pool:
        return
    try:
        estimated_cost = (tokens_used or 0) * 0.000003 if tokens_used else None
        await db_pool.execute(
            """INSERT INTO ai_operations_log (task, model, provider, entity_type, entity_id, success, latency_ms, confidence, tokens_used, estimated_cost, error_code, error_message)
               VALUES ($1, $2, 'nvidia_nemotron', $3, $4, $5, $6, $7, $8, $9, $10, $11)""",
            task, NVIDIA_MODEL, entity_type, entity_id, success, latency_ms, confidence, tokens_used, estimated_cost, error_code, error_message
        )
    except Exception as e:
        print(f"Failed to log AI operation: {e}")

async def call_nemotron(system_prompt: str, user_message: str, temperature: float = 0.3, max_tokens: int = 2048, task: str = "general", entity_type: str = None, entity_id: str = None) -> str:
    """Call NVIDIA Nemotron API via OpenAI-compatible endpoint"""
    import time
    start = time.time()
    try:
        response = await client.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        latency_ms = int((time.time() - start) * 1000)
        tokens_used = getattr(response.usage, 'total_tokens', None) if response.usage else None
        await log_ai_operation(task, True, latency_ms, None, tokens_used, entity_type, entity_id)
        return response.choices[0].message.content or ""
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        await log_ai_operation(task, False, latency_ms, None, None, entity_type, entity_id, type(e).__name__, str(e)[:200])
        print(f"Nemotron API error: {e}")
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")

def extract_json(text: str) -> dict:
    """Extract JSON from model output, handling markdown code blocks"""
    import re
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # Try extracting from markdown code block
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    # Try finding first { ... }
    match = re.search(r'\{[\s\S]+\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {}

# ─── ENGINE 1: NLU Report Analysis ───────────────────────────

class NLURequest(BaseModel):
    text: str
    language: str = "en"
    category_hint: Optional[str] = None
    media_urls: List[str] = []

class NLUResponse(BaseModel):
    category: str
    severity: str
    key_issues: List[str]
    affected_entities: List[str]
    urgency_level: int
    confidence: float
    is_valid_report: bool
    translated_summary: Optional[str]
    sentiment: str
    structured_tags: List[str]

@app.post("/nlu/analyze", response_model=NLUResponse)
async def analyze_report(req: NLURequest):
    """Engine 1: Understand and structure a citizen report using Nemotron"""

    system = """You are an AI civic report analyzer for Indian cities.
Extract structured information from citizen reports about urban infrastructure issues.
Always respond with valid JSON matching this schema:
{
  "category": "one of: waterlogging|pothole|garbage|streetlight|water_supply|sewage|road_damage|encroachment|tree_hazard|air_pollution|noise_pollution|park_damage|stray_animals|safety|other",
  "severity": "low|medium|high|critical",
  "key_issues": ["list of specific issues mentioned"],
  "affected_entities": ["roads|residents|children|vehicles|etc"],
  "urgency_level": 1-10,
  "confidence": 0.0-1.0,
  "is_valid_report": true|false,
  "translated_summary": "English summary if text is in Hindi/regional language, else null",
  "sentiment": "frustrated|concerned|urgent|informational|angry",
  "structured_tags": ["relevant hashtag-style tags"]
}"""

    user = f"""Analyze this civic report (language: {req.language}):
Category hint: {req.category_hint or 'auto-detect'}
Report: {req.text}"""

    raw = await call_nemotron(system, user, temperature=0.2, max_tokens=1024, task="classification", entity_type="report")
    data = extract_json(raw)

    return NLUResponse(
        category=data.get("category", req.category_hint or "other"),
        severity=data.get("severity", "medium"),
        key_issues=data.get("key_issues", []),
        affected_entities=data.get("affected_entities", []),
        urgency_level=data.get("urgency_level", 5),
        confidence=data.get("confidence", 0.7),
        is_valid_report=data.get("is_valid_report", True),
        translated_summary=data.get("translated_summary"),
        sentiment=data.get("sentiment", "concerned"),
        structured_tags=data.get("structured_tags", []),
    )

# ─── ENGINE 2: Report Clustering ─────────────────────────────

class ClusterCheckRequest(BaseModel):
    lat: float
    lng: float
    category: str
    description: str
    radius_m: float = 800

class ClusterResponse(BaseModel):
    incident_id: Optional[str]
    confidence: float
    reason: str

@app.post("/clustering/check", response_model=ClusterResponse)
async def check_cluster(req: ClusterCheckRequest):
    """Engine 2: Check if a new report belongs to an existing incident cluster"""

    if not db_pool:
        return ClusterResponse(incident_id=None, confidence=0.0, reason="DB unavailable")

    # Fetch nearby incidents within radius
    nearby = await db_pool.fetch(
        """SELECT id, title, description, category,
            ST_Distance(location_center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist
           FROM civic_incidents
           WHERE category = $3
           AND status NOT IN ('resolved', 'closed')
           AND ST_DWithin(location_center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $4)
           ORDER BY dist ASC
           LIMIT 5""",
        req.lng, req.lat, req.category, req.radius_m
    )

    if not nearby:
        return ClusterResponse(incident_id=None, confidence=0.0, reason="No nearby incidents found")

    # Use Nemotron to determine best cluster match
    candidates = "\n".join([
        f"ID: {row['id']}, Title: {row['title']}, Distance: {row['dist']:.0f}m\nDescription: {row['description'][:200]}"
        for row in nearby
    ])

    system = """You are a civic incident clustering AI. Given a new report and existing nearby incidents,
determine if the report should be clustered into an existing incident.
Respond with JSON: {"incident_id": "uuid or null", "confidence": 0.0-1.0, "reason": "brief reason"}
Only cluster if semantically and geographically related. If uncertain, return null."""

    user = f"""New report: {req.description}
Nearby incidents:
{candidates}"""

    raw = await call_nemotron(system, user, temperature=0.1, max_tokens=512, task="clustering", entity_type="report")
    data = extract_json(raw)

    # Validate that returned incident_id exists in our candidates
    candidate_ids = [str(row['id']) for row in nearby]
    incident_id = data.get("incident_id")
    if incident_id and incident_id not in candidate_ids:
        incident_id = None

    return ClusterResponse(
        incident_id=incident_id,
        confidence=data.get("confidence", 0.0),
        reason=data.get("reason", ""),
    )

class CreateIncidentRequest(BaseModel):
    report_id: str
    city_id: Optional[str]

@app.post("/clustering/create-incident")
async def create_incident_from_report(req: CreateIncidentRequest, background_tasks: BackgroundTasks):
    """Create a new civic incident from a solo report (background task)"""
    background_tasks.add_task(_create_incident_bg, req.report_id, req.city_id)
    return {"status": "queued"}

async def _create_incident_bg(report_id: str, city_id: Optional[str]):
    if not db_pool:
        return
    try:
        report = await db_pool.fetchrow(
            "SELECT * FROM reports WHERE id = $1", report_id
        )
        if not report:
            return

        # Analyze with NLU first
        nlu_req = NLURequest(
            text=report['description'],
            category_hint=report['category'],
        )
        nlu = await analyze_report(nlu_req)

        severity = nlu.severity if nlu.severity else 'medium'
        priority_score = nlu.urgency_level * 10.0

        incident = await db_pool.fetchrow(
            """INSERT INTO civic_incidents
               (city_id, ward_id, category, title, description, severity, status,
                priority_score, location_center, location_radius_m, first_detected_at)
               VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, 500, NOW())
               RETURNING id""",
            city_id or report['city_id'],
            report['ward_id'],
            report['category'],
            nlu.key_issues[0] if nlu.key_issues else report['description'][:100],
            report['description'],
            severity,
            priority_score,
            report['location']
        )

        if incident:
            await db_pool.execute(
                "UPDATE reports SET incident_id = $1, status = 'clustered' WHERE id = $2",
                incident['id'], report_id
            )
    except Exception as e:
        print(f"Background incident creation failed: {e}")

# ─── ENGINE 3: Root Cause Analysis ────────────────────────────

class RootCauseRequest(BaseModel):
    incident_id: Optional[str]
    category: str
    description: str
    report_summaries: List[str] = []
    location_context: Optional[str] = None
    historical_data: Optional[str] = None

class RootCauseResponse(BaseModel):
    primary_cause: str
    contributing_factors: List[str]
    systemic_issues: List[str]
    recommended_intervention: str
    estimated_fix_days: int
    affected_department: str
    confidence: float

@app.post("/root-cause/analyze", response_model=RootCauseResponse)
async def analyze_root_cause(req: RootCauseRequest):
    """Engine 3: AI root cause analysis for civic incidents"""

    system = """You are an expert urban infrastructure analyst for Indian cities (BBMP, BMC, PMC etc).
Given incident data, identify root causes and provide actionable recommendations.
Respond with JSON:
{
  "primary_cause": "main root cause",
  "contributing_factors": ["list of factors"],
  "systemic_issues": ["systemic/structural problems"],
  "recommended_intervention": "specific action steps",
  "estimated_fix_days": number,
  "affected_department": "department name",
  "confidence": 0.0-1.0
}"""

    reports_text = "\n".join(f"- {r}" for r in req.report_summaries) if req.report_summaries else "No additional reports"

    user = f"""Incident: {req.category.upper()}
Description: {req.description}
Location: {req.location_context or 'urban area'}
Citizen reports: 
{reports_text}
Historical patterns: {req.historical_data or 'not available'}"""

    raw = await call_nemotron(system, user, temperature=0.3, task="root_cause", entity_type="incident")
    data = extract_json(raw)

    return RootCauseResponse(
        primary_cause=data.get("primary_cause", "Under investigation"),
        contributing_factors=data.get("contributing_factors", []),
        systemic_issues=data.get("systemic_issues", []),
        recommended_intervention=data.get("recommended_intervention", "Contact municipal department"),
        estimated_fix_days=data.get("estimated_fix_days", 7),
        affected_department=data.get("affected_department", "Municipal Corporation"),
        confidence=data.get("confidence", 0.6),
    )

# ─── ENGINE 4: Priority Scoring ───────────────────────────────

class PriorityRequest(BaseModel):
    incident_id: Optional[str]
    category: str
    severity: str
    report_count: int
    unique_citizen_count: int
    affected_population: int
    supporters_count: int = 0
    has_media: bool = False
    days_open: int = 0
    resolution_history: Optional[str] = None

class PriorityResponse(BaseModel):
    priority_score: float
    breakdown: Dict[str, float]
    recommendation: str

@app.post("/priority/score", response_model=PriorityResponse)
async def compute_priority(req: PriorityRequest):
    """Engine 4: Compute multi-factor priority score for civic incidents"""

    # Algorithmic scoring (fast, no LLM needed for speed)
    severity_map = {"low": 25, "medium": 50, "high": 75, "critical": 100}
    severity_score = severity_map.get(req.severity, 50) * 0.25

    # Normalize affected population (assume max 100k)
    pop_score = min(req.affected_population / 100000, 1.0) * 100 * 0.20

    # Citizen support signal
    support_score = min((req.supporters_count + req.report_count * 2) / 200, 1.0) * 100 * 0.15

    # Urgency (days open — problems get worse over time)
    urgency = min(req.days_open / 30, 1.0) * 100 * 0.15

    # Evidence quality
    evidence = (0.8 if req.has_media else 0.5) * 100 * 0.10

    # Unique citizen engagement
    engagement = min(req.unique_citizen_count / 50, 1.0) * 100 * 0.15

    total = severity_score + pop_score + support_score + urgency + evidence + engagement

    # LLM recommendation
    system = "You are a civic priority analyst. Based on the priority score breakdown, give a 1-sentence action recommendation for municipal officers."
    user = f"Category: {req.category}, Severity: {req.severity}, Score: {total:.1f}/100, Affected: {req.affected_population}"

    try:
        recommendation = await call_nemotron(system, user, temperature=0.3, max_tokens=150, task="priority", entity_type="incident")
        recommendation = recommendation.strip().strip('"')
    except Exception:
        recommendation = f"High priority {req.category} issue affecting {req.affected_population} residents — immediate attention required."

    return PriorityResponse(
        priority_score=round(total, 2),
        breakdown={
            "severity": round(severity_score, 2),
            "population_impact": round(pop_score, 2),
            "citizen_support": round(support_score, 2),
            "urgency": round(urgency, 2),
            "evidence_quality": round(evidence, 2),
            "citizen_engagement": round(engagement, 2),
        },
        recommendation=recommendation,
    )

# ─── ENGINE 5: Resolution Verification ───────────────────────

class VerifyResolutionRequest(BaseModel):
    demand_id: str
    before_description: str
    after_reports: List[str]
    after_media_urls: List[str] = []
    officer_claim: str

class VerifyResolutionResponse(BaseModel):
    verdict: str  # "resolved" | "partially_resolved" | "not_resolved" | "needs_more_data"
    confidence: float
    reasoning: str
    points_to_verify: List[str]

@app.post("/verification/analyze", response_model=VerifyResolutionResponse)
async def verify_resolution(req: VerifyResolutionRequest):
    """Engine 5: Verify if a civic issue has truly been resolved"""

    system = """You are an independent civic resolution auditor.
Your job is to determine if a civic issue has genuinely been resolved based on available evidence.
Be skeptical — partial patches or cosmetic fixes should be flagged.
Respond with JSON:
{
  "verdict": "resolved|partially_resolved|not_resolved|needs_more_data",
  "confidence": 0.0-1.0,
  "reasoning": "detailed reasoning",
  "points_to_verify": ["things citizens should check in person"]
}"""

    citizen_reports_text = "\n".join(f"- {r}" for r in req.after_reports)

    user = f"""Issue: {req.before_description}

Officer's claim of resolution: {req.officer_claim}

Post-resolution citizen reports ({len(req.after_reports)} reports):
{citizen_reports_text or 'No citizen feedback yet'}

Evidence images provided: {len(req.after_media_urls)}"""

    raw = await call_nemotron(system, user, temperature=0.2, task="verification", entity_type="demand")
    data = extract_json(raw)

    return VerifyResolutionResponse(
        verdict=data.get("verdict", "needs_more_data"),
        confidence=data.get("confidence", 0.5),
        reasoning=data.get("reasoning", "Insufficient data to determine resolution status"),
        points_to_verify=data.get("points_to_verify", []),
    )

# ─── ENGINE 5B: Local DINOv2 + OpenCV Evidence Verification ───

class DINOv2VerificationRequest(BaseModel):
    before_evidence_url: str
    after_evidence_url: str
    incident_lat: float = 23.259933
    incident_lng: float = 77.412613
    evidence_lat: Optional[float] = None
    evidence_lng: Optional[float] = None
    before_timestamp: Optional[float] = None
    after_timestamp: Optional[float] = None
    max_radius_meters: float = 50.0

@app.post("/verification/analyze-dinov2")
async def analyze_dinov2_evidence(req: DINOv2VerificationRequest):
    """
    Local DINOv2 + OpenCV + pHash + PostGIS Evidence Verification Endpoint
    Calculates visual similarity, scene changes, duplicate hashes, GPS distance, and returns verification verdict.
    """
    result = run_dinov2_verification(
        before_src=req.before_evidence_url,
        after_src=req.after_evidence_url,
        incident_lat=req.incident_lat,
        incident_lng=req.incident_lng,
        evidence_lat=req.evidence_lat,
        evidence_lng=req.evidence_lng,
        before_time=req.before_timestamp,
        after_time=req.after_timestamp,
        max_radius_m=req.max_radius_meters
    )
    return result

# ─── ENGINE 6: Predictive Risk Analysis ──────────────────────

class RiskPredictionRequest(BaseModel):
    ward_id: str
    category: str
    city_id: str
    historical_incidents: int = 0
    current_open_incidents: int = 0
    monsoon_season: bool = False
    last_maintenance_days: Optional[int] = None

class RiskPredictionResponse(BaseModel):
    risk_score: float
    risk_level: str
    prediction_window_days: int
    top_risk_factors: List[str]
    preventive_actions: List[str]
    confidence: float

@app.post("/predictions/risk", response_model=RiskPredictionResponse)
async def predict_risk(req: RiskPredictionRequest):
    """Engine 6: Predict risk of a civic issue escalating in a ward"""

    system = """You are a predictive urban risk analyst for Indian cities.
Based on historical and contextual data, predict the likelihood of a civic issue escalating.
Respond with JSON:
{
  "risk_score": 0-100,
  "risk_level": "low|moderate|high|critical",
  "prediction_window_days": 30,
  "top_risk_factors": ["list of factors"],
  "preventive_actions": ["actionable prevention steps"],
  "confidence": 0.0-1.0
}"""

    user = f"""Category: {req.category}
Historical incidents (past 6 months): {req.historical_incidents}
Currently open incidents: {req.current_open_incidents}
Monsoon season active: {req.monsoon_season}
Days since last maintenance: {req.last_maintenance_days or 'unknown'}"""

    raw = await call_nemotron(system, user, temperature=0.3, task="prediction", entity_type="incident")
    data = extract_json(raw)

    return RiskPredictionResponse(
        risk_score=data.get("risk_score", 50.0),
        risk_level=data.get("risk_level", "moderate"),
        prediction_window_days=data.get("prediction_window_days", 30),
        top_risk_factors=data.get("top_risk_factors", []),
        preventive_actions=data.get("preventive_actions", []),
        confidence=data.get("confidence", 0.6),
    )

# ─── ENGINE 7: City Index Scoring ─────────────────────────────

class CityIndexRequest(BaseModel):
    city_id: str
    period_days: int = 30

class CityIndexResponse(BaseModel):
    overall_score: float
    sub_scores: Dict[str, float]
    trend: str  # "improving" | "declining" | "stable"
    key_achievements: List[str]
    key_concerns: List[str]
    narrative: str

@app.post("/city-index/score", response_model=CityIndexResponse)
async def compute_city_index(req: CityIndexRequest):
    """Engine 7: Compute comprehensive city health index"""

    if not db_pool:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Gather city data
    stats = await db_pool.fetchrow(
        """SELECT
            COUNT(*) FILTER (WHERE status = 'resolved')::float /
              NULLIF(COUNT(*), 0) * 100 as resolution_rate,
            COUNT(*) FILTER (WHERE status = 'active') as active_incidents,
            COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active') as critical_active,
            COUNT(DISTINCT ward_id) as affected_wards
           FROM civic_incidents
           WHERE city_id = $1 AND created_at > NOW() - INTERVAL '30 days'""",
        req.city_id
    )

    report_stats = await db_pool.fetchrow(
        """SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as unique_reporters
           FROM reports r
           JOIN wards w ON r.ward_id = w.id
           WHERE w.city_id = $1 AND r.created_at > NOW() - INTERVAL '30 days'""",
        req.city_id
    )

    resolution_rate = float(stats['resolution_rate'] or 0)
    participation = min(float(report_stats['unique_reporters'] or 0) / 1000, 1.0) * 100

    system = """You are a city health analyst. Given civic metrics, generate a comprehensive health index.
Respond with JSON:
{
  "overall_score": 0-100,
  "sub_scores": {"cleanliness": 0-100, "roads": 0-100, "water": 0-100, "safety": 0-100, "satisfaction": 0-100},
  "trend": "improving|declining|stable",
  "key_achievements": ["list"],
  "key_concerns": ["list"],
  "narrative": "2-sentence city health narrative"
}"""

    user = f"""City metrics (last 30 days):
Resolution rate: {resolution_rate:.1f}%
Active incidents: {stats['active_incidents']}
Critical active: {stats['critical_active']}
Citizen reports: {report_stats['total']}
Unique reporters: {report_stats['unique_reporters']}
Citizen participation index: {participation:.1f}/100"""

    raw = await call_nemotron(system, user, temperature=0.3)
    data = extract_json(raw)

    return CityIndexResponse(
        overall_score=data.get("overall_score", resolution_rate),
        sub_scores=data.get("sub_scores", {}),
        trend=data.get("trend", "stable"),
        key_achievements=data.get("key_achievements", []),
        key_concerns=data.get("key_concerns", []),
        narrative=data.get("narrative", "City health data being analyzed."),
    )

# ─── ENGINE 8: Multilingual NLG (Response Generation) ────────

class NLGRequest(BaseModel):
    purpose: str  # "demand_summary" | "resolution_notification" | "escalation_alert" | "monthly_report"
    data: Dict[str, Any]
    language: str = "en"  # "hi" | "en"
    audience: str = "citizen"  # "citizen" | "officer" | "ngo" | "media"

class NLGResponse(BaseModel):
    text: str
    subject: Optional[str]
    push_notification_text: Optional[str]

@app.post("/nlg/generate", response_model=NLGResponse)
async def generate_text(req: NLGRequest):
    """Engine 8: Multilingual natural language generation for notifications & reports"""

    lang_instruction = "Respond in Hindi (Devanagari script)" if req.language == "hi" else "Respond in simple English"

    system = f"""You are a civic communication specialist writing for {req.audience}s.
{lang_instruction}. Keep language accessible, factual, and empathetic.
Purpose: {req.purpose}
Respond with JSON: {{"text": "...", "subject": "optional short subject/title", "push_notification_text": "50 chars max"}}"""

    user = f"Generate {req.purpose} communication based on: {json.dumps(req.data, ensure_ascii=False)}"

    raw = await call_nemotron(system, user, temperature=0.5, max_tokens=1024, task="summarization", entity_type="notification")
    data = extract_json(raw)

    return NLGResponse(
        text=data.get("text", ""),
        subject=data.get("subject"),
        push_notification_text=data.get("push_notification_text"),
    )

# ─── Health Check ─────────────────────────────────────────────

@app.get("/healthz")
async def health():
    return {
        "status": "ok",
        "service": "sahay-ai-services",
        "engines": ["nlu", "clustering", "root-cause", "priority", "verification", "predictions", "city-index", "nlg"],
        "model": NVIDIA_MODEL,
        "db_connected": db_pool is not None,
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/")
async def root():
    return {"message": "Sahay AI Services — 8 civic intelligence engines", "docs": "/docs"}
