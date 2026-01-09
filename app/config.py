"""Configuration settings for the application."""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # App settings
    app_name: str = "KUMC Anam Medical Portal"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # Security settings
    secret_key: str = os.environ.get("SECRET_KEY", "your-super-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    
    # KUMC API settings
    default_hospital_code: str = "AA"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
