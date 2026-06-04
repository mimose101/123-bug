(function() {
    'use strict';

    // 全局视图模式状态变量：'combined' | 'list'
    let currentViewMode = localStorage.getItem('insect_view_mode') || 'combined';
    if (currentViewMode === 'specimen' || currentViewMode === 'grid') {
        currentViewMode = 'combined';
    }
    // 标本馆模式下各分类当前选中的鸣虫索引缓存：{ c1: 0, c2: 0, ... }
    let specimenActiveIndices = {};

    /* ==========================================================
       ✨ 1. 初始化背景粒子 (萤火虫)
       ========================================================== */
    function initFireflies() {
        const container = document.getElementById('firefliesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        const count = window.innerWidth <= 768 ? 10 : 25;
        
        for (let i = 0; i < count; i++) {
            const firefly = document.createElement('div');
            firefly.className = 'firefly';
            
            // 随机分配初始位置、动画时长和延迟
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const duration = 8 + Math.random() * 8;
            const delay = Math.random() * 5;
            
            firefly.style.left = `${left}vw`;
            firefly.style.top = `${top}vh`;
            firefly.style.animationDuration = `${duration}s`;
            firefly.style.animationDelay = `${delay}s`;
            
            container.appendChild(firefly);
        }
    }

    /* ==========================================================
       ☀️ / 🌙 2. 日夜主题切换逻辑
       ========================================================== */
    function initThemeToggle() {
        const btn = document.getElementById('themeToggleBtn');
        if (!btn) return;
        
        // 初始应用主题
        const savedTheme = localStorage.getItem('insect_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            btn.textContent = '☀️';
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            btn.textContent = '🌙';
        }
        
        btn.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark-theme');
            if (isDark) {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
                btn.textContent = '☀️';
                localStorage.setItem('insect_theme', 'light');
            } else {
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark-theme');
                btn.textContent = '🌙';
                localStorage.setItem('insect_theme', 'dark');
            }
        });
    }



    /* ==========================================================
       ★ 4. 侧滑标本盒收藏抽屉逻辑
       ========================================================== */
    function initSpecimenDrawer() {
        const btn = document.getElementById('specimenDrawerBtn');
        const drawer = document.getElementById('specimenDrawer');
        const overlay = document.getElementById('drawerOverlay');
        const closeBtn = document.getElementById('drawerCloseBtn');
        
        if (!btn || !drawer || !overlay || !closeBtn) return;
        
        function openDrawer() {
            drawer.classList.add('active');
            overlay.classList.add('active');
            renderDrawerFavorites();
        }
        
        function closeDrawer() {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
            // 关闭抽屉时，停止抽屉内的所有叫声播放
            stopDrawerAudios();
        }
        
        btn.addEventListener('click', openDrawer);
        overlay.addEventListener('click', closeDrawer);
        closeBtn.addEventListener('click', closeDrawer);
        
        // 更新浮动 badge 数量
        updateFloatingBadge();
    }

    function updateFloatingBadge() {
        const badge = document.getElementById('floatingBadge');
        if (badge) {
            badge.textContent = getFavorites().length;
        }
    }

    // 抽屉内专用的音频播放状态记录
    let drawerActiveAudio = null;
    let drawerActiveBtn = null;

    function stopDrawerAudios() {
        if (drawerActiveAudio) {
            drawerActiveAudio.pause();
            drawerActiveAudio = null;
        }
        if (drawerActiveBtn) {
            drawerActiveBtn.textContent = '▶ 播放';
            drawerActiveBtn.classList.remove('playing');
            drawerActiveBtn = null;
        }
    }

    function renderDrawerFavorites() {
        const content = document.getElementById('drawerContent');
        if (!content) return;
        
        const favs = getFavorites();
        if (favs.length === 0) {
            content.innerHTML = `
                <div class="empty-result" style="padding: 40px 10px; text-align: center; background: none; box-shadow: none;">
                    <div style="font-size: 2.2rem; margin-bottom: 12px;">📦</div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">您的标本盒是空的</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px;">在右侧物种卡片上点击心形图标即可收藏</div>
                </div>
            `;
            return;
        }
        
        content.innerHTML = '';
        
        favs.forEach(num => {
            const item = typeof insectData !== 'undefined' ? insectData.find(d => {
                const match = d.textHtml.match(/id="i(\d+)"/);
                return match && match[1] === num;
            }) : null;
            
            if (item) {
                const titleMatch = item.textHtml.match(/<h3[^>]*>[\s\S]*?\d+[\.．]\s*([^\s（(\(：:]+)(?:[\(（]([^）\)]+)[\)）])?/i);
                const cname = titleMatch ? titleMatch[1] : '未知鸣虫';
                const lname = titleMatch && titleMatch[2] ? titleMatch[2] : '';
                
                const card = document.createElement('div');
                card.className = 'drawer-fav-item';
                
                card.innerHTML = `
                    <div class="drawer-fav-title">
                        <div>
                            <span class="drawer-fav-name">${cname}</span>
                            ${lname ? `<span class="drawer-fav-latin">(${lname})</span>` : ''}
                        </div>
                        <button class="drawer-fav-delete" data-num="${num}" title="取消收藏">✕</button>
                    </div>
                    ${item.audio ? `
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button class="drawer-play-btn control-btn" style="width: auto; height: auto; border-radius: 20px; padding: 4px 12px; font-size: 0.72rem;" data-src="${item.audio.file}">▶ 播放</button>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">录制: ${item.audio.recordist}</span>
                        </div>
                    ` : '<span style="font-size:0.7rem; color: var(--text-muted);">暂无声音数据</span>'}
                `;
                
                // 取消收藏事件
                card.querySelector('.drawer-fav-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(num);
                    renderDrawerFavorites();
                });
                
                // 叫声对比播放
                const playBtn = card.querySelector('.drawer-play-btn');
                if (playBtn) {
                    playBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const src = playBtn.dataset.src;
                        
                        if (drawerActiveAudio && drawerActiveBtn === playBtn) {
                            // 暂停当前
                            drawerActiveAudio.pause();
                            playBtn.textContent = '▶ 播放';
                            playBtn.classList.remove('playing');
                            drawerActiveAudio = null;
                            drawerActiveBtn = null;
                        } else {
                            // 停止前一个
                            stopDrawerAudios();
                            
                            // 本地文件直接播放，远程文件走代理通道
                            let realSrc = src;
                            if (src.startsWith('http') && !src.includes('proxy')) {
                                realSrc = "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(src);
                            }
                            
                            const audio = new Audio(realSrc);
                            playBtn.textContent = '⏳ 加载...';
                            
                            audio.addEventListener('playing', () => {
                                playBtn.textContent = '⏸ 暂停';
                                playBtn.classList.add('playing');
                            });
                            
                            audio.addEventListener('ended', () => {
                                playBtn.textContent = '▶ 播放';
                                playBtn.classList.remove('playing');
                                if (drawerActiveAudio === audio) {
                                    drawerActiveAudio = null;
                                    drawerActiveBtn = null;
                                }
                            });
                            
                            audio.addEventListener('error', () => {
                                playBtn.textContent = '❌ 播放失败';
                                setTimeout(() => { playBtn.textContent = '▶ 播放'; }, 2000);
                            });
                            
                            audio.play().catch(() => {
                                playBtn.textContent = '▶ 播放';
                            });
                            
                            drawerActiveAudio = audio;
                            drawerActiveBtn = playBtn;
                        }
                    });
                }
                
                content.appendChild(card);
            }
        });
    }

    /* ==========================================================
       📊 5. 动态计算可视化统计仪表盘
       ========================================================== */
    function initStatsCharts() {
        if (typeof insectData === 'undefined') return;
        
        let total = 0;
        let hasAudio = 0;
        let hasInat = 0;
        
        insectData.forEach(item => {
            const match = item.textHtml.match(/id="i(\d+)"/);
            if (match) {
                total++;
                if (item.audio) hasAudio++;
                if (item.inaturalist && item.inaturalist.photos && item.inaturalist.photos.length > 0) hasInat++;
            }
        });
        
        if (total === 0) return;
        
        const audioPct = Math.round((hasAudio / total) * 100);
        const inatPct = Math.round((hasInat / total) * 100);
        
        const audioChart = document.getElementById('audioRatioChart');
        const audioVal = document.getElementById('audioRatioVal');
        const inatChart = document.getElementById('inatRatioChart');
        const inatVal = document.getElementById('inatRatioVal');
        
        if (audioChart && audioVal) {
            audioChart.style.background = `conic-gradient(var(--primary) ${audioPct}%, rgba(120,120,120,0.1) ${audioPct}%)`;
            audioVal.textContent = `${audioPct}%`;
        }
        
        if (inatChart && inatVal) {
            inatChart.style.background = `conic-gradient(var(--primary) ${inatPct}%, rgba(120,120,120,0.1) ${inatPct}%)`;
            inatVal.textContent = `${inatPct}%`;
        }
    }

    /* ==========================================================
       🖼️ 6. 三种展示模式切换与主渲染核心
       ========================================================== */
    function renderSpeciesHtml(item, query = '', showHeader = true, excludeInat = false) {
        let html = item.textHtml;
        const h3Match = html.match(/<h3([^>]*)>([\s\S]*?)<\/h3>/i);
        if (!h3Match) return html;

        const innerHtml = h3Match[2].trim();
        const titleMatch = innerHtml.match(/^\s*(\d+)\s*[\.．]\s*([^\s（(\(：:]+)(?:[\(（]([^）\)]+)[\)）])?[\s：:]*/);
        if (!titleMatch) return html;

        const speciesNum = titleMatch[1];
        const rawChineseName = titleMatch[2];
        const rawLatinName = titleMatch[3] || '';
        let desc = innerHtml.substring(titleMatch[0].length).trim();

        // 别名俗称
        const nicknames = [];
        let isLatinValid = /^[a-zA-Z\s\.\-_]+$/.test(rawLatinName.replace(/\s+/g, ' ').trim());
        let formattedLatin = '';
        if (rawLatinName) {
            if (isLatinValid) {
                formattedLatin = rawLatinName.replace(/\s+/g, ' ').trim();
            } else {
                nicknames.push(rawLatinName.trim());
            }
        }

        const nickRegex = /(?:俗称|又称)[“"']([^“”"'\s，。；、]+)[”"']/g;
        let nickMatch;
        while ((nickMatch = nickRegex.exec(desc)) !== null) {
            if (!nicknames.includes(nickMatch[1])) nicknames.push(nickMatch[1]);
        }
        
        const quotesRegex = /[“"']([^“”"'\s，。；、~]{2,6})[”"']/g;
        let quoteMatch;
        while ((quoteMatch = quotesRegex.exec(desc)) !== null) {
            const name = quoteMatch[1];
            if (!nicknames.includes(name) && !name.includes('~') && !name.includes('叮') && nicknames.length < 5) {
                nicknames.push(name);
            }
        }

        const clauses = desc.split(/[，。；；\n]/).map(c => c.trim()).filter(c => c.length > 0);
        const soundKeywords = ['叫', '鸣', '音量', '叫口', '音调', '节奏', '音质', '金属声', '连贯性', '冷叫'];
        const soundClauses = clauses.filter(c => soundKeywords.some(kw => c.includes(kw)));
        const careKeywords = ['饲养', '挑选', '保湿', '群养', '喂食', '逃逸', '寿命', '食物', '南瓜', '胡萝卜', '黄瓜', '泡饭', '万体', '黄蛉盒', '蛉筒', '避开', '防逃', '挑选', '寄生', '皮实', '耐寒', '怕热', '常温', '单养'];
        const careClauses = clauses.filter(c => careKeywords.some(kw => c.includes(kw)));

        function highlight(txt) {
            if (!query) return txt;
            const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            return txt.replace(regex, '<mark class="search-highlight">$1</mark>');
        }

        const isFavorited = getFavorites().includes(speciesNum);

        let cardHtml = '';
        if (showHeader) {
            cardHtml += `
                <div class="species-header-modern">
                    <div class="species-badge-modern">#${speciesNum.padStart(3, '0')}</div>
                    <div class="species-title-container-modern">
                        <h3 class="species-name-modern">${highlight(rawChineseName)}</h3>
                        ${formattedLatin ? `<span class="species-latin-modern">${highlight(formattedLatin)}</span>` : ''}
                    </div>
                    <button class="favorite-btn-modern ${isFavorited ? 'active' : ''}" data-species-num="${speciesNum}" aria-label="收藏">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </button>
                </div>
            `;
        }

        if (nicknames.length > 0) {
            cardHtml += `
                <div class="species-tags-modern" style="margin-bottom:12px;">
                    <span class="tags-label-modern">🏷️ 别名/俗称：</span>
                    ${nicknames.map(name => `<span class="species-tag-modern">${highlight(name)}</span>`).join('')}
                </div>
            `;
        }

        cardHtml += `<div class="species-desc-modern">${highlight(desc)}</div>`;
        cardHtml += `<div class="species-info-grid-modern" style="margin-top:16px;">`;

        if (soundClauses.length > 0) {
            cardHtml += `
                <div class="info-card-item-modern">
                    <div class="info-card-title-modern">🔊 鸣声特征 & 习性</div>
                    <div class="info-card-text-modern">${highlight(soundClauses.slice(0, 3).join('，') + '。')}</div>
                </div>
            `;
        }

        if (careClauses.length > 0) {
            cardHtml += `
                <div class="info-card-item-modern">
                    <div class="info-card-title-modern">🥬 饲养要点 & 挑选</div>
                    <div class="info-card-text-modern">${highlight(careClauses.slice(0, 3).join('，') + '。')}</div>
                </div>
            `;
        }

        if (!excludeInat) {
            if (item.inaturalist) {
                const inat = item.inaturalist;
                // 总是显示学术对照名，以保证排版一致性
                const showAcademicName = !!inat.displayName;
                
                cardHtml += `
                    <div class="info-card-item-modern inat-info-modern">
                        <div class="info-card-title-modern">
                            <span class="info-icon">☘️ iNaturalist 生态观察图鉴</span>
                            <a class="inat-link-btn" href="https://www.inaturalist.org/taxa/${inat.taxonId}" target="_blank" rel="noopener noreferrer">图鉴官网 →</a>
                        </div>
                        ${showAcademicName ? `<div class="inat-badge-modern" style="margin-bottom:12px; font-size:0.95rem; line-height:1.5;"><span style="font-weight:bold; color:#009688; margin-right:6px;">学术对照名:</span><span style="font-weight:600; color:var(--text-main);">${highlight(inat.displayName)}</span></div>` : ''}
                        ${inat.photos && inat.photos.length > 0 ? `
                            <div class="inat-photo-gallery">
                                ${inat.photos.slice(0, 5).map((p, i) => `
                                    <div class="inat-photo-item">
                                        <img src="${p.url}" data-large="${p.largeUrl || p.url}" alt="${rawChineseName}-生态照片-${i+1}" loading="lazy" />
                                        <div class="inat-photo-attribution" title="${p.attribution}">${p.attribution}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; padding: 10px 0; font-style: italic; text-align:justify;">
                                该物种在 iNaturalist 数据库中暂无公开的生态观察照片。您可以点击右上角前往官网查看更多观察记录。
                            </div>
                        `}
                    </div>
                `;
            } else {
                // 对于未匹配到 iNaturalist 的种类，提供精美的提示
                cardHtml += `
                    <div class="info-card-item-modern inat-info-modern" style="opacity: 0.85; border-style: dashed;">
                        <div class="info-card-title-modern">
                            <span class="info-icon">☘️ iNaturalist 生态观察图鉴</span>
                        </div>
                        <div class="inat-badge-modern" style="margin-bottom:8px; font-size:0.95rem; line-height:1.5;"><span style="font-weight:bold; color:var(--text-muted); margin-right:6px;">学术对照名:</span><span style="color:var(--text-muted); font-style:italic;">暂无精确匹配</span></div>
                        <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; text-align:justify;">未在 iNaturalist 数据库中匹配到该品种的精确观察图鉴。</div>
                    </div>
                `;
            }
        }

        cardHtml += `</div>`;
        return cardHtml;
    }

    // 动态构建分类下的物种展示
    function rebuildCategoryView(catId) {
        const container = document.getElementById('view-' + catId);
        if (!container) return;
        
        // 查找属于当前分类的所有鸣虫数据
        // 查找属于当前分类且包含有效物种 ID 的鸣虫数据
        const catItems = typeof insectData !== 'undefined' 
            ? insectData.filter(d => d.category === catId && d.textHtml.includes('id="i')) 
            : [];
        if (catItems.length === 0) return;
        
        // 保留原有的返回首页按钮和分类标题
        const catName = getCategoryName(catId);
        let headerHtml = '';
        if (currentViewMode === 'combined') {
            // 明细页 (合并模式)：去掉上部的的大分类标题导航，使界面简洁
            headerHtml = `
                <div class="view-toolbar" style="margin-bottom:16px;">
                    <button class="back-btn" onclick="navigateTo('home')" style="margin:0;">← 返回首页</button>
                    <div class="mode-selectors">
                        <button class="mode-btn active" data-mode="combined">图鉴画册</button>
                        <button class="mode-btn" data-mode="list">普通列表</button>
                    </div>
                </div>
            `;
        } else {
            // 列表模式：保留大分类标题导航
            headerHtml = `
                <button class="back-btn" onclick="navigateTo('home')">← 返回首页</button>
                <div class="view-toolbar">
                    <h2 class="category-page-title" style="border:none; margin:0; padding:0;">${catName}</h2>
                    <div class="mode-selectors">
                        <button class="mode-btn" data-mode="combined">图鉴画册</button>
                        <button class="mode-btn active" data-mode="list">普通列表</button>
                    </div>
                </div>
            `;
        }
        
        // 主内容挂载区
        let bodyHtml = '';
        
        if (currentViewMode === 'list') {
            // 传统平铺列表模式
            bodyHtml = `<div class="species-list-container">`;
            catItems.forEach(item => {
                const specNum = item.textHtml.match(/id="i(\d+)"/)[1];
                bodyHtml += `
                    <div class="species-card-modern" id="i${specNum}" data-species-num="${specNum}">
                        ${renderSpeciesHtml(item, '', true, true)}
                        ${item.images && item.images.length > 0 ? `
                            <div class="image-container">
                                ${item.images.map(img => `
                                    <figure>
                                        <img src="${img.src}" alt="${img.caption}" loading="lazy" />
                                        <figcaption>${img.caption}</figcaption>
                                    </figure>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${item.audio ? renderPlayerHtml(item) : ''}
                        ${renderListInatSection(item)}
                    </div>
                `;
            });
            bodyHtml += `</div>`;
            
        } else {
            // 合并模式：左侧是缩略网格导航，右侧是标本详情展板
            if (specimenActiveIndices[catId] === undefined) {
                specimenActiveIndices[catId] = 0;
            }
            
            const activeIdx = specimenActiveIndices[catId];
            const activeItem = catItems[activeIdx];
            const activeSpecNum = activeItem.textHtml.match(/id="i(\d+)"/)[1];
            
            // 幻灯大图
            const galleryImgs = activeItem.images && activeItem.images.length > 0 ? activeItem.images : [{src: 'images/fallback.jpg', caption: '暂无生态照'}];
            
            bodyHtml = `
                <div class="combined-view-container">
                    <!-- 物种详情展板 -->
                    <div class="combined-detail-panel" style="width:100%;">
                        <div class="specimen-layout" id="i${activeSpecNum}" data-species-num="${activeSpecNum}">
                            <!-- 上层：左侧主图及缩略图 + 右侧基本信息和形态习性 -->
                            <div class="specimen-top-section">
                                <div class="specimen-display-aside">
                                    <div class="specimen-img-carousel">
                                        <img src="${galleryImgs[0].src}" alt="${galleryImgs[0].caption}" loading="lazy" onerror="this.src='images/fallback.jpg';" />
                                        <div class="specimen-img-attribution">${galleryImgs[0].caption}</div>
                                    </div>
                                    
                                    ${galleryImgs.length > 1 ? `
                                    <div class="specimen-thumb-gallery">
                                        ${galleryImgs.map((img, idx) => `
                                            <div class="specimen-thumb-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                                                <img src="${img.src}" alt="${img.caption}" loading="lazy" onerror="this.src='images/fallback.jpg';" />
                                            </div>
                                        `).join('')}
                                    </div>
                                    ` : ''}
                                </div>
                                
                                <div class="specimen-info-aside">
                                    <div class="specimen-title-row">
                                        <span class="specimen-tag-badge">#${activeSpecNum.padStart(3, '0')}</span>
                                        <div class="specimen-names-box">
                                            <div class="specimen-cname">${activeItem.textHtml.match(/<h3[^>]*>[\s\S]*?\d+[\.．]\s*([^\s（(\(：:]+)/i)[1]}</div>
                                            <div class="specimen-lname">${activeItem.textHtml.match(/<h3[^>]*>[\s\S]*?\d+[\.．]\s*[^\s（(\(：:]+(?:[\(（]([^）\)]+)[\)）])?/i)[1] || ''}</div>
                                        </div>
                                        <button class="favorite-btn-modern ${getFavorites().includes(activeSpecNum) ? 'active' : ''}" data-species-num="${activeSpecNum}">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div style="flex:1; overflow-y:auto; padding-right:6px;">
                                        ${renderSpeciesHtml(activeItem, '', false, true)}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 中层：音频播放器（全宽）与折叠声谱图 -->
                            <div class="specimen-middle-section">
                                ${activeItem.audio ? renderFoldablePlayerHtml(activeItem) : `
                                    <div class="info-card-item-modern" style="text-align:center; padding: 20px 10px;">
                                        <div style="font-size:1.5rem; margin-bottom:8px;">🔇</div>
                                        <div style="color:var(--text-muted); font-size:0.8rem;">该鸣虫暂无野生叫声音频数据</div>
                                    </div>
                                `}
                            </div>
                            
                            <!-- 下层：iNaturalist 生态观察图鉴（横向滚动条） -->
                            <div class="specimen-bottom-section">
                                ${renderHorizontalInatSection(activeItem)}
                            </div>
                        </div>
                        
                        <!-- 翻页小导航 -->
                        <div class="specimen-nav-bar">
                            <button class="specimen-nav-btn prev-specimen-btn">◀ 上一种</button>
                            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">${activeIdx + 1} / ${catItems.length}</span>
                            <button class="specimen-nav-btn next-specimen-btn">下一种 ▶</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = headerHtml + bodyHtml;
        
        // 绑定事件
        bindCategoryToolbarEvents(container, catId, catItems);
        bindDynamicCardEvents(container);
    }

    function renderPlayerHtml(item) {
        const specNum = item.textHtml.match(/id="i(\d+)"/)[1];
        return `
            <div class="custom-audio-player" data-audio-src="${item.audio.file}" data-species-num="${specNum}">
                <button class="audio-play-btn" aria-label="播放叫声">
                    <svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="pause-icon" viewBox="0 0 24 24" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    <svg class="loading-icon" viewBox="0 0 50 50" style="display:none; animation: audio-spin 1s linear infinite; width:18px; height:18px; stroke:currentColor; stroke-width:4; fill:none; stroke-linecap:round;">
                        <circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,0.2)"></circle>
                        <path d="M25,5A20,20 0 0,1 45,25"></path>
                    </svg>
                </button>
                <div class="audio-progress-container">
                    <div class="audio-progress-bar">
                        <div class="audio-progress-fill"></div>
                    </div>
                    <div class="audio-time-indicator">00:00 / ${item.audio.length || '00:00'}</div>
                </div>
                
                <!-- 微型声波频谱动效 -->
                <div class="mini-visualizer">
                    <div class="visualizer-bar"></div>
                    <div class="visualizer-bar"></div>
                    <div class="visualizer-bar"></div>
                    <div class="visualizer-bar"></div>
                </div>
            </div>
            <div class="spectrogram-container">
                <div class="spectrogram-wrapper">
                    <img class="spectrogram-img skeleton-box" src="${item.audio.spectrogram.startsWith('http') ? 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(item.audio.spectrogram) : item.audio.spectrogram}" alt="声谱图" loading="lazy" onload="this.classList.remove('skeleton-box')" />
                    <div class="spectrogram-progress-line"></div>
                    <div class="spectrogram-overlay"></div>
                </div>
                <span class="audio-recordist">🎤 录制: ${item.audio.recordist} | XC ${item.audio.quality}级野生叫声</span>
            </div>
        `;
    }

    function renderFoldablePlayerHtml(item) {
        const specNum = item.textHtml.match(/id="i(\d+)"/)[1];
        return `
            <div class="custom-audio-player" data-audio-src="${item.audio.file}" data-species-num="${specNum}">
                <button class="audio-play-btn" aria-label="播放叫声">
                    <svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="pause-icon" viewBox="0 0 24 24" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    <svg class="loading-icon" viewBox="0 0 50 50" style="display:none; animation: audio-spin 1s linear infinite; width:18px; height:18px; stroke:currentColor; stroke-width:4; fill:none; stroke-linecap:round;">
                        <circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,0.2)"></circle>
                        <path d="M25,5A20,20 0 0,1 45,25"></path>
                    </svg>
                </button>
                <div class="audio-progress-container">
                    <div class="audio-progress-bar">
                        <div class="audio-progress-fill"></div>
                    </div>
                    <div class="audio-time-indicator">00:00 / ${item.audio.length || '00:00'}</div>
                </div>
                
                <!-- 微型声波频谱动效 -->
                <div class="mini-visualizer">
                    <div class="visualizer-bar"></div>
                    <div class="visualizer-bar"></div>
                    <div class="visualizer-bar"></div>
                    <div class="visualizer-bar"></div>
                </div>
            </div>
            
            <div class="spectrogram-toggle-container">
                <button class="spectrogram-toggle-btn" type="button">
                    <span class="toggle-icon">📊</span> <span class="toggle-text">显示声谱图</span>
                </button>
            </div>
            
            <div class="spectrogram-foldable">
                <div class="spectrogram-container" style="margin-top: 10px;">
                    <div class="spectrogram-wrapper">
                        <img class="spectrogram-img skeleton-box" src="${item.audio.spectrogram.startsWith('http') ? 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(item.audio.spectrogram) : item.audio.spectrogram}" alt="声谱图" loading="lazy" onload="this.classList.remove('skeleton-box')" />
                        <div class="spectrogram-progress-line"></div>
                        <div class="spectrogram-overlay"></div>
                    </div>
                    <span class="audio-recordist">🎤 录制: ${item.audio.recordist} | XC ${item.audio.quality}级野生叫声</span>
                </div>
            </div>
        `;
    }

    function renderHorizontalInatSection(item, query = '') {
        const h3Match = item.textHtml.match(/<h3([^>]*)>([\s\S]*?)<\/h3>/i);
        let rawChineseName = '鸣虫';
        if (h3Match) {
            const innerHtml = h3Match[2].trim();
            const titleMatch = innerHtml.match(/^\s*(\d+)\s*[\.．]\s*([^\s（(\(：:]+)(?:[\(（]([^）\)]+)[\)）])?[\s：:]*/);
            if (titleMatch) {
                rawChineseName = titleMatch[2];
            }
        }

        function highlight(txt) {
            if (!query) return txt;
            const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            return txt.replace(regex, '<mark class="search-highlight">$1</mark>');
        }

        if (item.inaturalist) {
            const inat = item.inaturalist;
            const showAcademicName = !!inat.displayName;
            
            return `
                <div class="info-card-item-modern inat-info-modern inat-horizontal">
                    <div class="info-card-title-modern">
                        <span class="info-icon">☘️ iNaturalist 生态观察图鉴</span>
                        <a class="inat-link-btn" href="https://www.inaturalist.org/taxa/${inat.taxonId}" target="_blank" rel="noopener noreferrer">图鉴官网 →</a>
                    </div>
                    ${showAcademicName ? `<div class="inat-badge-modern" style="margin-bottom:12px; font-size:0.95rem; line-height:1.5;"><span style="font-weight:bold; color:#009688; margin-right:6px;">学术对照名:</span><span style="font-weight:600; color:var(--text-main);">${highlight(inat.displayName)}</span></div>` : ''}
                    ${inat.photos && inat.photos.length > 0 ? `
                        <div class="inat-photo-scroll-container">
                            ${inat.photos.slice(0, 5).map((p, i) => `
                                <div class="inat-photo-item">
                                    <img src="${p.url}" data-large="${p.largeUrl || p.url}" alt="${rawChineseName}-生态照片-${i+1}" loading="lazy" />
                                    <div class="inat-photo-attribution" title="${p.attribution}">${p.attribution}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; padding: 10px 0; font-style: italic; text-align:justify;">
                            该物种在 iNaturalist 数据库中暂无公开的生态观察照片。您可以点击右上角前往官网查看更多观察记录。
                        </div>
                    `}
                </div>
            `;
        } else {
            return `
                <div class="info-card-item-modern inat-info-modern inat-horizontal" style="opacity: 0.85; border-style: dashed;">
                    <div class="info-card-title-modern">
                        <span class="info-icon">☘️ iNaturalist 生态观察图鉴</span>
                    </div>
                    <div class="inat-badge-modern" style="margin-bottom:8px; font-size:0.95rem; line-height:1.5;"><span style="font-weight:bold; color:var(--text-muted); margin-right:6px;">学术对照名:</span><span style="color:var(--text-muted); font-style:italic;">暂无精确匹配</span></div>
                    <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; text-align:justify;">未在 iNaturalist 数据库中匹配到该品种的精确观察图鉴。</div>
                </div>
            `;
        }
    }

    function renderListInatSection(item, query = '') {
        const h3Match = item.textHtml.match(/<h3([^>]*)>([\s\S]*?)<\/h3>/i);
        let rawChineseName = '鸣虫';
        if (h3Match) {
            const innerHtml = h3Match[2].trim();
            const titleMatch = innerHtml.match(/^\s*(\d+)\s*[\.．]\s*([^\s（(\(：:]+)(?:[\(（]([^）\)]+)[\)）])?[\s：:]*/);
            if (titleMatch) {
                rawChineseName = titleMatch[2];
            }
        }

        function highlight(txt) {
            if (!query) return txt;
            const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            return txt.replace(regex, '<mark class="search-highlight">$1</mark>');
        }

        if (item.inaturalist) {
            const inat = item.inaturalist;
            const showAcademicName = !!inat.displayName;
            
            return `
                <div class="info-card-item-modern inat-info-modern" style="margin-top: 16px;">
                    <div class="info-card-title-modern">
                        <span class="info-icon">☘️ iNaturalist 生态观察图鉴</span>
                        <a class="inat-link-btn" href="https://www.inaturalist.org/taxa/${inat.taxonId}" target="_blank" rel="noopener noreferrer">图鉴官网 →</a>
                    </div>
                    ${showAcademicName ? `<div class="inat-badge-modern" style="margin-bottom:12px; font-size:0.95rem; line-height:1.5;"><span style="font-weight:bold; color:#009688; margin-right:6px;">学术对照名:</span><span style="font-weight:600; color:var(--text-main);">${highlight(inat.displayName)}</span></div>` : ''}
                    ${inat.photos && inat.photos.length > 0 ? `
                        <div class="inat-photo-gallery">
                            ${inat.photos.slice(0, 5).map((p, i) => `
                                <div class="inat-photo-item">
                                    <img src="${p.url}" data-large="${p.largeUrl || p.url}" alt="${rawChineseName}-生态照片-${i+1}" loading="lazy" />
                                    <div class="inat-photo-attribution" title="${p.attribution}">${p.attribution}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; padding: 10px 0; font-style: italic; text-align:justify;">
                            该物种在 iNaturalist 数据库中暂无公开的生态观察照片。您可以点击右上角前往官网查看更多观察记录。
                        </div>
                    `}
                </div>
            `;
        } else {
            return `
                <div class="info-card-item-modern inat-info-modern" style="opacity: 0.85; border-style: dashed; margin-top: 16px;">
                    <div class="info-card-title-modern">
                        <span class="info-icon">☘️ iNaturalist 生态观察图鉴</span>
                    </div>
                    <div class="inat-badge-modern" style="margin-bottom:8px; font-size:0.95rem; line-height:1.5;"><span style="font-weight:bold; color:var(--text-muted); margin-right:6px;">学术对照名:</span><span style="color:var(--text-muted); font-style:italic;">暂无精确匹配</span></div>
                    <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; text-align:justify;">未在 iNaturalist 数据库中匹配到该品种的精确观察图鉴。</div>
                </div>
            `;
        }
    }

    // 绑定多模式切换与标本馆左右导航事件
    function bindCategoryToolbarEvents(container, catId, catItems) {
        // 模式切换按钮
        const modeBtns = container.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                currentViewMode = mode;
                localStorage.setItem('insect_view_mode', mode);
                
                // 停止可能正在播放的任何全局叫声
                stopActiveAudio();
                
                rebuildCategoryView(catId);
            });
        });
        
        // 合并图鉴画册模式下的事件绑定
        if (currentViewMode === 'combined') {
            const activeIdx = specimenActiveIndices[catId] || 0;
            const prevBtn = container.querySelector('.prev-specimen-btn');
            const nextBtn = container.querySelector('.next-specimen-btn');
            function slideTo(newIdx) {
                stopActiveAudio();
                specimenActiveIndices[catId] = newIdx;
                
                // 添加淡出转场效果
                const panel = container.querySelector('.combined-detail-panel');
                if (panel) {
                    panel.style.opacity = '0';
                    panel.style.transform = 'translateY(10px)';
                    panel.style.transition = 'opacity 0.22s, transform 0.22s';
                }
                
                setTimeout(() => {
                    rebuildCategoryView(catId);
                }, 200);
            }
            
            // 下方上一只/下一只翻页
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    const newIdx = (activeIdx - 1 + catItems.length) % catItems.length;
                    slideTo(newIdx);
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const newIdx = (activeIdx + 1) % catItems.length;
                    slideTo(newIdx);
                });
            }
            
            // 键盘左右方向键切换
            const handleKeyDown = (e) => {
                if (window.location.hash !== `#category/${catId}` || currentViewMode !== 'combined') {
                    document.removeEventListener('keydown', handleKeyDown);
                    return;
                }
                if (e.key === 'ArrowLeft' && prevBtn) {
                    prevBtn.click();
                } else if (e.key === 'ArrowRight' && nextBtn) {
                    nextBtn.click();
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            
            // 手机端在详情卡片上的手势左右划动切换
            const layout = container.querySelector('.specimen-layout');
            if (layout) {
                let touchStartX = 0;
                layout.addEventListener('touchstart', (e) => {
                    touchStartX = e.touches[0].clientX;
                }, { passive: true });
                
                layout.addEventListener('touchend', (e) => {
                    const touchEndX = e.changedTouches[0].clientX;
                    const diff = touchEndX - touchStartX;
                    if (Math.abs(diff) > 70) {
                        if (diff > 0 && prevBtn) {
                            prevBtn.click(); // 向右划显示前一只
                        } else if (diff < 0 && nextBtn) {
                            prevBtn.click(); // 容错处理
                            nextBtn.click(); // 向左划显示下一只
                        }
                    }
                }, { passive: true });
            }

            // == 14. 详情画册多图缩略图点击切换逻辑 ==
            const activeItem = catItems[activeIdx];
            const galleryImgs = activeItem.images && activeItem.images.length > 0 ? activeItem.images : [{src: 'images/fallback.jpg', caption: '暂无生态照'}];
            
            const thumbItems = container.querySelectorAll('.specimen-thumb-item');
            const mainImg = container.querySelector('.specimen-img-carousel img');
            const mainAttribution = container.querySelector('.specimen-img-attribution');
            
            thumbItems.forEach(thumb => {
                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(thumb.dataset.index);
                    const targetImg = galleryImgs[idx];
                    
                    if (thumb.classList.contains('active')) return;
                    
                    // 切换 active 状态
                    thumbItems.forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                    
                    // 大图淡出切换
                    if (mainImg) {
                        mainImg.style.opacity = '0';
                        setTimeout(() => {
                            mainImg.src = targetImg.src;
                            mainImg.alt = targetImg.caption || '';
                            if (mainAttribution) {
                                mainAttribution.textContent = targetImg.caption || '';
                            }
                            mainImg.style.opacity = '1';
                        }, 200);
                    }
                });
            });
            
            // 为详情大图绑定完美的大图放大模态框（只展示当前鸣虫的生态照片）
            if (mainImg) {
                mainImg.style.cursor = 'zoom-in';
                mainImg.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // 获取当前激活的图片索引
                    const activeThumb = container.querySelector('.specimen-thumb-item.active');
                    const curIdx = activeThumb ? parseInt(activeThumb.dataset.index) : 0;
                    
                    // 将 galleryImgs 转换为适合 createImageModal 调用的 allImages 数组
                    const allImagesForModal = galleryImgs.map(img => ({
                        src: img.src,
                        alt: img.caption || ''
                    }));
                    
                    createImageModal(mainImg.src, mainImg.alt, curIdx, allImagesForModal);
                });
            }
        }
    }

    /* ==========================================================
       🔊 7. 自定义叫声播放器扫频逻辑 (同步声图)
       ========================================================== */
    let activeAudio = null;
    let activePlayer = null;

    function stopActiveAudio() {
        if (activeAudio) {
            activeAudio.pause();
            activeAudio = null;
        }
        if (activePlayer && typeof activePlayer.resetThisPlayer === 'function') {
            activePlayer.resetThisPlayer();
            activePlayer = null;
        }
    }

    function initAudioPlayers(container) {
        const players = container.querySelectorAll('.custom-audio-player');
        players.forEach(player => {
            if (player.dataset.audioInitialized) return;
            player.dataset.audioInitialized = 'true';

            const playBtn = player.querySelector('.audio-play-btn');
            const playIcon = playBtn.querySelector('.play-icon');
            const pauseIcon = playBtn.querySelector('.pause-icon');
            const loadingIcon = playBtn.querySelector('.loading-icon');
            const progressBar = player.querySelector('.audio-progress-bar');
            const progressFill = player.querySelector('.audio-progress-fill');
            const timeIndicator = player.querySelector('.audio-time-indicator');

            // 声谱图
            const specContainer = player.closest('.sound-info-modern, .specimen-display, .species-card-modern, .specimen-middle-section').querySelector('.spectrogram-container');
            let specLine = null;
            let specOverlay = null;
            if (specContainer) {
                specLine = specContainer.querySelector('.spectrogram-progress-line');
                specOverlay = specContainer.querySelector('.spectrogram-overlay');
            }

            const audioSrc = player.dataset.audioSrc;
            let audio = null;

            function formatTime(secs) {
                if (isNaN(secs)) return '00:00';
                const m = Math.floor(secs / 60).toString().padStart(2, '0');
                const s = Math.floor(secs % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
            }

            function resetThisPlayer() {
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
                if (loadingIcon) loadingIcon.style.display = 'none';
                playBtn.classList.remove('playing');
                progressFill.style.width = '0%';
                timeIndicator.style.color = "var(--text-secondary)";
                timeIndicator.textContent = `00:00 / ${formatTime(audio ? audio.duration : 0)}`;
                if (specLine) specLine.style.display = 'none';
                if (specOverlay) specOverlay.style.width = '100%';
            }

            function setupAudio() {
                if (audio) return audio;
                
                let currentSrc = audioSrc;
                
                // 本地文件直接播放，远程文件走 CodeTabs 代理通道
                if (audioSrc.startsWith('http') && !audioSrc.includes('proxy')) {
                    currentSrc = "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(audioSrc);
                }
                
                audio = new Audio(currentSrc);
                
                audio.addEventListener('loadstart', () => {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'none';
                    if (loadingIcon) loadingIcon.style.display = 'block';
                    timeIndicator.textContent = "🔍 正在装载野生叫声...";
                });

                audio.addEventListener('waiting', () => {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'none';
                    if (loadingIcon) loadingIcon.style.display = 'block';
                });

                audio.addEventListener('play', () => {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                    if (loadingIcon) loadingIcon.style.display = 'none';
                    playBtn.classList.add('playing');
                    if (specLine) specLine.style.display = 'block';
                });

                audio.addEventListener('playing', () => {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                    if (loadingIcon) loadingIcon.style.display = 'none';
                    playBtn.classList.add('playing');
                    if (specLine) specLine.style.display = 'block';
                    timeIndicator.style.color = "var(--text-secondary)";
                });

                audio.addEventListener('pause', () => {
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                    if (loadingIcon) loadingIcon.style.display = 'none';
                    playBtn.classList.remove('playing');
                });

                audio.addEventListener('timeupdate', () => {
                    const duration = audio.duration || 0;
                    const current = audio.currentTime || 0;
                    if (duration > 0) {
                        const pct = (current / duration) * 100;
                        progressFill.style.width = `${pct}%`;
                        timeIndicator.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
                        if (specLine) specLine.style.left = `${pct}%`;
                        if (specOverlay) specOverlay.style.width = `${100 - pct}%`;
                    }
                });

                audio.addEventListener('ended', () => {
                    resetThisPlayer();
                    if (activeAudio === audio) {
                        activeAudio = null;
                        activePlayer = null;
                    }
                });

                audio.addEventListener('loadedmetadata', () => {
                    timeIndicator.textContent = `00:00 / ${formatTime(audio.duration)}`;
                });
                audio.addEventListener('error', () => {
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                    if (loadingIcon) loadingIcon.style.display = 'none';
                    playBtn.classList.remove('playing');
                    timeIndicator.textContent = "❌ 野生音源连接超时";
                    timeIndicator.style.color = "#ff1744";
                    if (specLine) specLine.style.display = 'none';
                    if (specOverlay) specOverlay.style.width = '100%';
                });

                return audio;
            }

            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const localAudio = setupAudio();

                if (activeAudio && activeAudio !== localAudio) {
                    stopActiveAudio();
                }

                if (localAudio.paused) {
                    activeAudio = localAudio;
                    activePlayer = { resetThisPlayer };
                    localAudio.play().catch(err => {
                        console.log("Play blocked:", err);
                        timeIndicator.textContent = "⚠️ 需点击解锁播放";
                    });
                } else {
                    localAudio.pause();
                }
            });

            progressBar.addEventListener('click', (e) => {
                e.stopPropagation();
                const localAudio = setupAudio();
                const rect = progressBar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const pct = Math.max(0, Math.min(1, clickX / width));
                
                if (localAudio.duration) {
                    localAudio.currentTime = localAudio.duration * pct;
                    progressFill.style.width = `${pct * 100}%`;
                    timeIndicator.textContent = `${formatTime(localAudio.currentTime)} / ${formatTime(localAudio.duration)}`;
                    if (specLine) specLine.style.left = `${pct * 100}%`;
                    if (specOverlay) specOverlay.style.width = `${100 - pct * 100}%`;
                }
            });
        });
    }

    /* ==========================================================
       🖼️ 8. 图片点击放大模态框 (自适应 + 触摸手势)
       ========================================================== */
    function createImageModal(src, alt, currentIndex, allImages) {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.95);
            backdrop-filter: blur(25px);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.4s ease;
            user-select: none;
            touch-action: none;
            -webkit-user-select: none;
        `;

        // 高清大图异步加载器局部变量
        let activeImageLoader = null;

        // 创建高清提示状态标签 (HD Badge)
        const hdBadge = document.createElement('div');
        hdBadge.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            color: white;
            background: rgba(0,0,0,0.6);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            backdrop-filter: blur(10px);
            z-index: 100003;
            display: flex;
            align-items: center;
            gap: 6px;
            border: 1px solid rgba(255,255,255,0.1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // 高清图异步加载逻辑
        function loadLargeImage(url) {
            if (!url || url === img.src) {
                hdBadge.style.opacity = '0';
                return;
            }

            // 动态注入 loading 旋转样式
            if (!document.getElementById('hd-spinner-style')) {
                const style = document.createElement('style');
                style.id = 'hd-spinner-style';
                style.innerHTML = `
                    @keyframes hd-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .hd-spinner {
                        width: 12px;
                        height: 12px;
                        border: 2px solid rgba(255,255,255,0.3);
                        border-top-color: #fff;
                        border-radius: 50%;
                        display: inline-block;
                        animation: hd-spin 0.8s linear infinite;
                    }
                `;
                document.head.appendChild(style);
            }

            hdBadge.style.opacity = '1';
            hdBadge.innerHTML = `<span class="hd-spinner"></span> 正在加载高清图...`;

            const tempImg = new Image();
            activeImageLoader = tempImg;
            tempImg.src = url;
            tempImg.onload = () => {
                if (activeImageLoader === tempImg) {
                    img.style.opacity = '0.5';
                    setTimeout(() => {
                        img.src = url;
                        img.style.opacity = '1';
                    }, 100);
                    hdBadge.innerHTML = `<span style="color:#4CAF50; font-weight:bold; text-shadow:0 0 4px rgba(76,175,80,0.4);">HD</span> 已加载高清`;
                    setTimeout(() => {
                        if (activeImageLoader === tempImg) {
                            hdBadge.style.opacity = '0';
                        }
                    }, 2000);
                }
            };
            tempImg.onerror = () => {
                if (activeImageLoader === tempImg) {
                    hdBadge.innerHTML = `<span style="color:#FF5722; font-weight:bold;">⚠️</span> 载入高清失败`;
                    setTimeout(() => {
                        if (activeImageLoader === tempImg) {
                            hdBadge.style.opacity = '0';
                        }
                    }, 3000);
                }
            };
        }

        const imgContainer = document.createElement('div');
        imgContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        `;

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.style.cssText = `
            max-width: 95vw;
            max-height: 90vh;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 6px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.5);
            transform: scale(0.85);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
            cursor: grab;
            user-select: none;
            touch-action: none;
        `;

        let currentScale = 1;
        let translateX = 0, translateY = 0;
        let isDragging = false;
        let startX, startY, lastTranslateX, lastTranslateY;

        function updateTransform(animated) {
            if (!animated) img.style.transition = 'none';
            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
            if (!animated) requestAnimationFrame(() => {
                img.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
            });
        }

        function resetView() {
            currentScale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform(true);
        }

        // 鼠标拖拽平移
        img.addEventListener('mousedown', (e) => {
            if (currentScale <= 1) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            lastTranslateX = translateX;
            lastTranslateY = translateY;
            img.style.cursor = 'grabbing';
            img.style.transition = 'none';
            e.preventDefault();
        });

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            translateX = lastTranslateX + (e.clientX - startX);
            translateY = lastTranslateY + (e.clientY - startY);
            updateTransform(false);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = 'grab';
                img.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // 双击恢复大小
        img.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            resetView();
        });

        // 触摸手势拖动及缩放
        let touchStartTime = 0;
        let lastTapTime = 0;
        let touchStartX = 0, touchStartY = 0;
        let isTouchDragging = false;
        let isPinching = false;
        let initialPinchDist = 0;
        let initialPinchScale = 1;
        let swipeHandled = false;

        function getTouchDist(t1, t2) {
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        imgContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            swipeHandled = false;

            if (e.touches.length === 2) {
                isPinching = true;
                isTouchDragging = false;
                initialPinchDist = getTouchDist(e.touches[0], e.touches[1]);
                initialPinchScale = currentScale;
            } else if (e.touches.length === 1) {
                touchStartTime = Date.now();
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                lastTranslateX = translateX;
                lastTranslateY = translateY;
                isTouchDragging = true;
                img.style.transition = 'none';
            }
        }, { passive: false });

        imgContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();

            if (isPinching && e.touches.length === 2) {
                const dist = getTouchDist(e.touches[0], e.touches[1]);
                const scale = (dist / initialPinchDist) * initialPinchScale;
                currentScale = Math.min(Math.max(scale, 0.5), 5);
                updateTransform(false);
            } else if (isTouchDragging && e.touches.length === 1) {
                const dx = e.touches[0].clientX - touchStartX;
                const dy = e.touches[0].clientY - touchStartY;

                if (currentScale > 1) {
                    translateX = lastTranslateX + dx;
                    translateY = lastTranslateY + dy;
                    updateTransform(false);
                }
            }
        }, { passive: false });

        imgContainer.addEventListener('touchend', (e) => {
            if (isPinching) {
                isPinching = false;
                if (currentScale < 1) resetView();
                return;
            }

            if (!isTouchDragging) return;
            isTouchDragging = false;
            img.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';

            const elapsed = Date.now() - touchStartTime;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;

            // 双击检测
            if (elapsed < 250 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                const now = Date.now();
                if (now - lastTapTime < 300) {
                    if (currentScale > 1) resetView();
                    else {
                        currentScale = 2.5;
                        updateTransform(true);
                    }
                    lastTapTime = 0;
                    return;
                }
                lastTapTime = now;
            }

            // 滑屏切图
            const threshold = 50;
            if (currentScale <= 1 && !swipeHandled && elapsed < 400) {
                if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
                    swipeHandled = true;
                    if (allImages.length > 1) {
                        if (dx < 0) updateImage((currentIndex + 1) % allImages.length, 'next');
                        else updateImage((currentIndex - 1 + allImages.length) % allImages.length, 'prev');
                    }
                }
            }
        });

        // 按钮及UI组件
        const isMobile = window.innerWidth <= 768;
        const caption = document.createElement('div');
        caption.className = 'modal-caption';
        caption.style.cssText = `
            position: absolute;
            bottom: ${isMobile ? '80px' : '30px'};
            left: 50%;
            transform: translateX(-50%);
            color: white;
            background: rgba(0,0,0,0.7);
            padding: 8px 20px;
            border-radius: 30px;
            font-size: 14px;
            backdrop-filter: blur(10px);
            z-index: 100002;
            text-align: center;
            max-width: 85vw;
        `;
        caption.textContent = alt || '';

        const sideBtnStyle = `
            position: absolute;
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.4);
            border: 1px solid rgba(255,255,255,0.08);
            padding: 10px 18px;
            border-radius: 30px;
            cursor: pointer;
            z-index: 100001;
            backdrop-filter: blur(4px);
            transition: all 0.3s;
        `;

        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '❮ 上一张';
        prevBtn.style.cssText = `${sideBtnStyle} top: 50%; left: 24px; transform: translateY(-50%);`;
        
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '下一张 ❯';
        nextBtn.style.cssText = `${sideBtnStyle} top: 50%; right: 24px; transform: translateY(-50%);`;

        if (isMobile || allImages.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px; right: 20px;
            width: 44px; height: 44px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.4);
            font-size: 20px;
            cursor: pointer;
            backdrop-filter: blur(4px);
            z-index: 100003;
            display: flex; align-items: center; justify-content: center;
        `;

        // 组装 DOM
        imgContainer.appendChild(img);
        modal.appendChild(imgContainer);
        modal.appendChild(closeBtn);
        modal.appendChild(prevBtn);
        modal.appendChild(nextBtn);
        modal.appendChild(caption);
        modal.appendChild(hdBadge);
        document.body.appendChild(modal);

        function updateImage(index, direction) {
            currentIndex = index;
            const target = allImages[currentIndex];
            img.style.opacity = '0';
            img.style.transform = direction === 'next' ? 'translateX(-40px) scale(0.9)' : 'translateX(40px) scale(0.9)';
            
            setTimeout(() => {
                img.src = target.src;
                img.alt = target.alt || '';
                caption.textContent = target.alt || '';
                resetView();
                img.style.opacity = '1';
                img.style.transform = 'scale(1)';
            }, 200);
        }

        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); updateImage((currentIndex - 1 + allImages.length) % allImages.length, 'prev'); });
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); updateImage((currentIndex + 1) % allImages.length, 'next'); });

        const closeModal = () => {
            modal.style.opacity = '0';
            img.style.transform = 'scale(0.8)';
            img.style.opacity = '0';
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            setTimeout(() => { if (document.body.contains(modal)) document.body.removeChild(modal); }, 350);
        };

        modal.addEventListener('click', (e) => { if (e.target === modal || e.target === imgContainer) closeModal(); });
        closeBtn.addEventListener('click', closeModal);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeModal();
            else if (e.key === 'ArrowLeft' && allImages.length > 1) prevBtn.click();
            else if (e.key === 'ArrowRight' && allImages.length > 1) nextBtn.click();
        };
        document.addEventListener('keydown', handleKeyDown);

        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            img.style.opacity = '1';
            img.style.transform = 'scale(1)';
        });
    }

    // 绑定动态卡片上的基本失败、放大等事件
    function bindDynamicCardEvents(container) {
        const images = container.querySelectorAll('.image-container img, .inat-photo-item img');
        images.forEach((img, index) => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                createImageModal(img.src, img.alt, index, images);
            });
        });
        
        // 绑定失败兜底
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
            img.addEventListener('error', function() {
                if (img.classList.contains('inat-ecological-photo') || img.classList.contains('spectrogram-img')) {
                    return; // iNat 和声图不执行默认错误覆盖，直接显示样式兜底
                }
                const placeholder = document.createElement('div');
                placeholder.className = 'img-error-placeholder';
                placeholder.innerHTML = '<span>图片加载失败</span>';
                this.parentNode.replaceChild(placeholder, this);
            });
        });

        // 叫声播放器联动绑定
        initAudioPlayers(container);
    }

    /* ==========================================================
       ★ 9. 收藏/书签核心业务存储逻辑
       ========================================================== */
    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem('insect_favorites')) || [];
        } catch (e) {
            return [];
        }
    }

    function toggleFavorite(num) {
        let favs = getFavorites();
        const idx = favs.indexOf(num);
        if (idx > -1) {
            favs.splice(idx, 1);
        } else {
            favs.push(num);
        }
        localStorage.setItem('insect_favorites', JSON.stringify(favs));
        
        // 全局同步更新 UI
        updateFloatingBadge();
        
        const favBtns = document.querySelectorAll(`.favorite-btn-modern[data-species-num="${num}"]`);
        favBtns.forEach(btn => {
            if (favs.includes(num)) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        // 如果标本盒在滑开状态下，实时重新拉取列表
        const drawer = document.getElementById('specimenDrawer');
        if (drawer && drawer.classList.contains('active')) {
            renderDrawerFavorites();
        }
    }

    // 全局收藏委托绑定，不需要每个卡片重新写监听
    function initFavoritesDelegation() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.favorite-btn-modern');
            if (btn) {
                e.stopPropagation();
                e.preventDefault();
                const num = btn.getAttribute('data-species-num');
                toggleFavorite(num);
            }
        });
    }

    /* ==========================================================
       🔍 10. 智能搜索 (防抖、多标签)
       ========================================================== */
    function initSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResultsView = document.getElementById('searchResultsView');
        const hubView = document.getElementById('hubView');

        if (!searchInput || !searchResultsView || !hubView) return;

        let timer = null;

        function getCatLabel(category) {
            const map = {
                'c1': '小型蛉虫类', 'c2': '奥蟋类', 'c3': '地栖蟋蟀类',
                'c4': '树蟋类', 'c5': '片蟋类及相似种', 'c6': '蝈螽·纺织娘·似织螽',
                'c7': '草螽·露螽·拟叶螽', 'c8': '拟叶螽类', 'c9': '其他种类及补充'
            };
            return map[category] || '';
        }

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();

            if (timer) clearTimeout(timer);
            
            if (query === '') {
                searchResultsView.classList.remove('active');
                hubView.style.display = 'block';
                searchResultsView.innerHTML = '';
                return;
            }

            timer = setTimeout(() => {
                hubView.style.display = 'none';
                searchResultsView.classList.add('active');
                
                // 停止任何正在播放的全局音乐
                stopActiveAudio();
                
                // 在所有的 category-view 中进行隐藏
                document.querySelectorAll('.category-view').forEach(v => v.classList.remove('active'));

                const results = typeof insectData !== 'undefined' ? insectData.filter(item => {
                    // 过滤掉非物种的讨论段落（没有 id="i..."）
                    if (!item.textHtml.includes('id="i')) return false;
                    const temp = document.createElement('div');
                    temp.innerHTML = item.textHtml;
                    const text = temp.innerText.toLowerCase();
                    return text.includes(query) || (item.description && item.description.toLowerCase().includes(query));
                }) : [];

                searchResultsView.innerHTML = `
                    <button class="back-btn" onclick="document.getElementById('searchInput').value=''; document.getElementById('searchResultsView').classList.remove('active'); document.getElementById('hubView').style.display='block';">← 返回首页</button>
                    <h2 class="category-page-title">🔍 搜索结果: 找到 ${results.length} 种鸣虫</h2>
                `;

                if (results.length === 0) {
                    searchResultsView.innerHTML += `
                        <div class="empty-result">
                            <div style="font-size:2.5rem; margin-bottom:12px;">🦗</div>
                            没有找到与 "${query}" 相关的鸣虫数据，换个词试试吧！
                        </div>
                    `;
                    return;
                }

                results.forEach(item => {
                    const specNum = item.textHtml.match(/id="i(\d+)"/)[1];
                    const section = document.createElement('div');
                    section.className = 'species-card-modern';
                    section.setAttribute('id', `search-i${specNum}`);
                    
                    const catLabel = getCatLabel(item.category);
                    
                    section.innerHTML = `
                        <div style="margin-bottom:10px;"><span class="search-result-tag">${catLabel}</span></div>
                        ${renderSpeciesHtml(item, query, true, true)}
                        ${item.images && item.images.length > 0 ? `
                            <div class="image-container">
                                ${item.images.slice(0, 2).map(img => `
                                    <figure>
                                        <img src="${img.src}" alt="${img.caption}" loading="lazy" />
                                        <figcaption>${img.caption}</figcaption>
                                    </figure>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${item.audio ? renderPlayerHtml(item) : ''}
                        ${renderListInatSection(item, query)}
                    `;
                    
                    searchResultsView.appendChild(section);
                });

                bindDynamicCardEvents(searchResultsView);
            }, 250);
        });
    }

    /* ==========================================================
       🏛️ 11. SPA 路由机制 (Hash 变化)
       ========================================================== */
    function initSPA() {
        const container = document.querySelector('.container');
        
        // 分门别类建立 category-view 容器
        const categories = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'];
        categories.forEach(catId => {
            if (document.getElementById('view-' + catId)) return;
            const viewDiv = document.createElement('div');
            viewDiv.className = 'category-view';
            viewDiv.id = 'view-' + catId;
            viewDiv.setAttribute('data-view', catId);
            container.appendChild(viewDiv);
        });

        window.addEventListener('hashchange', handleRoute);
        window.addEventListener('popstate', handleRoute);
        
        // 初始触发路由
        handleRoute();
    }

    function handleRoute() {
        const hash = window.location.hash;
        const hubView = document.getElementById('hubView');
        const header = document.querySelector('.header');
        const allViews = document.querySelectorAll('.category-view');
        const homeBtn = document.querySelector('.toc-home-btn');
        const searchResultsView = document.getElementById('searchResultsView');
        const searchInput = document.getElementById('searchInput');

        // 关闭一切可能正在播放的叫声
        stopActiveAudio();

        if (hash.startsWith('#category/')) {
            const catId = hash.replace('#category/', '');
            
            // 清理搜索视图状态
            if (searchResultsView) searchResultsView.classList.remove('active');
            if (searchInput) searchInput.value = '';

            if (hubView) hubView.classList.add('hidden');
            if (header) header.style.display = 'none';
            
            allViews.forEach(v => v.classList.remove('active'));

            const targetView = document.getElementById('view-' + catId);
            if (targetView) {
                targetView.classList.add('active');
                
                // 渲染分类详情内容
                rebuildCategoryView(catId);
            }

            if (homeBtn) homeBtn.classList.add('visible');
            window.scrollTo({ top: 0, behavior: 'instant' });

            // 移动端自适应关闭目录
            closeMobileToc();
            
        } else {
            // 返回首页
            if (hubView) hubView.classList.remove('hidden');
            if (header) header.style.display = '';
            
            allViews.forEach(v => v.classList.remove('active'));
            if (searchResultsView) searchResultsView.classList.remove('active');
            if (searchInput) searchInput.value = '';
            
            if (homeBtn) homeBtn.classList.remove('visible');
            
            window.scrollTo({ top: 0, behavior: 'instant' });
            
            // 重新刷新统计仪表盘
            initStatsCharts();
        }

        updateTocHighlight();
    }

    function closeMobileToc() {
        if (window.innerWidth <= 768) {
            const toc = document.querySelector('.toc');
            const overlay = document.getElementById('overlay');
            const toggle = document.getElementById('menuToggle');
            if (toc && toc.classList.contains('active')) {
                toc.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                if (toggle) toggle.innerHTML = '☰';
            }
        }
    }

    function navigateTo(target) {
        if (target === 'home') {
            history.pushState(null, '', window.location.pathname);
            handleRoute();
        } else {
            window.location.hash = '#category/' + target;
        }
    }

    // 监听目录点击拦截，跳转 SPA
    function initTocSPALinks() {
        const links = document.querySelectorAll('.toc a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            const catMatch = href.match(/^#(c\d+)$/);
            if (catMatch) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo(catMatch[1]);
                });
                return;
            }

            if (href === '#pf') {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo('home');
                });
                return;
            }

            const speciesMatch = href.match(/^#(i(\d+))$/);
            if (speciesMatch) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const speciesNum = parseInt(speciesMatch[2]);
                    const targetCat = getSpeciesCategory(speciesNum);

                    // 1. 切换到对应的分类
                    navigateTo(targetCat);

                    // 2. 标本馆模式下定位当前索引并展示
                    const catItems = typeof insectData !== 'undefined' 
                        ? insectData.filter(d => d.category === targetCat && d.textHtml.includes('id="i')) 
                        : [];
                    const index = catItems.findIndex(item => {
                        const match = item.textHtml.match(/id="i(\d+)"/);
                        return match && parseInt(match[1]) === speciesNum;
                    });
                    
                    if (index > -1) {
                        specimenActiveIndices[targetCat] = index;
                    }
                    
                    // 重绘视图并平滑滚动到页面主展示区
                    rebuildCategoryView(targetCat);
                    
                    setTimeout(() => {
                        const view = document.getElementById('view-' + targetCat);
                        if (view) {
                            view.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 180);
                    
                    closeMobileToc();
                });
            }
        });
    }

    function getCategoryName(catId) {
        const names = {
            'c1': '一、小型蛉虫类',
            'c2': '二、奥蟋类',
            'c3': '三、地栖蟋蟀类',
            'c4': '四、树蟋类（竹蛉及其近似种）',
            'c5': '五、片蟋类及其它外观相似种',
            'c6': '六、蝈螽、纺织娘和似织螽',
            'c7': '七、草螽、露螽和拟叶螽(含外观近似种)',
            'c8': '八、拟叶螽类',
            'c9': '九、其他种类及补充'
        };
        return names[catId] || catId;
    }

    function getSpeciesCategory(num) {
        if (num >= 1 && num <= 18) return 'c1';
        if (num >= 19 && num <= 32) return 'c2';
        if (num >= 33 && num <= 57) return 'c3';
        if (num >= 58 && num <= 64) return 'c4';
        if (num >= 65 && num <= 84) return 'c5';
        if (num >= 85 && num <= 96) return 'c6';
        if (num >= 97 && num <= 116) return 'c7';
        if (num >= 117 && num <= 121) return 'c8';
        if (num >= 122 && num <= 134) return 'c9';
        return 'c1';
    }

    function updateTocHighlight() {
        const hash = window.location.hash;
        const links = document.querySelectorAll('.toc a');
        links.forEach(l => l.classList.remove('toc-active'));

        if (hash.startsWith('#category/')) {
            const catId = hash.replace('#category/', '');
            const target = document.querySelector(`.toc a[href="#${catId}"]`);
            if (target) {
                target.classList.add('toc-active');
                const parentLi = target.closest('li');
                if (parentLi && parentLi.classList.contains('collapsed')) {
                    parentLi.classList.remove('collapsed');
                }
            }
        }
    }

    /* ==========================================================
       🍔 12. 移动端抽屉目录菜单与基本拦截
       ========================================================== */
    function initMobileMenu() {
        const toggle = document.getElementById('menuToggle');
        const toc = document.querySelector('.toc');
        const overlay = document.getElementById('overlay');

        if (!toggle || !toc || !overlay) return;

        function toggleMenu() {
            const active = toc.classList.contains('active');
            if (active) {
                toc.classList.remove('active');
                overlay.classList.remove('active');
                toggle.innerHTML = '☰';
            } else {
                toc.classList.add('active');
                overlay.classList.add('active');
                toggle.innerHTML = '✕';
            }
        }

        toggle.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }

    // 二级目录折叠
    function initCollapsibleToc() {
        const items = document.querySelectorAll('.toc li');
        items.forEach(item => {
            const sub = item.querySelector('ul');
            if (sub) {
                item.classList.add('collapsed');
                sub.classList.add('toc-submenu');

                const arrow = document.createElement('span');
                arrow.className = 'toc-arrow';
                arrow.innerHTML = '▼';
                
                const a = item.querySelector('a');
                if (a) item.insertBefore(arrow, a.nextSibling);
                else item.insertBefore(arrow, item.firstChild);

                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    item.classList.toggle('collapsed');
                });
            }
        });
    }

    // 精准滚动高亮自动跟踪
    function initScrollSpy() {
        if (!('IntersectionObserver' in window)) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && currentViewMode === 'list') {
                    const id = entry.target.getAttribute('id');
                    if (!id) return;
                    
                    const links = document.querySelectorAll('.toc a');
                    links.forEach(l => l.classList.remove('toc-active'));
                    
                    const targetLink = document.querySelector(`.toc a[href="#${id}"]`);
                    if (targetLink) {
                        targetLink.classList.add('toc-active');
                    }
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '-5% 0px -60% 0px'
        });

        // 观察每一个物种卡片 (这只在 list 模式下有效，通过 DOM 重新生成时，在 JS 动态绑定)
        window.addEventListener('hashchange', () => {
            setTimeout(() => {
                const sections = document.querySelectorAll('.species-card-modern');
                sections.forEach(s => observer.observe(s));
            }, 300);
        });
    }

    function initSpectrogramFolding() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.spectrogram-toggle-btn');
            if (btn) {
                e.stopPropagation();
                const section = btn.closest('.specimen-middle-section');
                if (!section) return;
                const foldable = section.querySelector('.spectrogram-foldable');
                if (!foldable) return;
                
                const text = btn.querySelector('.toggle-text');
                if (foldable.classList.contains('expanded')) {
                    foldable.classList.remove('expanded');
                    foldable.style.maxHeight = '0px';
                    if (text) text.textContent = '显示声谱图';
                    btn.classList.remove('active');
                } else {
                    foldable.classList.add('expanded');
                    foldable.style.maxHeight = foldable.scrollHeight + 'px';
                    if (text) text.textContent = '隐藏声谱图';
                    btn.classList.add('active');
                }
            }
        });
    }

    // 在左部导航（TOC 目录）中有音频的鸣虫旁加上 🔈 图标
    function initTocAudioIcons() {
        if (typeof insectData === 'undefined') return;
        insectData.forEach(item => {
            if (item.audio) {
                const match = item.textHtml.match(/id="i(\d+)"/);
                if (match) {
                    const speciesNum = match[1];
                    const link = document.querySelector(`.toc a[href="#i${speciesNum}"]`);
                    if (link) {
                        // 避免重复添加
                        if (!link.querySelector('.toc-audio-icon')) {
                            const icon = document.createElement('span');
                            icon.className = 'toc-audio-icon';
                            icon.textContent = ' 🔈';
                            link.appendChild(icon);
                        }
                    }
                }
            }
        });
    }

    /* ==========================================================
       🚀 13. DOM 就绪入口
       ========================================================== */
    document.addEventListener('DOMContentLoaded', () => {
        // 核心视觉与主题初始化
        initFireflies();
        initThemeToggle();

        initSpecimenDrawer();
        
        // 统计图表初始化
        initStatsCharts();
        
        // 路由与搜索交互初始化
        initSearch();
        initSPA();
        initTocSPALinks();
        initMobileMenu();
        initCollapsibleToc();
        initFavoritesDelegation();
        initScrollSpy();
        initSpectrogramFolding();
        initTocAudioIcons();

        // 窗口变化自适应重置
        window.addEventListener('resize', () => {
            initFireflies();
            closeMobileToc();
        });
        
        // 页面平滑过渡 Polyfill
        document.documentElement.style.scrollBehavior = 'smooth';
    });

    // 挂载到全局，供 inline html 点击调用
    window.navigateTo = navigateTo;

})();
