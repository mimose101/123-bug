import json
import urllib.request

url = "https://api.inaturalist.org/v1/observations?taxon_id=507378&photos=true&per_page=5"
headers = {"User-Agent": "Mozilla/5.0"}
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        results = res_data.get("results", [])
        for i, obs in enumerate(results):
            # 打印每个 observation 的 id, faves 数量和 faves_count
            faves = obs.get("faves", [])
            faves_count_field = obs.get("faves_count", 0)
            print(f"Obs {i+1}: ID {obs.get('id')}, faves list len: {len(faves)}, faves_count field: {faves_count_field}")
except Exception as e:
    print(f"Error: {e}")
