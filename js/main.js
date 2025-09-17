/**
 * 主控制逻辑
 * 负责协调数据处理和图形渲染
 */
class MultipathRelationVisualization {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.graphRenderer = new GraphRenderer('graph-container', this.dataProcessor);
        this.currentData = null;
        this.currentTenant = null;
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 显示加载状态
            this.showLoading();
            
            // 加载数据
            this.currentData = await this.dataProcessor.loadData();
            
            // 初始化租户选择器
            this.initTenantSelector();
            
            // 渲染图形
            this.renderGraph();
            
            // 绑定事件
            this.bindEvents();
            
            // 隐藏加载状态
            this.hideLoading();
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError(`数据加载失败: ${error.message}<br/><br/>请确保：<br/>1. 使用本地服务器运行（如：python -m http.server 8000）<br/>2. 数据文件存在于 ../data/ 目录下<br/>3. 检查浏览器控制台获取详细错误信息`);
        }
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const container = d3.select('#graph-container');
        container.html('<div class="loading">正在加载数据...</div>');
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const container = d3.select('#graph-container');
        container.select('.loading').remove();
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        const container = d3.select('#graph-container');
        container.html(`<div style="text-align: center; padding: 50px; color: #e74c3c;">${message}</div>`);
    }


    /**
     * 初始化租户选择器
     */
    initTenantSelector() {
        const tenantSelect = document.getElementById('tenant-select');
        if (!tenantSelect) return;

        // 获取所有可用的租户
        const tenants = this.dataProcessor.getAvailableTenants();
        
        // 清空现有选项
        tenantSelect.innerHTML = '';
        
        // 添加"全部"选项
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = '全部租户';
        tenantSelect.appendChild(allOption);
        
        // 添加租户选项
        tenants.forEach(tenantId => {
            const option = document.createElement('option');
            option.value = tenantId;
            option.textContent = tenantId;
            tenantSelect.appendChild(option);
        });
        
        console.log('可用租户:', tenants);
    }

    /**
     * 渲染图形
     */
    renderGraph() {
        console.log('开始渲染图形...');
        const data = this.currentTenant ? 
            this.dataProcessor.getDataByTenant(this.currentTenant) : 
            this.dataProcessor.getAllData();
        console.log('使用数据:', data);
        this.graphRenderer.render(data);
        console.log('图形渲染完成');
    }


    /**
     * 绑定事件
     */
    bindEvents() {
        // 键盘快捷键：Ctrl/Cmd + R 重置视图
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                this.graphRenderer.resetView();
            }
        });

        // 租户选择事件
        this.bindTenantEvents();

        // 搜索功能
        this.bindSearchEvents();
    }

    /**
     * 绑定租户选择事件
     */
    bindTenantEvents() {
        const tenantSelect = document.getElementById('tenant-select');
        if (tenantSelect) {
            tenantSelect.addEventListener('change', (event) => {
                this.currentTenant = event.target.value || null;
                console.log('选择租户:', this.currentTenant);
                this.renderGraph();
            });
        }
    }

    /**
     * 绑定搜索事件
     */
    bindSearchEvents() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const tagId = searchInput.value.trim();
                if (tagId) {
                    this.graphRenderer.searchAndHighlight(tagId);
                } else {
                    this.graphRenderer.showAllEdges();
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    const tagId = searchInput.value.trim();
                    if (tagId) {
                        this.graphRenderer.searchAndHighlight(tagId);
                    } else {
                        this.graphRenderer.showAllEdges();
                    }
                }
            });
        }
    }


    /**
     * 获取应用统计信息
     */
    getStatistics() {
        if (!this.currentData) return null;
        
        return {
            totalNodes: this.currentData.nodes.length,
            totalLinks: this.currentData.links.length,
            totalTags: this.dataProcessor.tags.filter(tag => !tag.is_deleted).length,
            totalRelations: this.dataProcessor.relations.length
        };
    }

    /**
     * 导出图形为PNG
     */
    exportAsPNG() {
        const svg = this.graphRenderer.svg.node();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const link = document.createElement('a');
            link.download = 'multipath_relation_graph.png';
            link.href = canvas.toDataURL();
            link.click();
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }

    /**
     * 导出数据为JSON
     */
    exportData() {
        const data = {
            nodes: this.currentData.nodes,
            links: this.currentData.links,
            tags: this.dataProcessor.tags,
            relations: this.dataProcessor.relations,
            statistics: this.getStatistics()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = 'multipath_relation_data.json';
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MultipathRelationVisualization();
    
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', () => {
        if (window.app) {
            // 延迟重新渲染，避免频繁调用
            clearTimeout(window.resizeTimeout);
            window.resizeTimeout = setTimeout(() => {
                window.app.graphRenderer.init();
                window.app.renderGraph();
            }, 250);
        }
    });
});
