<template>
  <div class="achievements fade-in">
    <!-- 段位卡片 -->
    <section class="rank-card">
      <div class="rank-left">
        <div class="rank-icon">{{ achievement.currentRank.icon }}</div>
        <div class="rank-info">
          <div class="rank-name" :style="{ color: achievement.currentRank.color }">
            {{ achievement.currentRank.name }} · Lv.{{ achievement.currentLevel }}
          </div>
          <div class="rank-exp">
            <span>{{ achievement.exp }} EXP</span>
            <span class="exp-next">/ 下一段位 {{ achievement.nextRankExp }} EXP</span>
          </div>
          <div class="exp-bar">
            <div class="exp-fill" :style="{ width: achievement.levelProgress + '%' }"></div>
          </div>
        </div>
      </div>
      <div class="rank-right">
        <div class="stat-box">
          <span class="stat-num">{{ achievement.unlockedCount }}</span>
          <span class="stat-label">已获勋章</span>
        </div>
        <div class="stat-box">
          <span class="stat-num">{{ achievement.totalMedals }}</span>
          <span class="stat-label">勋章总数</span>
        </div>
      </div>
    </section>

    <!-- 段位进度条 -->
    <section class="ranks-road">
      <h3>段位之路</h3>
      <div class="ranks-track">
        <div
          v-for="(rank, idx) in ranks"
          :key="rank.name"
          class="rank-node"
          :class="{ active: achievement.exp >= rank.minExp, current: rank.name === achievement.currentRank.name }"
        >
          <div class="node-icon" :style="{ borderColor: rank.color }">
            <span>{{ rank.icon }}</span>
          </div>
          <div class="node-info">
            <span class="node-name" :style="{ color: rank.color }">{{ rank.name }}</span>
            <span class="node-exp">{{ rank.minExp }} EXP</span>
          </div>
          <div v-if="idx < ranks.length - 1" class="node-line" :class="{ filled: achievement.exp >= ranks[idx + 1].minExp }"></div>
        </div>
      </div>
    </section>

    <!-- 勋章墙 -->
    <section class="medals-section">
      <div class="section-head">
        <h3>勋章墙</h3>
        <span class="medal-count">{{ achievement.unlockedCount }} / {{ achievement.totalMedals }}</span>
      </div>
      <div class="medals-grid">
        <div
          v-for="medal in achievement.allMedals"
          :key="medal.id"
          class="medal-card"
          :class="{ unlocked: medal.unlocked }"
        >
          <div class="medal-icon">{{ medal.unlocked ? medal.icon : '🔒' }}</div>
          <div class="medal-name">{{ medal.name }}</div>
          <div class="medal-desc">{{ medal.desc }}</div>
          <div v-if="medal.unlocked" class="medal-badge">已解锁</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAchievementStore } from '../stores/achievement'

const achievement = useAchievementStore()
const ranks = achievement.getAllRanks()
</script>

<style scoped>
.achievements {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 段位卡片 */
.rank-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 32px;
  background: linear-gradient(135deg, var(--bg-surface), var(--bg-surface-2));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}
.rank-card::before {
  content: '';
  position: absolute;
  top: -60%;
  right: -5%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, var(--accent-glow), transparent 70%);
  pointer-events: none;
}
.rank-left {
  display: flex;
  align-items: center;
  gap: 24px;
  position: relative;
  z-index: 1;
}
.rank-icon {
  font-size: 56px;
  line-height: 1;
  filter: drop-shadow(0 0 12px var(--accent-glow));
}
.rank-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rank-name {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.rank-exp {
  font-size: 13px;
  color: var(--text-muted);
}
.exp-next {
  opacity: 0.6;
}
.exp-bar {
  width: 320px;
  height: 10px;
  background: var(--bg-surface-2);
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.exp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  border-radius: 5px;
  transition: width 0.6s ease;
  box-shadow: 0 0 8px var(--accent-glow);
}
.rank-right {
  display: flex;
  gap: 32px;
  position: relative;
  z-index: 1;
}
.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
}
.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 段位之路 */
.ranks-road {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
}
.ranks-road h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 24px;
}
.ranks-track {
  display: flex;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 8px;
}
.rank-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex-shrink: 0;
  width: 90px;
}
.node-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--bg-surface-2);
  border: 3px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s;
  opacity: 0.4;
}
.rank-node.active .node-icon {
  opacity: 1;
}
.rank-node.current .node-icon {
  box-shadow: 0 0 16px var(--accent-glow);
  transform: scale(1.1);
}
.node-info {
  margin-top: 10px;
  text-align: center;
}
.node-name {
  font-size: 13px;
  font-weight: 600;
  display: block;
}
.node-exp {
  font-size: 11px;
  color: var(--text-muted);
}
.node-line {
  position: absolute;
  top: 26px;
  left: 70px;
  width: 40px;
  height: 3px;
  background: var(--border);
}
.node-line.filled {
  background: var(--accent);
}

/* 勋章墙 */
.medals-section {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.section-head h3 {
  font-size: 16px;
  font-weight: 600;
}
.medal-count {
  font-size: 14px;
  color: var(--accent);
  font-weight: 600;
}
.medals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
}
.medal-card {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px 14px;
  text-align: center;
  position: relative;
  transition: all 0.3s;
  opacity: 0.5;
  filter: grayscale(0.7);
}
.medal-card.unlocked {
  opacity: 1;
  filter: none;
  border-color: var(--border-light);
}
.medal-card.unlocked:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.medal-icon {
  font-size: 38px;
  margin-bottom: 10px;
}
.medal-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}
.medal-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
.medal-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  background: var(--success);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
</style>
