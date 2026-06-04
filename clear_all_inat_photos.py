import json
import re

with open("data.js", "r", encoding="utf-8") as f:
    content = f.read().strip()

prefix = "const insectData = "
json_str = content[len(prefix):].strip()
if json_str.endswith(";"):
    json_str = json_str[:-1].strip()

data = json.loads(json_str)

cleared_count = 0
for item in data:
    if "inaturalist" in item:
        # 只保留已配置好的分类基本信息，清空已下载照片列表，以迫使下载脚本重新从 iNaturalist 获取最优质的照片
        inat = item["inaturalist"]
        inat["photos"] = []
        if "checked_for_5" in inat:
            del inat["checked_for_5"]
        cleared_count += 1

output = prefix + json.dumps(data, ensure_ascii=False, indent=2) + ";"
with open("data.js", "w", encoding="utf-8") as f:
    f.write(output)

print(f"[OK] 成功清空了 {cleared_count} 个已匹配物种的照片缓存配置，准备执行点赞数降序精选重下！")
