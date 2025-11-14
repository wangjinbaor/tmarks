/**
 * Features Section - 核心功能展示
 * 展示 TMarks 的主要功能特性
 */

import { Sparkles, Layers, Share2, Puzzle, Shield, Code } from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI 智能标签',
    description: '自动分析网页内容，智能推荐标签。支持 OpenAI、Claude、DeepSeek、智谱等 8+ AI 提供商，灵活选择。',
    highlight: '自动化 → 节省时间',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Puzzle,
    title: '浏览器扩展',
    description: '一键保存当前页面，AI 自动推荐标签，离线支持，自动同步到云端。支持 Chrome 和 Firefox。',
    highlight: '快速保存 → 随时访问',
    gradient: 'from-blue-500 to-cyan-500',
    code: true,
  },
  {
    icon: Layers,
    title: '标签页组管理',
    description: '一键收纳当前所有标签页，智能分组，快速恢复工作场景。支持拖拽排序和批量操作。',
    highlight: '场景管理 → 提高效率',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Share2,
    title: '公开分享',
    description: '创建个性化书签展示页面，支持自定义域名。KV 缓存加速，全球访问秒开。',
    highlight: '知识分享 → 影响力',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Shield,
    title: '安全可靠',
    description: 'JWT 身份认证，API Key 管理，数据加密存储。完全掌控自己的数据，支持自托管。',
    highlight: '隐私保护 → 安心使用',
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Code,
    title: '开发者友好',
    description: '完整的 REST API，支持批量操作。提供 TypeScript SDK，文档完善，易于集成。',
    highlight: 'API 优先 → 易于扩展',
    gradient: 'from-pink-500 to-rose-500',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            一站式书签管理解决方案
          </h2>
          <p className="text-xl" style={{ color: 'var(--muted-foreground)' }}>
            从保存到分享，从个人到团队，全方位满足你的需求
          </p>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="card hover:shadow-xl transition-all group">
                {/* 图标 */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* 标题 */}
                <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
                  {feature.title}
                </h3>

                {/* 描述 */}
                <p className="mb-4 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  {feature.description}
                </p>

                {/* 代码示例（仅浏览器扩展） */}
                {feature.code && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-4 text-xs font-mono">
                    <div style={{ color: 'var(--muted-foreground)' }}>// 快速保存当前页面</div>
                    <div style={{ color: 'var(--foreground)' }}>chrome.tabs.getCurrent()</div>
                  </div>
                )}

                {/* 亮点 */}
                <div className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                  {feature.highlight}
                </div>
              </div>
            )
          })}
        </div>

        {/* 底部说明 */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <span className="font-medium" style={{ color: 'var(--primary)' }}>
              所有功能完全免费，无限制使用
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

