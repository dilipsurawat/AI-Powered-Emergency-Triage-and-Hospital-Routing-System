# main.py - FINAL WORKING VERSION with gemini-3.5-flash
import os
import json
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from google import genai
from google.genai import types
import uvicorn
from dotenv import load_dotenv

load_dotenv()

# Import hospital matcher
from hospital_matcher import hospital_matcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Emergency Triage - Indore")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

# Models
class PatientTriageRequest(BaseModel):
    voice_text: str = Field(..., min_length=2)
    lat: float = Field(...)
    lng: float = Field(...)
    
    @field_validator('voice_text')
    @classmethod
    def validate_text(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Symptoms text too short')
        return v.strip()

class TriageAIOutput(BaseModel):
    symptoms: List[str]
    esi_level: int
    specialty: str
    patient_instruction: str
    risk_factors: List[str]

class HospitalRecommendation(BaseModel):
    id: str
    name: str
    type: str
    distance_km: float
    eta_minutes: int
    wait_time_minutes: int
    has_icu: bool
    icu_beds_available: int
    has_ventilator: bool
    phone: str
    address: str
    rating: float
    match_score: float
    specialty_match: bool
    price_level: str

class EmergencyResponse(BaseModel):
    success: bool
    request_id: str
    timestamp: str
    city: str
    patient_symptoms: str
    severity_level: int
    severity_text: str
    required_specialty: str
    patient_instruction: str
    risk_factors: List[str]
    recommended_hospital: Optional[HospitalRecommendation]
    alternative_hospitals: List[HospitalRecommendation]
    ambulance_needed: bool
    ambulance_info: dict
    message: str

SEVERITY_MAP = {
    1: {"text": "🔴 CRITICAL - Life Threatening Emergency", "ambulance": True},
    2: {"text": "🟠 HIGH RISK - Serious Emergency", "ambulance": True},
    3: {"text": "🟡 URGENT - Needs Medical Attention", "ambulance": False},
    4: {"text": "🟢 LESS URGENT - Visit Clinic", "ambulance": False},
    5: {"text": "✅ NON-URGENT - Home Care", "ambulance": False}
}

# Rule-based fallback
def rule_based_triage(text: str) -> dict:
    text_lower = text.lower()
    
    # Critical - Cardiac
    if any(word in text_lower for word in ['chest pain', 'chhati dard', 'heart attack', 'dil ka daura', 'chest tightness', 'left arm pain']):
        return {
            "symptoms": ["chest pain", "possible cardiac issue"],
            "esi_level": 1,
            "specialty": "Cardiology",
            "patient_instruction": "🚨 CRITICAL! Possible heart attack. Call ambulance NOW! Patient should not move.",
            "risk_factors": ["Cardiac emergency", "Time sensitive"]
        }
    # Critical - Respiratory
    elif any(word in text_lower for word in ['not breathing', 'saans nahi', 'can\'t breathe', 'choking', 'ghut raha']):
        return {
            "symptoms": ["severe breathing difficulty"],
            "esi_level": 1,
            "specialty": "Emergency Medicine",
            "patient_instruction": "🚨 CRITICAL! Breathing emergency. Call ambulance immediately!",
            "risk_factors": ["Respiratory failure risk"]
        }
    # Critical - Neurological
    elif any(word in text_lower for word in ['unconscious', 'behoshi', 'stroke', 'lakwa', 'fit', 'seizure']):
        return {
            "symptoms": ["neurological emergency"],
            "esi_level": 1,
            "specialty": "Neurology",
            "patient_instruction": "🚨 CRITICAL! Possible stroke/seizure. Call ambulance NOW!",
            "risk_factors": ["Neurological emergency"]
        }
    # Critical - Trauma
    elif any(word in text_lower for word in ['severe bleeding', 'khoon nikal', 'accident', 'car crash', 'head injury']):
        return {
            "symptoms": ["trauma", "bleeding"],
            "esi_level": 1,
            "specialty": "Trauma Care",
            "patient_instruction": "🚨 CRITICAL! Trauma emergency. Call ambulance immediately! Apply pressure on bleeding.",
            "risk_factors": ["Severe injury", "Blood loss risk"]
        }
    # High Risk - Respiratory
    elif any(word in text_lower for word in ['breathing problem', 'saans lene me problem', 'asthma', 'dam', 'wheezing']):
        return {
            "symptoms": ["breathing difficulty"],
            "esi_level": 2,
            "specialty": "Respiratory Medicine",
            "patient_instruction": "⚠️ HIGH RISK! Visit emergency immediately. Keep patient sitting upright.",
            "risk_factors": ["Respiratory distress"]
        }
    # High Risk - Chest/Heart
    elif any(word in text_lower for word in ['chest discomfort', 'dil mein dard', 'palpitations', 'heart racing']):
        return {
            "symptoms": ["cardiac symptoms"],
            "esi_level": 2,
            "specialty": "Cardiology",
            "patient_instruction": "⚠️ HIGH RISK! Go to nearest hospital with cardiac facility immediately.",
            "risk_factors": ["Possible cardiac issue"]
        }
    # Medium - Fever
    elif any(word in text_lower for word in ['high fever', 'tez bukhar', '104', 'vomiting', 'ulti']):
        return {
            "symptoms": ["high fever with vomiting"],
            "esi_level": 3,
            "specialty": "General Medicine",
            "patient_instruction": "🟡 Visit hospital today. Keep patient hydrated. Monitor temperature.",
            "risk_factors": ["Dehydration risk", "Infection possible"]
        }
    # Medium - Pain
    elif any(word in text_lower for word in ['severe pain', 'tez dard', 'fracture', 'haddi tut', 'broken bone']):
        return {
            "symptoms": ["severe pain/fracture"],
            "esi_level": 3,
            "specialty": "Orthopedics",
            "patient_instruction": "🟡 Go to hospital for X-ray. Immobilize the affected area.",
            "risk_factors": ["Possible fracture"]
        }
    # Low
    elif any(word in text_lower for word in ['cold', 'cough', 'khansi', 'mild fever', 'halka bukhar', 'headache', 'sar dard']):
        return {
            "symptoms": ["mild symptoms"],
            "esi_level": 4,
            "specialty": "General Medicine",
            "patient_instruction": "🟢 Visit clinic if symptoms persist. Take rest and stay hydrated.",
            "risk_factors": []
        }
    # Default
    else:
        return {
            "symptoms": ["general symptoms"],
            "esi_level": 4,
            "specialty": "General Medicine",
            "patient_instruction": "Monitor your symptoms. Visit a clinic if condition worsens.",
            "risk_factors": []
        }

@app.get("/")
async def root():
    return {"service": "AI Emergency Triage - Indore", "status": "operational", "city": "Indore"}

@app.get("/api/v1/health")
async def health():
    return {"status": "healthy", "city": "Indore", "hospitals": len(hospital_matcher.hospitals)}

@app.post("/api/v1/triage")
async def perform_triage(request: PatientTriageRequest):
    request_id = f"TRIAGE_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    logger.info(f"[{request_id}] Processing: {request.voice_text}")
    
    ai_result = None
    
    try:
        # USING WORKING MODEL: gemini-3.5-flash
        response = client.models.generate_content(
            model='gemini-3.5-flash',  # From your list - THIS WORKS!
            contents=f"Patient symptoms: '{request.voice_text}'",
            config=types.GenerateContentConfig(
                system_instruction="""You are an emergency triage doctor. Analyze symptoms and return ONLY JSON.
                ESI Levels: 1=Critical(life threatening), 2=High Risk, 3=Urgent, 4=Less Urgent, 5=Non-Urgent
                Specialties: Cardiology, Neurology, Orthopedics, Pediatrics, General Medicine, Trauma, Respiratory Medicine
                Return exact JSON with fields: symptoms (list), esi_level (int), specialty (str), patient_instruction (str), risk_factors (list)""",
                response_mime_type="application/json",
                response_schema=TriageAIOutput,
                temperature=0.1
            ),
        )
        ai_result = json.loads(response.text)
        logger.info(f"[{request_id}] AI Success: ESI {ai_result['esi_level']}, {ai_result['specialty']}")
        
    except Exception as e:
        logger.warning(f"[{request_id}] AI Failed: {e}, using rule-based")
        ai_result = rule_based_triage(request.voice_text)
    
    # Hospital matching
    hospital_result = hospital_matcher.find_best_hospital(
        patient_lat=request.lat,
        patient_lng=request.lng,
        required_specialty=ai_result["specialty"],
        esi_level=ai_result["esi_level"],
        max_results=3
    )
    
    severity_info = SEVERITY_MAP.get(ai_result["esi_level"], SEVERITY_MAP[5])
    
    recommended = None
    if hospital_result["best_hospital"]:
        h = hospital_result["best_hospital"]
        recommended = HospitalRecommendation(
            id=h["id"], name=h["name"], type=h["type"],
            distance_km=h["match_details"]["distance_km"],
            eta_minutes=h["match_details"]["eta_minutes"],
            wait_time_minutes=h["current_wait_time_minutes"],
            has_icu=h["has_icu"], icu_beds_available=h["icu_beds_available"],
            has_ventilator=h["has_ventilator"], phone=h["phone"],
            address=h["address"], rating=h["rating"],
            match_score=h["match_score"],
            specialty_match=h["match_details"]["specialty_match"] == True,
            price_level=h["price_level"]
        )
    
    alternatives = []
    for alt in hospital_result["alternatives"]:
        alternatives.append(HospitalRecommendation(
            id=alt["id"], name=alt["name"], type=alt["type"],
            distance_km=alt["match_details"]["distance_km"],
            eta_minutes=alt["match_details"]["eta_minutes"],
            wait_time_minutes=alt["current_wait_time_minutes"],
            has_icu=alt["has_icu"], icu_beds_available=alt["icu_beds_available"],
            has_ventilator=alt["has_ventilator"], phone=alt["phone"],
            address=alt["address"], rating=alt["rating"],
            match_score=alt["match_score"],
            specialty_match=alt["match_details"]["specialty_match"] == True,
            price_level=alt["price_level"]
        ))
    
    ambulance_info = hospital_matcher.get_ambulance_info(request.lat, request.lng)
    
    return EmergencyResponse(
        success=True,
        request_id=request_id,
        timestamp=datetime.now().isoformat(),
        city="Indore",
        patient_symptoms=request.voice_text,
        severity_level=ai_result["esi_level"],
        severity_text=severity_info["text"],
        required_specialty=ai_result["specialty"],
        patient_instruction=ai_result["patient_instruction"],
        risk_factors=ai_result["risk_factors"],
        recommended_hospital=recommended,
        alternative_hospitals=alternatives,
        ambulance_needed=severity_info["ambulance"],
        ambulance_info=ambulance_info,
        message=ai_result["patient_instruction"]
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)