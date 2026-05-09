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
        const images = document.querySelectorAll('.image-container img');
        images.forEach((img, index) => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', (e) => {
                createImageModal(img.src, img.alt, index, images);
            });
        });
    }

    // 创建图片模态框 - 自适应浏览器窗口
    function createImageModal(src, alt, currentIndex, allImages) {
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
        `;

        // 图片容器 - 填满窗口
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
        `;

        let currentScale = 1;
        let translateX = 0, translateY = 0;
        let isDragging = false;
        let startX, startY, lastTranslateX, lastTranslateY;

        // 更新图片变换
        function updateTransform(animated) {
            if (!animated) img.style.transition = 'none';
            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
            if (!animated) requestAnimationFrame(() => { img.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease'; });
        }

        // 重置缩放和位移
        function resetView() {
            currentScale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform(true);
        }

        // 拖拽功能
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

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            translateX = lastTranslateX + (e.clientX - startX);
            translateY = lastTranslateY + (e.clientY - startY);
            updateTransform(false);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = 'grab';
                img.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
            }
        });

        // 双击恢复原始大小
        img.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            resetView();
        });

        // 阻止图片容器点击冒泡
        imgContainer.addEventListener('click', (e) => {
            if (e.target === img) e.stopPropagation();
        });

        // 图片名称显示
        const caption = document.createElement('div');
        caption.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.8);
            background: rgba(0,0,0,0.5);
            padding: 6px 18px;
            border-radius: 20px;
            font-size: 13px;
            backdrop-filter: blur(10px);
            max-width: 80%;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;
        `;
        caption.textContent = alt || '';

        // 计数器
        const counter = document.createElement('div');
        counter.style.cssText = `
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            background: rgba(255,255,255,0.12);
            padding: 6px 18px;
            border-radius: 20px;
            font-size: 14px;
            backdrop-filter: blur(10px);
            letter-spacing: 1px;
            pointer-events: none;
        `;
        counter.textContent = `${currentIndex + 1} / ${allImages.length}`;

        // 导航按钮样式
        const btnStyle = `
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.1);
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.25s;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '❮';
        prevBtn.style.cssText = `${btnStyle} left: 16px;`;
        if (allImages.length <= 1) prevBtn.style.display = 'none';

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '❯';
        nextBtn.style.cssText = `${btnStyle} right: 16px;`;
        if (allImages.length <= 1) nextBtn.style.display = 'none';

        // 按钮悬停效果
        [prevBtn, nextBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.25)'; btn.style.transform = 'translateY(-50%) scale(1.1)'; });
            btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.1)'; btn.style.transform = 'translateY(-50%) scale(1)'; });
        });

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 16px; right: 16px;
            width: 44px; height: 44px;
            border: none; border-radius: 50%;
            background: rgba(255,255,255,0.12);
            color: white; font-size: 28px;
            cursor: pointer;
            backdrop-filter: blur(10px);
            transition: all 0.25s ease;
            z-index: 10001;
            display: flex; align-items: center; justify-content: center;
            line-height: 1;
        `;
        closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.3)'; closeBtn.style.transform = 'rotate(90deg)'; });
        closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'rgba(255,255,255,0.12)'; closeBtn.style.transform = 'rotate(0)'; });

        // 组装 DOM
        imgContainer.appendChild(img);
        modal.appendChild(imgContainer);
        modal.appendChild(closeBtn);
        modal.appendChild(prevBtn);
        modal.appendChild(nextBtn);
        modal.appendChild(counter);
        if (alt) modal.appendChild(caption);
        document.body.appendChild(modal);

        // 更新图片
        function updateImage(index) {
            currentIndex = index;
            const targetImg = allImages[currentIndex];
            // 淡出
            img.style.opacity = '0';
            img.style.transform = 'scale(0.85)';
            setTimeout(() => {
                img.src = targetImg.src;
                img.alt = targetImg.alt;
                caption.textContent = targetImg.alt || '';
                counter.textContent = `${currentIndex + 1} / ${allImages.length}`;
                resetView();
                // 淡入
                img.style.opacity = '1';
                img.style.transform = 'scale(1)';
            }, 200);
        }

        // 导航
        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); updateImage((currentIndex - 1 + allImages.length) % allImages.length); });
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); updateImage((currentIndex + 1) % allImages.length); });

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
            document.removeEventListener('mousemove', arguments.callee);
            setTimeout(() => { if (document.body.contains(modal)) document.body.removeChild(modal); }, 350);
        };

        modal.addEventListener('click', (e) => { if (e.target === modal || e.target === imgContainer) closeModal(); });
        closeBtn.addEventListener('click', closeModal);

        // 键盘导航
        const handleKeyDown = (e) => {
            if (!document.body.contains(modal)) { document.removeEventListener('keydown', handleKeyDown); return; }
            switch (e.key) {
                case 'Escape': closeModal(); break;
                case 'ArrowLeft': prevBtn.click(); break;
                case 'ArrowRight': nextBtn.click(); break;
                case '0': resetView(); break; // 按 0 键重置视图
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

                    // 点击一级链接也切换折叠状态
                    link.addEventListener('click', (e) => {
                        // 在移动端，如果点击的是有子菜单的父链接，我们只想展开/折叠，不希望触发默认跳转或关闭菜单
                        // 在桌面端，我们既想跳转，也想展开/折叠

                        if (window.innerWidth <= 768) {
                            e.preventDefault(); // 阻止跳转
                            e.stopPropagation(); // 阻止冒泡到 initMobileMenu 中的点击事件
                            item.classList.toggle('collapsed');
                        } else {
                            // 桌面端：保持跳转，但也切换折叠状态（点一下展开，再点一下折叠）
                            item.classList.toggle('collapsed');
                        }
                    });
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
        initSPA();
        // initTocSPALinks 在 initCollapsibleToc 之后调用
        initMobileMenu();
        initCollapsibleToc(); // 初始化折叠目录
        initTocSPALinks(); // TOC链接拦截为SPA路由
        addScrollToTop();
        addImageClickHandler();
        addScrollAnimation();
        initLazyImages(); // 图片懒加载与淡入

        // 平滑滚动 Polyfill (简单的)
        document.documentElement.style.scrollBehavior = 'smooth';
    });

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
                textDiv.innerHTML = item.textHtml;
                section.appendChild(textDiv);

                if (item.images && item.images.length > 0) {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'image-container';
                    item.images.forEach(imgData => {
                        const fig = document.createElement('figure');
                        const img = document.createElement('img');
                        img.src = imgData.src;
                        img.alt = '鸣虫图片';
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
            'c7': '八、草螽、露螽和拟叶螽(含外观近似种)',
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
        }
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

