import { relations } from "drizzle-orm";

import {
  achievementGroups,
  achievementSets,
  achievements,
  contentPacks,
  gameReleases,
  games,
  platforms,
  releaseAchievementSets,
} from "./catalog";
import {
  checklistItemAchievements,
  checklistItems,
  guideContentNodeAchievements,
  guideContentNodes,
  guideContentNodeTargets,
  guideSections,
  guideSteps,
  guideTargets,
  guides,
  guideVersions,
} from "./editorial";
import { mediaAssets } from "./media";
import {
  userAchievementProgress,
  userChecklistProgress,
  userCompletions,
  userGuideProgress,
} from "./progress";

export const gamesRelations = relations(games, ({ many }) => ({
  releases: many(gameReleases),
  achievementSets: many(achievementSets),
  contentPacks: many(contentPacks),
  guides: many(guides),
  mediaAssets: many(mediaAssets),
}));

export const platformsRelations = relations(platforms, ({ many }) => ({
  releases: many(gameReleases),
}));

export const gameReleasesRelations = relations(gameReleases, ({ many, one }) => ({
  game: one(games, {
    fields: [gameReleases.gameId],
    references: [games.id],
  }),
  platform: one(platforms, {
    fields: [gameReleases.platformId],
    references: [platforms.id],
  }),
  achievementSetLinks: many(releaseAchievementSets),
  guideTargets: many(guideTargets),
}));

export const achievementSetsRelations = relations(achievementSets, ({ many, one }) => ({
  game: one(games, {
    fields: [achievementSets.gameId],
    references: [games.id],
  }),
  releaseLinks: many(releaseAchievementSets),
  groups: many(achievementGroups),
  guideTargets: many(guideTargets),
  userCompletions: many(userCompletions),
  userGuideProgress: many(userGuideProgress),
}));

export const releaseAchievementSetsRelations = relations(releaseAchievementSets, ({ one }) => ({
  release: one(gameReleases, {
    fields: [releaseAchievementSets.gameReleaseId],
    references: [gameReleases.id],
  }),
  achievementSet: one(achievementSets, {
    fields: [releaseAchievementSets.achievementSetId],
    references: [achievementSets.id],
  }),
}));

export const contentPacksRelations = relations(contentPacks, ({ many, one }) => ({
  game: one(games, {
    fields: [contentPacks.gameId],
    references: [games.id],
  }),
  achievementGroups: many(achievementGroups),
}));

export const achievementGroupsRelations = relations(achievementGroups, ({ many, one }) => ({
  achievementSet: one(achievementSets, {
    fields: [achievementGroups.achievementSetId],
    references: [achievementSets.id],
  }),
  contentPack: one(contentPacks, {
    fields: [achievementGroups.contentPackId],
    references: [contentPacks.id],
  }),
  achievements: many(achievements),
}));

export const achievementsRelations = relations(achievements, ({ many, one }) => ({
  group: one(achievementGroups, {
    fields: [achievements.achievementGroupId],
    references: [achievementGroups.id],
  }),
  contentNodeLinks: many(guideContentNodeAchievements),
  checklistItemLinks: many(checklistItemAchievements),
  userProgress: many(userAchievementProgress),
}));

export const guidesRelations = relations(guides, ({ many, one }) => ({
  game: one(games, {
    fields: [guides.gameId],
    references: [games.id],
  }),
  targets: many(guideTargets),
  steps: many(guideSteps),
  versions: many(guideVersions, { relationName: "guideVersions" }),
  publishedVersion: one(guideVersions, {
    fields: [guides.publishedVersionId],
    references: [guideVersions.id],
    relationName: "guidePublishedVersion",
  }),
}));

export const guideTargetsRelations = relations(guideTargets, ({ many, one }) => ({
  guide: one(guides, {
    fields: [guideTargets.guideId],
    references: [guides.id],
  }),
  achievementSet: one(achievementSets, {
    fields: [guideTargets.achievementSetId],
    references: [achievementSets.id],
  }),
  gameRelease: one(gameReleases, {
    fields: [guideTargets.gameReleaseId],
    references: [gameReleases.id],
  }),
  contentNodeLinks: many(guideContentNodeTargets),
  userProgress: many(userGuideProgress),
}));

export const guideStepsRelations = relations(guideSteps, ({ many, one }) => ({
  guide: one(guides, {
    fields: [guideSteps.guideId],
    references: [guides.id],
  }),
  sections: many(guideSections),
}));

export const guideSectionsRelations = relations(guideSections, ({ many, one }) => ({
  step: one(guideSteps, {
    fields: [guideSections.guideStepId],
    references: [guideSteps.id],
  }),
  contentNodes: many(guideContentNodes),
}));

export const guideContentNodesRelations = relations(guideContentNodes, ({ many, one }) => ({
  section: one(guideSections, {
    fields: [guideContentNodes.guideSectionId],
    references: [guideSections.id],
  }),
  targetLinks: many(guideContentNodeTargets),
  achievementLinks: many(guideContentNodeAchievements),
  checklistItem: one(checklistItems),
}));

export const guideContentNodeTargetsRelations = relations(
  guideContentNodeTargets,
  ({ one }) => ({
    contentNode: one(guideContentNodes, {
      fields: [guideContentNodeTargets.contentNodeId],
      references: [guideContentNodes.id],
    }),
    guideTarget: one(guideTargets, {
      fields: [guideContentNodeTargets.guideTargetId],
      references: [guideTargets.id],
    }),
  }),
);

export const guideContentNodeAchievementsRelations = relations(
  guideContentNodeAchievements,
  ({ one }) => ({
    contentNode: one(guideContentNodes, {
      fields: [guideContentNodeAchievements.contentNodeId],
      references: [guideContentNodes.id],
    }),
    achievement: one(achievements, {
      fields: [guideContentNodeAchievements.achievementId],
      references: [achievements.id],
    }),
  }),
);

export const checklistItemsRelations = relations(checklistItems, ({ many, one }) => ({
  contentNode: one(guideContentNodes, {
    fields: [checklistItems.contentNodeId],
    references: [guideContentNodes.id],
  }),
  achievementLinks: many(checklistItemAchievements),
  userProgress: many(userChecklistProgress),
}));

export const checklistItemAchievementsRelations = relations(
  checklistItemAchievements,
  ({ one }) => ({
    checklistItem: one(checklistItems, {
      fields: [checklistItemAchievements.checklistItemId],
      references: [checklistItems.id],
    }),
    achievement: one(achievements, {
      fields: [checklistItemAchievements.achievementId],
      references: [achievements.id],
    }),
  }),
);

export const guideVersionsRelations = relations(guideVersions, ({ many, one }) => ({
  guide: one(guides, {
    fields: [guideVersions.guideId],
    references: [guides.id],
    relationName: "guideVersions",
  }),
  sourceVersion: one(guideVersions, {
    fields: [guideVersions.sourceVersionId],
    references: [guideVersions.id],
    relationName: "guideVersionSource",
  }),
  derivedVersions: many(guideVersions, { relationName: "guideVersionSource" }),
  publishedByGuides: many(guides, { relationName: "guidePublishedVersion" }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  scopeGame: one(games, {
    fields: [mediaAssets.scopeGameId],
    references: [games.id],
  }),
}));

export const userCompletionsRelations = relations(userCompletions, ({ many, one }) => ({
  achievementSet: one(achievementSets, {
    fields: [userCompletions.achievementSetId],
    references: [achievementSets.id],
  }),
  achievementProgress: many(userAchievementProgress),
  guideProgress: many(userGuideProgress),
}));

export const userAchievementProgressRelations = relations(userAchievementProgress, ({ one }) => ({
  userCompletion: one(userCompletions, {
    fields: [userAchievementProgress.userCompletionId],
    references: [userCompletions.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievementProgress.achievementId],
    references: [achievements.id],
  }),
}));

export const userGuideProgressRelations = relations(userGuideProgress, ({ many, one }) => ({
  guideTarget: one(guideTargets, {
    fields: [userGuideProgress.guideTargetId],
    references: [guideTargets.id],
  }),
  achievementSet: one(achievementSets, {
    fields: [userGuideProgress.achievementSetId],
    references: [achievementSets.id],
  }),
  userCompletion: one(userCompletions, {
    fields: [userGuideProgress.userCompletionId],
    references: [userCompletions.id],
  }),
  lastStep: one(guideSteps, {
    fields: [userGuideProgress.lastStepId],
    references: [guideSteps.id],
  }),
  lastSection: one(guideSections, {
    fields: [userGuideProgress.lastSectionId],
    references: [guideSections.id],
  }),
  lastContentNode: one(guideContentNodes, {
    fields: [userGuideProgress.lastContentNodeId],
    references: [guideContentNodes.id],
  }),
  checklistProgress: many(userChecklistProgress),
}));

export const userChecklistProgressRelations = relations(userChecklistProgress, ({ one }) => ({
  userGuideProgress: one(userGuideProgress, {
    fields: [userChecklistProgress.userGuideProgressId],
    references: [userGuideProgress.id],
  }),
  checklistItem: one(checklistItems, {
    fields: [userChecklistProgress.checklistItemId],
    references: [checklistItems.id],
  }),
}));
