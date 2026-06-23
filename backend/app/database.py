from supabase import create_client, Client
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str

    class Config:
        env_file = ".env"


settings = Settings()

supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
