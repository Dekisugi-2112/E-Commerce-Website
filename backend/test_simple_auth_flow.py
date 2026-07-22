import os
import uuid
import hashlib
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

# Test creating simple user in profiles table
test_email = "simple_user_test@gmail.com"
test_pass = "123456"
pass_hash = hashlib.sha256(test_pass.encode()).hexdigest()
new_id = str(uuid.uuid4())

print("Testing Direct Profiles Table Auth...")

try:
    # Try inserting directly into profiles table
    data = {
        "id": new_id,
        "email": test_email,
        "password_hash": pass_hash,
        "full_name": "Simple Auth Test",
        "phone": "0987654321",
        "role": "customer"
    }
    res = supabase.table("profiles").upsert(data).execute()
    print("[SUCCESS] User created directly in profiles table!")
    print("Inserted data:", res.data)
except Exception as e:
    print("[ERROR]", str(e))
