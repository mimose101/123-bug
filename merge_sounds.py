#!/usr/bin/env python3
"""
将 sounds.json 中的叫声数据合并到 data.js 中对应的品种条目。
"""
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. 读取 sounds.json
with open("sounds.json", encoding="utf-8") as f:
    sounds = json.load(f)
print(f"[INFO] sounds.json 中共有 {len(sounds)} 条叫声数据")

# 2. 读取 data.js
with open("data.js", encoding="utf-8") as f:
    content = f.read().strip()
prefix = "const insectData = "
json_str = content[len(prefix):].strip()
if json_str.endswith(";"):
    json_str = json_str[:-1].strip()
data = json.loads(json_str)
print(f"[INFO] data.js 中共有 {len(data)} 条品种数据")

# 3. 合并
merged = 0
for idx_str, audio_obj in sounds.items():
    idx = int(idx_str)
    if idx < len(data):
        data[idx]["audio"] = audio_obj
        merged += 1
        print(f"  ✅ 索引 {idx}: 注入叫声 XC{audio_obj['id']} ({audio_obj['quality']}级)")

# 4. 写回 data.js
output = prefix + json.dumps(data, ensure_ascii=False, indent=2) + ";"
with open("data.js", "w", encoding="utf-8") as f:
    f.write(output)

print(f"\n[DONE] 成功合并 {merged} 条叫声数据到 data.js")
