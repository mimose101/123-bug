#!/usr/bin/env python3
"""
批量从 Xeno-Canto API v3 抓取鸣虫叫声数据，输出 sounds.json 缓存文件。
优先挑选 Quality A/B 级录音。
"""
import json, re, sys, time, urllib.request, urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

API_KEY = "412be279868afe0251bec221f71dccc2a3e1c76c"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# 1. 读取 data.js
with open("data.js", encoding="utf-8") as f:
    content = f.read().strip()
json_str = content[len("const insectData ="):].strip()
if json_str.endswith(";"):
    json_str = json_str[:-1].strip()
data = json.loads(json_str)
print(f"[INFO] 共加载 {len(data)} 条品种数据")

# 2. 提取拉丁学名
species_list = []
for idx, item in enumerate(data):
    if "audio" in item:
        continue  # 已有音频，跳过
    m = re.search(r'[（(]([A-Z][a-z]+ [a-z]+)', item["textHtml"])
    if m:
        latin = m.group(1).strip()
        # 过滤掉明显不合法的（如粘连名）
        if " " in latin and len(latin.split()) == 2:
            species_list.append((idx, latin))

print(f"[INFO] 需要查询叫声的品种: {len(species_list)} 种")

# 3. 批量查询 Xeno-Canto
results = {}
matched = 0
for i, (idx, latin) in enumerate(species_list):
    q_str = f'sp:"{latin}"'
    encoded_q = urllib.parse.quote(q_str)
    url = f"https://xeno-canto.org/api/3/recordings?query={encoded_q}&key={API_KEY}"
    
    for attempt in range(2):  # 最多重试1次
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
            break
        except Exception as e:
            if attempt == 0:
                print(f"  [RETRY] {latin}: {e}")
                time.sleep(1)
            else:
                print(f"  [FAIL] {latin}: {e}")
                res_json = {"numRecordings": "0", "recordings": []}
    
    num = int(res_json.get("numRecordings", 0))
    recordings = res_json.get("recordings", [])
    
    if num > 0 and recordings:
        # 优先选择 A/B 级品质
        best = None
        for rec in recordings:
            q = rec.get("q", "")
            if q == "A":
                best = rec
                break
        if not best:
            for rec in recordings:
                q = rec.get("q", "")
                if q == "B":
                    best = rec
                    break
        if not best:
            best = recordings[0]  # 没有 A/B 就用第一条
        
        sono = best.get("sono", {})
        spec_url = sono.get("large") or sono.get("full") or sono.get("med") or ""
        file_url = best.get("file", "")
        # 确保 https
        if file_url.startswith("//"):
            file_url = "https:" + file_url
        if spec_url.startswith("//"):
            spec_url = "https:" + spec_url
            
        results[str(idx)] = {
            "id": str(best.get("id", "")),
            "file": file_url,
            "spectrogram": spec_url,
            "recordist": best.get("rec", "Unknown"),
            "quality": best.get("q", "?"),
            "length": best.get("length", "0:00")
        }
        matched += 1
        print(f"  [{i+1}/{len(species_list)}] ✅ {latin} -> XC{best.get('id')} ({best.get('q')}级, {best.get('length')})")
    else:
        print(f"  [{i+1}/{len(species_list)}] ❌ {latin} -> 无录音")
    
    time.sleep(0.4)  # 礼貌延迟

# 4. 保存结果
with open("sounds.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n[DONE] 共匹配成功 {matched}/{len(species_list)} 种鸣虫叫声，已保存至 sounds.json")
