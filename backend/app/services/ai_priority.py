import json
import logging
import time
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from groq import Groq
from app.core.config import settings
from app.services.emergency_checker import check_emergency

logger = logging.getLogger(__name__)

# Predefined keyword to numeric score map for LLM responses
WORD_SCORES = {
    "critical": 95,
    "life_safety": 98,
    "emergency": 98,
    "urgent": 90,
    "immediate": 95,
    "high": 80,
    "severe": 85,
    "substantial": 75,
    "moderate": 60,
    "medium": 55,
    "low": 30,
    "minor": 20,
    "negligible": 10
}


def parse_score(val: Any, default: int = 50) -> int:
    """Parse integer, float, or textual severity level into 0-100 bounded score."""
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return max(0, min(100, int(round(val))))
    if isinstance(val, str):
        val_clean = val.strip().lower()
        if val_clean.isdigit():
            return max(0, min(100, int(val_clean)))
        for word, score in WORD_SCORES.items():
            if word in val_clean:
                return score
    return default


class AIAnalysisResult(BaseModel):
    severity: int = Field(..., ge=0, le=100)
    urgency: int = Field(..., ge=0, le=100)
    public_impact: int = Field(..., ge=0, le=100)
    safety_risk: int = Field(..., ge=0, le=100)
    priority_score: int = Field(..., ge=0, le=100)
    priority_level: str
    emergency: bool
    ai_reason: str
    ai_provider: str


def clamp(val: Any, min_val: int = 0, max_val: int = 100) -> int:
    """Clamp value between min and max bounds."""
    return parse_score(val, default=50)


def calculate_priority_level(score: int) -> str:
    """Map numeric score (0-100) to standard priority level."""
    if score >= 90:
        return "CRITICAL"
    elif score >= 75:
        return "HIGH"
    elif score >= 50:
        return "MEDIUM"
    else:
        return "LOW"


def calculate_backend_score(severity: int, urgency: int, public_impact: int, safety_risk: int) -> int:
    """
    Deterministic backend calculation:
    Severity = 25%
    Urgency = 25%
    Public Impact = 20%
    Safety Risk = 30%
    """
    score = (severity * 0.25) + (urgency * 0.25) + (public_impact * 0.20) + (safety_risk * 0.30)
    return clamp(round(score))


def heuristic_analysis(title: str, description: str, department_name: str) -> Dict[str, Any]:
    """
    High-accuracy heuristic fallback when Groq API is not configured or unavailable.
    """
    text = f"{title} {description}".lower()
    
    # Base baseline scores
    severity = 50
    urgency = 50
    public_impact = 45
    safety_risk = 45

    # Safety indicators
    if any(k in text for k in ["hazard", "danger", "electrocution", "shock", "fire", "injury", "injured", "hospital", "collapsed"]):
        safety_risk += 35
        severity += 25
        urgency += 25
    elif any(k in text for k in ["accident", "fall", "bike", "crash", "tripped", "hole", "sinkhole", "deep"]):
        safety_risk += 25
        urgency += 20

    # Urgency indicators
    if any(k in text for k in ["urgent", "immediately", "immediate", "emergency", "now", "critical", "rapid"]):
        urgency += 25
    elif any(k in text for k in ["days", "week", "month", "minor", "aesthetic"]):
        urgency -= 15

    # Public impact indicators
    if any(k in text for k in ["school", "main road", "junction", "hospital", "bus stop", "market", "thousands", "hundreds", "highway"]):
        public_impact += 35
    elif any(k in text for k in ["neighborhood", "street", "colony", "community", "apartment"]):
        public_impact += 15

    # Department specific weightings
    dept_lower = department_name.lower()
    if "electric" in dept_lower or "kseb" in dept_lower:
        safety_risk += 15
    elif "food" in dept_lower:
        severity += 15
    elif "road" in dept_lower:
        public_impact += 10

    sev = clamp(severity)
    urg = clamp(urgency)
    imp = clamp(public_impact)
    risk = clamp(safety_risk)

    score = calculate_backend_score(sev, urg, imp, risk)
    level = calculate_priority_level(score)

    reason = f"Automated civic evaluation for {department_name}: severity ({sev}/100), urgency ({urg}/100), public impact ({imp}/100), safety risk ({risk}/100)."

    return {
        "severity": sev,
        "urgency": urg,
        "public_impact": imp,
        "safety_risk": risk,
        "priority_score": score,
        "priority_level": level,
        "emergency": False,
        "ai_reason": reason,
        "ai_provider": "civicpulse:heuristic-engine"
    }


def analyze_complaint(title: str, description: str, department_name: str) -> AIAnalysisResult:
    """
    Comprehensive Complaint Prioritization:
    1. Emergency Safety Rule Engine Check (Deterministic priority override)
    2. Groq LLM Evaluation (JSON schema enforced) with fallback heuristic
    3. Backend score formula enforcement
    4. Emergency clamp and priority level assignment
    """
    # 1. Deterministic Emergency Rule Check
    is_emergency, emergency_category, emergency_rule_reason = check_emergency(title, description)

    groq_api_key = settings.GROQ_API_KEY
    analysis_data: Optional[Dict[str, Any]] = None
    ai_provider = "civicpulse:heuristic-engine"

    # Active chat models on Groq in priority order
    CANDIDATE_MODELS = [
        "qwen/qwen3.8-27b",
        "groq/compound",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-120b"
    ]

    if groq_api_key and groq_api_key.strip() and not groq_api_key.startswith("your_"):
        for model_name in CANDIDATE_MODELS:
            try:
                print("\n" + "=" * 75, flush=True)
                print(f"[CIVICPULSE AI] CALLING GROQ AI CLOUD PRIORITIZER", flush=True)
                print(f"   * Complaint:   \"{title[:60]}\"", flush=True)
                print(f"   * Department:  {department_name}", flush=True)
                print(f"   * Groq Model:  {model_name}", flush=True)
                print(f"   * Status:      Sending request to Groq LPUs...", flush=True)

                client = Groq(api_key=groq_api_key)
                prompt = f"""
You are a public safety complaint prioritization assistant for the smart-city platform CivicPulse AI.
Analyze the following citizen complaint for the department "{department_name}":

Title: {title}
Description: {description}

Estimate the following attributes on a scale from 0 to 100:
- severity (0 to 100): Physical scale, structural damage, or intensity of the defect.
- urgency (0 to 100): How quickly the situation will escalate if unaddressed.
- public_impact (0 to 100): Number of citizens, commuters, or public facilities affected.
- safety_risk (0 to 100): Direct bodily danger, hazard, fire risk, or electrocution risk.

Return ONLY a valid JSON object matching this exact schema:
{{
  "severity": <integer 0-100>,
  "urgency": <integer 0-100>,
  "public_impact": <integer 0-100>,
  "safety_risk": <integer 0-100>,
  "emergency": <true/false>,
  "reason": "<Brief, clear 1-2 sentence professional explanation of why this priority was assigned>"
}}
Do NOT invent facts not present in the complaint text.
Prioritize situations involving immediate danger to life, electricity hazards, fire, explosions, major accidents, structural collapse, and public health contamination.
"""
                t_start = time.time()
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": "You are a public safety complaint prioritization assistant. Always return valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=300
                )
                t_elapsed_ms = (time.time() - t_start) * 1000

                raw_content = response.choices[0].message.content
                parsed = json.loads(raw_content)

                sev = parse_score(parsed.get("severity", 50))
                urg = parse_score(parsed.get("urgency", 50))
                imp = parse_score(parsed.get("public_impact", 50))
                risk = parse_score(parsed.get("safety_risk", 50))
                ai_emergency = bool(parsed.get("emergency", False))
                reason = str(parsed.get("reason", "Analyzed by Groq AI Priority Engine."))

                score = calculate_backend_score(sev, urg, imp, risk)
                level = calculate_priority_level(score)

                print(f"   [SUCCESS] GROQ RESPONSE RECEIVED in {t_elapsed_ms:.0f}ms!", flush=True)
                print(f"   [METRICS] Severity: {sev}/100 | Urgency: {urg}/100 | Public Impact: {imp}/100 | Safety Risk: {risk}/100", flush=True)
                print(f"   [PRIORITY] Score: {score}/100 ({level}) | Groq Emergency: {ai_emergency}", flush=True)
                print(f"   [REASON] \"{reason}\"", flush=True)
                print("=" * 75 + "\n", flush=True)

                analysis_data = {
                    "severity": sev,
                    "urgency": urg,
                    "public_impact": imp,
                    "safety_risk": risk,
                    "priority_score": score,
                    "priority_level": level,
                    "emergency": ai_emergency,
                    "ai_reason": reason,
                    "ai_provider": f"groq:{model_name}"
                }
                ai_provider = f"groq:{model_name}"
                break
            except Exception as e:
                logger.warning(f"Groq API with model {model_name} failed: {e}")
                print(f"   [WARNING] Groq model {model_name} failed ({e}). Trying next model...", flush=True)
                continue

    if not analysis_data:
        print("\n" + "=" * 75, flush=True)
        print("[CIVICPULSE AI] Groq cloud unavailable; activating Heuristic Fallback Engine.", flush=True)
        print("=" * 75 + "\n", flush=True)
        analysis_data = heuristic_analysis(title, description, department_name)
        ai_provider = analysis_data["ai_provider"]

    # 3. Emergency Safety Rule Override (CRITICAL REQUIREMENT)
    # If the deterministic emergency checker detects a dangerous situation, override priority to CRITICAL.
    if is_emergency:
        analysis_data["emergency"] = True
        analysis_data["safety_risk"] = max(analysis_data["safety_risk"], 95)
        analysis_data["urgency"] = max(analysis_data["urgency"], 95)
        # Boost priority score to top tier [95-100]
        recomputed_score = calculate_backend_score(
            analysis_data["severity"],
            analysis_data["urgency"],
            analysis_data["public_impact"],
            analysis_data["safety_risk"]
        )
        analysis_data["priority_score"] = max(recomputed_score, 96)
        analysis_data["priority_level"] = "CRITICAL"
        prefix = f"[EMERGENCY OVERRIDE - {emergency_category}]: {emergency_rule_reason}"
        if not analysis_data["ai_reason"].startswith("[EMERGENCY"):
            analysis_data["ai_reason"] = f"{prefix} {analysis_data['ai_reason']}"
        analysis_data["ai_provider"] += " + emergency-override-engine"
        print(f"   [EMERGENCY SAFETY OVERRIDE ACTIVE] Score: {analysis_data['priority_score']}/100 (CRITICAL)\n", flush=True)

    return AIAnalysisResult(
        severity=analysis_data["severity"],
        urgency=analysis_data["urgency"],
        public_impact=analysis_data["public_impact"],
        safety_risk=analysis_data["safety_risk"],
        priority_score=analysis_data["priority_score"],
        priority_level=analysis_data["priority_level"],
        emergency=analysis_data["emergency"],
        ai_reason=analysis_data["ai_reason"],
        ai_provider=analysis_data.get("ai_provider", ai_provider)
    )
