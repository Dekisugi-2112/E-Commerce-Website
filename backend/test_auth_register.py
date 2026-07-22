import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Explicitly load .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print(f"Testing Auth sign_up on Supabase: {url}")
supabase = create_client(url, key)

test_email = "testuser123@gmail.com"
test_pass = "123456"
test_name = "Test User"

try:
    res = supabase.auth.sign_up({
        "email": test_email,
        "password": test_pass,
        "options": {
            "data": {
                "full_name": test_name,
                "role": "customer"
            }
        }
    })
    print(f"Success! User ID: {res.user.id if res.user else 'None'}")
    print(f"Session: {res.session}")
    
    # Check if profile was inserted in public.profiles
    if res.user:
        prof = supabase.table("profiles").select("*").eq("id", res.user.id).execute()
        print(f"Profile in database: {prof.data}")
except Exception as e:
    print(f"Error signing up: {str(e)}")
