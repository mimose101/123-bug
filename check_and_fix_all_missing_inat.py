#!/usr/bin/env python3
"""
自动检查 data.js 中所有未配置 iNaturalist 数据节点的物种：
1. 提取其拉丁学名或中文名。
2. 搜索 iNaturalist 数据库尝试自动匹配 Taxon ID。
3. 如果匹配成功且官方有生态照片，则自动下载、本地化压缩并更新 data.js。
"""
import json
import os
import re
import sys
import urllib.request
import urllib.parse
import time
import random
from PIL import Image
import concurrent.futures

sys.stdout.reconfigure(encoding='utf-8')

def search_inat_taxon(query_str):
    url = f"https://api.inaturalist.org/v1/taxa?q={urllib.parse.quote(query_str)}"
    headers = {"User-Agent": "Mozilla/5.0"}
    max_retries = 5
    for retry in range(max_retries):
        try:
            time.sleep(random.uniform(0.1, 1.0))
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                results = res_data.get("results", [])
                if results:
                    for r in results:
                        return r.get("id"), r.get("name"), r.get("preferred_common_name", r.get("english_common_name", ""))
                    return results[0].get("id"), results[0].get("name"), results[0].get("preferred_common_name", "")
                return None
        except Exception as e:
            if "429" in str(e):
                sleep_time = 4 + retry * 4 + random.uniform(1.0, 3.0)
                print(f"    搜索 Taxon 限流 (429)，等待 {sleep_time:.1f}s 后重试 {retry+1}/{max_retries}...")
                time.sleep(sleep_time)
            else:
                print(f"    搜索 Taxon 失败 ({query_str}): {e}")
                return None
    return None

def fetch_inat_photos(taxon_id):
    # 使用 order_by=votes 降序拉取最多 30 个观察记录，以挑选最受欢迎（faved）的生态照片
    url = f"https://api.inaturalist.org/v1/observations?taxon_id={taxon_id}&photos=true&per_page=30&quality_grade=research,casual&order_by=votes&order=desc"
    headers = {"User-Agent": "Mozilla/5.0"}
    max_retries = 5
    for retry in range(max_retries):
        try:
            time.sleep(random.uniform(0.1, 1.2))
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                results = res_data.get("results", [])
                
                # 双重保险：在内存中显式按 faves 列表长度或 faves_count 字段降序二次排序
                results.sort(key=lambda x: max(len(x.get("faves", [])), x.get("faves_count", 0)), reverse=True)
                
                photos_list = []
                for obs in results:
                    for p in obs.get("photos", []):
                        img_url = p.get("url")
                        attribution = p.get("attribution")
                        if img_url and attribution:
                            # 过滤声音频谱图上传者 (orthoptera-jp)
                            if "orthoptera-jp" in attribution.lower():
                                continue
                            medium_url = img_url.replace("square.jpg", "medium.jpg").replace("square.jpeg", "medium.jpeg").replace("square.png", "medium.png")
                            large_url = img_url.replace("square.jpg", "large.jpg").replace("square.jpeg", "large.jpeg").replace("square.png", "large.png")
                            # 防止照片 URL 重复
                            if not any(x['url'] == medium_url for x in photos_list):
                                photos_list.append({
                                    "url": medium_url,
                                    "largeUrl": large_url,
                                    "attribution": attribution
                                })
                        if len(photos_list) >= 5:
                            break
                    if len(photos_list) >= 5:
                        break
                return photos_list
        except Exception as e:
            if "429" in str(e):
                sleep_time = 4 + retry * 4 + random.uniform(1.0, 3.0)
                print(f"    [TaxonID {taxon_id}] 抓取照片限流 (429)，等待 {sleep_time:.1f}s 后重试 {retry+1}/{max_retries}...")
                time.sleep(sleep_time)
            else:
                print(f"    获取照片失败 (TaxonID {taxon_id}): {e}")
                return []
    print(f"    [TaxonID {taxon_id}] 抓取照片重试多次失败。")
    return []

def process_item(item, headers):
    html = item.get("textHtml", "")
    match = re.search(r'id="i(\d+)"', html)
    if not match:
        return False
    species_id = int(match.group(1))

    if "inaturalist" in item:
        inat_data = item["inaturalist"]
        if len(inat_data.get("photos", [])) >= 5 or inat_data.get("checked_for_5"):
            return False

    h3_match = re.search(r'<h3[^>]*>([\s\S]*?)</h3>', html)
    if not h3_match:
        return False
    
    inner = h3_match.group(1).strip()
    title_match = re.search(r'^\s*\d+\s*[\.．]\s*([^\s（(\(：:]+)(?:[\(（]([^）\)]+)[\)）])?', inner)
    if not title_match:
        return False

    chinese_name = title_match.group(1)
    latin_name = title_match.group(2) if title_match.group(2) else ""
    
    if latin_name:
        latin_name = re.sub(r'[^a-zA-Z\s]', '', latin_name).strip()
        latin_name = re.sub(r'\s+', ' ', latin_name)

    print(f"\n[#{species_id}] 发现未匹配或需补充照片种类: {chinese_name} | 拉丁名: {latin_name}")
    
    taxon_id = None
    scientific_name = None
    display_name = None

    if "inaturalist" in item and item["inaturalist"].get("taxonId"):
        taxon_id = item["inaturalist"]["taxonId"]
        scientific_name = item["inaturalist"].get("name", "")
        display_name = item["inaturalist"].get("displayName", "")
        print(f"  [#{species_id}] 📦 使用已有的 TaxonID: {taxon_id} | Name: {scientific_name}")

    if not taxon_id and latin_name:
        res = search_inat_taxon(latin_name)
        if res:
            taxon_id, scientific_name, display_name = res
            print(f"    [#{species_id}] ✅ 匹配成功! TaxonID: {taxon_id} | Name: {scientific_name}")
    
    if not taxon_id:
        res = search_inat_taxon(chinese_name)
        if res:
            taxon_id, scientific_name, display_name = res
            print(f"    [#{species_id}] ✅ 匹配成功! TaxonID: {taxon_id} | Name: {scientific_name}")

    if not taxon_id:
        print(f"  [#{species_id}] ❌ 无法在 iNaturalist 上找到匹配物种。")
        return False

    api_photos = fetch_inat_photos(taxon_id)
    if not api_photos:
        print(f"  [#{species_id}] ⚠️ 该物种在 iNaturalist 上暂无公开的生态观察图片")
        item["inaturalist"] = {
            "taxonId": taxon_id,
            "displayName": display_name or chinese_name,
            "name": scientific_name,
            "photos": [],
            "checked_for_5": True
        }
        return True

    local_photos = []
    for p_idx, photo_info in enumerate(api_photos, 1):
        remote_url = photo_info["url"]
        large_url = photo_info.get("largeUrl", remote_url)
        attribution = photo_info["attribution"]

        ext = ".jpg" if "jpg" in remote_url.lower() else ".jpeg"
        filename = f"inat_i{species_id}_{p_idx}{ext}"
        local_path = os.path.join("images/inat", filename)

        try:
            req = urllib.request.Request(remote_url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                img_data = resp.read()
            
            with open(local_path, "wb") as img_f:
                img_f.write(img_data)
            
            with Image.open(local_path) as img:
                img.save(local_path, "JPEG", quality=75, optimize=True)
            
            local_photos.append({
                "url": f"images/inat/{filename}",
                "largeUrl": large_url,
                "attribution": attribution
            })
        except Exception as e:
            print(f"    [#{species_id}] ❌ 下载/压缩照片 {p_idx} 失败: {e}")

    item["inaturalist"] = {
        "taxonId": taxon_id,
        "displayName": display_name or chinese_name,
        "name": scientific_name,
        "photos": local_photos,
        "checked_for_5": True
    }
    print(f"  [#{species_id}] 🎉 成功缓存了 {len(local_photos)} 张生态照！")
    return True

def main():
    print("========== 开始自适应限速多线程补全 iNaturalist 鸣虫数据 ==========")

    with open("data.js", "r", encoding="utf-8") as f:
        content = f.read().strip()
    
    prefix = "const insectData = "
    json_str = content[len(prefix):].strip()
    if json_str.endswith(";"):
        json_str = json_str[:-1].strip()

    data = json.loads(json_str)

    os.makedirs("images/inat", exist_ok=True)
    headers = {"User-Agent": "Mozilla/5.0"}
    
    updated_count = 0

    items_to_process = []
    for item in data:
        html = item.get("textHtml", "")
        match = re.search(r'id="i(\d+)"', html)
        if not match:
            continue
        
        if "inaturalist" in item:
            inat_data = item["inaturalist"]
            if len(inat_data.get("photos", [])) >= 5 or inat_data.get("checked_for_5"):
                continue
        items_to_process.append(item)

    if not items_to_process:
        print("\n所有物种已配置最新 iNaturalist 数据，无需更新。")
        return

    print(f"共发现 {len(items_to_process)} 个物种需要抓取/补全 iNaturalist 数据，启动限速线程池...")

    # 并发度设为 3，温和抓取防封
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(process_item, item, headers): item for item in items_to_process}
        
        for future in concurrent.futures.as_completed(futures):
            item = futures[future]
            try:
                updated = future.result()
                if updated:
                    updated_count += 1
                    # 实时写入 data.js，支持断点续传和进度查看
                    output = prefix + json.dumps(data, ensure_ascii=False, indent=2) + ";"
                    with open("data.js", "w", encoding="utf-8") as f:
                        f.write(output)
            except Exception as e:
                print(f"处理物种时发生未捕获异常: {e}")

    if updated_count > 0:
        print(f"\n[DONE] 自适应修补完成，共更新了 {updated_count} 个物种 of iNaturalist 数据")
    else:
        print("\n未发现需要更新的数据。")

if __name__ == "__main__":
    main()
