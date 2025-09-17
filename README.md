# 多路径关系可视化系统

一个基于D3.js的交互式数据模型关系可视化工具，用于展示数据库表之间的复杂关系网络。

## 功能特性

### 🎯 核心功能
- **交互式关系图**：使用D3.js力导向图展示表之间的关系
- **多租户支持**：支持按租户过滤和查看数据
- **颜色编码**：每个语义标签使用不同颜色区分
- **实时交互**：支持缩放、拖拽、悬停显示详情

### 🎨 可视化特性
- **节点**：圆形节点表示数据表
- **边**：彩色线条表示关系，箭头指示方向
- **图例**：显示所有标签及其颜色映射
- **详情面板**：点击节点或边显示详细信息

### 🔧 交互功能
- **缩放和平移**：鼠标滚轮缩放，拖拽平移
- **高亮显示**：点击节点高亮相关关系
- **标签切换**：显示/隐藏节点和边标签
- **租户过滤**：按租户筛选数据
- **视图重置**：一键重置到初始视图

## 项目结构

```
multipath_relation_visualization/
├── index.html              # 主页面
├── css/
│   └── style.css          # 样式文件
├── js/
│   ├── data-processor.js  # 数据处理模块
│   ├── graph-renderer.js  # 图形渲染模块
│   └── main.js           # 主控制逻辑
├── data/
│   ├── semantic_all_edge_tag.json
│   └── semantic_dm_table_relation_def.json
└── README.md              # 项目说明
```

## 数据格式

### semantic_all_edge_tag.json
包含语义边标签定义：
- `tag_name`: 标签名称
- `src_dataset`: 源数据集
- `dst_dataset`: 目标数据集
- `relation_ids`: 关联的关系ID列表
- `tenant_id`: 租户ID

### semantic_dm_table_relation_def.json
包含数据模型表关系定义：
- `id`: 关系ID
- `src_table`: 源表
- `dst_table`: 目标表
- `type`: 关系类型（ONE_TO_MANY/ONE_TO_ONE）
- `condition`: 连接条件

## 使用方法

### 1. 启动项目
直接在浏览器中打开 `index.html` 文件，或使用本地服务器：

```bash
# 使用Python启动本地服务器
python -m http.server 8000

# 或使用Node.js
npx http-server
```

### 2. 基本操作
- **查看关系**：图形自动布局显示所有表关系
- **选择租户**：使用顶部下拉菜单筛选特定租户数据
- **查看详情**：点击节点或边查看详细信息
- **高亮标签**：点击图例中的标签高亮相关关系
- **调整视图**：使用鼠标滚轮缩放，拖拽平移

### 3. 快捷键
- `Ctrl/Cmd + R`: 重置视图
- `Ctrl/Cmd + L`: 切换标签显示

## 技术栈

- **D3.js v7**: 数据驱动的图形渲染
- **HTML5/CSS3**: 页面结构和样式
- **JavaScript ES6+**: 现代JavaScript特性
- **SVG**: 矢量图形渲染

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 自定义配置

### 修改颜色方案
在 `data-processor.js` 中的 `assignColors()` 方法中修改颜色数组：

```javascript
const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', 
    // 添加更多颜色...
];
```

### 调整图形布局
在 `graph-renderer.js` 中的 `createSimulation()` 方法中调整力导向参数：

```javascript
.force('link', d3.forceLink(data.links)
    .distance(100)      // 调整边长度
    .strength(0.5))     // 调整边强度
.force('charge', d3.forceManyBody()
    .strength(-300))    // 调整节点排斥力
```

## 故障排除

### 数据加载失败
- 确保 `data/` 目录下的JSON文件存在
- 检查文件路径是否正确
- 使用本地服务器而非直接打开HTML文件

### 图形显示异常
- 检查浏览器控制台是否有JavaScript错误
- 确保D3.js库正确加载
- 尝试刷新页面重新加载

### 性能问题
- 对于大量数据，考虑启用数据过滤
- 调整力导向模拟的参数
- 使用现代浏览器获得更好性能

## 开发说明

### 添加新功能
1. 在相应的模块中添加方法
2. 在 `main.js` 中绑定事件
3. 更新UI界面（如需要）

### 修改数据格式
1. 更新 `data-processor.js` 中的解析逻辑
2. 调整 `graph-renderer.js` 中的渲染逻辑
3. 测试数据兼容性

## 许可证

MIT License - 详见 LICENSE 文件

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的关系图可视化
- 实现多租户数据过滤
- 添加交互式功能
