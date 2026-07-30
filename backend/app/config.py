from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    firebase_credentials: str  # Nou!
    sender_email: str
    brevo_api_key: str=""
    cors_origins: str="*"
    class Config:
        env_file = ".env"
        extra = "ignore" # <-- Această linie salvează situația

settings = Settings()