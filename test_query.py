import json
import re

with open("data.js", "r", encoding="utf-8") as f:
    content = f.read().strip()

json_str = content[len("const insectData ="):].strip()
if json_str.endswith(";"):
    json_str = json_str[:-1].strip()

insect_list = json.loads(json_str)

def extract_species_info(text_html):
    h3_match = re.search(r'<h3[^>]*>([\s\S]*?)</h3>', text_html, re.IGNORECASE)
    if not h3_match:
        return {"status": "no_h3"}
    
    inner_html = h3_match.group(1).strip()
    title_match = re.match(r'^\s*(\d+)\s*[\.．]\s*([^\s（(\(：:]+)(?:[\(（]([^）\)]+)[\)）])?[\s：:]*', inner_html)
    if not title_match:
        return {"status": "no_title_match", "inner_html": inner_html}
        
    num = title_match.group(1)
    cn_name = title_match.group(2)
    latin_raw = title_match.group(3) or ''
    
    return {
        "status": "ok",
        "num": num,
        "cn_name": cn_name,
        "latin_name": latin_raw
    }

print("Testing first 10 items:")
for i in range(10):
    item = insect_list[i]
    info = extract_species_info(item.get("textHtml", ""))
    print(f"Item {i+1}: status={info['status']}")
    if info['status'] == 'ok':
        print(f"  Num: {info['num']}, CN: {info['cn_name']}, Latin: {info['latin_name']}")
    elif info['status'] == 'no_title_match':
        print(f"  Inner HTML: {info['inner_html'][:100]}")
