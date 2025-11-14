/**
 * Hero Section - 首屏区域
 * 展示核心价值主张和 CTA
 */

import { Star, Github, ExternalLink, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function HeroSection() {
  const navigate = useNavigate()

  const scrollToDeployment = () => {
    const deploymentSection = document.getElementById('deployment-section')
    deploymentSection?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center py-20">
        {/* 标签 */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
            开源 · 免费 · 自托管
          </span>
        </div>

        {/* 主标题 */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            AI 驱动的书签管理
          </span>
          <br />
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            让整理变得简单高效
          </span>
        </h1>

        {/* 副标题 */}
        <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          TMarks 结合 AI 技术自动生成标签，支持浏览器扩展、标签页组管理、公开分享。
          <br />
          完全开源，一键部署到 Cloudflare，永久免费使用。
        </p>

        {/* CTA 按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="https://tmarks.669696.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-lg inline-flex items-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            立即体验
          </a>
          <button onClick={scrollToDeployment} className="btn btn-lg btn-ghost border border-border inline-flex items-center gap-2">
            <Play className="w-5 h-5" />
            观看部署教程
          </button>
          <button onClick={() => navigate('/login')} className="btn btn-lg btn-ghost border border-border">
            登录
          </button>
        </div>

        {/* 社会证明 */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <a
            href="https://github.com/ai-tmarks/tmarks"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-foreground transition"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
          <span>•</span>
          <span>MIT 开源</span>
          <span>•</span>
          <span>支持 8+ AI 提供商</span>
          <span>•</span>
          <span>全球 CDN 加速</span>
        </div>

        {/* 信任标识 */}
        <div className="mt-16">
          <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
            基于现代化技术栈构建
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            <div className="text-2xl font-bold">React 19</div>
            <div className="text-2xl font-bold">TypeScript</div>
            <div className="text-2xl font-bold">Cloudflare</div>
            <div className="text-2xl font-bold">AI</div>
          </div>
        </div>
      </div>
    </section>
  )
}

