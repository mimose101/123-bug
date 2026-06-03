import json

try:
    with open("data.js", "r", encoding="utf-8") as f:
        content = f.read().strip()
        
    if content.startswith("const insectData ="):
        json_str = content[len("const insectData ="):].strip()
        if json_str.endswith(";"):
            json_str = json_str[:-1].strip()
            
        data = json.loads(json_str)
        print("Success! Parsed data.js as JSON list.")
        print(f"Number of items: {len(data)}")
        print("First item keys:", data[0].keys())
    else:
        print("data.js does not start with const insectData =")
except Exception as e:
    print("Error:", e)
