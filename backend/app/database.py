"""
GlucoTwin — SQLite Database & Persistence Layer
Happiest Health Digital Twin Challenge 2026

Zero-configuration local SQLite database for storing patient profiles,
continuous sensor observations, twin states, predictions, and simulation sessions.
"""

import json
from datetime import datetime
from pathlib import Path
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    Float,
    String,
    Text,
    DateTime,
    Boolean,
    Index,
)
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "glucotwin.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PatientModel(Base):
    __tablename__ = "patients"
    
    patient_id = Column(String(32), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    archetype = Column(String(64), nullable=False)
    description = Column(Text, nullable=True)
    age = Column(Integer, nullable=False)
    sex = Column(String(16), nullable=False)
    BMI = Column(Float, nullable=False)
    diabetes_duration_years = Column(Integer, nullable=False)
    HbA1c = Column(Float, nullable=False)
    baseline_glucose = Column(Float, nullable=False)
    baseline_hr = Column(Float, nullable=False)
    baseline_hrv = Column(Float, nullable=False)
    medications_json = Column(Text, default="[]")
    comorbidities_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

class SensorObservationModel(Base):
    __tablename__ = "sensor_observations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(32), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    glucose = Column(Float, nullable=True)
    hr = Column(Float, nullable=True)
    hrv = Column(Float, nullable=True)
    steps = Column(Integer, default=0)
    activity_intensity = Column(Float, default=0.0)
    sleep_quality = Column(Float, default=0.0)
    meal_carbs = Column(Float, default=0.0)
    sensor_status = Column(String(32), default="OK")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_patient_timestamp", "patient_id", "timestamp", unique=True),
    )

class TwinStateRecordModel(Base):
    __tablename__ = "twin_states"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(32), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    current_glucose = Column(Float, nullable=False)
    glucose_velocity = Column(Float, nullable=False)
    glucose_acceleration = Column(Float, nullable=False)
    hr = Column(Float, nullable=False)
    hrv = Column(Float, nullable=False)
    steps_30m = Column(Float, default=0.0)
    activity_intensity = Column(Float, default=0.0)
    sleep_quality = Column(Float, default=0.0)
    glucose_dev_base = Column(Float, nullable=False)
    hr_dev_base = Column(Float, nullable=False)
    hrv_dev_base = Column(Float, nullable=False)
    metabolic_stability = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_category = Column(String(32), nullable=False)
    eta_minutes = Column(Float, nullable=True)
    explanations_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

class SimulationSessionModel(Base):
    __tablename__ = "simulation_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(32), index=True, nullable=False)
    is_active = Column(Boolean, default=False)
    current_step_idx = Column(Integer, default=0)
    speed_multiplier = Column(Float, default=1.0)
    last_tick_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    """Initializes tables in SQLite database."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency helper for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
