    // 移动端菜单功能
    function initMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const toc = document.querySelector('.toc');
        const overlay = document.getElementById('overlay');
        const links = document.querySelectorAll('.toc a');

        function toggleMenu() {
            const isActive = toc.classList.contains('active');
            if (isActive) {
                toc.classList.remove('active');
                overlay.classList.remove('active');
                menuToggle.innerHTML = '☰';
                menuToggle.setAttribute('aria-label', '打开菜单');
            } else {
                toc.classList.add('active');
                overlay.classList.add('active');
                menuToggle.innerHTML = '✕';
                menuToggle.setAttribute('aria-label', '关闭菜单');
            }
        }

        if (menuToggle) {
            menuToggle.addEventListener('click', toggleMenu);
        }

        if (overlay) {
            overlay.addEventListener('click', toggleMenu);
        }

        links.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleMenu();
                }
            });
        });

        // 监听窗口大小变化，重置菜单状态
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && toc.classList.contains('active')) {
                toggleMenu();
            }
        });
    }

    // 滚动到顶部按钮
    function addScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-top';
        scrollBtn.innerHTML = ''; //通过CSS伪元素添加箭头
        scrollBtn.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        document.body.appendChild(scrollBtn);

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });
    }

    // 图片点击放大功能 (保持原逻辑优化)
    function addImageClickHandler() {
        // 使用事件委托优化性能，但此处由于图片分散，保持遍历添加
        const images = document.querySelectorAll('.image-container img, .inat-photo-item img');
        images.forEach((img, index) => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', (e) => {
                createImageModal(img.src, img.alt, index, images);
            });
        });
    }

    // 创建图片模态框 - 自适应浏览器窗口 + 完整触屏手势支持
    function createImageModal(src, alt, currentIndex, allImages) {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.95);
            backdrop-filter: blur(20px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.4s ease;
            user-select: none;
            cursor: default;
            touch-action: none;
            -webkit-user-select: none;
        `;

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
            max-width: 96vw;
            max-height: 92vh;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 6px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.6);
            transform: scale(0.85);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
            cursor: grab;
            user-select: none;
            -webkit-user-drag: none;
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

        // === 鼠标拖拽 ===
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

        // 双击恢复原始大小
        img.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            resetView();
        });

        imgContainer.addEventListener('click', (e) => {
            if (e.target === img) e.stopPropagation();
        });

        // === 触屏手势 ===
        let touchStartTime = 0;
        let lastTapTime = 0;
        let touchStartX = 0, touchStartY = 0;
        let isTouchDragging = false;
        let isPinching = false;
        let initialPinchDist = 0;
        let initialPinchScale = 1;
        let pinchCenterX = 0, pinchCenterY = 0;
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
                // 双指捏合开始
                isPinching = true;
                isTouchDragging = false;
                initialPinchDist = getTouchDist(e.touches[0], e.touches[1]);
                initialPinchScale = currentScale;
                pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            } else if (e.touches.length === 1) {
                // 单指触摸开始
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
                // 双指捏合缩放
                const dist = getTouchDist(e.touches[0], e.touches[1]);
                const scale = (dist / initialPinchDist) * initialPinchScale;
                currentScale = Math.min(Math.max(scale, 0.5), 5);
                updateTransform(false);
            } else if (isTouchDragging && e.touches.length === 1) {
                const dx = e.touches[0].clientX - touchStartX;
                const dy = e.touches[0].clientY - touchStartY;

                if (currentScale > 1) {
                    // 放大状态：拖拽平移
                    translateX = lastTranslateX + dx;
                    translateY = lastTranslateY + dy;
                    updateTransform(false);
                }
                // 未放大状态：touchend 里判断滑动切换
            }
        }, { passive: false });

        imgContainer.addEventListener('touchend', (e) => {
            if (isPinching) {
                isPinching = false;
                // 缩放过小则弹回
                if (currentScale < 1) {
                    currentScale = 1;
                    translateX = 0;
                    translateY = 0;
                    updateTransform(true);
                }
                return;
            }

            if (!isTouchDragging) return;
            isTouchDragging = false;
            img.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';

            const elapsed = Date.now() - touchStartTime;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // 双击检测（两次轻触间隔 < 300ms）
            if (elapsed < 250 && absDx < 10 && absDy < 10) {
                const now = Date.now();
                if (now - lastTapTime < 300) {
                    // 双击：切换放大/还原
                    if (currentScale > 1) {
                        resetView();
                    } else {
                        currentScale = 2.5;
                        updateTransform(true);
                    }
                    lastTapTime = 0;
                    return;
                }
                lastTapTime = now;
            }

            // 滑动切换
            const swipeThreshold = 40;
            if (currentScale <= 1 && !swipeHandled && elapsed < 400) {
                if (isMobile) {
                    // 移动端：上下滑屏切换
                    if (absDy > swipeThreshold && absDy > absDx * 1.2) {
                        swipeHandled = true;
                        if (allImages.length > 1) {
                            if (dy < 0) {
                                updateImage((currentIndex + 1) % allImages.length, 'next');
                            } else {
                                updateImage((currentIndex - 1 + allImages.length) % allImages.length, 'prev');
                            }
                        }
                    }
                } else {
                    // 桌面端：保持左右滑动切换
                    if (absDx > swipeThreshold && absDx > absDy * 1.2) {
                        swipeHandled = true;
                        if (allImages.length > 1) {
                            if (dx < 0) {
                                updateImage((currentIndex + 1) % allImages.length, 'next');
                            } else {
                                updateImage((currentIndex - 1 + allImages.length) % allImages.length, 'prev');
                            }
                        }
                    }
                }
            }
        });

        // 阻止默认触摸行为（防止页面滚动和浏览器手势）
        modal.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

        // === UI 元素 ===
        const isMobile = window.innerWidth <= 768;

        const caption = document.createElement('div');
        caption.className = 'modal-caption';
        caption.style.cssText = `
            position: absolute;
            bottom: ${isMobile ? '80px' : '30px'};
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.95);
            background: rgba(0,0,0,0.7);
            padding: ${isMobile ? '8px 20px' : '10px 28px'};
            border-radius: 30px;
            font-size: ${isMobile ? '14px' : '16px'};
            backdrop-filter: blur(15px);
            text-align: center;
            width: fit-content;
            max-width: 85vw;
            white-space: normal;
            word-wrap: break-word;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            z-index: 10002;
            border: 1px solid rgba(255,255,255,0.2);
            font-weight: 500;
            line-height: 1.4;
        `;
        caption.textContent = alt || '';

        const sideBtnStyle = `
            position: absolute;
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.4);
            border: 1px solid rgba(255,255,255,0.08);
            padding: ${isMobile ? '8px 12px' : '12px 20px'};
            border-radius: 30px;
            font-size: ${isMobile ? '14px' : '14px'};
            cursor: pointer;
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
            z-index: 10001;
            white-space: nowrap;
        `;

        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = isMobile ? '▲' : '❮ 上一张';
        if (isMobile) {
            prevBtn.style.cssText = `${sideBtnStyle} top: 70px; left: 50%; transform: translateX(-50%);`;
        } else {
            prevBtn.style.cssText = `${sideBtnStyle} top: 50%; left: 24px; transform: translateY(-50%);`;
        }
        
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = isMobile ? '▼' : '下一张 ❯';
        if (isMobile) {
            nextBtn.style.cssText = `${sideBtnStyle} bottom: 150px; left: 50%; transform: translateX(-50%);`;
        } else {
            nextBtn.style.cssText = `${sideBtnStyle} top: 50%; right: 24px; transform: translateY(-50%);`;
        }

        if (allImages.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }

        [prevBtn, nextBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => { 
                btn.style.background = 'rgba(255,255,255,0.15)';
                btn.style.color = 'white';
                const baseTransform = btn.style.transform.split(' scale')[0];
                btn.style.transform = `${baseTransform} scale(1.1)`;
                btn.style.borderColor = 'rgba(255,255,255,0.2)';
            });
            btn.addEventListener('mouseleave', () => { 
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.color = 'rgba(255,255,255,0.4)';
                const baseTransform = btn.style.transform.split(' scale')[0];
                btn.style.transform = `${baseTransform} scale(1)`;
                btn.style.borderColor = 'rgba(255,255,255,0.08)';
            });
        });

        const counter = document.createElement('div');
        counter.style.cssText = `
            position: absolute;
            bottom: ${isMobile ? '120px' : '75px'};
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.3);
            font-size: 11px;
            letter-spacing: 1px;
            pointer-events: none;
            z-index: 10001;
        `;
        counter.textContent = `${currentIndex + 1} / ${allImages.length}`;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px; right: 20px;
            width: ${isTouchDevice ? '44px' : '40px'};
            height: ${isTouchDevice ? '44px' : '40px'};
            border: none; border-radius: 50%;
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.4);
            font-size: 24px;
            cursor: pointer;
            backdrop-filter: blur(4px);
            transition: all 0.3s ease;
            z-index: 10003;
            display: flex; align-items: center; justify-content: center;
            line-height: 1;
            border: 1px solid rgba(255,255,255,0.08);
        `;
        closeBtn.addEventListener('mouseenter', () => { 
            closeBtn.style.background = 'rgba(255,255,255,0.15)'; 
            closeBtn.style.color = 'white';
            closeBtn.style.transform = 'rotate(90deg) scale(1.1)'; 
        });
        closeBtn.addEventListener('mouseleave', () => { 
            closeBtn.style.background = 'rgba(255,255,255,0.05)'; 
            closeBtn.style.color = 'rgba(255,255,255,0.4)';
            closeBtn.style.transform = 'rotate(0) scale(1)'; 
        });

        // 组装 DOM
        imgContainer.appendChild(img);
        modal.appendChild(imgContainer);
        modal.appendChild(closeBtn);
        modal.appendChild(prevBtn);
        modal.appendChild(nextBtn);
        modal.appendChild(caption);
        modal.appendChild(counter);
        document.body.appendChild(modal);

        // 更新图片
        function updateImage(index, direction) {
            currentIndex = index;
            const targetImg = allImages[currentIndex];
            
            // 离场动画
            img.style.opacity = '0';
            if (isMobile) {
                img.style.transform = direction === 'next' ? 'translateY(-30px) scale(0.95)' : 'translateY(30px) scale(0.95)';
            } else {
                img.style.transform = direction === 'next' ? 'translateX(-30px) scale(0.95)' : 'translateX(30px) scale(0.95)';
            }
            
            setTimeout(() => {
                img.src = targetImg.src;
                img.alt = targetImg.alt;
                caption.textContent = targetImg.alt || '';
                counter.textContent = `${currentIndex + 1} / ${allImages.length}`;
                resetView();
                
                // 入场动画
                img.style.opacity = '1';
                img.style.transform = 'scale(1)';
            }, 200);
        }

        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); updateImage((currentIndex - 1 + allImages.length) % allImages.length, isMobile ? 'prev' : 'prev'); });
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); updateImage((currentIndex + 1) % allImages.length, isMobile ? 'next' : 'next'); });

        // 滚轮缩放
        modal.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = 0.12;
            if (e.deltaY < 0) {
                currentScale = Math.min(currentScale + factor, 5);
            } else {
                currentScale = Math.max(currentScale - factor, 0.3);
            }
            updateTransform(false);
        });

        // 关闭
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
            if (!document.body.contains(modal)) { document.removeEventListener('keydown', handleKeyDown); return; }
            switch (e.key) {
                case 'Escape': closeModal(); break;
                case 'ArrowLeft': prevBtn.click(); break;
                case 'ArrowRight': nextBtn.click(); break;
                case '0': resetView(); break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // 入场动画
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            img.style.opacity = '1';
            img.style.transform = 'scale(1)';
        });
    }

    // 滚动动画
    function addScrollAnimation() {
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -20px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            const sections = document.querySelectorAll('.content-section');
            sections.forEach(section => {
                section.style.opacity = '0';
                section.style.transform = 'translateY(20px)';
                section.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                observer.observe(section);
            });
        }
    }

    // 二级目录折叠功能
    function initCollapsibleToc() {
        const tocItems = document.querySelectorAll('.toc li');

        tocItems.forEach(item => {
            const submenu = item.querySelector('ul');
            if (submenu) {
                // 添加折叠类
                item.classList.add('collapsed');
                submenu.classList.add('toc-submenu');

                // 添加箭头图标
                const arrow = document.createElement('span');
                arrow.className = 'toc-arrow';
                arrow.innerHTML = '▼'; // 使用向下箭头
                arrow.title = '展开/折叠';

                // 将箭头插入到链接后面
                const link = item.querySelector('a');
                if (link) {
                    item.insertBefore(arrow, link.nextSibling);
                } else {
                    item.insertBefore(arrow, item.firstChild);
                }

                // 点击箭头切换折叠状态
                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault(); // 防止触发链接点击
                    item.classList.toggle('collapsed');
                });
            }
        });
    }

    // 初始化
    document.addEventListener('DOMContentLoaded', () => {
        initSearch();
        initSPA();
        initMobileMenu();
        initCollapsibleToc(); // 初始化折叠目录
        initTocSPALinks(); // TOC链接拦截为SPA路由
        addScrollToTop();
        addImageClickHandler();
        addScrollAnimation();
        initLazyImages(); // 图片懒加载与淡入
        initImageFallback(); // 图片加载失败兜底
        initStatsBar(); // 统计看板
        initRandomButton(); // 随机探索按钮
        initFavoritesCard(); // 我的收藏卡片
        initFavoritesDelegation(); // 收藏事件全局委托

        // 平滑滚动 Polyfill (简单的)
        document.documentElement.style.scrollBehavior = 'smooth';
    });

    // ===== 智能鸣虫卡片正则解析与重构渲染 (P2-7) =====
    function renderSpeciesHtml(item, query = '') {
        let html = item.textHtml;
        
        // 匹配 h3 标签和其中的 innerHtml
        const h3Match = html.match(/<h3([^>]*)>([\s\S]*?)<\/h3>/i);
        if (!h3Match) {
            return html; // 如果不是品种段落，直接返回原始 html 结构
        }

        const innerHtml = h3Match[2].trim();

        // 正则提取品种数字编号、中文名、拉丁学名
        const titleMatch = innerHtml.match(/^\s*(\d+)\s*[\.．]\s*([^\s（(\(：:]+)(?:[\(（]([^）\)]+)[\)）])?[\s：:]*/);
        
        if (!titleMatch) {
            return html; // 解析失败，平滑降级
        }

        const speciesNum = titleMatch[1];
        const rawChineseName = titleMatch[2];
        const rawLatinName = titleMatch[3] || '';
        
        // 剩余的文本属于介绍与详情描述
        let desc = innerHtml.substring(titleMatch[0].length).trim();

        // 提取别名/俗称
        const nicknames = [];
        
        // 如果括号里匹配到的是中文俗称（如：短草鬼）而不是纯英文的拉丁学名
        let isLatinValid = /^[a-zA-Z\s\.\-_]+$/.test(rawLatinName.replace(/\s+/g, ' ').trim());
        let formattedLatin = '';
        if (rawLatinName) {
            if (isLatinValid) {
                formattedLatin = rawLatinName.replace(/\s+/g, ' ').trim();
            } else {
                nicknames.push(rawLatinName.trim());
            }
        }

        // 匹配 俗称“xxx” 或 又称“xxx”
        const nickRegex = /(?:俗称|又称)[“"']([^“”"'\s，。；、]+)[”"']/g;
        let nickMatch;
        while ((nickMatch = nickRegex.exec(desc)) !== null) {
            if (!nicknames.includes(nickMatch[1])) {
                nicknames.push(nickMatch[1]);
            }
        }
        
        // 匹配其他可能带有引号且长度合适的别名
        const quotesRegex = /[“"']([^“”"'\s，。；、~]{2,6})[”"']/g;
        let quoteMatch;
        while ((quoteMatch = quotesRegex.exec(desc)) !== null) {
            const name = quoteMatch[1];
            if (!nicknames.includes(name) && !name.includes('~') && !name.includes('叮') && nicknames.length < 5) {
                nicknames.push(name);
            }
        }

        // 根据标句符号切分 clauses 寻找 鸣声 和 饲养 关键条款
        const clauses = desc.split(/[，。；；\n]/).map(c => c.trim()).filter(c => c.length > 0);
        
        const soundKeywords = ['叫', '鸣', '音量', '叫口', '音调', '节奏', '音质', '金属声', '连贯性', '冷叫'];
        const soundClauses = clauses.filter(c => soundKeywords.some(kw => c.includes(kw)));
        
        const careKeywords = ['饲养', '挑选', '保湿', '群养', '喂食', '逃逸', '寿命', '食物', '南瓜', '胡萝卜', '黄瓜', '泡饭', '万体', '黄蛉盒', '蛉筒', '避开', '防逃', '挑选', '寄生', '皮实', '耐寒', '怕热', '挑选', '常温', '单养'];
        const careClauses = clauses.filter(c => careKeywords.some(kw => c.includes(kw)));

        // 高亮文本函数
        function highlight(txt) {
            if (!query) return txt;
            const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            return txt.replace(regex, '<mark class="search-highlight">$1</mark>');
        }

        // 判断当前品种的收藏状态
        const isFavorited = getFavorites().includes(speciesNum);

        // 构造卡片的 HTML
        let cardHtml = `
            <div class="species-card-modern" id="i${speciesNum}" data-species-num="${speciesNum}">
                <div class="species-header-modern">
                    <div class="species-badge-modern">#${speciesNum.padStart(3, '0')}</div>
                    <div class="species-title-container-modern">
                        <h3 class="species-name-modern">${highlight(rawChineseName)}</h3>
                        ${formattedLatin ? `<span class="species-latin-modern">${highlight(formattedLatin)}</span>` : ''}
                    </div>
                    <button class="favorite-btn-modern ${isFavorited ? 'active' : ''}" data-species-num="${speciesNum}" aria-label="收藏">
                        <svg class="heart-svg" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </button>
                </div>
        `;

        if (nicknames.length > 0) {
            cardHtml += `
                <div class="species-tags-modern">
                    <span class="tags-label-modern">🏷️ 别名/俗称：</span>
                    ${nicknames.map(name => `<span class="species-tag-modern">${highlight(name)}</span>`).join('')}
                </div>
            `;
        }

        cardHtml += `
            <div class="species-desc-modern">
                ${highlight(desc)}
            </div>
        `;

        if (soundClauses.length > 0 || careClauses.length > 0 || item.description) {
            cardHtml += `<div class="species-info-grid-modern">`;
            
            if (soundClauses.length > 0 || item.audio) {
                cardHtml += `
                    <div class="info-card-item-modern sound-info-modern">
                        <div class="info-card-title-modern">🔊 鸣声特征 & 习性</div>
                        <div class="info-card-text-modern">${soundClauses.length > 0 ? highlight(soundClauses.slice(0, 3).join('，') + '。') : '详见本种描述。'}</div>
                `;
                
                if (item.audio) {
                    cardHtml += `
                        <div class="custom-audio-player" data-audio-src="${item.audio.file}" data-species-num="${speciesNum}">
                            <button class="audio-play-btn" aria-label="播放叫声">
                                <svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                <svg class="pause-icon" viewBox="0 0 24 24" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                <svg class="loading-icon" viewBox="0 0 50 50" style="display:none; animation: audio-spin 1s linear infinite; width:16px; height:16px; stroke:#ffffff; stroke-width:4; fill:none; stroke-linecap:round;">
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
                        </div>
                        <div class="spectrogram-container">
                            <div class="spectrogram-wrapper">
                                <img class="spectrogram-img" src="${item.audio.spectrogram}" alt="科学声谱图" loading="lazy" />
                                <div class="spectrogram-progress-line"></div>
                                <div class="spectrogram-overlay"></div>
                            </div>
                            <span class="audio-recordist" title="录音师: ${item.audio.recordist}">🎤 录制: ${item.audio.recordist} | XC ${item.audio.quality}级野生原音</span>
                        </div>
                    `;
                }
                
                cardHtml += `</div>`;
            }
            
            if (careClauses.length > 0) {
                cardHtml += `
                    <div class="info-card-item-modern care-info-modern">
                        <div class="info-card-title-modern">🥬 饲养要点 & 挑选</div>
                        <div class="info-card-text-modern">${highlight(careClauses.slice(0, 3).join('，') + '。')}</div>
                    </div>
                `;
            }

            if (item.description) {
                cardHtml += `
                    <div class="info-card-item-modern morphology-info-modern" style="grid-column: span 2; background: #F5F7F5; border-color: rgba(27, 94, 32, 0.1);">
                        <div class="info-card-title-modern" style="color: #1B5E20;"><span class="info-icon">🔬</span> 学术形态描述 (国家动物标本资源库)</div>
                        <div class="info-card-text-modern" style="font-size: 0.82rem; line-height: 1.7; color: var(--text-main); text-align: justify;">
                            ${highlight(item.description)}
                        </div>
                    </div>
                `;
            }

            if (item.inaturalist) {
                const inat = item.inaturalist;
                const showContrast = inat.displayName && inat.displayName !== rawChineseName;
                
                cardHtml += `
                    <div class="info-card-item-modern inat-info-modern">
                        <div class="info-card-title-modern">
                            <div class="inat-title-left">
                                <span class="info-icon">☘️</span> iNaturalist 自然观察与生态图鉴
                            </div>
                            <a class="inat-link-btn" href="https://www.inaturalist.org/taxa/${inat.taxonId}" target="_blank" rel="noopener noreferrer" title="查看全球分布与野外记录">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                                </svg>
                                生态图鉴 →
                            </a>
                        </div>
                `;
                
                if (showContrast) {
                    cardHtml += `
                        <div class="inat-badge-modern">
                            <span class="inat-badge-label">标准学术名:</span>${highlight(inat.displayName)}
                        </div>
                    `;
                } else {
                    cardHtml += `<div style="height: 4px;"></div>`;
                }

                if (inat.photos && inat.photos.length > 0) {
                    cardHtml += `<div class="inat-photo-gallery">`;
                    inat.photos.forEach((photo, pIdx) => {
                        cardHtml += `
                            <div class="inat-photo-item">
                                <img src="${photo.url}" alt="${rawChineseName}生态图集-${pIdx+1}" loading="lazy" class="inat-ecological-photo" />
                                <div class="inat-photo-attribution" title="${photo.attribution}">${photo.attribution}</div>
                            </div>
                        `;
                    });
                    cardHtml += `</div>`;
                }
                
                cardHtml += `</div>`;
            }
            
            cardHtml += `</div>`;
        }

        cardHtml += `</div>`;
        return cardHtml;
    }

    // ===== 互动收藏/书签核心业务模块 (P2-8) =====
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
        updateFavoritesUI();
    }

    function updateFavoritesUI() {
        const favs = getFavorites();
        
        // 更新首页收藏卡片数量
        const countEl = document.getElementById('favoritesCount');
        if (countEl) {
            countEl.textContent = `📋 ${favs.length} 种鸣虫`;
        }

        // 更新全局所有已存在卡片的收藏心形按钮状态
        const favBtns = document.querySelectorAll('.favorite-btn-modern');
        favBtns.forEach(btn => {
            const num = btn.getAttribute('data-species-num');
            if (favs.includes(num)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 如果用户正在我的收藏视图，实时重绘列表
        if (window.location.hash === '#category/favorites') {
            renderFavoritesList();
        }
    }

    // 全局收藏按钮事件委托，无需重复手动绑定
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

    // 在首页追加“我的收藏”卡片
    function initFavoritesCard() {
        const cardsContainer = document.querySelector('.category-cards');
        if (!cardsContainer) return;

        const favCard = document.createElement('div');
        favCard.className = 'category-card favorites-card';
        favCard.setAttribute('onclick', "navigateTo('favorites')");
        favCard.setAttribute('data-card', 'favorites');
        
        favCard.innerHTML = `
            <div class="category-card-header" style="background: linear-gradient(135deg, #FF6F00 0%, #E65100 100%)">
                <span class="category-card-num">★</span>
                <div class="category-card-title">我的收藏</div>
            </div>
            <div class="category-card-body">
                <div class="category-card-count" id="favoritesCount">📋 0 种鸣虫</div>
                <div class="category-card-desc">快速查看您收藏的所有鸣虫品种，支持离线保存</div>
                <div class="category-card-arrow">→</div>
            </div>
        `;
        
        cardsContainer.appendChild(favCard);
        updateFavoritesUI();
    }

    // 动态生成收藏视图
    function renderFavoritesList() {
        const favs = getFavorites();
        const favsList = document.getElementById('favoritesList');
        if (!favsList) return;

        if (favs.length === 0) {
            favsList.innerHTML = `
                <div class="empty-result" style="padding: 60px 20px; text-align: center;">
                    <div style="font-size:3.5rem; margin-bottom:16px; opacity:0.6;">⭐</div>
                    <div style="font-size:1.1rem; color:var(--text-secondary); margin-bottom:8px;">您还没有收藏任何鸣虫</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">快去浏览鸣虫品种，点击卡片右上角的心形图标收藏吧！</div>
                </div>
            `;
            return;
        }

        favsList.innerHTML = '';
        
        favs.forEach(num => {
            const item = typeof insectData !== 'undefined' ? insectData.find(d => {
                const match = d.textHtml.match(/id="i(\d+)"/);
                return match && match[1] === num;
            }) : null;

            if (item) {
                const section = document.createElement('div');
                section.className = 'content-section';
                
                const textDiv = document.createElement('div');
                textDiv.className = 'content-text';
                textDiv.innerHTML = renderSpeciesHtml(item);
                section.appendChild(textDiv);

                if (item.images && item.images.length > 0) {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'image-container';
                    item.images.forEach(imgData => {
                        const fig = document.createElement('figure');
                        const img = document.createElement('img');
                        img.src = imgData.src;
                        img.alt = imgData.caption || '鸣虫图片';
                        img.setAttribute('loading', 'lazy');

                        const figcaption = document.createElement('figcaption');
                        figcaption.textContent = imgData.caption;

                        fig.appendChild(img);
                        fig.appendChild(figcaption);
                        imgContainer.appendChild(fig);
                    });
                    section.appendChild(imgContainer);
                }

                favsList.appendChild(section);
            }
        });

        // 统一绑定收藏页的新生成图片的点击、懒加载与 fallback 事件
        bindDynamicCardEvents(favsList);
    }

    // ===== 自定义叫声播放器与声谱图同步扫描业务逻辑 =====
    let activeAudio = null;
    let activePlayer = null;

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

            // 声谱图交互组件 (修复Bug：.spectrogram-container 是 .sound-info-modern 的子元素，并非 sibling)
            const specContainer = player.closest('.sound-info-modern').querySelector('.spectrogram-container');
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
                progressFill.style.width = '0%';
                timeIndicator.style.color = "var(--text-secondary)";
                timeIndicator.textContent = `00:00 / ${formatTime(audio ? audio.duration : 0)}`;
                if (specLine) specLine.style.display = 'none';
                if (specOverlay) specOverlay.style.width = '100%';
            }

            function setupAudio() {
                if (audio) return audio;
                
                let currentSrc = audioSrc;
                audio = new Audio(currentSrc);
                
                let fallbackTimer = null;
                let hasSwitched = false;

                function startFallbackTimer() {
                    clearFallbackTimer();
                    fallbackTimer = setTimeout(() => {
                        if (audio && audio.paused === false && audio.currentTime === 0 && !hasSwitched) {
                            console.warn("Direct connection to Xeno-Canto is slow. Switching to high-speed proxy channel...");
                            timeIndicator.textContent = "正在尝试高品质加速通道...";
                            timeIndicator.style.color = "#FF8F00";
                            
                            hasSwitched = true;
                            const savedVolume = audio.volume;
                            audio.pause();
                            
                            // 使用 CodeTabs 反向代理加速境外学术音频文件
                            currentSrc = "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(audioSrc);
                            audio.src = currentSrc;
                            audio.load();
                            audio.volume = savedVolume;
                            audio.play().catch(err => {
                                console.error("Fallback play failed:", err);
                                handlePlaybackError();
                            });
                        }
                    }, 4000); // 4秒超时自动切换备用通道
                }

                function clearFallbackTimer() {
                    if (fallbackTimer) {
                        clearTimeout(fallbackTimer);
                        fallbackTimer = null;
                    }
                }

                function handlePlaybackError() {
                    clearFallbackTimer();
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                    if (loadingIcon) loadingIcon.style.display = 'none';
                    timeIndicator.textContent = "❌ 加载失败 (海外资源超时)";
                    timeIndicator.style.color = "#d32f2f";
                    if (specLine) specLine.style.display = 'none';
                    if (specOverlay) specOverlay.style.width = '100%';
                }
                
                audio.addEventListener('loadstart', () => {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'none';
                    if (loadingIcon) loadingIcon.style.display = 'block';
                    if (!hasSwitched) {
                        timeIndicator.textContent = "🔍 正在连接野生音源...";
                        timeIndicator.style.color = "var(--text-secondary)";
                        startFallbackTimer();
                    }
                });

                audio.addEventListener('waiting', () => {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'none';
                    if (loadingIcon) loadingIcon.style.display = 'block';
                    if (!hasSwitched) {
                        startFallbackTimer();
                    }
                });

                audio.addEventListener('play', () => {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                    if (loadingIcon) loadingIcon.style.display = 'none';
                    if (specLine) specLine.style.display = 'block';
                });

                audio.addEventListener('playing', () => {
                    clearFallbackTimer();
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                    if (loadingIcon) loadingIcon.style.display = 'none';
                    if (specLine) specLine.style.display = 'block';
                    timeIndicator.style.color = "var(--text-secondary)";
                });

                audio.addEventListener('pause', () => {
                    clearFallbackTimer();
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                    if (loadingIcon) loadingIcon.style.display = 'none';
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
                    clearFallbackTimer();
                    resetThisPlayer();
                    if (activeAudio === audio) {
                        activeAudio = null;
                        activePlayer = null;
                    }
                });

                audio.addEventListener('loadedmetadata', () => {
                    timeIndicator.textContent = `00:00 / ${formatTime(audio.duration)}`;
                });

                audio.addEventListener('error', (e) => {
                    console.error("Audio error encountered:", e);
                    if (!hasSwitched) {
                        console.warn("Direct connection failed. Retrying with proxy channel...");
                        hasSwitched = true;
                        timeIndicator.textContent = "⚡ 切换加速通道...";
                        timeIndicator.style.color = "#FF8F00";
                        const savedVolume = audio.volume;
                        
                        currentSrc = "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(audioSrc);
                        audio.src = currentSrc;
                        audio.load();
                        audio.volume = savedVolume;
                        audio.play().catch(err => {
                            console.error("Fallback play after error failed:", err);
                            handlePlaybackError();
                        });
                    } else {
                        handlePlaybackError();
                    }
                });

                return audio;
            }

            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const localAudio = setupAudio();

                if (activeAudio && activeAudio !== localAudio) {
                    if (activePlayer && typeof activePlayer.resetThisPlayer === 'function') {
                        activePlayer.resetThisPlayer();
                    }
                }

                if (localAudio.paused) {
                    activeAudio = localAudio;
                    activePlayer = { resetThisPlayer };
                    localAudio.play().catch(err => {
                        console.log("Audio play blocked:", err);
                        // 兜底重试
                        if (err.name === "NotSupportedError" || err.name === "NotAllowedError") {
                            timeIndicator.textContent = "⚠️ 浏览器播放受限";
                        }
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

    // 动态生成内容的事件二次绑定助手
    function bindDynamicCardEvents(container) {
        const images = container.querySelectorAll('.image-container img, .inat-photo-item img');
        images.forEach((img, index) => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', () => {
                createImageModal(img.src, img.alt, index, images);
            });
        });
        
        // 绑定懒加载加载完毕事件
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
            img.setAttribute('loading', 'lazy');
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });
                img.addEventListener('error', () => {
                    img.classList.add('loaded');
                });
            }
            
            // 绑定 fallback 兜底
            if (!img.dataset.fallbackBound) {
                img.dataset.fallbackBound = 'true';
                img.addEventListener('error', function() {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'img-error-placeholder';
                    placeholder.innerHTML = '<span>图片加载失败</span>';
                    this.parentNode.replaceChild(placeholder, this);
                });
            }
        });

        // 绑定自定义音频播放器
        initAudioPlayers(container);
    }

    // ===== 搜索功能（含防抖、高亮、分类标签）=====
    function initSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResultsView = document.getElementById('searchResultsView');
        const hubView = document.getElementById('hubView');

        if (!searchInput || !searchResultsView || !hubView) return;

        let debounceTimer = null;

        // 获取分类名称用于标签
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

            // 防抖
            if (debounceTimer) clearTimeout(debounceTimer);
            
            if (query === '') {
                searchResultsView.classList.remove('active');
                hubView.style.display = 'block';
                searchResultsView.innerHTML = '';
                return;
            }

            debounceTimer = setTimeout(() => {
                // 执行搜索
                hubView.style.display = 'none';
                searchResultsView.classList.add('active');

                const results = typeof insectData !== 'undefined' ? insectData.filter(item => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = item.textHtml;
                    const text = tempDiv.innerText.toLowerCase();
                    return text.includes(query);
                }) : [];

                searchResultsView.innerHTML = `
                    <div class="category-page-title" style="margin-bottom:20px; font-size:1.5rem; text-align:center;">
                        🔍 搜索结果: 找到 ${results.length} 种鸣虫
                    </div>
                `;

                if (results.length === 0) {
                    searchResultsView.innerHTML += `<div class="empty-result">
                        <div style="font-size:2.5rem; margin-bottom:12px; opacity:0.5;">🦗</div>
                        没有找到与 "${query}" 相关的鸣虫，请换个关键词试试！</div>`;
                    return;
                }

                // 渲染结果
                results.forEach(item => {
                    const section = document.createElement('div');
                    section.className = 'content-section';

                    const textDiv = document.createElement('div');
                    textDiv.className = 'content-text';

                    // 添加分类标签
                    const catLabel = getCatLabel(item.category);
                    if (catLabel) {
                        textDiv.innerHTML = `<span class="search-result-tag">${catLabel}</span>` + renderSpeciesHtml(item, query);
                    } else {
                        textDiv.innerHTML = renderSpeciesHtml(item, query);
                    }
                    section.appendChild(textDiv);

                    if (item.images && item.images.length > 0) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'image-container';
                        item.images.forEach(imgData => {
                            const fig = document.createElement('figure');
                            const img = document.createElement('img');
                            img.src = imgData.src;
                            img.alt = imgData.caption || '鸣虫图片';
                            img.setAttribute('loading', 'lazy');

                            const figcaption = document.createElement('figcaption');
                            figcaption.textContent = imgData.caption;

                            fig.appendChild(img);
                            fig.appendChild(figcaption);
                            imgContainer.appendChild(fig);
                        });
                        section.appendChild(imgContainer);
                    }

                    searchResultsView.appendChild(section);
                });

                // 给新生成的搜索结果元素做事件二次绑定
                bindDynamicCardEvents(searchResultsView);
            }, 250); // 250ms 防抖
        });
    }

    // ===== SPA 多视图路由 =====
    function initSPA() {
        const container = document.querySelector('.container');
        const categoryGroups = {};

        if (typeof insectData !== 'undefined') {
            insectData.forEach(item => {
                const section = document.createElement('div');
                section.className = 'content-section';
                section.setAttribute('data-category', item.category);

                const textDiv = document.createElement('div');
                if (item.textId) textDiv.id = item.textId;
                textDiv.className = 'content-text';
                // 使用重构后的现代分层卡片渲染器
                textDiv.innerHTML = renderSpeciesHtml(item);
                section.appendChild(textDiv);

                if (item.images && item.images.length > 0) {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'image-container';
                    item.images.forEach(imgData => {
                        const fig = document.createElement('figure');
                        const img = document.createElement('img');
                        img.src = imgData.src;
                        img.alt = imgData.caption || '鸣虫图片';
                        img.setAttribute('loading', 'lazy');

                        const figcaption = document.createElement('figcaption');
                        figcaption.textContent = imgData.caption;

                        fig.appendChild(img);
                        fig.appendChild(figcaption);
                        imgContainer.appendChild(fig);
                    });
                    section.appendChild(imgContainer);
                }

                if (!categoryGroups[item.category]) categoryGroups[item.category] = [];
                categoryGroups[item.category].push(section);
            });
        } else {
            const allSections = document.querySelectorAll('.content-section[data-category]');
            allSections.forEach(section => {
                const cat = section.getAttribute('data-category');
                if (!categoryGroups[cat]) categoryGroups[cat] = [];
                categoryGroups[cat].push(section);
            });
        }

        Object.keys(categoryGroups).forEach(catId => {
            const viewDiv = document.createElement('div');
            viewDiv.className = 'category-view';
            viewDiv.id = 'view-' + catId;
            viewDiv.setAttribute('data-view', catId);

            const catName = getCategoryName(catId);
            viewDiv.innerHTML = `
                <button class="back-btn" onclick="navigateTo('home')">← 返回首页</button>
                <h2 class="category-page-title">${catName}</h2>
            `;

            categoryGroups[catId].forEach(section => {
                viewDiv.appendChild(section);
            });

            // 隐藏内容中与分类页标题重复的 h2
            const firstH2 = viewDiv.querySelector('.content-section .content-text > h2');
            if (firstH2) {
                firstH2.style.display = 'none';
            }

            container.appendChild(viewDiv);
        });

        // 动态追加我的收藏视图
        const favViewDiv = document.createElement('div');
        favViewDiv.className = 'category-view';
        favViewDiv.id = 'view-favorites';
        favViewDiv.setAttribute('data-view', 'favorites');
        favViewDiv.innerHTML = `
            <button class="back-btn" onclick="navigateTo('home')">← 返回首页</button>
            <h2 class="category-page-title">★ 我的收藏合集</h2>
            <div id="favoritesList"></div>
        `;
        container.appendChild(favViewDiv);

        // 核心修复：初始化绑定所有标准分类页卡片的叫声播放器与声谱图联动
        initAudioPlayers(container);

        window.addEventListener('hashchange', handleRoute);
        window.addEventListener('popstate', handleRoute);
        handleRoute();
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

    function getSpeciesCategory(speciesNum) {
        const n = speciesNum;
        if (n >= 1 && n <= 18) return 'c1';
        if (n >= 19 && n <= 32) return 'c2';
        if (n >= 33 && n <= 57) return 'c3';
        if (n >= 58 && n <= 64) return 'c4';
        if (n >= 65 && n <= 84) return 'c5';
        if (n >= 85 && n <= 96) return 'c6';
        if (n >= 97 && n <= 116) return 'c7';
        if (n >= 117 && n <= 121) return 'c8';
        if (n >= 122 && n <= 134) return 'c9';
        return 'c1';
    }

    function navigateTo(target) {
        if (target === 'home') {
            history.pushState(null, '', window.location.pathname);
            handleRoute();
        } else {
            window.location.hash = '#category/' + target;
        }
    }

    function handleRoute() {
        const hash = window.location.hash;
        const hubView = document.getElementById('hubView');
        const header = document.querySelector('.header');
        const allViews = document.querySelectorAll('.category-view');
        const homeBtn = document.querySelector('.toc-home-btn');
        const toc = document.querySelector('.toc');

        if (hash.startsWith('#category/')) {
            const catId = hash.replace('#category/', '');

            hubView.classList.add('hidden');
            header.style.display = 'none';
            allViews.forEach(v => v.classList.remove('active'));

            const targetView = document.getElementById('view-' + catId);
            if (targetView) {
                targetView.classList.add('active');
            }

            // 如果访问的是收藏路由，触发合集页渲染
            if (catId === 'favorites') {
                renderFavoritesList();
            }

            if (homeBtn) homeBtn.classList.add('visible');
            window.scrollTo({ top: 0, behavior: 'instant' });

            if (window.innerWidth <= 768) {
                const overlay = document.getElementById('overlay');
                const menuToggle = document.getElementById('menuToggle');
                if (toc && toc.classList.contains('active')) {
                    toc.classList.remove('active');
                    if (overlay) overlay.classList.remove('active');
                    if (menuToggle) menuToggle.innerHTML = '☰';
                }
            }
        } else {
            hubView.classList.remove('hidden');
            header.style.display = '';
            allViews.forEach(v => v.classList.remove('active'));
            if (homeBtn) homeBtn.classList.remove('visible');
            window.scrollTo({ top: 0, behavior: 'instant' });
            
            // 返回主页时自动更新收藏卡片计数
            updateFavoritesUI();
        }

        // 更新TOC高亮
        updateTocHighlight();
    }

    // 拦截TOC链接为SPA路由
    function initTocSPALinks() {
        const tocLinks = document.querySelectorAll('.toc a');
        tocLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            const catMatch = href.match(/^#(c\d+)$/);
            if (catMatch) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigateTo(catMatch[1]);
                });
                return;
            }

            if (href === '#pf') {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigateTo('home');
                });
                return;
            }

            const speciesMatch = href.match(/^#(i(\d+))$/);
            if (speciesMatch) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const speciesId = speciesMatch[1];
                    const speciesNum = parseInt(speciesMatch[2]);
                    const targetCat = getSpeciesCategory(speciesNum);

                    navigateTo(targetCat);

                    setTimeout(() => {
                        const target = document.getElementById(speciesId);
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 150);

                    if (window.innerWidth <= 768) {
                        const overlay = document.getElementById('overlay');
                        const menuToggle = document.getElementById('menuToggle');
                        const toc = document.querySelector('.toc');
                        if (toc && toc.classList.contains('active')) {
                            toc.classList.remove('active');
                            if (overlay) overlay.classList.remove('active');
                            if (menuToggle) menuToggle.innerHTML = '☰';
                        }
                    }
                });
            }
        });
    }

    // 图片懒加载与淡入
    function initLazyImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.setAttribute('loading', 'lazy');
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });
                img.addEventListener('error', () => {
                    img.classList.add('loaded');
                });
            }
        });
    }

    // ===== 图片加载失败兜底 =====
    function initImageFallback() {
        const images = document.querySelectorAll('.image-container img');
        images.forEach(img => {
            if (img.dataset.fallbackBound) return;
            img.dataset.fallbackBound = 'true';
            img.addEventListener('error', function() {
                // 替换为占位图
                const placeholder = document.createElement('div');
                placeholder.className = 'img-error-placeholder';
                placeholder.innerHTML = '<span>图片加载失败</span>';
                this.parentNode.replaceChild(placeholder, this);
            });
        });
    }

    // ===== 统计看板 =====
    function initStatsBar() {
        const hubView = document.getElementById('hubView');
        if (!hubView || typeof insectData === 'undefined') return;

        // 统计数据
        let totalSpecies = 0;
        let totalImages = 0;
        const photographers = new Set();

        insectData.forEach(item => {
            // 检查是否有品种标题（h3标签有id）
            const match = item.textHtml.match(/id="i(\d+)"/);
            if (match) totalSpecies++;
            
            if (item.images) {
                totalImages += item.images.length;
                item.images.forEach(img => {
                    const capMatch = img.caption.match(/[（(]([^）)]+)[）)]\s*$/);
                    if (capMatch) photographers.add(capMatch[1]);
                });
            }
        });

        const statsHtml = `
            <div class="stats-bar">
                <div class="stat-item">
                    <div class="stat-num">${totalSpecies}</div>
                    <div class="stat-label">鸣虫品种</div>
                </div>
                <div class="stat-item">
                    <div class="stat-num">${totalImages}</div>
                    <div class="stat-label">配图数量</div>
                </div>
                <div class="stat-item">
                    <div class="stat-num">${photographers.size}</div>
                    <div class="stat-label">摄影师</div>
                </div>
                <div class="stat-item">
                    <div class="stat-num">9</div>
                    <div class="stat-label">大分类</div>
                </div>
            </div>
        `;

        hubView.insertAdjacentHTML('afterbegin', statsHtml);
    }

    // ===== 随机探索按钮 =====
    function initRandomButton() {
        const hubView = document.getElementById('hubView');
        if (!hubView || typeof insectData === 'undefined') return;

        const btnContainer = document.createElement('div');
        btnContainer.style.textAlign = 'center';
        btnContainer.style.padding = '10px 0 20px';
        btnContainer.innerHTML = '<button class="random-btn" id="randomExploreBtn">🎲 随机看一种鸣虫</button>';
        hubView.appendChild(btnContainer);

        document.getElementById('randomExploreBtn').addEventListener('click', () => {
            // 只筛选有品种id的条目
            const speciesItems = insectData.filter(item => /id="i\d+"/.test(item.textHtml));
            if (speciesItems.length === 0) return;
            const randItem = speciesItems[Math.floor(Math.random() * speciesItems.length)];
            const idMatch = randItem.textHtml.match(/id="(i(\d+))"/);
            if (idMatch) {
                const speciesId = idMatch[1];
                const speciesNum = parseInt(idMatch[2]);
                const targetCat = getSpeciesCategory(speciesNum);
                navigateTo(targetCat);
                setTimeout(() => {
                    const target = document.getElementById(speciesId);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 200);
            }
        });
    }

    // ===== TOC高亮更新 =====
    function updateTocHighlight() {
        const hash = window.location.hash;
        const allTocLinks = document.querySelectorAll('.toc a');

        // 清除所有高亮
        allTocLinks.forEach(link => link.classList.remove('toc-active'));

        if (hash.startsWith('#category/')) {
            const catId = hash.replace('#category/', '');
            // 高亮对应一级目录
            const targetLink = document.querySelector(`.toc a[href="#${catId}"]`);
            if (targetLink) {
                targetLink.classList.add('toc-active');
                // 自动展开对应子目录
                const parentLi = targetLink.closest('li');
                if (parentLi && parentLi.classList.contains('collapsed')) {
                    parentLi.classList.remove('collapsed');
                }
            }
        }
    }
