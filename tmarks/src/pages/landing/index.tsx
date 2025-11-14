/**
 * Landing Page - 产品首页
 * 展示 TMarks 的核心功能和价值
 */

import { HeroSection } from './sections/HeroSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { DeploymentSection } from './sections/DeploymentSection'
import { AIProvidersSection } from './sections/AIProvidersSection'
import { UseCasesSection } from './sections/UseCasesSection'
import { TechStackSection } from './sections/TechStackSection'
import { FinalCTASection } from './sections/FinalCTASection'

export function LandingPage() {
  return (
    <div className="w-full">
      {/* Hero 区域 */}
      <HeroSection />

      {/* 核心功能展示 */}
      <FeaturesSection />

      {/* 部署教程 */}
      <DeploymentSection />

      {/* AI 提供商展示 */}
      <AIProvidersSection />

      {/* 使用场景 */}
      <UseCasesSection />

      {/* 技术栈 */}
      <TechStackSection />

      {/* 最终 CTA */}
      <FinalCTASection />
    </div>
  )
}

