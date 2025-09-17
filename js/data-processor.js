/**
 * 数据处理模块
 * 负责解析JSON数据，建立表关系映射，为每个tag分配颜色
 */
class DataProcessor {
    constructor() {
        this.tags = [];
        this.relations = [];
        this.nodes = [];
        this.links = [];
        this.colorMap = new Map();
        this.relationMap = new Map();
    }

    /**
     * 加载并处理数据
     */
    async loadData() {
        try {
            // 加载标签数据
            console.log('加载标签数据...');
            const tagsResponse = await fetch('../data/semantic_all_edge_tag.json');
            if (!tagsResponse.ok) {
                throw new Error(`标签数据加载失败: ${tagsResponse.status} ${tagsResponse.statusText}`);
            }
            this.tags = await tagsResponse.json();
            console.log('标签数据加载成功:', this.tags.length, '条记录');

            // 加载关系数据
            console.log('加载关系数据...');
            const relationsResponse = await fetch('../data/semantic_dm_table_relation_def.json');
            if (!relationsResponse.ok) {
                throw new Error(`关系数据加载失败: ${relationsResponse.status} ${relationsResponse.statusText}`);
            }
            this.relations = await relationsResponse.json();
            console.log('关系数据加载成功:', this.relations.length, '条记录');

            // 处理数据
            this.processData();
            
            return {
                nodes: this.nodes,
                links: this.links,
                colorMap: this.colorMap,
                tags: this.tags,
                relations: this.relations
            };
        } catch (error) {
            console.error('数据加载失败:', error);
            throw error;
        }
    }

    /**
     * 处理数据，建立节点和边的映射
     */
    processData() {
        // 建立关系映射
        console.log('关系数据加载完成，总数:', this.relations.length);
        this.relations.forEach(relation => {
            this.relationMap.set(relation.id, relation);
        });
        console.log('关系映射建立完成，映射数量:', this.relationMap.size);
        console.log('关系ID列表:', Array.from(this.relationMap.keys()));

        // 为每个tag分配颜色
        this.assignColors();

        // 构建节点
        this.buildNodes();

        // 构建边
        this.buildLinks();
    }

    /**
     * 为每个tag分配唯一颜色
     */
    assignColors() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
            '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7', '#FADBD8'
        ];

        const uniqueTags = [...new Set(this.tags.map(tag => tag.tag_name))];
        uniqueTags.forEach((tagName, index) => {
            this.colorMap.set(tagName, colors[index % colors.length]);
        });
    }

    /**
     * 构建节点数据
     */
    buildNodes() {
        const nodeMap = new Map();

        // 从关系数据中提取所有表
        this.relations.forEach(relation => {
            const srcTable = this.extractTableName(relation.src_table);
            const dstTable = this.extractTableName(relation.dst_table);

            if (!nodeMap.has(srcTable)) {
                nodeMap.set(srcTable, {
                    id: srcTable,
                    name: srcTable,
                    type: 'table',
                    relations: []
                });
            }

            if (!nodeMap.has(dstTable)) {
                nodeMap.set(dstTable, {
                    id: dstTable,
                    name: dstTable,
                    type: 'table',
                    relations: []
                });
            }

            // 记录关系
            nodeMap.get(srcTable).relations.push(relation.id);
            nodeMap.get(dstTable).relations.push(relation.id);
        });

        this.nodes = Array.from(nodeMap.values());
    }

    /**
     * 构建边数据
     */
    buildLinks() {
        this.links = [];
        console.log('开始构建边数据，标签数量:', this.tags.length);

        // 用于跟踪已处理的关系ID，避免重复
        const processedRelations = new Set();
        // 用于跟踪相同节点对之间的边数量，用于计算偏移
        const edgeCounts = new Map();

        this.tags.forEach(tag => {
            if (tag.is_deleted) return;

            const relationIds = tag.relation_ids;

            relationIds.forEach(relationId => {
                // 确保relationId是数字类型
                const numericRelationId = parseInt(relationId);
                
                // 如果已经处理过这个关系ID，跳过
                if (processedRelations.has(numericRelationId)) {
                    return;
                }
                
                const relation = this.relationMap.get(numericRelationId);
                if (!relation) {
                    console.warn(`未找到关系 ${relationId} (数字: ${numericRelationId})`);
                    console.warn('可用的关系ID:', Array.from(this.relationMap.keys()));
                    return;
                }

                const srcTable = this.extractTableName(relation.src_table);
                const dstTable = this.extractTableName(relation.dst_table);
                console.log(`关系 ${relationId}: ${srcTable} -> ${dstTable}`);

                // 找到对应的节点对象
                const srcNode = this.nodes.find(node => node.id === srcTable);
                const dstNode = this.nodes.find(node => node.id === dstTable);

                if (!srcNode || !dstNode) {
                    console.warn(`未找到节点: src=${srcTable}, dst=${dstTable}`);
                    return;
                }

                // 创建边的唯一键
                const edgeKey = `${srcTable}-${dstTable}`;
                const reverseEdgeKey = `${dstTable}-${srcTable}`;
                
                // 计算边的偏移量
                let offset = 0;
                if (edgeCounts.has(edgeKey)) {
                    offset = edgeCounts.get(edgeKey);
                    edgeCounts.set(edgeKey, offset + 1);
                } else if (edgeCounts.has(reverseEdgeKey)) {
                    offset = edgeCounts.get(reverseEdgeKey);
                    edgeCounts.set(reverseEdgeKey, offset + 1);
                } else {
                    edgeCounts.set(edgeKey, 1);
                }

                // 找到所有使用这个relation_id的tag
                const relatedTags = this.tags.filter(t => 
                    !t.is_deleted && t.relation_ids.includes(relationId.toString())
                );

                // 使用第一个tag的颜色，或者混合颜色
                const primaryTag = relatedTags[0];
                const tagColor = this.colorMap.get(primaryTag.tag_name);

                // 创建边
                const link = {
                    id: `relation-${numericRelationId}`, // 使用关系ID作为唯一标识
                    source: srcNode,  // 使用节点对象而不是字符串
                    target: dstNode,  // 使用节点对象而不是字符串
                    relationId: numericRelationId,
                    tagIds: relatedTags.map(t => t.tag_id), // 所有相关的tag ID
                    tagNames: relatedTags.map(t => t.tag_name), // 所有相关的tag名称
                    color: tagColor,
                    type: relation.type,
                    direction: relation.direction,
                    condition: relation.condition,
                    srcTable: relation.src_table,
                    dstTable: relation.dst_table,
                    offset: offset  // 添加偏移量
                };

                this.links.push(link);
                processedRelations.add(numericRelationId);
            });
        });
    }

    /**
     * 从完整表名中提取表名
     */
    extractTableName(fullTableName) {
        const parts = fullTableName.split('.');
        return parts[parts.length - 1];
    }

    /**
     * 获取所有数据（不过滤租户）
     */
    getAllData() {
        return {
            nodes: this.nodes,
            links: this.links,
            colorMap: this.colorMap
        };
    }

    /**
     * 根据租户ID获取数据
     */
    getDataByTenant(tenantId) {
        if (!tenantId) {
            return this.getAllData();
        }

        // 过滤标签数据
        const filteredTags = this.tags.filter(tag => 
            !tag.is_deleted && tag.tenant_id === tenantId
        );

        // 获取相关的relation_ids
        const relatedRelationIds = new Set();
        filteredTags.forEach(tag => {
            tag.relation_ids.forEach(id => relatedRelationIds.add(parseInt(id)));
        });

        // 过滤关系数据
        const filteredRelations = Array.from(relatedRelationIds)
            .map(id => this.relationMap.get(id))
            .filter(relation => relation);

        // 构建节点（只包含相关的表）
        const relatedTables = new Set();
        filteredRelations.forEach(relation => {
            relatedTables.add(this.extractTableName(relation.src_table));
            relatedTables.add(this.extractTableName(relation.dst_table));
        });

        const filteredNodes = this.nodes.filter(node => 
            relatedTables.has(node.id)
        );

        // 构建边
        const filteredLinks = this.links.filter(link => 
            relatedRelationIds.has(link.relationId)
        );

        return {
            nodes: filteredNodes,
            links: filteredLinks,
            colorMap: this.colorMap
        };
    }

    /**
     * 获取所有可用的租户ID
     */
    getAvailableTenants() {
        const tenants = new Set();
        this.tags.forEach(tag => {
            if (!tag.is_deleted && tag.tenant_id) {
                tenants.add(tag.tenant_id);
            }
        });
        return Array.from(tenants).sort();
    }

    /**
     * 获取标签统计信息
     */
    getTagStatistics() {
        const stats = {};
        this.tags.forEach(tag => {
            if (tag.is_deleted) return;
            
            if (!stats[tag.tag_name]) {
                stats[tag.tag_name] = {
                    count: 0,
                    color: this.colorMap.get(tag.tag_name),
                    relations: new Set()
                };
            }
            
            stats[tag.tag_name].count++;
            const relationIds = tag.relation_ids;
            relationIds.forEach(id => stats[tag.tag_name].relations.add(id));
        });

        return stats;
    }

    /**
     * 获取关系详情
     */
    getRelationDetails(relationId) {
        return this.relationMap.get(relationId);
    }

    /**
     * 获取标签详情
     */
    getTagDetails(tagName) {
        return this.tags.filter(tag => 
            tag.tag_name === tagName && !tag.is_deleted
        );
    }
}
