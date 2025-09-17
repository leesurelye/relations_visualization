/**
 * 图形渲染模块
 * 负责使用D3.js渲染交互式关系图
 */
class GraphRenderer {
    constructor(containerId, dataProcessor = null) {
        this.containerId = containerId;
        this.dataProcessor = dataProcessor;
        this.svg = null;
        this.g = null;
        this.simulation = null;
        this.width = 0;
        this.height = 0;
        this.zoom = null;
        
        // 绑定方法
        this.handleZoom = this.handleZoom.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
    }

    /**
     * 初始化渲染器
     */
    init() {
        const container = d3.select(`#${this.containerId}`);
        const containerRect = container.node().getBoundingClientRect();
        
        this.width = containerRect.width;
        this.height = Math.max(600, containerRect.height);

        // 创建SVG
        this.svg = container
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .style('background', '#fafafa');

        // 创建主组
        this.g = this.svg.append('g');

        // 设置缩放
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', this.handleZoom);

        this.svg.call(this.zoom);

        // 创建工具提示
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // 创建箭头标记
        this.createArrowMarkers();
    }

    /**
     * 创建箭头标记
     */
    createArrowMarkers() {
        const defs = this.svg.append('defs');

        // 创建默认箭头标记
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');
    }

    /**
     * 为边创建动态箭头标记
     */
    createDynamicArrowMarkers(links) {
        // 确保defs元素存在
        let defs = this.svg.select('defs');
        if (defs.empty()) {
            defs = this.svg.append('defs');
        }
        
        // 为每个唯一的颜色创建箭头标记
        const uniqueColors = [...new Set(links.map(link => link.color))];
        
        uniqueColors.forEach((color, index) => {
            const markerId = `arrowhead-${index}`;
            
            defs.append('marker')
                .attr('id', markerId)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', color);
        });
        
        return uniqueColors;
    }

    /**
     * 渲染图形
     */
    render(data) {
        
        // 检查数据是否有效
        if (!data || !data.nodes || !data.links) {
            console.error('数据无效:', data);
            return;
        }
        
        if (data.nodes.length === 0) {
            console.warn('节点数据为空');
            return;
        }
        
        // 清空图形
        this.clearGraph();
        
        // 初始化图形渲染器
        this.init();
        
        // 创建模拟
        this.createSimulation(data);
        
        // 创建边
        this.createLinks(data.links);
        
        // 创建节点
        this.createNodes(data.nodes);
        this.startSimulation();
    }

    /**
     * 清空图形
     */
    clearGraph() {
        // 清除整个容器内容
        const container = d3.select(`#${this.containerId}`);
        container.selectAll('*').remove();
        
        // 重置引用
        this.svg = null;
        this.g = null;
        this.simulation = null;
    }

    /**
     * 创建拖拽处理器
     */
    dragHandler() {
        return d3.drag()
            .on('start', (event, d) => {
                // 只固定被拖拽的节点，其他节点继续动画
                d.fx = d.x;
                d.fy = d.y;
                // 保持模拟运行，确保动画效果
                this.simulation.alphaTarget(0.1).restart();
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                // 保持节点在拖拽后的位置，但继续动画
                d.fx = event.x;
                d.fy = event.y;
                // 确保模拟继续运行
                this.simulation.alphaTarget(0.1).restart();
            });
    }

    /**
     * 创建力导向模拟
     */
    createSimulation(data) {
        this.simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links)
                .id(d => d.id)
                .distance(100)
                .strength(0.5))
            .force('charge', d3.forceManyBody()
                .strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide()
                .radius(d => Math.max(d.width, d.height) / 2 + 10))
            .alphaTarget(0.1)  // 保持持续的动画效果
            .alphaDecay(0.01); // 减慢衰减速度，让动画持续更久
    }

    /**
     * 创建边
     */
    createLinks(links) {
        const linkGroup = this.g.append('g')
            .attr('class', 'links');

        // 创建动态箭头标记
        const uniqueColors = this.createDynamicArrowMarkers(links);
        
        // 创建颜色到箭头ID的映射
        const colorToMarker = {};
        uniqueColors.forEach((color, index) => {
            colorToMarker[color] = `arrowhead-${index}`;
        });

        const link = linkGroup.selectAll('.link')
            .data(links)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', d => d.color)
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.8)
            .attr('marker-end', d => {
                const markerId = colorToMarker[d.color];
                return `url(#${markerId})`;
            })
            .on('click', this.handleLinkClick)
            .on('mouseover', this.handleLinkMouseover.bind(this))
            .on('mouseout', this.handleLinkMouseout.bind(this));

        // 添加边标签，显示关系ID
        const linkLabels = linkGroup.selectAll('.link-label')
            .data(links)
            .enter()
            .append('text')
            .attr('class', 'link-label')
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#333')
            .text(d => d.relationId) // 显示关系ID而不是标签名称
            .style('opacity', 1);
    }

    /**
     * 创建节点
     */
    createNodes(nodes) {
        // 确保节点组存在
        let nodeGroup = this.g.select('.nodes');
        if (nodeGroup.empty()) {
            nodeGroup = this.g.append('g').attr('class', 'nodes');
        }

        // 为节点添加宽度和高度属性
        nodes.forEach(node => {
            node.width = Math.max(60, node.name.length * 8 + 20);
            node.height = 30;
        });

        // 更新节点
        const node = nodeGroup.selectAll('.node')
            .data(nodes, d => d.id)
            .join(
                enter => enter.append('rect')
                    .attr('class', 'node')
                    .attr('width', d => d.width)
                    .attr('height', d => d.height)
                    .attr('rx', 5)
                    .attr('ry', 5)
                    .attr('fill', '#6B7DE3')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 3)
                    .style('pointer-events', 'all')
                    .on('click', this.handleNodeClick),
                update => update
                    .attr('width', d => d.width)
                    .attr('height', d => d.height)
                    .style('pointer-events', 'all'),
                exit => exit.remove()
            );

        // 为所有节点绑定拖拽处理器（包括新创建和已存在的）
        node.call(this.dragHandler());

        // 更新节点标签
        const nodeLabels = nodeGroup.selectAll('.node-label')
            .data(nodes, d => d.id)
            .join(
                enter => enter.append('text')
                    .attr('class', 'node-label')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '.35em')
                    .attr('font-size', '12px')
                    .attr('font-weight', '600')
                    .attr('fill', 'white')
                    .text(d => d.name)
                    .style('opacity', 1)
                    .style('pointer-events', 'all'),
                update => update.text(d => d.name).style('pointer-events', 'all'),
                exit => exit.remove()
            );

        // 为所有节点标签绑定拖拽处理器
        nodeLabels.call(this.dragHandler());
        
        // 节点拖拽处理器绑定完成
    }

    /**
     * 开始模拟
     */
    startSimulation() {
        this.simulation.on('tick', () => {
            this.g.selectAll('.link')
                .each(function(d) {
                    // 计算边的偏移
                    const offset = d.offset || 0;
                    const offsetDistance = offset * 8; // 每条边偏移8像素
                    
                    // 计算边的方向向量
                    const dx = d.target.x - d.source.x;
                    const dy = d.target.y - d.source.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    
                    if (length > 0) {
                        // 计算垂直方向
                        const perpX = -dy / length;
                        const perpY = dx / length;
                        
                        // 应用偏移
                        const offsetX = perpX * offsetDistance;
                        const offsetY = perpY * offsetDistance;
                        
                        d3.select(this)
                            .attr('x1', d.source.x + offsetX)
                            .attr('y1', d.source.y + offsetY)
                            .attr('x2', d.target.x + offsetX)
                            .attr('y2', d.target.y + offsetY);
                    } else {
                        d3.select(this)
                            .attr('x1', d.source.x)
                            .attr('y1', d.source.y)
                            .attr('x2', d.target.x)
                            .attr('y2', d.target.y);
                    }
                });

            this.g.selectAll('.node')
                .attr('x', d => d.x - d.width / 2)
                .attr('y', d => d.y - d.height / 2);

            this.g.selectAll('.node-label')
                .attr('x', d => d.x)
                .attr('y', d => d.y);

            this.g.selectAll('.link-label')
                .each(function(d) {
                    // 计算标签位置，考虑边的偏移
                    const offset = d.offset || 0;
                    const offsetDistance = offset * 8;
                    
                    const dx = d.target.x - d.source.x;
                    const dy = d.target.y - d.source.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    
                    if (length > 0) {
                        const perpX = -dy / length;
                        const perpY = dx / length;
                        
                        const offsetX = perpX * offsetDistance;
                        const offsetY = perpY * offsetDistance;
                        
                        const centerX = (d.source.x + d.target.x) / 2 + offsetX;
                        const centerY = (d.source.y + d.target.y) / 2 + offsetY;
                        
                        d3.select(this)
                            .attr('x', centerX)
                            .attr('y', centerY);
                    } else {
                        d3.select(this)
                            .attr('x', (d.source.x + d.target.x) / 2)
                            .attr('y', (d.source.y + d.target.y) / 2);
                    }
                });
        });
    }

    // 拖拽处理器在节点创建时绑定，不需要额外处理

    /**
     * 搜索并高亮tag_id对应的边
     */
    searchAndHighlight(tagId) {
        if (!this.dataProcessor) {
            console.error('DataProcessor未初始化');
            return;
        }

        // 查找匹配的tag
        const matchingTags = this.dataProcessor.tags.filter(tag => 
            tag.tag_id === tagId && !tag.is_deleted
        );

        if (matchingTags.length === 0) {
            this.showSearchError(`未找到tag_id: ${tagId}`);
            return;
        }

        // 获取所有相关的relation_ids
        const relationIds = new Set();
        matchingTags.forEach(tag => {
            tag.relation_ids.forEach(id => relationIds.add(parseInt(id)));
        });

        // 高亮相关的边
        this.highlightEdgesByRelationIds(Array.from(relationIds));
        
        // 显示成功提示
        // this.showSearchSuccess(`找到 ${matchingTags.length} 个匹配的tag，涉及 ${relationIds.size} 个关系`);
    }

    /**
     * 根据relation_ids高亮边
     */
    highlightEdgesByRelationIds(relationIds) {
        // 重置所有边的样式
        this.g.selectAll('.link')
            .style('stroke-width', 1)
            .style('stroke-opacity', 0.8)
            .style('opacity', 1)
            .style('stroke', null); // 恢复原始颜色

        // 高亮匹配的边 - 使用红色高亮
        this.g.selectAll('.link')
            .filter(d => relationIds.includes(d.relationId))
            .style('stroke-width', 3)
            .style('stroke-opacity', 1)
            .style('opacity', 1)
            .style('stroke', '#ff6b6b'); // 红色高亮

        // 保持所有节点的正常显示
        this.g.selectAll('.node')
            .style('opacity', 1)
            .style('pointer-events', 'all');
    }


    /**
     * 清除高亮
     */
    clearHighlight() {
        this.g.selectAll('.link')
            .style('stroke-width', 1)
            .style('stroke-opacity', 0.8)
            .style('opacity', 1)
            .style('stroke', null); // 恢复原始颜色

        this.g.selectAll('.node')
            .style('opacity', 1)
            .style('pointer-events', 'all');
    }

    /**
     * 显示所有边
     */
    showAllEdges() {
        // 恢复到边的原始样式（移除所有内联样式）
        this.g.selectAll('.link')
            .style('stroke-width', null)
            .style('stroke-opacity', null)
            .style('opacity', null)
            .style('stroke', null); // 恢复原始颜色

        this.g.selectAll('.node')
            .style('opacity', null)
            .style('pointer-events', 'all');
    }

    /**
     * 处理缩放
     */
    handleZoom(event) {
        this.g.attr('transform', event.transform);
    }

    /**
     * 处理节点点击
     */
    handleNodeClick(event, d) {
        // 高亮相关节点和边
        this.highlightNode(d.id);
    }

    /**
     * 处理边点击
     */
    handleLinkClick(event, d) {
        event.stopPropagation();
        
        // 显示condition信息
        this.showConditionPopup(d);
        
        // 高亮相关边
        this.highlightLink(d.id);
    }

    /**
     * 显示condition悬浮窗口
     */
    showConditionPopup(linkData) {
        const popup = document.getElementById('condition-popup');
        const tagName = document.getElementById('popup-tag-name');
        const relationId = document.getElementById('popup-relation-id');
        const relationType = document.getElementById('popup-relation-type');
        const srcTable = document.getElementById('popup-src-table');
        const dstTable = document.getElementById('popup-dst-table');
        const condition = document.getElementById('popup-condition');

        if (!popup) {
            console.error('找不到condition-popup元素');
            return;
        }

        // 填充基本信息
        if (tagName) {
            // 显示所有相关的tag名称
            const tagNames = linkData.tagNames || [linkData.tagName];
            tagName.textContent = tagNames.join(', ');
        }
        if (relationId) relationId.textContent = linkData.relationId || '未知';
        if (relationType) relationType.textContent = linkData.type || '未知';
        if (srcTable) srcTable.textContent = this.extractTableName(linkData.source.id || linkData.source);
        if (dstTable) dstTable.textContent = this.extractTableName(linkData.target.id || linkData.target);

        // 获取condition信息
        const relation = this.dataProcessor.relationMap.get(linkData.relationId);
        if (condition) {
            if (relation && relation.condition) {
                condition.textContent = JSON.stringify(relation.condition, null, 2);
            } else {
                condition.textContent = '无连接条件信息';
            }
        }

        // 显示悬浮窗口
        popup.style.display = 'block';
        
        // 绑定关闭按钮事件
        const closeBtn = document.getElementById('close-popup');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideConditionPopup();
        }
    }

    /**
     * 隐藏condition悬浮窗口
     */
    hideConditionPopup() {
        const popup = document.getElementById('condition-popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    /**
     * 显示搜索错误提示
     */
    showSearchError(message) {
        this.showSearchMessage(message, 'error');
    }

    // /**
    //  * 显示搜索成功提示
    //  */
    // (message) {
    //     this.showSearchMessage(message, 'success');
    // }

    /**
     * 显示搜索消息弹窗
     */
    showSearchMessage(message, type = 'info') {
        // 创建或获取搜索提示弹窗
        let searchPopup = document.getElementById('search-popup');
        if (!searchPopup) {
            searchPopup = document.createElement('div');
            searchPopup.id = 'search-popup';
            searchPopup.className = 'search-popup';
            document.body.appendChild(searchPopup);
        }

        // 设置样式
        const isError = type === 'error';
        searchPopup.style.cssText = `
            position: fixed;
            top: 10%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: '#ff6b6b';
            background: white;
            border: 1px solid #ff6b6b;
            padding: 20px 30px;
            border-radius: 8px;
            z-index: 2000;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            max-width: 400px;
            word-wrap: break-word;
        `;

        searchPopup.textContent = message;
        searchPopup.style.display = 'block';

        // 3秒后自动隐藏
        setTimeout(() => {
            if (searchPopup) {
                searchPopup.style.display = 'none';
            }
        }, 3000);

        // 点击隐藏
        searchPopup.onclick = () => {
            searchPopup.style.display = 'none';
        };
    }

    /**
     * 提取表名（去掉租户前缀）
     */
    extractTableName(fullTableName) {
        if (!fullTableName) return '未知';
        const parts = fullTableName.split('.');
        return parts[parts.length - 1] || fullTableName;
    }

    /**
     * 高亮节点
     */
    highlightNode(nodeId) {
        // 重置所有样式
        this.g.selectAll('.node').style('opacity', 0.6);
        this.g.selectAll('.link').style('opacity', 0.3);

        // 高亮选中节点
        this.g.selectAll('.node')
            .filter(d => d.id === nodeId)
            .style('opacity', 1);

        // 高亮相关边
        this.g.selectAll('.link')
            .filter(d => d.source.id === nodeId || d.target.id === nodeId)
            .style('opacity', 1);
    }

    /**
     * 高亮边
     */
    highlightLink(linkId) {
        // 重置所有样式
        this.g.selectAll('.link').style('opacity', 0.3);
        this.g.selectAll('.node').style('opacity', 0.6);

        // 高亮选中边
        this.g.selectAll('.link')
            .filter(d => d.id === linkId)
            .style('opacity', 1);

        // 高亮相关节点
        const link = this.g.selectAll('.link').data().find(d => d.id === linkId);
        if (link) {
            this.g.selectAll('.node')
                .filter(d => d.id === link.source.id || d.id === link.target.id)
                .style('opacity', 1);
        }
    }

    /**
     * 重置高亮
     */
    resetHighlight() {
        this.g.selectAll('.node').style('opacity', 1);
        this.g.selectAll('.link').style('opacity', 0.6);
    }


    /**
     * 重置视图
     */
    resetView() {
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity);
        this.resetHighlight();
    }

    // 移除节点悬浮显示功能

    /**
     * 处理边鼠标悬停
     */
    handleLinkMouseover(event, d) {
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);

        this.tooltip.html(`
            关系ID: ${d.relationId}<br/>
            类型: ${d.type}<br/>
            方向: ${d.direction}
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    /**
     * 处理边鼠标离开
     */
    handleLinkMouseout() {
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    }

}
